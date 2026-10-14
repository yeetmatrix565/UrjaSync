package com.example.urjasync.dashboard

import android.app.Activity
import android.content.Intent
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.WindowInsets
import android.widget.TextView
import android.widget.VideoView

/**
 * Plays the bundled intro clip, then hands over to the dashboard.
 *
 * The clip is resolved by name at runtime rather than referenced as `R.raw.*`,
 * so the app builds and runs whether or not one has been supplied. With no file
 * present this activity immediately forwards to [MainActivity] - exactly how the
 * app behaved before the intro existed.
 *
 * Drop the clip at `app/src/main/res/raw/intro.mp4`; the readme beside it covers
 * the naming rules and encoding.
 */
class SplashActivity : Activity() {

    private var advanced = false
    private val handler = Handler(Looper.getMainLooper())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val videoRes = findIntro()
        if (videoRes == 0) {
            openDashboard()
            return
        }

        setContentView(R.layout.activity_splash)
        goFullscreen()

        // Guards against a clip that never finishes preparing. Replaced with a
        // duration-based deadline once the player reports what it is holding.
        handler.postDelayed({ openDashboard() }, PREPARE_TIMEOUT_MS)

        // Tapping the clip skips it, the same as the button.
        findViewById<TextView>(R.id.intro_skip).setOnClickListener { openDashboard() }

        val video = findViewById<VideoView>(R.id.intro_video)
        video.setOnClickListener { openDashboard() }
        video.setVideoURI(Uri.parse("android.resource://$packageName/$videoRes"))

        video.setOnPreparedListener { player ->
            player.isLooping = false
            if (MUTE_INTRO) player.setVolume(0f, 0f)
            // Fill the display without distorting the clip's aspect ratio.
            player.setVideoScalingMode(MediaPlayer.VIDEO_SCALING_MODE_SCALE_TO_FIT_WITH_CROPPING)

            // MediaPlayer reports the duration as an Int; widen it so the
            // deadline arithmetic stays in Long throughout.
            val clipLength: Long =
                if (player.duration > 0) player.duration.toLong() else FALLBACK_DURATION_MS
            handler.removeCallbacksAndMessages(null)
            handler.postDelayed({ openDashboard() }, clipLength + COMPLETION_GRACE_MS)

            video.start()
        }

        video.setOnCompletionListener { openDashboard() }

        video.setOnErrorListener { _, _, _ ->
            // Corrupt or unsupported codec: get out of the way rather than
            // stranding the user on a black screen.
            openDashboard()
            true
        }
    }

    /** The intro is looked up by name, so a missing file is not a build failure. */
    private fun findIntro(): Int =
        INTRO_NAMES.firstNotNullOfOrNull { name ->
            resources.getIdentifier(name, "raw", packageName).takeIf { it != 0 }
        } ?: 0

    private fun goFullscreen() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            @Suppress("DEPRECATION")
            window.setDecorFitsSystemWindows(false)
            window.insetsController?.hide(WindowInsets.Type.systemBars())
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility =
                View.SYSTEM_UI_FLAG_FULLSCREEN or
                    View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        }
    }

    private fun openDashboard() {
        if (advanced) return
        advanced = true
        startActivity(Intent(this, MainActivity::class.java))
        finish()
    }

    /** Back skips the clip rather than exiting the app. */
    @Suppress("OVERRIDE_DEPRECATION")
    override fun onBackPressed() {
        openDashboard()
    }

    /** Leaving mid-clip must not leave the intro waiting to resume. */
    override fun onStop() {
        super.onStop()
        openDashboard()
    }

    override fun onDestroy() {
        handler.removeCallbacksAndMessages(null)
        super.onDestroy()
    }

    private companion object {
        /** Accepted names in res/raw, in priority order. */
        val INTRO_NAMES = listOf("intro", "intro_video", "splash_intro")

        /** A launch clip with sound is startling; flip this to give it audio. */
        const val MUTE_INTRO = true

        const val PREPARE_TIMEOUT_MS = 8_000L
        const val COMPLETION_GRACE_MS = 400L
        const val FALLBACK_DURATION_MS = 15_000L
    }
}
