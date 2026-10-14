plugins {
    alias(libs.plugins.android.application)
}

/**
 * Bundles the web/ static export as a SINGLE zip asset.
 *
 * It is deliberately not copied as loose files: aapt2 silently drops any asset
 * path segment beginning with "_", and Next's output contains several (`_next`,
 * `static/chunks/app/_not-found/...`). Zipping sidesteps that rule entirely, and
 * the app unpacks it into internal storage at first launch.
 */
val syncDashboardAssets by tasks.registering(Zip::class) {
    // Locals, so the action captures Files rather than this build script -
    // Gradle's configuration cache cannot serialise script object references.
    val exportDir = rootProject.file("../web/out")
    val assetsDir = file("src/main/assets")

    description = "Zips the web/ static export into a single APK asset."
    group = "build"

    from(exportDir)
    destinationDirectory.set(assetsDir)
    archiveFileName.set("dashboard.zip")

    doFirst {
        val index = exportDir.resolve("index.html")
        if (!index.exists()) {
            throw GradleException(
                "Dashboard bundle missing: expected $index.\n" +
                    "Run `npm run build` in ../web before building the app.",
            )
        }
        // Drop anything an earlier layout left behind, so the APK can never carry
        // both a stale loose copy and the zip.
        assetsDir.listFiles()?.forEach { it.deleteRecursively() }
    }
}

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
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
}

// The asset must exist before the asset merger runs.
tasks.named("preBuild") {
    dependsOn(syncDashboardAssets)
}

dependencies {
    // WebViewAssetLoader: serves the unpacked dashboard from a virtual https origin.
    implementation(libs.androidx.webkit)
}
