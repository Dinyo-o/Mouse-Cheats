(() => {
  "use strict";

  const SHIELD_INSTALLED = "__presenceGuardShieldInstalled";
  const script = document.currentScript;
  const STATE_ATTRIBUTE = script?.dataset.presenceGuardAttribute || "data-presence-guard-enabled";
  const STATE_EVENT = script?.dataset.presenceGuardEvent || "presence-guard:state";
  const suppressedEventTypes = [
    "visibilitychange",
    "webkitvisibilitychange",
    "blur",
    "focusout",
    "mouseout",
    "mouseleave",
    "pointerout",
    "pointerleave"
  ];

  if (window[SHIELD_INSTALLED]) {
    return;
  }

  Object.defineProperty(window, SHIELD_INSTALLED, {
    value: true
  });

  let enabled = false;

  function readState() {
    enabled = document.documentElement?.getAttribute(STATE_ATTRIBUTE) === "true";
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

  function findDescriptor(start, property) {
    let owner = start;

    while (owner) {
      const descriptor = Object.getOwnPropertyDescriptor(owner, property);

      if (descriptor) {
        return {
          owner,
          descriptor
        };
      }

      owner = Object.getPrototypeOf(owner);
    }

    return null;
  }

  function overrideGetter(start, property, protectedValue) {
    const found = findDescriptor(start, property);

    if (!found || found.descriptor.configurable === false) {
      return;
    }

    const { owner, descriptor } = found;
    const nativeGetter = descriptor.get;
    const nativeValue = descriptor.value;

    try {
      Object.defineProperty(owner, property, {
        configurable: true,
        enumerable: descriptor.enumerable,
        get() {
          if (enabled) {
            return typeof protectedValue === "function" ? protectedValue.call(this) : protectedValue;
          }

          if (nativeGetter) {
            return nativeGetter.call(this);
          }

          return nativeValue;
        },
        set: descriptor.set
          ? function setNativeValue(value) {
              return descriptor.set.call(this, value);
            }
          : undefined
      });
    } catch (error) {
      // Some browser-owned descriptors are intentionally locked down.
    }
  }

  function overrideMethod(start, property, replacement) {
    const found = findDescriptor(start, property);

    if (
      !found ||
      found.descriptor.configurable === false ||
      typeof found.descriptor.value !== "function"
    ) {
      return;
    }

    const { owner, descriptor } = found;
    const nativeMethod = descriptor.value;

    try {
      Object.defineProperty(owner, property, {
        configurable: true,
        enumerable: descriptor.enumerable,
        writable: descriptor.writable,
        value: function guardedMethod(...args) {
          if (enabled) {
            return replacement.call(this, nativeMethod, args);
          }

          return nativeMethod.apply(this, args);
        }
      });
    } catch (error) {
      // Keep the page running if a prototype refuses to be patched.
    }
  }

  function attachEventGuards(target) {
    if (!target) {
      return;
    }

    for (const eventType of suppressedEventTypes) {
      target.addEventListener(eventType, suppressWhenProtected, true);
    }
  }

  readState();
  window.addEventListener(STATE_EVENT, readState, true);
  attachEventGuards(window);
  attachEventGuards(document);

  if (document.documentElement) {
    attachEventGuards(document.documentElement);
  }

  overrideGetter(Document.prototype, "hidden", false);
  overrideGetter(Document.prototype, "visibilityState", "visible");
  overrideGetter(Document.prototype, "webkitHidden", false);
  overrideGetter(Document.prototype, "webkitVisibilityState", "visible");
  overrideMethod(Document.prototype, "hasFocus", () => true);
})();
