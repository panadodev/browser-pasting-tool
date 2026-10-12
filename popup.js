const api = typeof browser !== "undefined" ? browser : chrome;
const DELAY_SECONDS = 3;

const textEl = document.getElementById("text");
const statusEl = document.getElementById("status");

async function readClipboard() {
  try {
    const clip = await navigator.clipboard.readText();
    if (clip) {
      textEl.value = clip;
      statusEl.textContent = `Loaded ${clip.length} characters from clipboard.`;
      return;
    }
    statusEl.textContent = "Clipboard is empty.";
  } catch {
    statusEl.textContent =
      "Could not read clipboard. Paste into the box with Ctrl+V.";
  }
  textEl.focus();
}

document.getElementById("read").addEventListener("click", readClipboard);

document.getElementById("go").addEventListener("click", () => {
  const text = textEl.value;
  if (!text) {
    statusEl.textContent = "Nothing to type.";
    return;
  }

  api.runtime.sendMessage({
    type: "START_TYPING",
    text,
    delaySec: DELAY_SECONDS,
  });
  window.close();
});

readClipboard();
