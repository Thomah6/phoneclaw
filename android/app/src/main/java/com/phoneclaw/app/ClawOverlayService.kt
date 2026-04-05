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
        
        // Beautiful glowing circle for the unicorn bubble
        val bgDrawable = GradientDrawable()
        bgDrawable.shape = GradientDrawable.OVAL
        bgDrawable.setColor(Color.parseColor("#05060F")) // Deep bg
        bgDrawable.setStroke(4, Color.parseColor("#00E5FF")) // Electric Cyan border

        val icon = ImageView(this)
        icon.background = bgDrawable
        icon.setImageResource(android.R.drawable.ic_btn_speak_now)
        icon.setColorFilter(Color.parseColor("#00E5FF"))
        icon.setPadding(30, 30, 30, 30)
        
        // Add shadow/glow (Android elevation)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            icon.elevation = 20f
        }

        floatingView.addView(icon)

        val params = WindowManager.LayoutParams(
            160, 160, // Width, Height
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
