plugins {
    alias(libs.plugins.android.application)
}

/**
 * Version stamped into a release. CI derives these from the git tag, e.g.
 *   ./gradlew assembleRelease -PappVersionName=1.2.0 -PappVersionCode=10200
 * The defaults leave ordinary local builds untouched.
 */
val appVersionName = (findProperty("appVersionName") as String?) ?: "1.0"
val appVersionCode = (findProperty("appVersionCode") as String?)?.toIntOrNull() ?: 1

/**
 * The release keystore, supplied by CI through the environment. Null locally,
 * which is what keeps signing optional rather than mandatory.
 */
val releaseKeystorePath = System.getenv("URJA_KEYSTORE_PATH")?.takeIf { it.isNotBlank() }

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
        versionCode = appVersionCode
        versionName = appVersionName
    }

    signingConfigs {
        // Created only when the keystore is present, so no local build depends on
        // a secret existing.
        if (releaseKeystorePath != null) {
            create("release") {
                storeFile = file(releaseKeystorePath)
                storePassword = System.getenv("URJA_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("URJA_KEY_ALIAS")
                keyPassword = System.getenv("URJA_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            // Both are on, so the keep rules in proguard-rules.pro and
            // res/raw/keep.xml are load-bearing - see the comments in each.
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )

            // Left deliberately unsigned (app-release-unsigned.apk) when no
            // keystore is configured, rather than quietly signed with the debug
            // key - an unsigned artifact can't be mistaken for a publishable one.
            if (releaseKeystorePath != null) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
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
