# Urja Sync

Real-time 3D battery-management dashboard for an ESP32-based smart BMS
("Urja" = energy). Live telemetry is read from ThingSpeak and rendered as a
mobile-first, sci-fi "mission control" scene with a glassmorphism UI on top.

This is a polyglot monorepo with two independent deployables:

| Path       | What it is                                                          | Toolchain      |
| ---------- | ------------------------------------------------------------------- | -------------- |
| `web/`     | The dashboard (Next.js App Router) plus the ThingSpeak proxy route   | Node + Next.js |
| `android/` | Optional Android shell that renders the dashboard in a WebView       | Gradle + AGP   |

## Architecture

```
ESP32 BMS --> ThingSpeak channel --> web/ API route
                                      | zod validation + derived metrics
                                      v
                                GET /api/telemetry
                                      |
                 +--------------------+--------------------+
                 v                                         v
        browser (mobile-first)                  android/ WebView shell
        3D "The Pack" + 2D panels               (same URL, no duplicated UI)
```

The ThingSpeak read key never reaches a client: `web/src/app/api/telemetry/route.ts`
is the only code that talks upstream. The Android app is deliberately a thin shell
around the same web app, so there is exactly one implementation of the UI.

## Prerequisites

- **Node** >= 18.17 (developed on 24.x) and npm
- **JDK 17+** and the **Android SDK** - only for the Android shell

## Quick start (web)

```bash
cd web
npm install
npm run dev            # http://localhost:3000
```

With no configuration the dashboard runs in **demo mode**: the API route serves
synthetic telemetry that passes through the exact same validation pipeline as live
data, so the whole UI (including alerts) is exercisable offline.

## Live data

Copy `web/.env.local.example` to `web/.env.local` and fill it in:

```dotenv
THINGSPEAK_CHANNEL_ID=your_channel_id
THINGSPEAK_READ_API_KEY=your_read_key
```

Field contract from the firmware:

| Field       | Meaning                                     |
| ----------- | ------------------------------------------- |
| `field1`    | pack voltage (V)                            |
| `field2..4` | cell 1..3 voltage (V)                       |
| `field5`    | temperature (C)                             |
| `field6`    | current (A, positive = discharging)         |
| `field7`    | SOC (%)                                     |
| `field8`    | SOH (%)                                     |

Derived server-side: `powerW`, `imbalanceV`, `status` (LIVE/STALE/OFFLINE) and `alerts[]`.

## Exercise the failure paths

The route accepts a `scenario` query parameter and the dashboard forwards it from its
own URL, so every state is reachable straight from a browser:

| URL                  | Behaviour                                                        |
| -------------------- | ---------------------------------------------------------------- |
| `/`                  | normal, live                                                     |
| `/?scenario=alert`   | 35 C, cell 1 overvoltage, imbalance -> banner + pulsing cell      |
| `/?scenario=stale`   | newest feed 150 s old -> STALE                                    |
| `/?scenario=empty`   | no feeds -> OFFLINE, every value shows an em dash                 |
| `/?scenario=malformed` | nulls / non-numeric strings -> zod rejects everything           |

## Android shell

```bash
cd android
./gradlew :app:assembleDebug                 # -> app/build/outputs/apk/debug/app-debug.apk
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

The shell needs the web app reachable. Use Wi-Fi, or tunnel over USB:

```bash
adb reverse tcp:8080 tcp:3000                # shell falls back to http://localhost:8080
```

Point the build at a different host without editing source:

```bash
./gradlew :app:assembleDebug -PurjaServerUrl=http://192.168.1.50:3000
```

Open `UrjaSync/android` (not the repo root) in Android Studio.

## Quality gates

```bash
cd web
npm run typecheck    # tsc --noEmit
npm run lint         # next lint (eslint-config-next + prettier)
npm test             # vitest - telemetry pipeline unit tests
npm run build        # production build
npm run format       # prettier --write .
```

`npm start` self-heals: a `prestart` hook builds first when `.next` holds no
production build (running `next dev` removes it).

## Layout

```
web/
  src/app/                    routes: dashboard, error/loading/not-found, api/telemetry
  src/components/dashboard/   glassmorphism widgets (stat cards, cells, graphs, feed)
  src/components/three/       R3F canvas wrapper + scene/ (Pack, CellLabel)
  src/hooks/                  polling, smoothing, clock, reduced-motion
  src/lib/telemetry/          types, constants, zod schema, rules, parser, demo data + tests
  src/lib/three/              pure three.js builders (materials, particles)
android/
  app/src/main/java/com/example/urjasync/dashboard/   MainActivity + ServerConfig
```

## Design notes

- **Why `web/` and `android/` rather than a shared root?** The Next.js App Router
  resolves `./app` before `./src/app`, so a Gradle module directory named `app`
  silently shadowed the dashboard. Splitting the toolchains removes that collision
  and stops Android Studio indexing `node_modules`.
- **`targetSdk 34` is deliberate.** Android 15 forces edge-to-edge for targets 35+,
  which pushes the WebView under the status bar and zeroes WebView's CSS
  safe-area `env()` values.
- **No CSP** in `next.config.mjs`: Next injects inline styles and the 3D scene uses
  blob URLs, so a guessed policy would silently break the app. The other hardening
  headers are applied.
