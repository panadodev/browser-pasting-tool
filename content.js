const api = typeof browser !== "undefined" ? browser : chrome;
const keyDelayMs = 40;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const KEYMAP = (() => {
  const map = {};
  const add = (ch, code, keyCode, shift = false) =>
    (map[ch] = { code, keyCode, shift });

  for (let i = 0; i < 26; i++) {
    const lower = String.fromCharCode(97 + i);
    const code = `Key${lower.toUpperCase()}`;
    add(lower, code, 65 + i);
    add(lower.toUpperCase(), code, 65 + i, true);
  }
  "0123456789".split("").forEach((d) => add(d, `Digit${d}`, 48 + Number(d)));
  ")!@#$%^&*(".split("").forEach((s, i) => add(s, `Digit${i}`, 48 + i, true));

  const punct = [
    ["-", "_", "Minus", 189],
    ["=", "+", "Equal", 187],
    ["[", "{", "BracketLeft", 219],
    ["]", "}", "BracketRight", 221],
    ["\\", "|", "Backslash", 220],
    [";", ":", "Semicolon", 186],
    ["'", '"', "Quote", 222],
    [",", "<", "Comma", 188],
    [".", ">", "Period", 190],
    ["/", "?", "Slash", 191],
    ["`", "~", "Backquote", 192],
  ];
  for (const [base, shifted, code, kc] of punct) {
    add(base, code, kc);
    add(shifted, code, kc, true);
  }
  add(" ", "Space", 32);
  return map;
})();

const SPECIAL = {
  "\n": { key: "Enter", code: "Enter", keyCode: 13 },
  "\t": { key: "Tab", code: "Tab", keyCode: 9 },
};
const SHIFT = { key: "Shift", code: "ShiftLeft", keyCode: 16 };

function describeChar(ch) {
  if (SPECIAL[ch]) return { ...SPECIAL[ch], shift: false };
  const m = KEYMAP[ch];
  if (m) return { key: ch, ...m };
  return { key: ch, code: "", keyCode: 0, shift: false };
}

// Returns false if the page called preventDefault() (e.g. a VNC client)
function fireKey(target, type, { key, code, keyCode }, shiftKey) {
  const event = new KeyboardEvent(type, {
    key,
    code,
    keyCode,
    which: keyCode,
    charCode: type === "keypress" && key.length === 1 ? key.charCodeAt(0) : 0,
    shiftKey,
    bubbles: true,
    cancelable: true,
    composed: true,
  });
  return target.dispatchEvent(event);
}

function insertCharacter(target, text) {
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement
  ) {
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    target.setRangeText(text, start, end, "end");
    target.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        data: text,
        inputType: "insertText",
      }),
    );
  } else if (target instanceof HTMLElement && target.isContentEditable) {
    document.execCommand("insertText", false, text);
  }
}

function isFocusedFrame() {
  if (!document.hasFocus()) return false;
  const a = document.activeElement;
  // If focus is inside a child iframe, that frame's copy of this script handles it
  return !(a && (a.tagName === "IFRAME" || a.tagName === "FRAME"));
}

async function typeText(text) {
  if (!isFocusedFrame()) return;

  const target = document.activeElement || document.body;

  for (const ch of text.replace(/\r\n?/g, "\n")) {
    const info = describeChar(ch);

    if (info.shift) fireKey(target, "keydown", SHIFT, true);

    const notHandled = fireKey(target, "keydown", info, info.shift);
    fireKey(target, "keypress", info, info.shift);

    // Only insert locally if nothing (e.g. a VNC client) claimed the key
    if (notHandled && !SPECIAL[ch]) insertCharacter(target, ch);

    fireKey(target, "keyup", info, info.shift);
    if (info.shift) fireKey(target, "keyup", SHIFT, false);

    await wait(keyDelayMs);
  }
}

api.runtime.onMessage.addListener((message) => {
  if (
    message &&
    message.type === "TYPE_TEXT" &&
    typeof message.text === "string"
  ) {
    typeText(message.text);
  }
});
