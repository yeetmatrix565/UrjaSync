# R8 rules for the release build. Minification is on for release, so anything
# reached reflectively or by name has to be declared here or it silently stops
# working in the shipped APK.

# The dashboard talks to the shell through a WebView JS bridge: JavaScript calls
# these methods BY NAME on the object registered as "UrjaApp" (see MainActivity's
# addJavascriptInterface). If R8 renames them the page still loads, still renders,
# and simply loses the ability to read the stored channel credentials - a failure
# that looks like a configuration bug rather than a build bug.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
