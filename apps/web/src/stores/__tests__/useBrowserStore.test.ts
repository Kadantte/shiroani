import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { BrowserLeafNode, BrowserNode } from '@shiroani/shared';
import { useBrowserStore } from '../useBrowserStore';

// Mock webviewRefs — must be before importing the store
vi.mock('@/components/browser/webviewRefs', () => ({
  getWebview: vi.fn(),
  unregisterWebview: vi.fn(),
}));

// Mock platform
vi.mock('@/lib/platform', () => ({
  IS_ELECTRON: false,
}));

// Provide crypto.randomUUID for jsdom
let uuidCounter = 0;
vi.stubGlobal('crypto', {
  randomUUID: () => `tab-${++uuidCounter}`,
});

/** Narrow a tree node to a leaf, failing the test if the node is a split. */
function expectLeaf(node: BrowserNode | undefined): BrowserLeafNode {
  if (!node || node.kind !== 'leaf') {
    throw new Error(`expected leaf node, got ${node?.kind ?? 'undefined'}`);
  }
  return node;
}

describe('useBrowserStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useBrowserStore.setState({
      tabs: [],
      activeTabId: null,
      activePaneId: null,
      isAddressBarFocused: false,
      adblockEnabled: true,
      popupBlockEnabled: true,
      adblockWhitelist: [],
      restoreTabsOnStartup: true,
      isFullScreen: false,
    });
    uuidCounter = 0;
  });

  // ── openTab ───────────────────────────────────────────────────

  describe('openTab', () => {
    it('creates a new tab with default URL', () => {
      useBrowserStore.getState().openTab();

      const { tabs, activeTabId } = useBrowserStore.getState();
      expect(tabs).toHaveLength(1);
      const leaf = expectLeaf(tabs[0]);
      expect(leaf.title).toBe('Nowa karta');
      expect(leaf.isLoading).toBe(false); // new tab page doesn't load
      expect(leaf.canGoBack).toBe(false);
      expect(leaf.canGoForward).toBe(false);
      expect(activeTabId).toBe(leaf.id);
    });

    it('creates a tab with a custom URL', () => {
      useBrowserStore.getState().openTab('https://example.com');

      const { tabs } = useBrowserStore.getState();
      expect(tabs).toHaveLength(1);
      expect(expectLeaf(tabs[0]).url).toBe('https://example.com');
    });

    it('sets the new tab as active', () => {
      useBrowserStore.getState().openTab('https://a.com');
      useBrowserStore.getState().openTab('https://b.com');

      const { tabs, activeTabId } = useBrowserStore.getState();
      expect(tabs).toHaveLength(2);
      expect(activeTabId).toBe(tabs[1].id);
    });
  });

  // ── closeTab ──────────────────────────────────────────────────

  describe('closeTab', () => {
    it('removes the specified tab', () => {
      useBrowserStore.getState().openTab('https://a.com');
      useBrowserStore.getState().openTab('https://b.com');

      const tabToClose = useBrowserStore.getState().tabs[0].id;
      useBrowserStore.getState().closeTab(tabToClose);

      const { tabs } = useBrowserStore.getState();
      expect(tabs).toHaveLength(1);
      expect(expectLeaf(tabs[0]).url).toBe('https://b.com');
    });

    it('activates next tab when closing active tab', () => {
      useBrowserStore.getState().openTab('https://a.com');
      useBrowserStore.getState().openTab('https://b.com');
      useBrowserStore.getState().openTab('https://c.com');

      // Switch to middle tab and close it
      const middleTabId = useBrowserStore.getState().tabs[1].id;
      useBrowserStore.getState().switchTab(middleTabId);
      useBrowserStore.getState().closeTab(middleTabId);

      const { activeTabId, tabs } = useBrowserStore.getState();
      expect(tabs).toHaveLength(2);
      // Should activate the tab at the same index (or last if index is out of bounds)
      expect(activeTabId).toBeTruthy();
    });

    it('sets activeTabId to null when closing the last tab', () => {
      useBrowserStore.getState().openTab('https://a.com');
      const tabId = useBrowserStore.getState().tabs[0].id;
      useBrowserStore.getState().closeTab(tabId);

      const { tabs, activeTabId } = useBrowserStore.getState();
      expect(tabs).toHaveLength(0);
      expect(activeTabId).toBeNull();
    });

    it('does nothing for non-existent tab ID', () => {
      useBrowserStore.getState().openTab('https://a.com');
      useBrowserStore.getState().closeTab('nonexistent-id');

      expect(useBrowserStore.getState().tabs).toHaveLength(1);
    });

    it('keeps active tab unchanged when closing a non-active tab', () => {
      useBrowserStore.getState().openTab('https://a.com');
      useBrowserStore.getState().openTab('https://b.com');

      const firstTabId = useBrowserStore.getState().tabs[0].id;
      const activeId = useBrowserStore.getState().activeTabId;

      useBrowserStore.getState().closeTab(firstTabId);

      expect(useBrowserStore.getState().activeTabId).toBe(activeId);
    });
  });

  // ── switchTab ─────────────────────────────────────────────────

  describe('switchTab', () => {
    it('changes the active tab', () => {
      useBrowserStore.getState().openTab('https://a.com');
      useBrowserStore.getState().openTab('https://b.com');

      const firstTabId = useBrowserStore.getState().tabs[0].id;
      useBrowserStore.getState().switchTab(firstTabId);

      expect(useBrowserStore.getState().activeTabId).toBe(firstTabId);
    });
  });

  // ── updateTabState ────────────────────────────────────────────

  describe('updateTabState', () => {
    it('updates a specific tab by ID', () => {
      useBrowserStore.getState().openTab('https://a.com');
      const tabId = useBrowserStore.getState().tabs[0].id;

      useBrowserStore.getState().updateTabState(tabId, {
        title: 'Updated Title',
        url: 'https://updated.com',
        isLoading: false,
      });

      const leaf = expectLeaf(useBrowserStore.getState().tabs[0]);
      expect(leaf.title).toBe('Updated Title');
      expect(leaf.url).toBe('https://updated.com');
      expect(leaf.isLoading).toBe(false);
    });

    it('does not affect other tabs', () => {
      useBrowserStore.getState().openTab('https://a.com');
      useBrowserStore.getState().openTab('https://b.com');

      const firstTabId = useBrowserStore.getState().tabs[0].id;
      useBrowserStore.getState().updateTabState(firstTabId, { title: 'Changed' });

      expect(expectLeaf(useBrowserStore.getState().tabs[1]).title).toBe('Nowa karta');
    });
  });

  // ── UI state ──────────────────────────────────────────────────

  describe('setAddressBarFocused', () => {
    it('toggles address bar focus state', () => {
      useBrowserStore.getState().setAddressBarFocused(true);
      expect(useBrowserStore.getState().isAddressBarFocused).toBe(true);

      useBrowserStore.getState().setAddressBarFocused(false);
      expect(useBrowserStore.getState().isAddressBarFocused).toBe(false);
    });
  });

  describe('toggleAdblock', () => {
    it('toggles adblock enabled state', () => {
      expect(useBrowserStore.getState().adblockEnabled).toBe(true);

      useBrowserStore.getState().toggleAdblock();
      expect(useBrowserStore.getState().adblockEnabled).toBe(false);

      useBrowserStore.getState().toggleAdblock();
      expect(useBrowserStore.getState().adblockEnabled).toBe(true);
    });
  });

  // ── Popup block switch ───────────────────────────────────────

  describe('togglePopupBlock', () => {
    it('toggles popup block enabled state', () => {
      expect(useBrowserStore.getState().popupBlockEnabled).toBe(true);

      useBrowserStore.getState().togglePopupBlock();
      expect(useBrowserStore.getState().popupBlockEnabled).toBe(false);

      useBrowserStore.getState().togglePopupBlock();
      expect(useBrowserStore.getState().popupBlockEnabled).toBe(true);
    });
  });

  describe('setPopupBlockEnabled', () => {
    it('sets the value directly', () => {
      useBrowserStore.getState().setPopupBlockEnabled(false);
      expect(useBrowserStore.getState().popupBlockEnabled).toBe(false);

      useBrowserStore.getState().setPopupBlockEnabled(true);
      expect(useBrowserStore.getState().popupBlockEnabled).toBe(true);
    });
  });

  // ── Adblock whitelist ────────────────────────────────────────

  describe('addAdblockDomain', () => {
    it('adds a bare hostname', () => {
      useBrowserStore.getState().addAdblockDomain('example.com');
      expect(useBrowserStore.getState().adblockWhitelist).toEqual(['example.com']);
    });

    it('normalizes hostnames (lowercase, strip www., strip protocol/path)', () => {
      useBrowserStore.getState().addAdblockDomain('  HTTPS://WWW.Example.COM/some/path?q=1  ');
      expect(useBrowserStore.getState().adblockWhitelist).toEqual(['example.com']);
    });

    it('dedupes entries that normalize to the same host', () => {
      useBrowserStore.getState().addAdblockDomain('example.com');
      useBrowserStore.getState().addAdblockDomain('https://www.example.com/');
      useBrowserStore.getState().addAdblockDomain('EXAMPLE.com');
      expect(useBrowserStore.getState().adblockWhitelist).toEqual(['example.com']);
    });

    it('rejects empty and whitespace-only input', () => {
      useBrowserStore.getState().addAdblockDomain('');
      useBrowserStore.getState().addAdblockDomain('   ');
      expect(useBrowserStore.getState().adblockWhitelist).toEqual([]);
    });

    it('strips port suffixes', () => {
      useBrowserStore.getState().addAdblockDomain('example.com:8080');
      expect(useBrowserStore.getState().adblockWhitelist).toEqual(['example.com']);
    });

    it('preserves subdomains other than www.', () => {
      useBrowserStore.getState().addAdblockDomain('sub.example.com');
      expect(useBrowserStore.getState().adblockWhitelist).toEqual(['sub.example.com']);
    });
  });

  describe('removeAdblockDomain', () => {
    it('removes a previously added host', () => {
      useBrowserStore.getState().addAdblockDomain('example.com');
      useBrowserStore.getState().addAdblockDomain('other.com');
      useBrowserStore.getState().removeAdblockDomain('example.com');
      expect(useBrowserStore.getState().adblockWhitelist).toEqual(['other.com']);
    });

    it('normalizes the removal input', () => {
      useBrowserStore.getState().addAdblockDomain('example.com');
      useBrowserStore.getState().removeAdblockDomain('https://WWW.example.com/');
      expect(useBrowserStore.getState().adblockWhitelist).toEqual([]);
    });

    it('is a no-op for non-existent hosts', () => {
      useBrowserStore.getState().addAdblockDomain('example.com');
      useBrowserStore.getState().removeAdblockDomain('notthere.com');
      expect(useBrowserStore.getState().adblockWhitelist).toEqual(['example.com']);
    });
  });

  // ── openTab uses NEW_TAB_URL by default ─────────────────────

  describe('openTab default URL', () => {
    it('opens new tab with NEW_TAB_URL when no URL provided', () => {
      useBrowserStore.getState().openTab();

      const { tabs } = useBrowserStore.getState();
      expect(tabs).toHaveLength(1);
      expect(expectLeaf(tabs[0]).url).toBe('shiroani://newtab');
    });
  });
});
