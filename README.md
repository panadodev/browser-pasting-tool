# browser-pasting-tool
Last resort to not being able to paste through remote VNC etc.

## Extension starter (Chromium + Firefox)

This repository now contains a minimal browser extension starter:

- popup with a text input
- `Paste` button
- 3-second countdown
- sends keystrokes into the currently focused location on the active page

### Load in Chromium-based browsers

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this repository folder

### Load in Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `/home/runner/work/browser-pasting-tool/browser-pasting-tool/manifest.json`

### Usage

1. Focus the remote session/input where text should be typed.
2. Open the extension popup.
3. Paste text in the input field.
4. Click **Paste**.
5. Switch/focus back to the target within 3 seconds.
