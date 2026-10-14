# Releasing UrjaSync

One tag produces one release. Push `v1.2.0` and GitHub builds a **signed release
APK** and an **AAB**, then attaches both to a GitHub Release you can install
straight from the phone.

Nothing here is needed for day-to-day work: debug builds stay unsigned and need
no secrets.

## One-time setup

### 1. Create the signing key

This key is the app's identity. Every future update must be signed with the same
one, so keep it somewhere you will not lose.

```bat
keytool -genkeypair -v -keystore urjasync-release.jks -alias urjasync ^
  -keyalg RSA -keysize 2048 -validity 10000
```

`keytool` ships with the JDK, so it is already on your PATH.

When prompted, set a store password. **Use the same password for the key** — the
modern PKCS12 format requires it, and keytool will warn if you make them differ.

### 2. Turn it into a single-line base64 string

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\to\urjasync-release.jks")) > keystore.base64.txt
```

Open `keystore.base64.txt` and copy the whole thing — it is one very long line.

### 3. Add four repository secrets

GitHub → your repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret name | Value |
|---|---|
| `URJA_KEYSTORE_BASE64` | the one-line base64 from step 2 |
| `URJA_KEYSTORE_PASSWORD` | the store password you chose |
| `URJA_KEY_ALIAS` | `urjasync` (the `-alias` from step 1) |
| `URJA_KEY_PASSWORD` | the same password again |

Then delete `keystore.base64.txt` and move the `.jks` out of the project folder.
It is gitignored (`*.jks`, `*.keystore`), but keep it out of the repo regardless.

## Cutting a release

```bat
git tag -a v1.0.0 -m "First release"
git push origin v1.0.0
```

Then watch **Actions → Release**. When it finishes, the Releases page has:

- `app-release.apk` — install this on a phone
- `app-release.aab` — upload this to Play

The tag is the version. `v1.2.3` becomes versionName `1.2.3` and versionCode
`10203` (Android wants a single increasing integer, so the semantic version is
packed into one). Tags must be `v<major>.<minor>.<patch>`; anything else fails
the run immediately rather than shipping a mislabelled build.

## What the workflow actually does

1. Derives the version from the tag and refuses a malformed one.
2. Builds the web dashboard (`typecheck`, `test`, `build`) so the APK bundles a
   dashboard that is known to pass.
3. Installs the Android SDK packages the build compiles against.
4. Decodes the keystore from the secret into `android/release.keystore`.
5. Runs `assembleRelease` and `bundleRelease` with R8 minification and resource
   shrinking on.
6. Deletes the keystore from the runner.
7. **Verifies the APK is actually signed** (`apksigner verify --print-certs`) and
   fails if it is not — so a missing secret can never produce a release.
8. Publishes both artifacts to a GitHub Release.

## Two keep rules the release build depends on

R8 and the resource shrinker are on for release, which makes these load-bearing:

- **`android/app/proguard-rules.pro`** keeps `@JavascriptInterface` methods. The
  page calls the shell's bridge methods *by name*; if R8 renamed them the web app
  would render fine and simply lose access to the stored channel credentials.
- **`android/app/src/main/res/raw/keep.xml`** keeps `res/raw/*`. The intro clip is
  resolved by name at runtime, so the shrinker cannot see the reference and would
  strip it out of the release build.

If a release ever behaves differently from debug, suspect these first.

## Verifying a downloaded APK

```bat
"%LOCALAPPDATA%\Android\Sdk\build-tools\37.0.0\apksigner.bat" verify --print-certs app-release.apk
```

It should print the certificate for your keystore.

## Troubleshooting

| Symptom | Cause |
|---|---|
| `Tag 'x' must look like v1.2.3` | Tag format. Delete and re-tag correctly. |
| `Secret URJA_KEYSTORE_BASE64 is not set` | Secret missing or misnamed. |
| `app-release-unsigned.apk is unsigned` | The signing secrets did not reach the build — wrong alias or password is the usual cause. |
| Build fails installing the SDK | `packages` in the workflow lists an SDK package that no longer exists; check against `sdkmanager --list_installed` locally. |

## Do not lose the keystore

Android identifies an app by its signing key, not its name. Lose the keystore and
you cannot ship an update that existing installs will accept — users have to
uninstall and reinstall, and Play will not let you update the listing. Back it up
somewhere you trust, and never commit it.
