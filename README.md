# browser-pasting-tool
Last resort to not being able to paste through remote VNC etc.

## Extension starter (Chromium + Firefox)

This repository now contains a minimal browser extension starter:

- a context-menu command named **Paste with Browser Pasting Tool**
- reads the current clipboard text
- types it character by character into the currently focused location

The extension uses a content script to emit keyboard events and update normal
web inputs one character at a time. This does not require the unsupported
Firefox `debugger` permission.

### Load in Chromium-based browsers

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this repository folder

### Load in Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `manifest.firefox.json` from this repository

### Usage

1. Copy the text that should be typed.
2. Focus the target input or remote session.
3. Right-click and choose **Paste with Browser Pasting Tool**.
