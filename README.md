# Urja Sync

Real-time 3D battery-management dashboard for an ESP32-based smart BMS
("Urja" = energy). It reads a ThingSpeak channel directly and renders it as a
mobile-first, sci-fi "mission control" scene with a glassmorphism UI on top.

Two deployables in one repository:

| Path       | What it is                                                              | Toolchain      |
| ---------- | ----------------------------------------------------------------------- | -------------- |
| `web/`     | The dashboard, built as a **fully static bundle** (no server, no API route) | Node + Next.js |
| `android/` | Standalone Android app that bundles that bundle and reads ThingSpeak itself | Gradle + AGP   |

## Architecture

There is no backend. ThingSpeak answers with `Access-Control-Allow-Origin: *`, so the
dashboard reads the channel straight from the client - which is what lets the app run
on any network with no PC, no server and no tunnel.

```
ESP32 BMS --> ThingSpeak channel
                     ^
                     |  fetch feeds.json  (CORS *)
                     |
   +-----------------+------------------+
   |                                    |
 browser                        android/ WebView
 (static bundle, ConnectPrompt  (bundle in assets + credentials
  until configured)             from the native settings screen)
```

The Android shell hosts the compiled dashboard from its own APK assets through a
`WebViewAssetLoader` virtual origin, and exposes exactly two things to the page over a
JS bridge: the stored credentials, and a way to open the settings screen.

## Credentials & field discovery

Each user brings **their own** channel:

- **Channel ID + read API key** are entered in the app's native settings screen and
  stored encrypted at rest (AES/GCM with a key held in the Android Keystore).
- There is **no `.env` file and no server-side env**: credentials do not come
  from `web/.env.local` (that example file was deleted - the server env module
  it documented no longer exists). In a plain browser there is nowhere to enter
  credentials, so the dashboard shows a ConnectPrompt instead of live data.
- The app reads the channel's own **field labels** (`Pack Voltage (V)`, `Cell 1 (V)`,
  `Temperatura (°C)`, …) and works out which field carries which metric, so it is not
  tied to one firmware's field order. Anything it cannot recognise falls back to the
  reference UrjaSync layout.
- Packs are read as they are: **1 to 8 cells**, and every metric except the timestamp is
  optional. A 2S pack with no temperature, SOC or SOH simply shows fewer panels. When a
  channel publishes every cell but no pack total, the total is summed from the measured
  cells.

## Prerequisites

- **Node** >= 18.17 and npm (for `web/`)
- **JDK 17+** and the **Android SDK** (for `android/`)

## Web

```bash
cd web
npm install
npm run dev        # development server on http://localhost:3000
npm run build      # static export -> web/out
npm run preview    # serve the export on http://localhost:3000
```

`npm run build` writes a static site to `web/out`.

The Android build then zips that directory into a **single** `dashboard.zip` asset, and the
app unpacks it into internal storage on first launch. That indirection exists because
`aapt2` silently drops any asset path segment beginning with `_` - and Next's output is full
of them (`_next/`, `static/chunks/app/_not-found/`). Shipping loose files produced an APK
that loaded `index.html` and then failed to fetch a single JS or CSS file.

With no channel configured the dashboard shows a **ConnectPrompt**, not numbers:
it never invents telemetry. Synthetic data exists only via an explicit
`?scenario=` override (see "Exercise the failure paths"), which sends a fixture
through the exact same detector and parser as live data, so the whole UI
(including alerts) is exercisable with no hardware.

## Android

```bash
cd web && npm run build          # 1. produce the bundle
cd ../android && ./gradlew :app:assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

The Gradle build copies `web/out` into `src/main/assets` (gitignored, generated) and
**fails with instructions** if the export is missing, so an empty app cannot ship quietly.

On first launch the app shows a ConnectPrompt; tap the gear in the header, enter the
channel ID and read key, and it switches to live data immediately.

Open `UrjaSync/android` (not the repo root) in Android Studio.

## Exercise the failure paths

The dashboard forwards a `scenario` query parameter to the demo fixtures.
This is the **only** way to get synthetic data - nothing falls back to demo
on its own, and with no channel and no `scenario` the dashboard shows a
ConnectPrompt.

| URL                    | Behaviour                                                       |
| ---------------------- | --------------------------------------------------------------- |
| `/?scenario=alert`     | 35 °C, cell 1 overvoltage, imbalance -> banner + pulsing cell    |
| `/?scenario=stale`     | newest feed 150 s old -> STALE                                   |
| `/?scenario=empty`     | no feeds -> OFFLINE, every value shows an em dash                |
| `/?scenario=malformed` | nothing readable in any row -> OFFLINE                           |
| `/?scenario=basic`     | a 2S pack with no temperature, SOC or SOH, pack total derived    |

## Quality gates

```bash
cd web
npm run typecheck    # tsc --noEmit
npm run lint         # next lint (eslint-config-next + prettier)
npm test             # vitest - detector, parser, rules, fixtures
npm run format       # prettier --write .
```

CI runs the same for `web`, then builds the web export before assembling the APK.

## Layout

```
web/
  src/app/                    dashboard (/) + detail routes: voltage, current,
                              power, energy, temperature, health, pack,
                              insights; layout (TelemetryProvider), error,
                              loading, not-found
  src/components/dashboard/   glassmorphism widgets (stat cards, cells, graphs,
                              feed, ConnectPrompt, SettingsButton, SummaryBar, …)
  src/components/providers/   TelemetryProvider (one poll for the whole app)
  src/components/three/      R3F canvas wrapper + scene/ (Pack, CellLabel)
  src/components/ui/          shared UI (MetricCard/FormulaCard, charts, badges)
  src/hooks/                  useTelemetry (polling), useTelemetryLerp
                              (smoothing), useNow, useReducedMotion
  src/lib/telemetry/          types, constants, schema, rules, parse, detect,
                              client, bridge, derive, values, mock (+ tests)
  src/lib/electrical/         energy, stats, numeric, formulas (+ tests)
  src/lib/three/              pure three.js builders (materials, particles)
android/
  app/src/main/java/com/example/urjasync/dashboard/
                              MainActivity (asset loader + JS bridge),
                              SplashActivity, SettingsActivity,
                              SecureStore (Keystore)
  app/src/main/res/layout/    activity_splash.xml, activity_settings.xml
```

## Design notes

- **Why `web/` and `android/` rather than a shared root?** The Next.js App Router
  resolves `./app` before `./src/app`, so a Gradle module directory named `app`
  silently shadowed the dashboard. Splitting the toolchains removes that collision and
  stops Android Studio indexing `node_modules`.
- **No server means no `next start`.** The dashboard is a static export; `npm run preview`
  serves it locally.
- **`targetSdk 34` is deliberate.** Android 15 forces edge-to-edge for targets 35+,
  which pushes the WebView under the status bar and zeroes WebView's CSS safe-area
  `env()` values.
- **No CSP.** There is no server to set headers any more - a static host or CDN owns
  that, and Next's inline styles make a guessed policy worse than none.

## Known limitations

- The **browser build has no way to enter credentials**: they live in the
  native settings screen, so real data is only read by the app. In a browser,
  use `?scenario=` (above) to exercise the UI with fixtures.
- A detected mapping cannot yet be **overridden** from the UI. Detection is heuristic;
  if it guesses wrong for an unusual sketch, the app falls back to the reference layout
  rather than letting the user correct it in place.
- Temperature is interpreted in the unit the label declares (`(C)`, `(F)`); a channel
  that publishes neither is treated as Celsius.
