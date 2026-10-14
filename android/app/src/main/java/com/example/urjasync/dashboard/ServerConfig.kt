package com.example.urjasync.dashboard

/**
 * Where the shell looks for the dashboard, in priority order:
 *
 *  1. [SERVER_URL] - baked in at build time from the `urjaServerUrl` Gradle
 *     property, defaulting to the dev machine's LAN address.
 *  2. [ADB_REVERSE_URL] - works over USB once the host runs
 *     `adb reverse tcp:8080 tcp:3000`, with no Wi-Fi routing involved.
 */
object ServerConfig {

    const val ADB_REVERSE_URL: String = "http://localhost:8080"

    val candidates: List<String> =
        listOf(BuildConfig.SERVER_URL, ADB_REVERSE_URL).distinct()
}
