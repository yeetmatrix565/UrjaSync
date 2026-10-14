package com.example.urjasync.dashboard

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat
import java.io.File
import java.io.IOException
import java.util.zip.ZipInputStream

/** Must match CONFIG_CHANGED_EVENT in web/src/lib/telemetry/bridge.ts. */
private const val CONFIG_CHANGED_EVENT = "urja:config-changed"

private const val DASHBOARD_ZIP = "dashboard.zip"
private const val DASHBOARD_DIR = "dashboard"
private const val VERSION_MARKER = "dashboard.version"

/**
 * Hosts the dashboard from the APK's own assets and bridges the two things the
 * page cannot do by itself: read credentials from encrypted storage, and open
 * the settings screen. All telemetry goes straight from the page to ThingSpeak,
 * so the app needs no server and works on any network.
 */
class MainActivity : Activity() {

    private lateinit var webView: WebView
    private lateinit var assetLoader: WebViewAssetLoader
    private lateinit var store: SecureStore

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        WebView.setWebContentsDebuggingEnabled(true)
        store = SecureStore(this)

        // The bundle ships as a zip because aapt2 drops assets whose path segments
        // start with "_" (Next emits _next and _not-found). Unpacking once into
        // internal storage restores the exact tree Next expects.
        val dashboardDir = unpackDashboard()

        // Serving from a virtual https origin means absolute /_next/... paths
        // resolve and localStorage works, neither of which holds on file://.
        assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/", WebViewAssetLoader.InternalStoragePathHandler(this, dashboardDir))
            .build()

        webView = WebView(this).apply {
            setBackgroundColor(Color.parseColor("#05070A"))
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
            )
        }

        with(webView.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            useWideViewPort = true
            loadWithOverviewMode = true
            mediaPlaybackRequiresUserGesture = false
            cacheMode = WebSettings.LOAD_DEFAULT

            // The bundle is served through the asset loader; the page never needs
            // filesystem or file:// access, so it does not get it.
            allowFileAccess = false
            allowContentAccess = false
            @Suppress("DEPRECATION")
            allowFileAccessFromFileURLs = false
            @Suppress("DEPRECATION")
            allowUniversalAccessFromFileURLs = false
        }

        webView.addJavascriptInterface(WebBridge(), BRIDGE_NAME)

        webView.webViewClient = object : WebViewClientCompat() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest,
            ): WebResourceResponse? = assetLoader.shouldInterceptRequest(request.url)

            /**
             * Only our own origin loads in place. Anything else goes to the system
             * browser, which keeps the JS bridge away from third-party content.
             */
            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest,
            ): Boolean {
                val url = request.url
                if (url.host == WebViewAssetLoader.DEFAULT_DOMAIN) return false
                startActivity(Intent(Intent.ACTION_VIEW, url))
                return true
            }
        }

        setContentView(webView)
        webView.loadUrl("$APP_ORIGIN/index.html")
    }

    /**
     * Unpacks the bundled dashboard into internal storage, reusing it across
     * launches. `lastUpdateTime` changes on every install, so an app update
     * naturally invalidates the cache.
     */
    private fun unpackDashboard(): File {
        val target = File(filesDir, DASHBOARD_DIR)
        val marker = File(filesDir, VERSION_MARKER)
        val current = packageManager.getPackageInfo(packageName, 0).lastUpdateTime.toString()

        if (marker.isFile && marker.readText() == current && target.isDirectory) return target

        if (target.exists()) target.deleteRecursively()
        if (!target.mkdirs() && !target.isDirectory) {
            throw IOException("Could not create ${target.absolutePath}")
        }

        assets.open(DASHBOARD_ZIP).use { raw ->
            ZipInputStream(raw).use { zip ->
                var entry = zip.nextEntry
                while (entry != null) {
                    val outFile = File(target, entry.name)
                    // Refuse entries that would escape the target directory.
                    if (!outFile.canonicalPath.startsWith(target.canonicalPath + File.separator)) {
                        throw IOException("Refusing zip entry ${entry.name}")
                    }
                    if (entry.isDirectory) {
                        outFile.mkdirs()
                    } else {
                        outFile.parentFile?.mkdirs()
                        outFile.outputStream().use { zip.copyTo(it) }
                    }
                    zip.closeEntry()
                    entry = zip.nextEntry
                }
            }
        }

        marker.writeText(current)
        return target
    }

    override fun onResume() {
        super.onResume()
        // Covers returning from SettingsActivity: the page re-reads credentials
        // and switches from demo data to the live channel without a restart.
        if (::webView.isInitialized) {
            webView.evaluateJavascript(
                "window.dispatchEvent(new Event('$CONFIG_CHANGED_EVENT'))",
                null,
            )
        }
    }

    @Suppress("OVERRIDE_DEPRECATION")
    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        if (::webView.isInitialized) {
            webView.destroy()
        }
        super.onDestroy()
    }

    /** Exposed to the page as `window.UrjaApp`. */
    inner class WebBridge {

        @JavascriptInterface
        fun getConfig(): String = store.read().toBridgeJson()

        @JavascriptInterface
        fun openSettings() {
            runOnUiThread {
                startActivity(Intent(this@MainActivity, SettingsActivity::class.java))
            }
        }
    }

    private companion object {
        const val BRIDGE_NAME = "UrjaApp"
        val APP_ORIGIN = "https://" + WebViewAssetLoader.DEFAULT_DOMAIN
    }
}
