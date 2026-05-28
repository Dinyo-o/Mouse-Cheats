# Presence Guard

Presence Guard is a Firefox WebExtension with a toolbar toggle. When it is on, normal webpages are shielded from common client-side signals that reveal when the mouse leaves the page or when the tab becomes hidden.

## What it blocks

- `document.hidden` and `document.visibilityState` report as visible.
- `document.hasFocus()` reports as focused.
- `visibilitychange` events are stopped.
- Top-level window focus-loss events are stopped.
- Mouse and pointer leave events are stopped when the pointer exits the page or browser viewport.

Internal page interactions still pass through, so hover menus, form blur validation, drag/drop, and normal focus changes inside a page should keep working.

## Install temporarily in Firefox

1. Open `about:debugging#/runtime/this-firefox` in a new tab.
2. Click `Load Temporary Add-on`.
3. Select `manifest.json` from this folder.
4. Use the Presence Guard toolbar button to switch protection on or off.

Firefox does not allow extensions to run on some restricted pages such as browser settings pages, extension stores, and privileged `about:` pages.

## Limits

No extension can make this completely undetectable. A site may still infer tab changes from browser throttling, network timing, media behavior, server-side checks, or APIs that Firefox keeps outside extension control. This extension focuses on the common page-level JavaScript signals while avoiding broad patches that would break websites.
