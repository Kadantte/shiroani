#ifndef DESKTOP_OVERLAY_H
#define DESKTOP_OVERLAY_H

#include <napi.h>
#include <Windows.h>

namespace Overlay {

// Create the overlay window with animated sprite and tray icon.
// Args: { spritePath: string, iconPath: string, x: number, y: number,
//         frameWidth: number, frameHeight: number, frameCount: number, intervalMs: number }
// Returns: boolean (success)
Napi::Value CreateOverlay(const Napi::CallbackInfo& info);

// Destroy the overlay window and clean up all resources.
// Returns: void
Napi::Value DestroyOverlay(const Napi::CallbackInfo& info);

// Move the overlay to a new position.
// Args: (x: number, y: number)
// Returns: void
Napi::Value SetPosition(const Napi::CallbackInfo& info);

// Switch the animation sprite sheet.
// Args: { sheetPath: string, frameCount: number, frameWidth: number, intervalMs: number }
// Returns: void
Napi::Value SetAnimation(const Napi::CallbackInfo& info);

// Show or hide the overlay window.
// Args: (visible: boolean)
// Returns: void
Napi::Value SetVisible(const Napi::CallbackInfo& info);

// Check if the overlay is currently visible.
// Returns: boolean
Napi::Value IsVisible(const Napi::CallbackInfo& info);

// Get the current position of the overlay.
// Returns: { x: number, y: number }
Napi::Value GetPosition(const Napi::CallbackInfo& info);

// Resize the overlay window.
// Args: (size: number) — width and height in pixels (48-512)
// Returns: void
Napi::Value SetSize(const Napi::CallbackInfo& info);

// Set a callback function for overlay events (menu clicks, etc.).
// Args: (callback: function)
// Returns: void
Napi::Value SetCallback(const Napi::CallbackInfo& info);

// Set whether the mascot position is locked (prevents drag).
// Args: (locked: boolean)
// Returns: void
Napi::Value SetPositionLocked(const Napi::CallbackInfo& info);

} // namespace Overlay

#endif // DESKTOP_OVERLAY_H
