(() => {
  "use strict";

  const BRIDGE_INSTALLED = "__presenceGuardBridgeInstalled";
  const STORAGE_KEY = "presenceGuardEnabled";
  const STATE_ATTRIBUTE = "data-presence-guard-enabled";
  const STATE_EVENT = "presence-guard:state";
  const SUPPRESSED_EVENT_TYPES = [
    "visibilitychange",
    "webkitvisibilitychange",
    "blur",
    "focusout",
    "mouseout",
    "mouseleave",
    "pointerout",
    "pointerleave"
  ];
  const DEFAULTS = {
    [STORAGE_KEY]: false
  };

  if (window[BRIDGE_INSTALLED]) {
    return;
  }

  Object.defineProperty(window, BRIDGE_INSTALLED, {
    value: true
  });

  let enabled = false;

  function rootNode() {
    return document.documentElement || document.head || document.body;
  }

  function isTopLevelTarget(target) {
    return (
      target === window ||
      target === document ||
      target === document.documentElement ||
      target === document.body
    );
  }

  function isOutsideDocumentTarget(target) {
    return (
      target === null ||
      typeof target === "undefined" ||
      target === window ||
      target === document ||
      target === document.documentElement
    );
  }

  function isMouseLeavingPage(event) {
    if (event.type === "mouseout" || event.type === "pointerout") {
      return isOutsideDocumentTarget(event.relatedTarget);
    }

    if (event.type === "mouseleave" || event.type === "pointerleave") {
      return isOutsideDocumentTarget(event.relatedTarget) || isTopLevelTarget(event.target);
    }

    return false;
  }

  function isTopLevelFocusLoss(event) {
    if (event.type === "blur") {
      return isTopLevelTarget(event.target);
    }

    if (event.type === "focusout") {
      return isTopLevelTarget(event.target) && isOutsideDocumentTarget(event.relatedTarget);
    }

    return false;
  }

  function shouldSuppress(event) {
    if (!enabled) {
      return false;
    }

    if (event.type === "visibilitychange" || event.type === "webkitvisibilitychange") {
      return true;
    }

    return isMouseLeavingPage(event) || isTopLevelFocusLoss(event);
  }

  function suppressWhenProtected(event) {
    if (!shouldSuppress(event)) {
      return;
    }

    event.stopImmediatePropagation();

    if (event.cancelable) {
      event.preventDefault();
    }
  }

  function attachEventGuards(target) {
    if (!target) {
      return;
    }

    for (const eventType of SUPPRESSED_EVENT_TYPES) {
      target.addEventListener(eventType, suppressWhenProtected, true);
    }
  }

  function publish(nextEnabled) {
    enabled = Boolean(nextEnabled);

    const root = rootNode();

    if (!root) {
      return;
    }

    root.setAttribute(STATE_ATTRIBUTE, enabled ? "true" : "false");
    window.dispatchEvent(new Event(STATE_EVENT));
  }

  function injectShield() {
    const root = rootNode();

    if (!root) {
      document.addEventListener("readystatechange", injectShield, {
        once: true
      });
      return;
    }

    const script = document.createElement("script");
    script.src = browser.runtime.getURL("content/page-shield.js");
    script.async = false;
    script.dataset.presenceGuardAttribute = STATE_ATTRIBUTE;
    script.dataset.presenceGuardEvent = STATE_EVENT;
    root.appendChild(script);
    script.remove();
  }

  async function syncFromStorage() {
    const values = await browser.storage.local.get(DEFAULTS);
    publish(values[STORAGE_KEY]);
  }

  attachEventGuards(window);
  attachEventGuards(document);

  if (document.documentElement) {
    attachEventGuards(document.documentElement);
  }

  injectShield();
  syncFromStorage();

  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes[STORAGE_KEY]) {
      publish(changes[STORAGE_KEY].newValue);
    }
  });

  browser.runtime.onMessage.addListener((message) => {
    if (message && message.type === "presence-guard:set-enabled") {
      publish(message.enabled);
    }
  });
})();
