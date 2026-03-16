import { useCallback, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
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

const ICON_SIZE = 20;
const ICON_COLOR_ACTIVE = 'hsl(350, 20%, 92%)';
const ICON_COLOR_DISABLED = 'hsl(350, 10%, 30%)';
const PRIMARY_COLOR = 'hsl(345, 60%, 55%)';
const CARD_BG = 'hsl(350, 8%, 11%)';
const BACKGROUND = 'hsl(300, 10%, 5%)';
const BORDER_COLOR = 'hsl(350, 7%, 18%)';

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
    <View style={{ flex: 1, backgroundColor: BACKGROUND }}>
      {/* URL Bar */}
      <View
        className="flex-row items-center gap-1 px-2 py-2"
        style={{ backgroundColor: CARD_BG, borderBottomWidth: 1, borderBottomColor: BORDER_COLOR }}
      >
        <Pressable
          onPress={goBack}
          disabled={!state.canGoBack}
          accessibilityLabel="Wstecz"
          className="p-2"
        >
          <ChevronLeft
            size={ICON_SIZE}
            color={state.canGoBack ? ICON_COLOR_ACTIVE : ICON_COLOR_DISABLED}
          />
        </Pressable>

        <Pressable
          onPress={goForward}
          disabled={!state.canGoForward}
          accessibilityLabel="Dalej"
          className="p-2"
        >
          <ChevronRight
            size={ICON_SIZE}
            color={state.canGoForward ? ICON_COLOR_ACTIVE : ICON_COLOR_DISABLED}
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
          placeholderTextColor="hsl(350, 10%, 40%)"
          className="mx-1 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground"
        />

        {state.loading ? (
          <Pressable onPress={stopLoading} accessibilityLabel="Zatrzymaj" className="p-2">
            <X size={ICON_SIZE} color={ICON_COLOR_ACTIVE} />
          </Pressable>
        ) : (
          <Pressable onPress={reload} accessibilityLabel="Odśwież" className="p-2">
            <RotateCw size={ICON_SIZE} color={ICON_COLOR_ACTIVE} />
          </Pressable>
        )}

        <Pressable
          onPress={toggleBookmark}
          accessibilityLabel={isBookmarked ? 'Usuń zakładkę' : 'Dodaj zakładkę'}
          className="p-2"
        >
          {isBookmarked ? (
            <BookmarkCheck size={ICON_SIZE} color={PRIMARY_COLOR} />
          ) : (
            <Bookmark size={ICON_SIZE} color={ICON_COLOR_ACTIVE} />
          )}
        </Pressable>
      </View>

      {/* Progress Bar */}
      {state.loading && (
        <View style={{ height: 2, backgroundColor: BORDER_COLOR }}>
          <View
            style={{
              height: 2,
              width: `${Math.round(state.progress * 100)}%`,
              backgroundColor: PRIMARY_COLOR,
            }}
          />
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
        injectedJavaScriptBeforeContentLoaded={undefined}
        style={{ flex: 1, backgroundColor: BACKGROUND }}
      />
    </View>
  );
}
