/**
 * desktop_overlay.cpp
 *
 * Win32 native addon that creates a transparent overlay window with an animated
 * sprite (chibi mascot) and a system tray icon.
 *
 * Architecture:
 *   - The overlay window runs on a dedicated Win32 thread with its own message loop.
 *   - N-API functions (called from Node's event loop) communicate with the overlay
 *     thread via PostMessage / PostThreadMessage.
 *   - JS callbacks are dispatched through napi_threadsafe_function.
 *
 * Animation: Uses a single base PNG and computes smooth sinusoidal bobbing
 * in real-time at ~60fps. No sprite sheet frames needed.
 */

#include "desktop_overlay.h"

#include <cmath>
#include <string>
#include <cstring>
// Windows extensions for GET_X_LPARAM / GET_Y_LPARAM
#include <windowsx.h>

// GDI+ headers
#include <objidl.h>
#include <gdiplus.h>

// Shell for tray icon
#include <shellapi.h>
#include <commctrl.h>

#pragma comment(lib, "gdiplus.lib")
#pragma comment(lib, "user32.lib")
#pragma comment(lib, "shell32.lib")
#pragma comment(lib, "gdi32.lib")
#pragma comment(lib, "ole32.lib")
#pragma comment(lib, "comctl32.lib")

// ============================================================================
// Constants
// ============================================================================

static const wchar_t* OVERLAY_CLASS_NAME  = L"ShiroAniOverlay";
static const wchar_t* MESSAGE_CLASS_NAME  = L"ShiroAniMsgWnd";
static const wchar_t* OVERLAY_TITLE       = L"ShiroAni Mascot";

static const UINT WM_TRAYICON      = WM_USER + 1;
static const UINT WM_CHANGE_ANIM   = WM_USER + 100;
static const UINT WM_CHANGE_POS    = WM_USER + 101;
static const UINT WM_CHANGE_VIS    = WM_USER + 102;
static const UINT WM_DESTROY_OVL   = WM_USER + 103;
static const UINT WM_CHANGE_SIZE   = WM_USER + 104;

static const UINT ANIM_TIMER_ID    = 1;
static const int  ALPHA_THRESHOLD  = 20;

// Animation parameters
static const int  ANIM_INTERVAL_MS = 16;   // ~60fps
static const double BOB_AMPLITUDE  = 3.0;  // Max pixels of bobbing (at display size)
static const double BOB_PERIOD_SEC = 2.5;  // Seconds for one full bob cycle
static const double PI = 3.14159265358979323846;

// Tray icon ID
static const UINT TRAY_ICON_ID     = 1;

// Context menu item IDs
static const UINT IDM_HIDE_MASCOT    = 40001;
static const UINT IDM_QUIT_APP       = 40002;
static const UINT IDM_SHOW_MASCOT    = 40003;
static const UINT IDM_OPEN_APP       = 40010;
static const UINT IDM_NAV_SCHEDULE   = 40011;
static const UINT IDM_NAV_LIBRARY    = 40012;
static const UINT IDM_LOCK_POSITION  = 40013;
static const UINT IDM_OPEN_SETTINGS  = 40014;

// ============================================================================
// Structs for cross-thread data
// ============================================================================

struct AnimChangeData {
    std::wstring sheetPath;
    int frameCount;
    int frameWidth;
    int intervalMs;
};

struct OverlayInitParams {
    std::wstring spritePath;
    std::wstring iconPath;
    int x;
    int y;
    int frameWidth;
    int frameHeight;
    int frameCount;
    int intervalMs;
    HANDLE initEvent;
    bool   success;
};

// ============================================================================
// Global state (accessed only from the overlay thread unless noted)
// ============================================================================

static HWND                 g_overlayHwnd   = NULL;
static HWND                 g_messageHwnd   = NULL;
static Gdiplus::Bitmap*     g_baseImage     = NULL;  // Original high-res base image
static Gdiplus::Bitmap*     g_scaledImage   = NULL;  // Cached scaled-to-display-size image
static NOTIFYICONDATA       g_nid           = {};
static int                  g_displaySize   = 128;   // Current display size (width = height)
static BYTE*                g_alphaBuffer   = NULL;
static bool                 g_visible       = true;
static bool                 g_positionLocked = false;
static HANDLE               g_overlayThread = NULL;
static DWORD                g_overlayThreadId = 0;
static ULONG_PTR            g_gdiplusToken  = 0;
static bool                 g_trayCreated   = false;

// Animation state
static LARGE_INTEGER        g_perfFreq      = {};
static LARGE_INTEGER        g_animStart     = {};

// Threadsafe function for JS callbacks
static Napi::ThreadSafeFunction g_tsfn;
static bool g_tsfnCreated = false;

// ============================================================================
// Forward declarations
// ============================================================================

static DWORD WINAPI OverlayThreadProc(LPVOID param);
static LRESULT CALLBACK OverlayWndProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam);
static LRESULT CALLBACK MessageWndProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam);
static void RenderFrame();
static void RebuildScaledImage();
static void UpdateAlphaBuffer();
static bool LoadBaseImage(const std::wstring& path);
static void CleanupTrayIcon();
static void CreateTrayIcon(const std::wstring& iconPath);
static void ShowOverlayContextMenu(HWND hwnd, POINT pt);
static void ShowTrayContextMenu(HWND hwnd, POINT pt);
static std::wstring Utf8ToWide(const std::string& utf8);

// ============================================================================
// Utility: UTF-8 to wide string conversion
// ============================================================================

static std::wstring Utf8ToWide(const std::string& utf8) {
    if (utf8.empty()) return L"";
    int len = MultiByteToWideChar(CP_UTF8, 0, utf8.c_str(), (int)utf8.size(), NULL, 0);
    if (len <= 0) return L"";
    std::wstring wide(len, L'\0');
    MultiByteToWideChar(CP_UTF8, 0, utf8.c_str(), (int)utf8.size(), &wide[0], len);
    return wide;
}

// ============================================================================
// Image loading and scaling
// ============================================================================

static bool LoadBaseImage(const std::wstring& path) {
    Gdiplus::Bitmap* newImage = new Gdiplus::Bitmap(path.c_str());
    if (newImage->GetLastStatus() != Gdiplus::Ok) {
        delete newImage;
        return false;
    }
    if (g_baseImage) delete g_baseImage;
    if (g_scaledImage) { delete g_scaledImage; g_scaledImage = NULL; }
    g_baseImage = newImage;
    RebuildScaledImage();
    return true;
}

/**
 * Rebuild the cached scaled image from the base image at the current display size.
 * Also updates the alpha buffer for hit testing.
 */
static void RebuildScaledImage() {
    if (!g_baseImage) return;

    if (g_scaledImage) { delete g_scaledImage; g_scaledImage = NULL; }

    g_scaledImage = new Gdiplus::Bitmap(g_displaySize, g_displaySize, PixelFormat32bppPARGB);
    Gdiplus::Graphics g(g_scaledImage);
    g.Clear(Gdiplus::Color(0, 0, 0, 0));
    g.SetInterpolationMode(Gdiplus::InterpolationModeHighQualityBicubic);
    g.SetSmoothingMode(Gdiplus::SmoothingModeHighQuality);
    g.SetPixelOffsetMode(Gdiplus::PixelOffsetModeHighQuality);
    g.DrawImage(g_baseImage,
        Gdiplus::Rect(0, 0, g_displaySize, g_displaySize),
        0, 0, g_baseImage->GetWidth(), g_baseImage->GetHeight(),
        Gdiplus::UnitPixel);

    UpdateAlphaBuffer();
}

// ============================================================================
// Alpha buffer for hit testing
// ============================================================================

static void UpdateAlphaBuffer() {
    if (g_alphaBuffer) { delete[] g_alphaBuffer; g_alphaBuffer = NULL; }
    if (!g_scaledImage) return;

    int w = g_scaledImage->GetWidth();
    int h = g_scaledImage->GetHeight();
    g_alphaBuffer = new BYTE[w * h];

    Gdiplus::BitmapData data;
    Gdiplus::Rect rect(0, 0, w, h);
    if (g_scaledImage->LockBits(&rect, Gdiplus::ImageLockModeRead, PixelFormat32bppARGB, &data) != Gdiplus::Ok) {
        memset(g_alphaBuffer, 255, w * h);
        return;
    }

    BYTE* pixels = (BYTE*)data.Scan0;
    for (int y = 0; y < h; y++) {
        for (int x = 0; x < w; x++) {
            g_alphaBuffer[y * w + x] = pixels[y * data.Stride + x * 4 + 3];
        }
    }
    g_scaledImage->UnlockBits(&data);
}

// ============================================================================
// Rendering — real-time 60fps with sinusoidal bobbing
// ============================================================================

static void RenderFrame() {
    if (!g_overlayHwnd || !g_scaledImage) return;

    // Compute bobbing offset from elapsed time
    LARGE_INTEGER now;
    QueryPerformanceCounter(&now);
    double elapsed = (double)(now.QuadPart - g_animStart.QuadPart) / (double)g_perfFreq.QuadPart;
    double phase = (elapsed / BOB_PERIOD_SEC) * 2.0 * PI;
    int bobOffset = (int)round(BOB_AMPLITUDE * sin(phase));

    // The window is sized with extra vertical room for the bob
    int bufW = g_displaySize;
    int bufH = g_displaySize + (int)(BOB_AMPLITUDE * 2) + 2;

    Gdiplus::Bitmap backBuffer(bufW, bufH, PixelFormat32bppPARGB);
    Gdiplus::Graphics graphics(&backBuffer);
    graphics.Clear(Gdiplus::Color(0, 0, 0, 0));
    graphics.SetCompositingMode(Gdiplus::CompositingModeSourceOver);

    // Draw the pre-scaled image with vertical bobbing offset
    int drawY = (int)BOB_AMPLITUDE + 1 + bobOffset;
    graphics.DrawImage(g_scaledImage, 0, drawY, g_displaySize, g_displaySize);

    // Get HBITMAP
    HBITMAP hBitmap = NULL;
    backBuffer.GetHBITMAP(Gdiplus::Color(0, 0, 0, 0), &hBitmap);
    if (!hBitmap) return;

    HDC hdcScreen = GetDC(NULL);
    HDC hdcMem = CreateCompatibleDC(hdcScreen);
    HBITMAP hOld = (HBITMAP)SelectObject(hdcMem, hBitmap);

    POINT ptSrc = {0, 0};
    SIZE size = {bufW, bufH};

    RECT rc;
    GetWindowRect(g_overlayHwnd, &rc);
    POINT ptDst = {rc.left, rc.top};

    BLENDFUNCTION blend = {};
    blend.BlendOp = AC_SRC_OVER;
    blend.SourceConstantAlpha = 255;
    blend.AlphaFormat = AC_SRC_ALPHA;

    UpdateLayeredWindow(g_overlayHwnd, hdcScreen, &ptDst, &size, hdcMem, &ptSrc, 0, &blend, ULW_ALPHA);

    SelectObject(hdcMem, hOld);
    DeleteDC(hdcMem);
    ReleaseDC(NULL, hdcScreen);
    DeleteObject(hBitmap);
}

// ============================================================================
// Tray icon
// ============================================================================

static void CreateTrayIcon(const std::wstring& iconPath) {
    if (!g_messageHwnd) return;

    memset(&g_nid, 0, sizeof(g_nid));
    g_nid.cbSize = sizeof(NOTIFYICONDATA);
    g_nid.hWnd = g_messageHwnd;
    g_nid.uID = TRAY_ICON_ID;
    g_nid.uFlags = NIF_ICON | NIF_MESSAGE | NIF_TIP | NIF_SHOWTIP;
    g_nid.uCallbackMessage = WM_TRAYICON;
    g_nid.uVersion = NOTIFYICON_VERSION_4;

    HICON hIcon = (HICON)LoadImageW(
        NULL, iconPath.c_str(), IMAGE_ICON,
        GetSystemMetrics(SM_CXSMICON), GetSystemMetrics(SM_CYSMICON),
        LR_LOADFROMFILE
    );

    g_nid.hIcon = hIcon ? hIcon : LoadIcon(NULL, IDI_APPLICATION);
    wcscpy_s(g_nid.szTip, L"ShiroAni Mascot");

    Shell_NotifyIconW(NIM_ADD, &g_nid);
    Shell_NotifyIconW(NIM_SETVERSION, &g_nid);
    g_trayCreated = true;
}

static void CleanupTrayIcon() {
    if (g_trayCreated) {
        Shell_NotifyIconW(NIM_DELETE, &g_nid);
        if (g_nid.hIcon) { DestroyIcon(g_nid.hIcon); g_nid.hIcon = NULL; }
        g_trayCreated = false;
    }
}

// ============================================================================
// Context menus
// ============================================================================

static void ShowOverlayContextMenu(HWND hwnd, POINT pt) {
    HMENU hMenu = CreatePopupMenu();
    if (!hMenu) return;

    AppendMenuW(hMenu, MF_STRING, IDM_OPEN_APP, L"Otworz ShiroAni");
    AppendMenuW(hMenu, MF_SEPARATOR, 0, NULL);
    AppendMenuW(hMenu, MF_STRING, IDM_NAV_SCHEDULE, L"Plan");
    AppendMenuW(hMenu, MF_STRING, IDM_NAV_LIBRARY, L"Biblioteka");
    AppendMenuW(hMenu, MF_SEPARATOR, 0, NULL);
    AppendMenuW(hMenu, MF_STRING | (g_positionLocked ? MF_CHECKED : MF_UNCHECKED),
                IDM_LOCK_POSITION, L"Zablokuj pozycje");
    AppendMenuW(hMenu, MF_SEPARATOR, 0, NULL);
    AppendMenuW(hMenu, MF_STRING, IDM_HIDE_MASCOT, L"Ukryj maskotke");
    AppendMenuW(hMenu, MF_STRING, IDM_OPEN_SETTINGS, L"Ustawienia");
    AppendMenuW(hMenu, MF_SEPARATOR, 0, NULL);
    AppendMenuW(hMenu, MF_STRING, IDM_QUIT_APP, L"Zamknij");

    SetForegroundWindow(hwnd);
    TrackPopupMenu(hMenu, TPM_BOTTOMALIGN | TPM_LEFTALIGN, pt.x, pt.y, 0, hwnd, NULL);
    PostMessage(hwnd, WM_NULL, 0, 0);
    DestroyMenu(hMenu);
}

static void ShowTrayContextMenu(HWND hwnd, POINT pt) {
    HMENU hMenu = CreatePopupMenu();
    if (!hMenu) return;
    AppendMenuW(hMenu, MF_STRING, IDM_OPEN_APP, L"Otworz ShiroAni");
    AppendMenuW(hMenu, MF_STRING, g_visible ? IDM_HIDE_MASCOT : IDM_SHOW_MASCOT,
                g_visible ? L"Ukryj maskotke" : L"Pokaz maskotke");
    AppendMenuW(hMenu, MF_SEPARATOR, 0, NULL);
    AppendMenuW(hMenu, MF_STRING, IDM_QUIT_APP, L"Zamknij");
    SetForegroundWindow(hwnd);
    TrackPopupMenu(hMenu, TPM_BOTTOMALIGN | TPM_LEFTALIGN, pt.x, pt.y, 0, hwnd, NULL);
    PostMessage(hwnd, WM_NULL, 0, 0);
    DestroyMenu(hMenu);
}

// ============================================================================
// Callback to JS via threadsafe function
// ============================================================================

static void CallJsCallback(const std::string& eventName) {
    if (!g_tsfnCreated) return;
    std::string* data = new std::string(eventName);
    g_tsfn.NonBlockingCall(data, [](Napi::Env env, Napi::Function jsCallback, std::string* eventData) {
        if (eventData) {
            jsCallback.Call({Napi::String::New(env, *eventData)});
            delete eventData;
        }
    });
}

// ============================================================================
// Helper: get window dimensions accounting for bob headroom
// ============================================================================

static int GetWindowHeight() {
    return g_displaySize + (int)(BOB_AMPLITUDE * 2) + 2;
}

// ============================================================================
// Overlay window procedure
// ============================================================================

static LRESULT CALLBACK OverlayWndProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam) {
    switch (msg) {
        case WM_TIMER: {
            if (wParam == ANIM_TIMER_ID) {
                RenderFrame();
            }
            return 0;
        }

        case WM_NCHITTEST: {
            if (g_alphaBuffer) {
                POINT pt = {GET_X_LPARAM(lParam), GET_Y_LPARAM(lParam)};
                RECT rc;
                GetWindowRect(hwnd, &rc);
                int localX = pt.x - rc.left;
                // Account for bob headroom in Y
                int localY = pt.y - rc.top - ((int)BOB_AMPLITUDE + 1);

                if (localX >= 0 && localX < g_displaySize &&
                    localY >= 0 && localY < g_displaySize) {
                    BYTE alpha = g_alphaBuffer[localY * g_displaySize + localX];
                    if (alpha >= ALPHA_THRESHOLD) {
                        return HTCLIENT;
                    }
                }
            }
            return HTTRANSPARENT;
        }

        case WM_LBUTTONDOWN: {
            if (g_positionLocked) return 0;
            ReleaseCapture();
            SendMessage(hwnd, WM_NCLBUTTONDOWN, HTCAPTION, 0);
            return 0;
        }

        case WM_RBUTTONUP: {
            // Send cursor position to JS for custom styled context menu
            POINT screenPt;
            GetCursorPos(&screenPt);
            char buf[64];
            snprintf(buf, sizeof(buf), "context-menu:%d:%d", screenPt.x, screenPt.y);
            CallJsCallback(buf);
            return 0;
        }

        case WM_COMMAND: {
            switch (LOWORD(wParam)) {
                case IDM_HIDE_MASCOT:
                    ShowWindow(g_overlayHwnd, SW_HIDE);
                    g_visible = false;
                    CallJsCallback("hide");
                    break;
                case IDM_SHOW_MASCOT:
                    ShowWindow(g_overlayHwnd, SW_SHOWNOACTIVATE);
                    g_visible = true;
                    RenderFrame();
                    CallJsCallback("show");
                    break;
                case IDM_QUIT_APP:
                    CallJsCallback("quit");
                    break;
                case IDM_OPEN_APP:
                    CallJsCallback("open-app");
                    break;
                case IDM_NAV_SCHEDULE:
                    CallJsCallback("navigate:schedule");
                    break;
                case IDM_NAV_LIBRARY:
                    CallJsCallback("navigate:library");
                    break;
                case IDM_LOCK_POSITION:
                    g_positionLocked = !g_positionLocked;
                    CallJsCallback(g_positionLocked ? "lock-position" : "unlock-position");
                    break;
                case IDM_OPEN_SETTINGS:
                    CallJsCallback("navigate:settings");
                    break;
            }
            return 0;
        }

        case WM_CHANGE_ANIM: {
            AnimChangeData* data = reinterpret_cast<AnimChangeData*>(lParam);
            if (data) {
                LoadBaseImage(data->sheetPath);
                RenderFrame();
                delete data;
            }
            return 0;
        }

        case WM_CHANGE_POS: {
            int x = (int)(short)LOWORD(lParam);
            int y = (int)(short)HIWORD(lParam);
            SetWindowPos(g_overlayHwnd, NULL, x, y, 0, 0,
                         SWP_NOSIZE | SWP_NOACTIVATE | SWP_NOZORDER);
            RenderFrame();
            return 0;
        }

        case WM_CHANGE_VIS: {
            bool show = (wParam != 0);
            if (show) {
                ShowWindow(g_overlayHwnd, SW_SHOWNOACTIVATE);
                g_visible = true;
                RenderFrame();
            } else {
                ShowWindow(g_overlayHwnd, SW_HIDE);
                g_visible = false;
            }
            return 0;
        }

        case WM_CHANGE_SIZE: {
            int newSize = (int)wParam;
            if (newSize >= 48 && newSize <= 512) {
                RECT rc;
                GetWindowRect(g_overlayHwnd, &rc);
                int oldH = GetWindowHeight();
                g_displaySize = newSize;
                int newH = GetWindowHeight();
                // Anchor bottom-right
                int newX = rc.right - g_displaySize;
                int newY = rc.bottom - newH;
                RebuildScaledImage();
                SetWindowPos(g_overlayHwnd, NULL, newX, newY,
                             g_displaySize, newH,
                             SWP_NOACTIVATE | SWP_NOZORDER);
                RenderFrame();
            }
            return 0;
        }

        case WM_DESTROY_OVL: {
            KillTimer(g_overlayHwnd, ANIM_TIMER_ID);
            CleanupTrayIcon();
            PostQuitMessage(0);
            return 0;
        }

        case WM_DESTROY:
            return 0;
    }

    return DefWindowProc(hwnd, msg, wParam, lParam);
}

// ============================================================================
// Message-only window procedure (for tray icon)
// ============================================================================

static LRESULT CALLBACK MessageWndProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam) {
    switch (msg) {
        case WM_TRAYICON: {
            switch (LOWORD(lParam)) {
                case NIN_SELECT:
                case NIN_KEYSELECT:
                    if (g_overlayHwnd) {
                        if (g_visible) {
                            ShowWindow(g_overlayHwnd, SW_HIDE);
                            g_visible = false;
                            CallJsCallback("hide");
                        } else {
                            ShowWindow(g_overlayHwnd, SW_SHOWNOACTIVATE);
                            g_visible = true;
                            RenderFrame();
                            CallJsCallback("show");
                        }
                    }
                    break;
                case WM_CONTEXTMENU: {
                    POINT pt;
                    GetCursorPos(&pt);
                    ShowTrayContextMenu(hwnd, pt);
                    break;
                }
            }
            return 0;
        }

        case WM_COMMAND: {
            switch (LOWORD(wParam)) {
                case IDM_HIDE_MASCOT:
                    if (g_overlayHwnd) {
                        ShowWindow(g_overlayHwnd, SW_HIDE);
                        g_visible = false;
                        CallJsCallback("hide");
                    }
                    break;
                case IDM_SHOW_MASCOT:
                    if (g_overlayHwnd) {
                        ShowWindow(g_overlayHwnd, SW_SHOWNOACTIVATE);
                        g_visible = true;
                        RenderFrame();
                        CallJsCallback("show");
                    }
                    break;
                case IDM_QUIT_APP:
                    CallJsCallback("quit");
                    break;
                case IDM_OPEN_APP:
                    CallJsCallback("open-app");
                    break;
            }
            return 0;
        }
    }

    return DefWindowProc(hwnd, msg, wParam, lParam);
}

// ============================================================================
// Overlay thread
// ============================================================================

static DWORD WINAPI OverlayThreadProc(LPVOID param) {
    OverlayInitParams* initParams = reinterpret_cast<OverlayInitParams*>(param);
    initParams->success = false;

    SetProcessDPIAware();

    // Initialize performance counter for smooth animation timing
    QueryPerformanceFrequency(&g_perfFreq);
    QueryPerformanceCounter(&g_animStart);

    // Initialize GDI+
    Gdiplus::GdiplusStartupInput gdiplusStartupInput;
    if (Gdiplus::GdiplusStartup(&g_gdiplusToken, &gdiplusStartupInput, NULL) != Gdiplus::Ok) {
        SetEvent(initParams->initEvent);
        return 1;
    }

    CoInitializeEx(NULL, COINIT_APARTMENTTHREADED);

    // Register window classes
    WNDCLASSEXW wcOverlay = {};
    wcOverlay.cbSize = sizeof(WNDCLASSEXW);
    wcOverlay.lpfnWndProc = OverlayWndProc;
    wcOverlay.hInstance = GetModuleHandle(NULL);
    wcOverlay.lpszClassName = OVERLAY_CLASS_NAME;
    wcOverlay.hCursor = LoadCursor(NULL, IDC_ARROW);
    if (!RegisterClassExW(&wcOverlay) && GetLastError() != ERROR_CLASS_ALREADY_EXISTS) {
        Gdiplus::GdiplusShutdown(g_gdiplusToken); CoUninitialize();
        SetEvent(initParams->initEvent); return 1;
    }

    WNDCLASSEXW wcMsg = {};
    wcMsg.cbSize = sizeof(WNDCLASSEXW);
    wcMsg.lpfnWndProc = MessageWndProc;
    wcMsg.hInstance = GetModuleHandle(NULL);
    wcMsg.lpszClassName = MESSAGE_CLASS_NAME;
    if (!RegisterClassExW(&wcMsg) && GetLastError() != ERROR_CLASS_ALREADY_EXISTS) {
        Gdiplus::GdiplusShutdown(g_gdiplusToken); CoUninitialize();
        SetEvent(initParams->initEvent); return 1;
    }

    // Store display size
    g_displaySize = initParams->frameWidth;

    // Calculate initial position
    int posX = initParams->x;
    int posY = initParams->y;
    int winH = GetWindowHeight();

    if (posX < 0 || posY < 0) {
        RECT workArea;
        SystemParametersInfo(SPI_GETWORKAREA, 0, &workArea, 0);
        posX = workArea.right - g_displaySize - 20;
        posY = workArea.bottom - winH - 10;
    }

    // Create the layered overlay window
    g_overlayHwnd = CreateWindowExW(
        WS_EX_LAYERED | WS_EX_TOPMOST | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE,
        OVERLAY_CLASS_NAME, OVERLAY_TITLE, WS_POPUP,
        posX, posY, g_displaySize, winH,
        NULL, NULL, GetModuleHandle(NULL), NULL
    );

    if (!g_overlayHwnd) {
        Gdiplus::GdiplusShutdown(g_gdiplusToken); CoUninitialize();
        SetEvent(initParams->initEvent); return 1;
    }

    // Create hidden message window for tray icon
    g_messageHwnd = CreateWindowExW(
        0, MESSAGE_CLASS_NAME, L"ShiroAni Tray Message", 0,
        0, 0, 0, 0, HWND_MESSAGE, NULL, GetModuleHandle(NULL), NULL
    );

    // Load the base image (single PNG, not a sprite sheet)
    if (!LoadBaseImage(initParams->spritePath)) {
        DestroyWindow(g_overlayHwnd); g_overlayHwnd = NULL;
        Gdiplus::GdiplusShutdown(g_gdiplusToken); CoUninitialize();
        SetEvent(initParams->initEvent); return 1;
    }

    CreateTrayIcon(initParams->iconPath);

    ShowWindow(g_overlayHwnd, SW_SHOWNOACTIVATE);
    g_visible = true;
    RenderFrame();

    // Start 60fps animation timer
    SetTimer(g_overlayHwnd, ANIM_TIMER_ID, ANIM_INTERVAL_MS, NULL);

    initParams->success = true;
    SetEvent(initParams->initEvent);

    // Message loop
    MSG msg;
    while (GetMessage(&msg, NULL, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }

    // Cleanup
    if (g_baseImage) { delete g_baseImage; g_baseImage = NULL; }
    if (g_scaledImage) { delete g_scaledImage; g_scaledImage = NULL; }
    if (g_alphaBuffer) { delete[] g_alphaBuffer; g_alphaBuffer = NULL; }

    CleanupTrayIcon();

    if (g_overlayHwnd) { DestroyWindow(g_overlayHwnd); g_overlayHwnd = NULL; }
    if (g_messageHwnd) { DestroyWindow(g_messageHwnd); g_messageHwnd = NULL; }

    UnregisterClassW(OVERLAY_CLASS_NAME, GetModuleHandle(NULL));
    UnregisterClassW(MESSAGE_CLASS_NAME, GetModuleHandle(NULL));

    Gdiplus::GdiplusShutdown(g_gdiplusToken);
    g_gdiplusToken = 0;
    CoUninitialize();

    return 0;
}

// ============================================================================
// N-API exports
// ============================================================================

namespace Overlay {

Napi::Value CreateOverlay(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (g_overlayHwnd) {
        Napi::Error::New(env, "Overlay already exists").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    if (info.Length() < 1 || !info[0].IsObject()) {
        Napi::TypeError::New(env, "Expected options object").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    Napi::Object opts = info[0].As<Napi::Object>();

    std::string spritePath = opts.Get("spritePath").As<Napi::String>().Utf8Value();
    std::string iconPath   = opts.Get("iconPath").As<Napi::String>().Utf8Value();
    int x            = opts.Get("x").As<Napi::Number>().Int32Value();
    int y            = opts.Get("y").As<Napi::Number>().Int32Value();
    int frameWidth   = opts.Get("frameWidth").As<Napi::Number>().Int32Value();
    int frameHeight  = opts.Get("frameHeight").As<Napi::Number>().Int32Value();

    OverlayInitParams initParams;
    initParams.spritePath = Utf8ToWide(spritePath);
    initParams.iconPath   = Utf8ToWide(iconPath);
    initParams.x           = x;
    initParams.y           = y;
    initParams.frameWidth  = frameWidth;
    initParams.frameHeight = frameHeight;
    initParams.frameCount  = 1;
    initParams.intervalMs  = ANIM_INTERVAL_MS;
    initParams.initEvent   = CreateEvent(NULL, TRUE, FALSE, NULL);
    initParams.success     = false;

    if (!initParams.initEvent) {
        Napi::Error::New(env, "Failed to create sync event").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    g_overlayThread = CreateThread(NULL, 0, OverlayThreadProc, &initParams, 0, &g_overlayThreadId);

    if (!g_overlayThread) {
        CloseHandle(initParams.initEvent);
        Napi::Error::New(env, "Failed to create overlay thread").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    DWORD waitResult = WaitForSingleObject(initParams.initEvent, 5000);
    CloseHandle(initParams.initEvent);

    if (waitResult != WAIT_OBJECT_0 || !initParams.success) {
        if (g_overlayThread) {
            WaitForSingleObject(g_overlayThread, 1000);
            CloseHandle(g_overlayThread);
            g_overlayThread = NULL; g_overlayThreadId = 0;
        }
        return Napi::Boolean::New(env, false);
    }

    return Napi::Boolean::New(env, true);
}

Napi::Value DestroyOverlay(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (g_overlayHwnd) {
        PostMessage(g_overlayHwnd, WM_DESTROY_OVL, 0, 0);
        if (g_overlayThread) {
            WaitForSingleObject(g_overlayThread, 5000);
            CloseHandle(g_overlayThread);
            g_overlayThread = NULL; g_overlayThreadId = 0;
        }
        g_overlayHwnd = NULL; g_messageHwnd = NULL;
    }

    if (g_tsfnCreated) { g_tsfn.Release(); g_tsfnCreated = false; }

    return env.Undefined();
}

Napi::Value SetPosition(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsNumber()) {
        Napi::TypeError::New(env, "Expected (x: number, y: number)").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    int x = info[0].As<Napi::Number>().Int32Value();
    int y = info[1].As<Napi::Number>().Int32Value();
    if (g_overlayHwnd) PostMessage(g_overlayHwnd, WM_CHANGE_POS, 0, MAKELPARAM(x, y));
    return env.Undefined();
}

Napi::Value SetAnimation(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsObject()) {
        Napi::TypeError::New(env, "Expected options object").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    Napi::Object opts = info[0].As<Napi::Object>();
    std::string sheetPath = opts.Get("sheetPath").As<Napi::String>().Utf8Value();

    AnimChangeData* data = new AnimChangeData();
    data->sheetPath = Utf8ToWide(sheetPath);
    data->frameCount = 1;
    data->frameWidth = g_displaySize;
    data->intervalMs = ANIM_INTERVAL_MS;

    if (g_overlayHwnd) {
        PostMessage(g_overlayHwnd, WM_CHANGE_ANIM, 0, reinterpret_cast<LPARAM>(data));
    } else {
        delete data;
    }
    return env.Undefined();
}

Napi::Value SetVisible(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsBoolean()) {
        Napi::TypeError::New(env, "Expected (visible: boolean)").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    bool visible = info[0].As<Napi::Boolean>().Value();
    if (g_overlayHwnd) PostMessage(g_overlayHwnd, WM_CHANGE_VIS, visible ? 1 : 0, 0);
    return env.Undefined();
}

Napi::Value IsVisible(const Napi::CallbackInfo& info) {
    return Napi::Boolean::New(info.Env(), g_visible);
}

Napi::Value GetPosition(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    Napi::Object result = Napi::Object::New(env);
    if (g_overlayHwnd) {
        RECT rc; GetWindowRect(g_overlayHwnd, &rc);
        result.Set("x", Napi::Number::New(env, rc.left));
        result.Set("y", Napi::Number::New(env, rc.top));
    } else {
        result.Set("x", Napi::Number::New(env, 0));
        result.Set("y", Napi::Number::New(env, 0));
    }
    return result;
}

Napi::Value SetSize(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsNumber()) {
        Napi::TypeError::New(env, "Expected (size: number)").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    int size = info[0].As<Napi::Number>().Int32Value();
    if (g_overlayHwnd) PostMessage(g_overlayHwnd, WM_CHANGE_SIZE, (WPARAM)size, 0);
    return env.Undefined();
}

Napi::Value SetPositionLocked(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsBoolean()) {
        Napi::TypeError::New(env, "Expected (locked: boolean)").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    g_positionLocked = info[0].As<Napi::Boolean>().Value();
    return env.Undefined();
}

Napi::Value SetCallback(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsFunction()) {
        Napi::TypeError::New(env, "Expected (callback: function)").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    if (g_tsfnCreated) { g_tsfn.Release(); g_tsfnCreated = false; }
    g_tsfn = Napi::ThreadSafeFunction::New(env, info[0].As<Napi::Function>(), "OverlayCallback", 0, 1);
    g_tsfnCreated = true;
    return env.Undefined();
}

} // namespace Overlay

// ============================================================================
// Module initialization
// ============================================================================

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("createOverlay",  Napi::Function::New(env, Overlay::CreateOverlay));
    exports.Set("destroyOverlay", Napi::Function::New(env, Overlay::DestroyOverlay));
    exports.Set("setPosition",    Napi::Function::New(env, Overlay::SetPosition));
    exports.Set("setAnimation",   Napi::Function::New(env, Overlay::SetAnimation));
    exports.Set("setVisible",     Napi::Function::New(env, Overlay::SetVisible));
    exports.Set("isVisible",      Napi::Function::New(env, Overlay::IsVisible));
    exports.Set("getPosition",    Napi::Function::New(env, Overlay::GetPosition));
    exports.Set("setSize",        Napi::Function::New(env, Overlay::SetSize));
    exports.Set("setCallback",        Napi::Function::New(env, Overlay::SetCallback));
    exports.Set("setPositionLocked",  Napi::Function::New(env, Overlay::SetPositionLocked));
    return exports;
}

NODE_API_MODULE(desktop_overlay, Init)
