const api = typeof browser !== 'undefined' ? browser : chrome;

const input = document.getElementById('pasteText');
const button = document.getElementById('pasteButton');
const status = document.getElementById('status');

function setStatus(message) {
  status.textContent = message;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startPasteFlow() {
  const text = input.value;

  if (!text) {
    setStatus('Please enter text first.');
    return;
  }

  button.disabled = true;

  for (let remaining = 3; remaining > 0; remaining -= 1) {
    setStatus(`Pasting in ${remaining}...`);
    await wait(1000);
  }

  try {
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });

    if (!tab || typeof tab.id !== 'number') {
      throw new Error('No active tab found.');
    }

    await api.tabs.sendMessage(tab.id, { type: 'TYPE_TEXT', text });
    setStatus('Typing started.');
  } catch (error) {
    setStatus('Could not send text to this page.');
  } finally {
    button.disabled = false;
  }
}

button.addEventListener('click', () => {
  startPasteFlow();
});
