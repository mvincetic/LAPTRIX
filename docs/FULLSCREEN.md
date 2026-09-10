# Viewer fullscreen lifecycle

The viewer's fullscreen control requests entry only through an explicit user
action. Its icon, pressed state and accessible name follow the browser's
`fullscreenchange` event and the actual target in `document.fullscreenElement`.
Browser-driven exit updates that same control. The scene, camera mode, selected
corner, ghost choices, canonical cursor and pending project remain in place.

Rejected entry or exit leaves the viewer usable and shows a local Fullscreen status
message beside the control. Retry uses the same button; the message can also be
dismissed. Missing API support has a specific unavailable message. Synchronous
errors and rejected promises share that recovery path. Fullscreen transitions and
newer actions invalidate older pending completion errors, and cleanup removes the
document listener. The control does not own a second scene, playback clock or
application-wide error state.

`FullscreenControl` stays inside the deferred viewer bundle. Browser events own
actual state; promise rejection is handled without changing browser permissions.
This follows the documented [requestFullscreen contract](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen),
[fullscreenchange event](https://developer.mozilla.org/en-US/docs/Web/API/Document/fullscreenchange_event)
and [exitFullscreen contract](https://developer.mozilla.org/en-US/docs/Web/API/Document/exitFullscreen).

## Verification

Five desktop/phone/unsupported browser cases failed before the control update,
exposing missing recovery and a stale enter-only accessible name. They now pass,
using native fullscreen after a controlled first rejection. Both enter and exit
recovery preserve the same Canvas node, Top View, selected corner, reference-ghost
choice, paused 20-second cursor, complete project and pending 21 kg fuel, with no
new solve or unhandled page error. External document exit also updates the control.
A delayed first rejection after a newer successful native entry is separately
covered, ensuring it cannot add obsolete feedback or undo the actual control state.
A separate short-landscape case checks that header, camera actions and footer stay
within the actual fullscreen viewport.
That case reproduced clipped camera/exit controls at 780×390: the ordinary scene
minimum height exceeded the space remaining under the fullscreen header. The
fullscreen-only scene rule now permits shrinking, while header/footer retain their
natural heights. The normal workspace retains its existing minimum scene height.

`node scripts/fullscreen-qa.mjs` reviews rejected entry, native entry, rejected exit
and restored views at 1600×1000, 1280×900, 390×844 and 780×390. It records actual
control/panel/canvas bounds, cursor and Canvas identity, project equality, requests
and runtime/console errors. No fullscreen permission or browser setting is changed.
