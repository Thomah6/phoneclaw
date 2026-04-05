package com.phoneclaw.app

import android.content.Intent
import android.net.Uri
import android.provider.Settings
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

object ClawOverlayEventEmitter {
    var reactContext: ReactApplicationContext? = null

    fun sendEvent(eventName: String, params: WritableMap?) {
        reactContext?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit(eventName, params)
    }
}

class ClawOverlayModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    init {
        ClawOverlayEventEmitter.reactContext = reactContext
    }

    override fun getName(): String = "ClawOverlayModule"

    @ReactMethod
    fun requestOverlayPermission(promise: Promise) {
        if (!Settings.canDrawOverlays(reactContext)) {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + reactContext.packageName)
            )
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactContext.startActivity(intent)
            promise.resolve(false)
        } else {
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun hasPermission(promise: Promise) {
        promise.resolve(Settings.canDrawOverlays(reactContext))
    }

    @ReactMethod
    fun showBubble(promise: Promise) {
        if (!Settings.canDrawOverlays(reactContext)) {
            promise.resolve(false)
            return
        }
        val intent = Intent(reactContext, ClawOverlayService::class.java)
        reactContext.startService(intent)
        promise.resolve(true)
    }

    @ReactMethod
    fun hideBubble(promise: Promise) {
        val intent = Intent(reactContext, ClawOverlayService::class.java)
        reactContext.stopService(intent)
        promise.resolve(true)
    }
    
    @ReactMethod
    fun addListener(eventName: String) { }

    @ReactMethod
    fun removeListeners(count: Int) { }
}
