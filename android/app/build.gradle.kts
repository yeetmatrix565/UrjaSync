plugins {
    alias(libs.plugins.android.application)
}

/**
 * Base URL of the Next.js dashboard baked into the APK. Point it at whatever
 * host serves `web/` without editing source:
 *
 *   ./gradlew :app:assembleDebug -PurjaServerUrl=http://192.168.1.50:3000
 */
val urjaServerUrl: String =
    providers.gradleProperty("urjaServerUrl").getOrElse("http://10.193.138.249:3000")

android {
    namespace = "com.example.urjasync.dashboard"

    compileSdk {
        version = release(37)
    }

    defaultConfig {
        applicationId = "com.example.urjasync.dashboard"
        minSdk = 24
        // Deliberately 34: Android 15 forces edge-to-edge for targetSdk 35+, which
        // pushes the WebView under the status bar and zeroes WebView's CSS
        // safe-area env() values. At 34 the window insets itself normally.
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"

        buildConfigField("String", "SERVER_URL", "\"$urjaServerUrl\"")
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
}
