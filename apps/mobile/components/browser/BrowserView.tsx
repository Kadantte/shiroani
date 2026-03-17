import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { WebView } from 'react-native-webview';
import {
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  Home,
  RotateCw,
  X,
} from 'lucide-react-native';
import { useBrowserState } from '@/hooks/useBrowserState';
import { useBookmarks } from '@/hooks/useBookmarks';
import { QuickAccessPage } from './QuickAccessPage';
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
    goHome,
    dismissQuickAccess,
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
    setInputUrl(state.showQuickAccess ? '' : state.url);
  }, [state.url, state.showQuickAccess]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
  }, []);

  // Back: if QuickAccess is showing over a page, dismiss it first
  const handleBack = useCallback(() => {
    if (state.showQuickAccess && state.hasNavigated) {
      dismissQuickAccess();
    } else {
      goBack();
    }
  }, [state.showQuickAccess, state.hasNavigated, dismissQuickAccess, goBack]);

  const canGoBack = state.canGoBack || (state.showQuickAccess && state.hasNavigated);

  const toggleBookmark = useCallback(async () => {
    if (currentBookmark) {
      await deleteBookmark(currentBookmark.id);
    } else if (!state.showQuickAccess && state.url) {
      await addBookmark({
        url: state.url,
        title: state.title || state.url,
      });
    }
  }, [currentBookmark, state.url, state.title, state.showQuickAccess, addBookmark, deleteBookmark]);

  return (
    <View style={s.container}>
      {/* URL Bar */}
      <View style={s.urlBar}>
        <Pressable
          onPress={handleBack}
          disabled={!canGoBack}
          accessibilityLabel="Wstecz"
          style={s.iconButton}
        >
          <ChevronLeft size={ICON_SIZE} color={canGoBack ? colors.foreground : colors.border} />
        </Pressable>

        <Pressable
          onPress={goForward}
          disabled={!state.canGoForward}
          accessibilityLabel="Dalej"
          style={s.iconButton}
        >
          <ChevronRight
            size={ICON_SIZE}
            color={state.canGoForward ? colors.foreground : colors.border}
          />
        </Pressable>

        <TextInput
          value={isEditing ? inputUrl : state.showQuickAccess ? '' : state.url}
          onChangeText={setInputUrl}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={handleSubmitUrl}
          returnKeyType="go"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          selectTextOnFocus
          placeholder="Wpisz adres URL lub wyszukaj..."
          placeholderTextColor={colors.mutedForeground}
          style={s.urlInput}
        />

        {state.loading ? (
          <Pressable onPress={stopLoading} accessibilityLabel="Zatrzymaj" style={s.iconButton}>
            <X size={ICON_SIZE} color={colors.foreground} />
          </Pressable>
        ) : state.hasNavigated && !state.showQuickAccess ? (
          <Pressable onPress={reload} accessibilityLabel="Odśwież" style={s.iconButton}>
            <RotateCw size={ICON_SIZE} color={colors.foreground} />
          </Pressable>
        ) : null}

        {state.hasNavigated && !state.showQuickAccess && (
          <Pressable
            onPress={toggleBookmark}
            accessibilityLabel={isBookmarked ? 'Usuń zakładkę' : 'Dodaj zakładkę'}
            style={s.iconButton}
          >
            {isBookmarked ? (
              <BookmarkCheck size={ICON_SIZE} color={colors.primary} />
            ) : (
              <Bookmark size={ICON_SIZE} color={colors.foreground} />
            )}
          </Pressable>
        )}

        {state.hasNavigated && (
          <Pressable
            onPress={state.showQuickAccess ? dismissQuickAccess : goHome}
            accessibilityLabel={state.showQuickAccess ? 'Wróć do strony' : 'Szybki dostęp'}
            style={s.iconButton}
          >
            <Home
              size={ICON_SIZE}
              color={state.showQuickAccess ? colors.primary : colors.foreground}
            />
          </Pressable>
        )}
      </View>

      {/* Progress Bar */}
      {state.loading && (
        <View style={s.progressTrack}>
          <View style={[s.progressBar, { width: `${Math.round(state.progress * 100)}%` }]} />
        </View>
      )}

      {/* Content */}
      <View style={s.content}>
        {state.hasNavigated && (
          <View
            style={[s.layer, { zIndex: state.showQuickAccess ? 0 : 1 }]}
            pointerEvents={state.showQuickAccess ? 'none' : 'auto'}
          >
            <WebView
              ref={webViewRef}
              source={{ uri: state.url }}
              onNavigationStateChange={handleNavigationStateChange}
              onLoadProgress={handleLoadProgress}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={false}
              allowsBackForwardNavigationGestures={true}
              allowsFullscreenVideo={true}
              sharedCookiesEnabled={true}
              thirdPartyCookiesEnabled={true}
              mediaPlaybackRequiresUserAction={false}
              allowsInlineMediaPlayback={true}
              style={s.webview}
            />
          </View>
        )}
        {state.showQuickAccess && (
          <View style={[s.layer, { zIndex: 2 }]}>
            <QuickAccessPage onNavigate={navigateTo} />
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
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
  content: {
    flex: 1,
    position: 'relative',
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
