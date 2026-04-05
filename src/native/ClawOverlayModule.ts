/**
 * ClawOverlayModule — Floating Bubble Bridge (scaffold)
 *
 * TypeScript interface for the floating bubble overlay service.
 * The actual native implementation requires a Kotlin service:
 *
 * TODO: Implement in Kotlin (android/app/src/main/java/.../ClawOverlayService.kt):
 *   - Foreground service with SYSTEM_ALERT_WINDOW permission
 *   - WindowManager.addView() for the floating bubble (56x56dp)
 *   - Drag support (snaps to nearest edge)
 *   - Tap → opens chat panel (70% screen height)
 *   - Chat panel with text input + mic + live agent feed
 *
 * Required AndroidManifest.xml permission:
 *   <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
 *
 * Required Expo config plugin to inject the service declaration.
 */

import { NativeModules, Platform } from 'react-native';

const { ClawOverlayModule: NativeOverlayModule } = NativeModules;

interface OverlayInterface {
    /** Show the floating bubble overlay */
    showBubble(): Promise<boolean>;
    /** Hide the floating bubble overlay */
    hideBubble(): Promise<boolean>;
    /** Request SYSTEM_ALERT_WINDOW permission from the user */
    requestOverlayPermission(): Promise<boolean>;
    /** Check if overlay permission is granted */
    hasPermission(): Promise<boolean>;
}

function androidOnly<T>(fallback: T, fn: () => Promise<T>): Promise<T> {
    if (Platform.OS !== 'android') return Promise.resolve(fallback);
    if (!NativeOverlayModule) {
        console.warn('[ClawOverlayModule] Native module not available — Kotlin service not yet implemented.');
        return Promise.resolve(fallback);
    }
    return fn().catch((e) => {
        console.error('[ClawOverlayModule]', e);
        return fallback;
    });
}

const ClawOverlayModule: OverlayInterface = {
    showBubble: () => androidOnly(false, () => NativeOverlayModule.showBubble()),
    hideBubble: () => androidOnly(false, () => NativeOverlayModule.hideBubble()),
    requestOverlayPermission: () => androidOnly(false, () => NativeOverlayModule.requestOverlayPermission()),
    hasPermission: () => androidOnly(false, () => NativeOverlayModule.hasPermission()),
};

export default ClawOverlayModule;
