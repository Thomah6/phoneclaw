package com.phoneclaw.app

import android.annotation.SuppressLint
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.IBinder
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView

class ClawOverlayService : Service() {

    private lateinit var windowManager: WindowManager
    private lateinit var floatingView: FrameLayout
    private var isShowing = false

    override fun onBind(intent: Intent?): IBinder? = null

    @SuppressLint("ClickableViewAccessibility")
    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager

        floatingView = FrameLayout(this)
        
        // Beautiful modern pill/bubble design
        val bgDrawable = GradientDrawable(
            GradientDrawable.Orientation.TL_BR,
            intArrayOf(Color.parseColor("#1E293B"), Color.parseColor("#0F172A")) // Slate dark
        )
        bgDrawable.shape = GradientDrawable.OVAL
        bgDrawable.setStroke(3, Color.parseColor("#38BDF8")) // Modern sky blue border
        
        val icon = ImageView(this)
        icon.background = bgDrawable
        // Use a more appropriate native icon or generic mic icon
        icon.setImageResource(android.R.drawable.ic_btn_speak_now)
        icon.setColorFilter(Color.parseColor("#38BDF8")) // Sky blue tint
        icon.setPadding(35, 35, 35, 35)
        
        // Add shadow/glow (Android elevation)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            icon.elevation = 24f
            icon.outlineProvider = android.view.ViewOutlineProvider.BACKGROUND
        }

        floatingView.addView(icon)

        val params = WindowManager.LayoutParams(
            170, 170, // Slightly larger Width, Height for premium feel
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else
                WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        )

        params.gravity = Gravity.CENTER_VERTICAL or Gravity.END
        params.x = 0
        params.y = 100

        windowManager.addView(floatingView, params)
        isShowing = true

        // Dragging and clicking logic
        floatingView.setOnTouchListener(object : View.OnTouchListener {
            private var initialX = 0
            private var initialY = 0
            private var initialTouchX = 0f
            private var initialTouchY = 0f
            private var isClick = false

            override fun onTouch(v: View, event: MotionEvent): Boolean {
                when (event.action) {
                    MotionEvent.ACTION_DOWN -> {
                        initialX = params.x
                        initialY = params.y
                        initialTouchX = event.rawX
                        initialTouchY = event.rawY
                        isClick = true
                        return true
                    }
                    MotionEvent.ACTION_MOVE -> {
                        val diffX = (event.rawX - initialTouchX).toInt()
                        val diffY = (event.rawY - initialTouchY).toInt()
                        
                        if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
                            isClick = false
                        }
                        
                        // Gravity.END -> x logic is inverted
                        params.x = initialX - diffX
                        params.y = initialY + diffY
                        windowManager.updateViewLayout(floatingView, params)
                        return true
                    }
                    MotionEvent.ACTION_UP -> {
                        if (isClick) {
                            // Always bring the UI back to foreground first
                            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
                            launchIntent?.apply {
                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
                                // Only startActivity if intent is valid
                                startActivity(this)
                            }
                            
                            // Send the event directly to RN so it triggers the mic right when the app appears
                            ClawOverlayEventEmitter.sendEvent("onOverlayClicked", null)
                        }
                        return true
                    }
                }
                return false
            }
        })
    }

    override fun onDestroy() {
        super.onDestroy()
        if (isShowing) {
            windowManager.removeView(floatingView)
            isShowing = false
        }
    }
}
