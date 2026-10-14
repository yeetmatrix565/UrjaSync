INTRO VIDEO - DROP THE FILE HERE
================================

Put your launch clip in THIS folder (app/src/main/res/raw/) named:

    intro.mp4

That is all the app needs. It is picked up automatically on the next build.

ON THE FILE ITSELF
------------------
* Format   : MP4 container, H.264 video (this is what Android's player
             guarantees on every device the app supports).
* Audio    : AAC, if you want any - but note the clip currently plays MUTED.
             To give it sound, open SplashActivity.kt and set
             MUTE_INTRO = false.
* Size     : keep it under ~5 MB. Anything shipped in res/ is stored inside the
             APK, so a large clip makes the download bigger and slows install.
* Length   : 3-8 seconds works best. There is a `skip` button and tapping the
             video also skips it, so a longer clip is not fatal - just annoying.

RULES FOR THE NAME
------------------
Android resource names must be lowercase, and may only contain a-z, 0-9 and _.
So `intro.mp4` is fine; `Intro Video.MP4` or `intro-v2.mp4` will BREAK THE BUILD.
Rename the file before copying it in, not after.

WHY THE NAME MATTERS
--------------------
SplashActivity looks the file up by name at runtime, which means the app builds
and runs perfectly well with this folder empty - you just go straight to the
dashboard. Nothing is hardcoded to require the file.

Also accepted, in priority order: intro_video.mp4, splash_intro.mp4
(intro.mp4 wins if several are present).

This readme is only here so the folder exists in git and you can find it. It is
safe to delete once your clip is in place.
