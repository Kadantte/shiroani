import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { WebView } from 'react-native-webview';
import {
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  X,
} from 'lucide-react-native';
import { useBrowserState } from '@/hooks/useBrowserState';
import { useBookmarks } from '@/hooks/useBookmarks';
import { colors } from '@/lib/theme';

const ICON_SIZE = 20;

export function BrowserView() {
  const {
    webViewRef,
    state,
    handleNavigationStateChange,
    handleLoadProgress,
    navigateTo,
    goBack,
    goForward,
    reload,
    stopLoading,
  } = useBrowserState();

  const { bookmarks, addBookmark, deleteBookmark } = useBookmarks();
  const [inputUrl, setInputUrl] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const currentBookmark = bookmarks.find(b => b.url === state.url);
  const isBookmarked = Boolean(currentBookmark);

  const handleSubmitUrl = useCallback(() => {
    setIsEditing(false);
    if (inputUrl.trim()) {
      navigateTo(inputUrl);
    }
  }, [inputUrl, navigateTo]);

  const handleFocus = useCallback(() => {
    setIsEditing(true);
    setInputUrl(state.url);
  }, [state.url]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
  }, []);

  const toggleBookmark = useCallback(async () => {
    if (currentBookmark) {
      await deleteBookmark(currentBookmark.id);
    } else {
      await addBookmark({
        url: state.url,
        title: state.title || state.url,
      });
    }
  }, [currentBookmark, state.url, state.title, addBookmark, deleteBookmark]);

  return (
    <View style={styles.container}>
      {/* URL Bar */}
      <View style={styles.urlBar}>
        <Pressable
          onPress={goBack}
          disabled={!state.canGoBack}
          accessibilityLabel="Wstecz"
          style={styles.iconButton}
        >
          <ChevronLeft
            size={ICON_SIZE}
            color={state.canGoBack ? colors.foreground : colors.border}
          />
        </Pressable>

        <Pressable
          onPress={goForward}
          disabled={!state.canGoForward}
          accessibilityLabel="Dalej"
          style={styles.iconButton}
        >
          <ChevronRight
            size={ICON_SIZE}
            color={state.canGoForward ? colors.foreground : colors.border}
          />
        </Pressable>

        <TextInput
          value={isEditing ? inputUrl : state.url}
          onChangeText={setInputUrl}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={handleSubmitUrl}
          returnKeyType="go"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          selectTextOnFocus
          placeholder="Wpisz adres URL"
          placeholderTextColor={colors.mutedForeground}
          style={styles.urlInput}
        />

        {state.loading ? (
          <Pressable onPress={stopLoading} accessibilityLabel="Zatrzymaj" style={styles.iconButton}>
            <X size={ICON_SIZE} color={colors.foreground} />
          </Pressable>
        ) : (
          <Pressable onPress={reload} accessibilityLabel="Odśwież" style={styles.iconButton}>
            <RotateCw size={ICON_SIZE} color={colors.foreground} />
          </Pressable>
        )}

        <Pressable
          onPress={toggleBookmark}
          accessibilityLabel={isBookmarked ? 'Usuń zakładkę' : 'Dodaj zakładkę'}
          style={styles.iconButton}
        >
          {isBookmarked ? (
            <BookmarkCheck size={ICON_SIZE} color={colors.primary} />
          ) : (
            <Bookmark size={ICON_SIZE} color={colors.foreground} />
          )}
        </Pressable>
      </View>

      {/* Progress Bar */}
      {state.loading && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: `${Math.round(state.progress * 100)}%` }]} />
        </View>
      )}

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: state.url }}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadProgress={handleLoadProgress}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        allowsBackForwardNavigationGestures={true}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  urlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconButton: {
    padding: 8,
  },
  urlInput: {
    flex: 1,
    minWidth: 0,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 13,
    color: colors.foreground,
  },
  progressTrack: {
    height: 2,
    backgroundColor: colors.border,
  },
  progressBar: {
    height: 2,
    backgroundColor: colors.primary,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
