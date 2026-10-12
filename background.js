const api = typeof browser !== "undefined" ? browser : chrome;
const HAS_DEBUGGER = !!(api.debugger && api.debugger.attach);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const KEY_DELAY_MS = 40;
const SHIFT_MOD = 8;

// US layout: char -> { code, keyCode, shift }
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

function describeChar(ch) {
  if (ch === "\n") {
    return {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      text: "\r",
      shift: false,
    };
  }
  if (ch === "\t") {
    return { key: "Tab", code: "Tab", keyCode: 9, text: "", shift: false };
  }
  const m = KEYMAP[ch];
  if (m) return { key: ch, text: ch, ...m };
  return { key: ch, code: "", keyCode: 0, text: ch, shift: false };
}

/* ---------- Chrome: trusted keys via the debugger protocol ---------- */

const cdp = (target, method, params) =>
  api.debugger.sendCommand(target, method, params);

async function pressKey(target, info, modifiers) {
  const base = {
    key: info.key,
    code: info.code,
    windowsVirtualKeyCode: info.keyCode,
    nativeVirtualKeyCode: info.keyCode,
    modifiers,
  };
  await cdp(target, "Input.dispatchKeyEvent", {
    ...base,
    type: info.text ? "keyDown" : "rawKeyDown",
    ...(info.text ? { text: info.text, unmodifiedText: info.text } : {}),
  });
  await cdp(target, "Input.dispatchKeyEvent", { ...base, type: "keyUp" });
}

async function typeViaDebugger(tabId, text) {
  const target = { tabId };
  await api.debugger.attach(target, "1.3");
  try {
    for (const ch of text.replace(/\r\n?/g, "\n")) {
      const info = describeChar(ch);

      if (info.shift) {
        await cdp(target, "Input.dispatchKeyEvent", {
          type: "rawKeyDown",
          key: "Shift",
          code: "ShiftLeft",
          windowsVirtualKeyCode: 16,
          nativeVirtualKeyCode: 16,
          modifiers: SHIFT_MOD,
        });
      }

      await pressKey(target, info, info.shift ? SHIFT_MOD : 0);

      if (info.shift) {
        await cdp(target, "Input.dispatchKeyEvent", {
          type: "keyUp",
          key: "Shift",
          code: "ShiftLeft",
          windowsVirtualKeyCode: 16,
          nativeVirtualKeyCode: 16,
          modifiers: 0,
        });
      }

      await sleep(KEY_DELAY_MS);
    }
  } finally {
    await api.debugger.detach(target).catch(() => {});
  }
}

/* ---------- Firefox: hand the text to the content script ---------- */

async function typeViaContentScript(tabId, text) {
  // Goes to all frames; only the focused frame actually types
  await api.tabs.sendMessage(tabId, { type: "TYPE_TEXT", text });
}

/* ---------- Shared ---------- */

async function flashBadge(text, ms = 3000) {
  await api.action.setBadgeText({ text });
  await sleep(ms);
  await api.action.setBadgeText({ text: "" });
}

async function pickTargetTab() {
  const tabs = await api.tabs.query({ active: true, windowType: "normal" });
  console.log(
    "Active tabs:",
    tabs.map((t) => `${t.url} | pending: ${t.pendingUrl || "-"}`),
  );

  const usable = tabs
    .filter(
      (t) =>
        typeof t.id === "number" &&
        /^(https?|file):/.test(t.url || "") &&
        !(t.pendingUrl && !/^(https?|file):/.test(t.pendingUrl)),
    )
    .sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));

  if (!usable.length) {
    throw new Error(
      `No usable tab. Active tabs: ${tabs.map((t) => t.url).join(", ")}`,
    );
  }
  return usable[0];
}

async function run({ text, delaySec }) {
  for (let s = delaySec; s > 0; s--) {
    await api.action.setBadgeText({ text: String(s) });
    await sleep(1000);
  }
  await api.action.setBadgeText({ text: "" });

  try {
    const tab = await pickTargetTab();
    console.log(
      "Typing into:",
      tab.url,
      HAS_DEBUGGER ? "(debugger)" : "(content script)",
    );

    if (HAS_DEBUGGER) {
      try {
        await typeViaDebugger(tab.id, text);
      } catch (err) {
        console.warn("Debugger failed, falling back to content script:", err);
        await typeViaContentScript(tab.id, text);
      }
    } else {
      await typeViaContentScript(tab.id, text);
    }
  } catch (err) {
    console.error("Typing failed:", err);
    await flashBadge("!");
  }
}

api.runtime.onMessage.addListener((message) => {
  if (message && message.type === "START_TYPING") run(message);
});
