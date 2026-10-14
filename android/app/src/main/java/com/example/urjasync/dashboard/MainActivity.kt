package com.example.urjasync.dashboard

import android.annotation.SuppressLint
import android.app.Activity
import android.graphics.Color
import android.os.Bundle
import android.view.ViewGroup
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient

/**
 * Thin shell that renders the Urja Sync dashboard served by the Next.js app in
 * `web/` (its API route is what talks to ThingSpeak). If the dashboard cannot
 * be reached the shell shows a self-contained page explaining how to start it,
 * so the app never appears broken or blank.
 */
class MainActivity : Activity() {

    private lateinit var webView: WebView
    private var attempt = 0
    private var showingError = false

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Lets chrome://inspect attach to this WebView while debugging.
        WebView.setWebContentsDebuggingEnabled(true)

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
        }

        webView.webViewClient = object : WebViewClient() {
            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: WebResourceError,
            ) {
                if (request.isForMainFrame && !showingError) {
                    attempt++
                    loadNext()
                }
            }

            @Suppress("OVERRIDE_DEPRECATION")
            override fun onReceivedError(
                view: WebView,
                errorCode: Int,
                description: String?,
                failingUrl: String?,
            ) {
                if (!showingError) {
                    attempt++
                    loadNext()
                }
            }
        }

        setContentView(webView)
        loadNext()
    }

    /** Tries each configured URL in turn, then falls back to the help page. */
    private fun loadNext() {
        val url = ServerConfig.candidates.getOrNull(attempt)
        if (url != null) {
            showingError = false
            webView.loadUrl(url)
        } else {
            showingError = true
            webView.loadDataWithBaseURL(null, errorPageHtml(), "text/html", "utf-8", null)
        }
    }

    override fun onResume() {
        super.onResume()
        if (::webView.isInitialized && showingError) {
            attempt = 0
            loadNext()
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

    private fun errorPageHtml(): String {
        val tried = ServerConfig.candidates.joinToString("</code> and <code>")
        return """
            <!doctype html>
            <html><head>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              html,body{height:100%;margin:0;background:#05070a;color:#e6edf3;
                font-family:Roboto,system-ui,sans-serif;
                display:flex;align-items:center;justify-content:center}
              .wrap{max-width:20rem;padding:2rem;text-align:center}
              h1{font-size:.95rem;letter-spacing:.22em;text-transform:uppercase;
                color:#22d3ee;margin:0 0 1.25rem}
              p{font-size:.8rem;line-height:1.7;color:#93a1b0;margin:0 0 .8rem}
              code{font-family:monospace;color:#e6edf3}
            </style></head>
            <body><div class="wrap">
              <h1>Urja Sync</h1>
              <p>Can't reach the telemetry server.</p>
              <p>Tried <code>$tried</code>.</p>
              <p>Start it with <code>npm start</code> inside <code>web/</code> on the dev
                 machine and keep this phone on the same Wi-Fi, or run
                 <code>adb reverse tcp:8080 tcp:3000</code>.
                 Reopening the app retries.</p>
            </div></body></html>
        """.trimIndent()
    }
}
