const STORAGE_KEY = "presenceGuardEnabled";
const DEFAULTS = {
  [STORAGE_KEY]: false
};

async function getEnabled() {
  const values = await browser.storage.local.get(DEFAULTS);
  return Boolean(values[STORAGE_KEY]);
}

async function syncBadge() {
  const enabled = await getEnabled();

  await browser.browserAction.setBadgeText({
    text: enabled ? "ON" : ""
  });
  await browser.browserAction.setBadgeBackgroundColor({
    color: enabled ? "#19764d" : "#6b7280"
  });
  await browser.browserAction.setTitle({
    title: enabled ? "Presence Guard is on" : "Presence Guard is off"
  });
}

browser.runtime.onInstalled.addListener(async () => {
  const values = await browser.storage.local.get(STORAGE_KEY);

  if (typeof values[STORAGE_KEY] !== "boolean") {
    await browser.storage.local.set(DEFAULTS);
  }

  await syncBadge();
});

browser.runtime.onStartup.addListener(syncBadge);

browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes[STORAGE_KEY]) {
    syncBadge();
  }
});

syncBadge();
