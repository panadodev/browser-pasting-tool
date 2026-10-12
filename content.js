const api = typeof browser !== 'undefined' ? browser : chrome;
const keyDelayMs = 40;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fireKeyboardEvent(target, type, key) {
  const event = new KeyboardEvent(type, {
    key,
    bubbles: true,
    cancelable: true
  });
  target.dispatchEvent(event);
}

function insertCharacter(target, key) {
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;

    target.value = `${target.value.slice(0, start)}${key}${target.value.slice(end)}`;
    const nextPosition = start + key.length;
    target.setSelectionRange(nextPosition, nextPosition);
    target.dispatchEvent(new InputEvent('input', { bubbles: true, data: key, inputType: 'insertText' }));
    return;
  }

  if (target instanceof HTMLElement && target.isContentEditable) {
    target.focus();
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) {
      target.append(key);
    } else {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(key));
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    target.dispatchEvent(new InputEvent('input', { bubbles: true, data: key, inputType: 'insertText' }));
  }
}

async function typeText(text) {
  const target = document.activeElement || document.body;

  if (target instanceof HTMLElement) {
    target.focus();
  }

  for (const key of text) {
    fireKeyboardEvent(target, 'keydown', key);
    fireKeyboardEvent(target, 'keypress', key);
    insertCharacter(target, key);
    fireKeyboardEvent(target, 'keyup', key);
    await wait(keyDelayMs);
  }
}

api.runtime.onMessage.addListener((message) => {
  if (!message || message.type !== 'TYPE_TEXT' || typeof message.text !== 'string') {
    return;
  }

  typeText(message.text);
});
