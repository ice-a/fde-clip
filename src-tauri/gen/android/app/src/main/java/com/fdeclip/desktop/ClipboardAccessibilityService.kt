package com.fdeclip.desktop

import android.accessibilityservice.AccessibilityService
import android.content.ClipboardManager
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import java.io.File

/**
 * Optional background clipboard relay for Android.
 *
 * Android 10+ blocks background apps from reading the clipboard. The user must
 * explicitly enable this service in system accessibility settings. When
 * enabled, it stores the latest clipboard text in the app data directory;
 * the Rust watcher polls that file and emits the normal clipboard event.
 */
class ClipboardAccessibilityService : AccessibilityService() {
    private var clipboard: ClipboardManager? = null
    private val handler = Handler(Looper.getMainLooper())
    private val heartbeat = object : Runnable {
        override fun run() {
            writeStatus(true)
            handler.postDelayed(this, 30_000)
        }
    }

    override fun onCreate() {
        super.onCreate()
        clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        clipboard?.addPrimaryClipChangedListener {
            val text = clipboard?.primaryClip?.getItemAt(0)?.text?.toString().orEmpty()
            if (text.isNotEmpty()) writeClipboard(text)
        }
        handler.post(heartbeat)
        Log.i(TAG, "clipboard accessibility service started")
    }

    override fun onDestroy() {
        handler.removeCallbacks(heartbeat)
        writeStatus(false)
        super.onDestroy()
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) = Unit

    override fun onInterrupt() = Unit

    private fun dataDirs(): List<File> =
        listOfNotNull(getExternalFilesDir(null), filesDir).distinctBy { it.absolutePath }

    private fun writeClipboard(text: String) {
        val encoded = Base64.encodeToString(text.toByteArray(Charsets.UTF_8), Base64.NO_WRAP)
        val payload = "$encoded\n${System.currentTimeMillis() / 1000}"
        for (dir in dataDirs()) {
            File(dir, "clipboard_latest.txt").writeText(payload)
        }
    }

    private fun writeStatus(enabled: Boolean) {
        val payload = "${if (enabled) 1 else 0}\n${System.currentTimeMillis() / 1000}"
        for (dir in dataDirs()) {
            File(dir, "accessibility_status.txt").writeText(payload)
        }
    }

    private companion object {
        const val TAG = "fde-clip-a11y"
    }
}
