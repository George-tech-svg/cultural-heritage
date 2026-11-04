# Luo Heritage visual redesign - 4 November 2026

## Delivered

The public heritage homepage is now the first screen. The owner explicitly selected public-first entry on 4 November 2026; this supersedes the older login-first flow. Public visitors can browse and search, while saved items, submissions, administration and other personal features still require their existing account permissions. Restored native sessions can resume their assigned workspace.

The homepage uses an original lightweight lakeshore illustration, a restrained ivory/forest-green/muted-gold palette, editorial serif headings, clear calls to action, published collection cards, learning/story/artifact pathways and the CULTURAL HERITAGE assistant. It keeps Luo/Dholuo identity throughout. The illustration is identified as an illustration inspired by the Lake Victoria landscape. Archive totals and cultural material are never invented.

Featured cards are loaded from the existing public library, use its protected responsive image delivery, and open complete details with Back/X and related records. Search carries its query into Discover. Loading, empty, invalid-response and retry states are explicit. The header menu includes installation, closes with X/Escape and remains usable on small screens.

The same theme applies to the shared web/native shell, administrative pages, sign-in, sidebars, cards and collection controls. Background patterns and institutional watermarks are restrained; approved institutional branding still appears clearly on authentication and in the public footer. A lakeshore illustration is the authentication fallback when an institutional image is unavailable.

The existing black fixed media dock, pinned feed search, contained media with black unused space, inline more/less, full transcript details, contributor continuation, role permissions, reset-only recovery and culturally scoped black chatbot remain available. Seventy-four new authored labels were registered for the existing interface editor. Only editor-saved community translations appear, with read-only English underneath.

## Validation

- Full regression suite: **424 passed, zero failures**. Two older isolated header test fixtures needed their router mock completed; the final complete suite passed after that fixture correction. [Test log](luo-redesign-tests-2026-11-04.log).
- Final production web build: passed lint with zero errors (nine existing image warnings), TypeScript and all 57 generated pages. [Web build](luo-redesign-web-build-2026-11-04.log).
- Final mobile production build: passed TypeScript and Vite. [Mobile build](luo-redesign-mobile-build-2026-11-04.log).
- Public homepage: six desktop/tablet/phone/landscape viewports on both production web and compiled mobile bundles. Checked first-screen phone search, overflow, navigation menu/installation/X, complete featured item details, search continuation to the feed, empty/error/retry recovery and translated labels with noneditable English. No runtime errors or live account/content writes. [Web proof](luo-home-web-2026-11-04.json), [mobile proof](luo-home-mobile-2026-11-04.json).
- Existing feed: all 20 responsive layouts passed, including all eight collection filters and direct contribution links. [Feed proof](luo-feed-mobile-2026-11-04.json).
- Actual public library: 12 records returned; six sampled published images returned nonempty HTTP 200 image responses. [Real library proof](luo-redesign-live-library-2026-11-04.json).
- Login/registration/reset browser check: passed at 360px. App approval returns remain intact; unsafe external callbacks are rejected. The reset flow requests a code, checks password confirmation and completes. Delivery was intercepted; no email or account writes occurred. The audit now waits for the reset form's own layout before inspecting it.
- Both native projects contain identical copies of all **32** final bundle files. [Native bundle proof](luo-redesign-native-bundles-2026-11-04.json).
- Android debug APK assembled: Gradle reported BUILD SUCCESSFUL, and all 32 bundle files inside the APK match final dist byte-for-byte. The debug APK is at clients/mobile/android/app/build/outputs/apk/debug/app-debug.apk. [Android build log](luo-redesign-android-build-2026-11-04.log).

## Documentation

Updated the role-based in-app manuals, public and administrative PRD guides, and public-entry wording in the operational Terms notice. Existing institution-authored policy text and earlier consent records are preserved. The web manual is edition 2.1, dated 4 November 2026, and its HTML, editable Word and 32-page PDF exports were regenerated. All 18 sections, contents destinations, PDF navigation and layouts at 360/794/1200px validated.

## Review artifacts

- [Desktop homepage](screenshots/luo-redesign-home-web-1440.png)
- [Phone homepage](screenshots/luo-redesign-home-web-390.png)
- [Narrow phone homepage](screenshots/luo-redesign-home-web-320.png)
- [Phone sign-in](screenshots/login-mobile.png)
- [Current PDF manual](../LUO_HERITAGE_WEB_USER_MANUAL.pdf)

## Limits

Changes are local. No deployment, store release, physical-device acceptance, real account creation, publication or provider email delivery was performed. iOS assets are prepared, but iOS compilation needs a Mac with Xcode. Email delivery configuration remains deferred by the owner, and institutional legal contact/provider/retention fields still require completion. AI output accuracy and future uploaded media still depend on their providers, records and permissions.
