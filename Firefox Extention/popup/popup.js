const STORAGE_KEY = "presenceGuardEnabled";
const DEFAULTS = {
  [STORAGE_KEY]: false
};

const enabledControl = document.querySelector("#enabled");
const statusText = document.querySelector("#status");

function render(enabled) {
  enabledControl.checked = enabled;
  statusText.textContent = enabled ? "On" : "Off";
}

async function getEnabled() {
  const values = await browser.storage.local.get(DEFAULTS);
  return Boolean(values[STORAGE_KEY]);
}

async function notifyActiveTab(enabled) {
  const tabs = await browser.tabs.query({
    active: true,
    currentWindow: true
  });
  const activeTab = tabs[0];

  if (!activeTab?.id) {
    return;
  }

  try {
    await browser.tabs.executeScript(activeTab.id, {
      file: "/content/bridge.js",
      allFrames: true,
      runAt: "document_start"
    });
  } catch (error) {
    // Restricted browser pages cannot run extension content scripts.
  }

  try {
    await browser.tabs.sendMessage(activeTab.id, {
      type: "presence-guard:set-enabled",
      enabled
    });
  } catch (error) {
    // The active page may be restricted or may not have a content script yet.
  }
}

async function setEnabled(enabled) {
  await browser.storage.local.set({
    [STORAGE_KEY]: enabled
  });
  render(enabled);
  await notifyActiveTab(enabled);
}

enabledControl.addEventListener("change", () => {
  setEnabled(enabledControl.checked);
});

getEnabled().then(render);
