import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { createLogger } from '@shiroani/shared';
import { IS_ELECTRON } from '@/lib/platform';
import { electronStoreGet } from '@/lib/electron-store';
import { createDebouncedPersist } from '@/lib/electron-store';

const logger = createLogger('Dock');

export type DockEdge = 'top' | 'bottom' | 'left' | 'right';

interface DockSettings {
  /** Offset along the edge as percentage (0-100) */
  offset: number;
  /** Which edge the dock is snapped to */
  edge: DockEdge;
  /** Whether auto-hide is enabled */
  autoHide: boolean;
  /** Whether dragging is enabled */
  draggable: boolean;
  /** Whether to show text labels under icons */
  showLabels: boolean;
}

interface DockState extends DockSettings {
  /** Whether the dock is currently being dragged */
  isDragging: boolean;
  /** Drag position in viewport pixels (only used during drag) */
  dragPosition: { x: number; y: number } | null;
  /** Whether the dock is expanded (for auto-hide hover) */
  isExpanded: boolean;
  /** Whether settings have been restored from persistence */
  initialized: boolean;
}

interface DockActions {
  setEdge: (edge: DockEdge) => void;
  setOffset: (offset: number) => void;
  setAutoHide: (autoHide: boolean) => void;
  setDraggable: (draggable: boolean) => void;
  setShowLabels: (showLabels: boolean) => void;
  setDragging: (isDragging: boolean) => void;
  setDragPosition: (pos: { x: number; y: number } | null) => void;
  setExpanded: (expanded: boolean) => void;
  /** Snap to edge + offset from a viewport pixel position */
  snapToEdge: (x: number, y: number) => void;
  /** Reset dock to default position */
  resetPosition: () => void;
  /** Initialize from persisted settings */
  initDock: () => Promise<void>;
}

type DockStore = DockState & DockActions;

const DEFAULT_OFFSET = 50;
const DEFAULT_EDGE: DockEdge = 'bottom';
const STORE_KEY = 'dock-settings';

const persistSettings = createDebouncedPersist(STORE_KEY, 300);

function persistCurrentSettings(state: DockState) {
  if (!IS_ELECTRON) return;
  const settings: DockSettings = {
    offset: state.offset,
    edge: state.edge,
    autoHide: state.autoHide,
    draggable: state.draggable,
    showLabels: state.showLabels,
  };
  persistSettings(settings);
}

export const useDockStore = create<DockStore>()(
  devtools(
    (set, get) => ({
      // State
      offset: DEFAULT_OFFSET,
      edge: DEFAULT_EDGE,
      autoHide: false,
      draggable: true,
      showLabels: true,
      isDragging: false,
      dragPosition: null,
      isExpanded: false,
      initialized: false,

      // Actions
      setEdge: (edge: DockEdge) => {
        set({ edge }, undefined, 'dock/setEdge');
        persistCurrentSettings(get());
      },

      setOffset: (offset: number) => {
        set({ offset: Math.max(0, Math.min(100, offset)) }, undefined, 'dock/setOffset');
        persistCurrentSettings(get());
      },

      setAutoHide: (autoHide: boolean) => {
        set({ autoHide, isExpanded: !autoHide }, undefined, 'dock/setAutoHide');
        persistCurrentSettings(get());
      },

      setDraggable: (draggable: boolean) => {
        set({ draggable }, undefined, 'dock/setDraggable');
        persistCurrentSettings(get());
      },

      setShowLabels: (showLabels: boolean) => {
        set({ showLabels }, undefined, 'dock/setShowLabels');
        persistCurrentSettings(get());
      },

      setDragging: (isDragging: boolean) => {
        set({ isDragging }, undefined, 'dock/setDragging');
      },

      setDragPosition: (pos: { x: number; y: number } | null) => {
        set({ dragPosition: pos }, undefined, 'dock/setDragPosition');
      },

      setExpanded: (expanded: boolean) => {
        set({ isExpanded: expanded }, undefined, 'dock/setExpanded');
      },

      snapToEdge: (x: number, y: number) => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // Distance to each edge
        const distances = {
          top: y,
          bottom: vh - y,
          left: x,
          right: vw - x,
        };

        // Find closest edge
        const edge = (Object.entries(distances) as [DockEdge, number][]).reduce((a, b) =>
          a[1] < b[1] ? a : b
        )[0];

        // Calculate offset along the edge (percentage)
        let offset: number;
        if (edge === 'top' || edge === 'bottom') {
          offset = (x / vw) * 100;
        } else {
          offset = (y / vh) * 100;
        }
        offset = Math.max(5, Math.min(95, offset));

        set({ edge, offset, isDragging: false, dragPosition: null }, undefined, 'dock/snapToEdge');
        persistCurrentSettings(get());
      },

      resetPosition: () => {
        set({ edge: DEFAULT_EDGE, offset: DEFAULT_OFFSET }, undefined, 'dock/resetPosition');
        persistCurrentSettings(get());
      },

      initDock: async () => {
        if (!IS_ELECTRON) {
          set({ initialized: true }, undefined, 'dock/initDock');
          return;
        }
        try {
          const saved = await electronStoreGet<DockSettings>(STORE_KEY);
          if (saved) {
            logger.debug('Restored dock settings:', saved);
            set(
              {
                offset: saved.offset ?? DEFAULT_OFFSET,
                edge: saved.edge ?? DEFAULT_EDGE,
                autoHide: saved.autoHide ?? false,
                draggable: saved.draggable ?? true,
                showLabels: saved.showLabels ?? true,
                isExpanded: !(saved.autoHide ?? false),
                initialized: true,
              },
              undefined,
              'dock/initDock'
            );
          } else {
            set({ initialized: true }, undefined, 'dock/initDock');
          }
        } catch (err) {
          logger.error('Failed to restore dock settings:', err);
          set({ initialized: true }, undefined, 'dock/initDock');
        }
      },
    }),
    { name: 'dock' }
  )
);
