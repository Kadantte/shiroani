import { memo, useCallback, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Eye, Globe, Plus } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useQuickAccess, type QuickAccessSite, type FrequentSite } from '@/hooks/useQuickAccess';
import { colors } from '@/lib/theme';
import type { Bookmark } from '@/lib/db-queries';

const mascotIcon = require('@/assets/images/mascot-wave.png');

// ============================================
// Site Card with favicon + fallback
// ============================================

function SiteCard({
  site,
  onPress,
  onRemove,
}: {
  site: QuickAccessSite;
  onPress: (url: string) => void;
  onRemove: (site: QuickAccessSite) => void;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <Pressable
      onPress={() => onPress(site.url)}
      onLongPress={() => onRemove(site)}
      style={s.quickLink}
    >
      <View style={s.quickLinkIconWrap}>
        {site.icon && !imgError ? (
          <Image
            source={{ uri: site.icon }}
            style={s.faviconImg}
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={[s.quickLinkIcon, { backgroundColor: colors.muted }]}>
            <Text style={s.quickLinkLetter}>{site.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
      </View>
      <Text style={s.quickLinkTitle} numberOfLines={1}>
        {site.name}
      </Text>
    </Pressable>
  );
}

// ============================================
// Add Site Button
// ============================================

function AddSiteButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={s.quickLink}>
      <View style={[s.quickLinkIcon, s.addButton]}>
        <Plus size={20} color={colors.mutedForeground} />
      </View>
      <Text style={s.quickLinkTitle}>Dodaj</Text>
    </Pressable>
  );
}

// ============================================
// Frequent Site Item
// ============================================

function FrequentSiteItem({
  site,
  onPress,
}: {
  site: FrequentSite;
  onPress: (url: string) => void;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <Pressable onPress={() => onPress(site.url)} style={s.frequentItem}>
      {site.favicon && !imgError ? (
        <Image
          source={{ uri: site.favicon }}
          style={s.frequentFavicon}
          onError={() => setImgError(true)}
        />
      ) : (
        <Globe size={16} color={colors.mutedForeground} />
      )}
      <Text style={s.frequentTitle} numberOfLines={1}>
        {site.title}
      </Text>
    </Pressable>
  );
}

// ============================================
// Bookmark Item
// ============================================

function BookmarkItem({
  bookmark,
  onPress,
}: {
  bookmark: Bookmark;
  onPress: (url: string) => void;
}) {
  return (
    <Pressable onPress={() => onPress(bookmark.url)} style={s.bookmarkItem}>
      <Globe size={16} color={colors.mutedForeground} />
      <View style={s.bookmarkInfo}>
        <Text style={s.bookmarkTitle} numberOfLines={1}>
          {bookmark.title}
        </Text>
        <Text style={s.bookmarkUrl} numberOfLines={1}>
          {bookmark.url.replace(/^https?:\/\//, '')}
        </Text>
      </View>
    </Pressable>
  );
}

// ============================================
// Add Site Modal
// ============================================

function AddSiteModal({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (name: string, url: string) => void;
}) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  const handleAdd = useCallback(() => {
    if (!name.trim() || !url.trim()) return;
    onAdd(name.trim(), url.trim());
    setName('');
    setUrl('');
    onClose();
  }, [name, url, onAdd, onClose]);

  const handleClose = useCallback(() => {
    setName('');
    setUrl('');
    onClose();
  }, [onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={s.modalOverlay} onPress={handleClose}>
        <Pressable style={s.modalContent} onPress={e => e.stopPropagation()}>
          <Text style={s.modalTitle}>Dodaj stronę</Text>
          <Text style={s.modalDescription}>Dodaj stronę do szybkiego dostępu.</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Nazwa"
            placeholderTextColor={colors.mutedForeground}
            style={s.modalInput}
          />
          <TextInput
            value={url}
            onChangeText={setUrl}
            placeholder="https://example.com"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            onSubmitEditing={handleAdd}
            style={s.modalInput}
          />
          <View style={s.modalButtons}>
            <Pressable onPress={handleClose} style={s.modalButtonCancel}>
              <Text style={s.modalButtonCancelText}>Anuluj</Text>
            </Pressable>
            <Pressable
              onPress={handleAdd}
              disabled={!name.trim() || !url.trim()}
              style={[s.modalButtonAdd, (!name.trim() || !url.trim()) && { opacity: 0.4 }]}
            >
              <Text style={s.modalButtonAddText}>Dodaj</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ============================================
// Main Component
// ============================================

interface QuickAccessPageProps {
  onNavigate: (url: string) => void;
}

function QuickAccessPageInner({ onNavigate }: QuickAccessPageProps) {
  const { bookmarks } = useBookmarks();
  const {
    sites,
    frequentSites,
    hiddenPredefined,
    addSite,
    removeSite,
    hidePredefined,
    showPredefined,
  } = useQuickAccess();

  const [showAddModal, setShowAddModal] = useState(false);

  const handlePress = useCallback(
    (url: string) => {
      onNavigate(url);
    },
    [onNavigate]
  );

  const handleRemove = useCallback(
    (site: QuickAccessSite) => {
      if (site.isPredefined) {
        hidePredefined(site.id);
      } else {
        removeSite(site.id);
      }
    },
    [hidePredefined, removeSite]
  );

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Hero */}
      <View style={s.hero}>
        <Image source={mascotIcon} style={s.mascot} resizeMode="contain" />
        <Text style={s.heroTitle}>ShiroAni</Text>
        <Text style={s.heroSubtitle}>Dokąd dziś płyniemy?</Text>
      </View>

      {/* Quick Links */}
      <Text style={s.sectionTitle}>Szybki dostęp</Text>
      <View style={s.quickLinksGrid}>
        {sites.map(site => (
          <SiteCard key={site.id} site={site} onPress={handlePress} onRemove={handleRemove} />
        ))}
        <AddSiteButton onPress={() => setShowAddModal(true)} />
      </View>

      {/* Hidden predefined sites */}
      {hiddenPredefined.length > 0 && (
        <>
          <Text style={[s.sectionTitle, { marginTop: 24 }]}>Ukryte strony</Text>
          <View style={s.hiddenList}>
            {hiddenPredefined.map(site => (
              <Pressable key={site.id} onPress={() => showPredefined(site.id)} style={s.hiddenChip}>
                <Eye size={12} color={colors.mutedForeground} />
                <Text style={s.hiddenChipText}>{site.name}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {/* Frequently Visited */}
      {frequentSites.length > 0 && (
        <>
          <Text style={[s.sectionTitle, { marginTop: 24 }]}>Często odwiedzane</Text>
          <View style={s.frequentList}>
            {frequentSites.map(site => (
              <FrequentSiteItem key={site.url} site={site} onPress={handlePress} />
            ))}
          </View>
        </>
      )}

      {/* Bookmarks */}
      {bookmarks.length > 0 && (
        <>
          <Text style={[s.sectionTitle, { marginTop: 24 }]}>Zakładki</Text>
          <View style={s.bookmarksList}>
            {bookmarks.slice(0, 10).map(bm => (
              <BookmarkItem key={bm.id} bookmark={bm} onPress={handlePress} />
            ))}
          </View>
        </>
      )}

      <AddSiteModal visible={showAddModal} onClose={() => setShowAddModal(false)} onAdd={addSite} />
    </ScrollView>
  );
}

export const QuickAccessPage = memo(QuickAccessPageInner);

// ============================================
// Styles
// ============================================

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 32,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 32,
  },
  mascot: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.foreground,
  },
  heroSubtitle: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.mutedForeground,
    paddingHorizontal: 20,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Quick Links Grid
  quickLinksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  quickLink: {
    width: '29%',
    alignItems: 'center',
    gap: 6,
  },
  quickLinkIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  faviconImg: {
    width: 32,
    height: 32,
    borderRadius: 4,
  },
  quickLinkIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLinkLetter: {
    color: colors.mutedForeground,
    fontSize: 18,
    fontWeight: '700',
  },
  quickLinkTitle: {
    fontSize: 11,
    color: colors.foreground,
    textAlign: 'center',
  },

  // Add button
  addButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },

  // Hidden sites
  hiddenList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
  },
  hiddenChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.muted,
    borderRadius: 8,
  },
  hiddenChipText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },

  // Frequent sites
  frequentList: {
    marginHorizontal: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  frequentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  frequentFavicon: {
    width: 18,
    height: 18,
    borderRadius: 3,
  },
  frequentTitle: {
    flex: 1,
    fontSize: 13,
    color: colors.foreground,
  },

  // Bookmarks
  bookmarksList: {
    marginHorizontal: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  bookmarkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bookmarkInfo: {
    flex: 1,
  },
  bookmarkTitle: {
    fontSize: 14,
    color: colors.foreground,
    fontWeight: '500',
  },
  bookmarkUrl: {
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: 1,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 4,
  },
  modalDescription: {
    fontSize: 13,
    color: colors.mutedForeground,
    marginBottom: 16,
  },
  modalInput: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.foreground,
    marginBottom: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  modalButtonCancel: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalButtonCancelText: {
    fontSize: 14,
    color: colors.mutedForeground,
    fontWeight: '500',
  },
  modalButtonAdd: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  modalButtonAddText: {
    fontSize: 14,
    color: colors.primaryForeground,
    fontWeight: '600',
  },
});
