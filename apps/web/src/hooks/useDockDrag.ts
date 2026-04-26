import { useCallback, useRef } from 'react';
import { useDockStore } from '@/stores/useDockStore';

const DRAG_THRESHOLD = 5; // px before drag starts (distinguishes click from drag)

/**
 * Hook providing pointer-event-based drag behavior for the navigation dock.
 * Returns handlers to attach to the dock container element.
 *
 * Pointer capture is deferred until the drag threshold is exceeded so that
 * normal clicks on child buttons are not swallowed.
 */
export function useDockDrag() {
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const hasDragged = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Only primary button, and only if dragging is enabled
    if (e.button !== 0) return;
    if (!useDockStore.getState().draggable) return;

    startPos.current = { x: e.clientX, y: e.clientY };
    hasDragged.current = false;
    pointerIdRef.current = e.pointerId;
    containerRef.current = e.currentTarget as HTMLElement;
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!startPos.current) return;

    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;

    // Check threshold before starting drag
    if (!hasDragged.current) {
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
      hasDragged.current = true;
      useDockStore.getState().setDragging(true);
      // Capture pointer only once drag actually starts
      if (containerRef.current && pointerIdRef.current != null) {
        containerRef.current.setPointerCapture?.(pointerIdRef.current);
      }
    }

    useDockStore.getState().setDragPosition({ x: e.clientX, y: e.clientY });
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!startPos.current) return;

    if (hasDragged.current) {
      const el = e.currentTarget as HTMLElement;
      el.releasePointerCapture?.(e.pointerId);
      useDockStore.getState().snapToEdge(e.clientX, e.clientY);
    }

    startPos.current = null;
    hasDragged.current = false;
    pointerIdRef.current = null;
    containerRef.current = null;
  }, []);

  const onPointerCancel = useCallback((e: React.PointerEvent) => {
    if (!startPos.current) return;

    if (hasDragged.current) {
      const el = e.currentTarget as HTMLElement;
      el.releasePointerCapture?.(e.pointerId);
    }

    useDockStore.setState({ isDragging: false, dragPosition: null });
    startPos.current = null;
    hasDragged.current = false;
    pointerIdRef.current = null;
    containerRef.current = null;
  }, []);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    /** Check after pointerUp whether the interaction was a drag (to suppress click) */
    hasDraggedRef: hasDragged,
  };
}
