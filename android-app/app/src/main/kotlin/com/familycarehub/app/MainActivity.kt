package com.familycarehub.app

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.ViewGroup
import android.webkit.*
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.viewinterop.AndroidView

class MainActivity : ComponentActivity() {

    private var webView: WebView? = null

    // Default connection target: local dev emulator IP (10.0.2.2:3000) or production URL
    private val appUrl = "http://10.0.2.2:3000"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // Handle native back navigation
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView?.canGoBack() == true) {
                    webView?.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })

        setContent {
            Surface(
                modifier = Modifier.fillMaxSize(),
                color = Color(0xFFF7FAF9) // Morning Mist Canvas
            ) {
                CareHubWebView(
                    url = appUrl,
                    onWebViewCreated = { wv -> webView = wv }
                )
            }
        }
    }

    @Composable
    fun CareHubWebView(url: String, onWebViewCreated: (WebView) -> Unit) {
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { context ->
                WebView(context).apply {
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )

                    settings.apply {
                        javaScriptEnabled = true
                        domStorageEnabled = true
                        databaseEnabled = true
                        useWideViewPort = true
                        loadWithOverviewMode = true
                        setSupportZoom(false)
                        cacheMode = WebSettings.LOAD_DEFAULT
                        mediaPlaybackRequiresUserGesture = false
                    }

                    webViewClient = object : WebViewClient() {
                        override fun shouldOverrideUrlLoading(
                            view: WebView?,
                            request: WebResourceRequest?
                        ): Boolean {
                            val targetUri = request?.url ?: return false
                            val urlString = targetUri.toString()

                            // 1. Direct Emergency Call Handler (tel:)
                            if (urlString.startsWith("tel:")) {
                                val dialIntent = Intent(Intent.ACTION_DIAL, targetUri)
                                context.startActivity(dialIntent)
                                return true
                            }

                            // 2. Email Handler (mailto:)
                            if (urlString.startsWith("mailto:")) {
                                val mailIntent = Intent(Intent.ACTION_SENDTO, targetUri)
                                context.startActivity(mailIntent)
                                return true
                            }

                            // 3. Google Maps / Navigation links
                            if (urlString.contains("google.com/maps") || urlString.contains("maps.google.com")) {
                                val mapIntent = Intent(Intent.ACTION_VIEW, targetUri)
                                context.startActivity(mapIntent)
                                return true
                            }

                            return false
                        }
                    }

                    webChromeClient = object : WebChromeClient() {
                        // Provides client-side logging and upload capabilities
                    }

                    loadUrl(url)
                    onWebViewCreated(this)
                }
            }
        )
    }

    override fun onDestroy() {
        webView?.destroy()
        webView = null
        super.onDestroy()
    }
}
