// utils/polyfills.js
// Comprehensive global polyfills for React Native / Hermes JS engine.
// Injected via Metro serializer.getPolyfills at the HEADER of the native bundle
// so all APIs are defined before any third-party module or entry point evaluates.

(function () {
  if (typeof globalThis === 'undefined') return;

  function applyTo(name, impl) {
    globalThis[name] = impl;
    if (typeof global !== 'undefined') global[name] = impl;
    if (typeof window !== 'undefined') window[name] = impl;
  }

  // ─── 1. DOMException ────────────────────────────────────────────────────────
  if (typeof globalThis.DOMException === 'undefined') {
    var DOM_CODES = {
      IndexSizeError: 1, HierarchyRequestError: 3, WrongDocumentError: 4,
      InvalidCharacterError: 5, NoModificationAllowedError: 7, NotFoundError: 8,
      NotSupportedError: 9, InvalidStateError: 11, SyntaxError: 12,
      InvalidModificationError: 13, NamespaceError: 14, InvalidAccessError: 15,
      TypeMismatchError: 17, SecurityError: 18, NetworkError: 19, AbortError: 20,
      URLMismatchError: 21, QuotaExceededError: 22, TimeoutError: 23,
      InvalidNodeTypeError: 24, DataCloneError: 25,
    };
    function DOMExceptionPolyfill(message, name) {
      var err = new Error(message || '');
      err.name = name || 'Error';
      err.code = DOM_CODES[name] || 0;
      return err;
    }
    DOMExceptionPolyfill.prototype = Object.create(Error.prototype);
    DOMExceptionPolyfill.prototype.constructor = DOMExceptionPolyfill;
    for (var k in DOM_CODES) {
      if (Object.prototype.hasOwnProperty.call(DOM_CODES, k)) {
        DOMExceptionPolyfill[k] = DOM_CODES[k];
      }
    }
    applyTo('DOMException', DOMExceptionPolyfill);
  }

  // ─── 2. Performance Timeline API ────────────────────────────────────────────
  if (typeof globalThis.PerformanceEntry === 'undefined') {
    function PerformanceEntry(name, entryType, startTime, duration) {
      this.name = name || ''; this.entryType = entryType || '';
      this.startTime = startTime || 0; this.duration = duration || 0;
    }
    PerformanceEntry.prototype.toJSON = function () {
      return { name: this.name, entryType: this.entryType, startTime: this.startTime, duration: this.duration };
    };
    applyTo('PerformanceEntry', PerformanceEntry);
  }

  if (typeof globalThis.PerformanceMark === 'undefined') {
    function PerformanceMark(name, options) {
      this.name = name || ''; this.entryType = 'mark';
      this.startTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      this.duration = 0; this.detail = options ? options.detail : null;
    }
    PerformanceMark.prototype = Object.create(globalThis.PerformanceEntry.prototype);
    PerformanceMark.prototype.constructor = PerformanceMark;
    applyTo('PerformanceMark', PerformanceMark);
  }

  if (typeof globalThis.PerformanceMeasure === 'undefined') {
    function PerformanceMeasure(name, startTime, duration, detail) {
      this.name = name || ''; this.entryType = 'measure';
      this.startTime = startTime || 0; this.duration = duration || 0; this.detail = detail || null;
    }
    PerformanceMeasure.prototype = Object.create(globalThis.PerformanceEntry.prototype);
    PerformanceMeasure.prototype.constructor = PerformanceMeasure;
    applyTo('PerformanceMeasure', PerformanceMeasure);
  }

  if (typeof globalThis.PerformanceObserver === 'undefined') {
    function PerformanceObserver(callback) { this._cb = callback; }
    PerformanceObserver.prototype.observe = function () {};
    PerformanceObserver.prototype.disconnect = function () {};
    PerformanceObserver.prototype.takeRecords = function () { return []; };
    PerformanceObserver.supportedEntryTypes = ['mark', 'measure', 'resource', 'navigation', 'paint'];
    applyTo('PerformanceObserver', PerformanceObserver);
  }

  // ─── 3. Memory API ──────────────────────────────────────────────────────────
  if (typeof globalThis.MemoryInfo === 'undefined') {
    function MemoryInfo() {
      this.totalJSHeapSize = 10000000;
      this.usedJSHeapSize = 5000000;
      this.jsHeapSizeLimit = 2000000000;
    }
    MemoryInfo.prototype.toJSON = function () {
      return { totalJSHeapSize: this.totalJSHeapSize, usedJSHeapSize: this.usedJSHeapSize, jsHeapSizeLimit: this.jsHeapSizeLimit };
    };
    applyTo('MemoryInfo', MemoryInfo);
  }

  // ─── 4. MessageQueue (BatchedBridge) ────────────────────────────────────────
  if (typeof globalThis.MessageQueue === 'undefined') {
    function MessageQueuePolyfill() {}
    MessageQueuePolyfill.prototype.registerCallableModule = function () {};
    MessageQueuePolyfill.prototype.registerLazyCallableModule = function () {};
    MessageQueuePolyfill.prototype.getCallableModule = function () { return null; };
    MessageQueuePolyfill.spy = function () {};
    applyTo('MessageQueue', MessageQueuePolyfill);
  }

  // ─── 5. Event / CustomEvent ─────────────────────────────────────────────────
  if (typeof globalThis.Event === 'undefined') {
    function EventPolyfill(type, init) {
      this.type = type || ''; this.bubbles = !!(init && init.bubbles);
      this.cancelable = !!(init && init.cancelable); this.defaultPrevented = false;
      this.timeStamp = Date.now();
      this.target = null; this.currentTarget = null;
      this.eventPhase = 0;
    }
    EventPolyfill.prototype.preventDefault = function () { this.defaultPrevented = true; };
    EventPolyfill.prototype.stopPropagation = function () {};
    EventPolyfill.prototype.stopImmediatePropagation = function () {};
    EventPolyfill.prototype.initEvent = function (type, bubbles, cancelable) {
      this.type = type; this.bubbles = !!bubbles; this.cancelable = !!cancelable;
    };

    // Use Object.defineProperty for phase constants so Hermes does not treat them
    // as writable (avoids "Cannot assign to read-only property 'NONE'" crashes).
    var eventConstants = { NONE: 0, CAPTURING_PHASE: 1, AT_TARGET: 2, BUBBLING_PHASE: 3 };
    Object.keys(eventConstants).forEach(function (key) {
      var val = eventConstants[key];
      try {
        Object.defineProperty(EventPolyfill, key, { value: val, writable: false, enumerable: true, configurable: true });
        Object.defineProperty(EventPolyfill.prototype, key, { value: val, writable: false, enumerable: true, configurable: true });
      } catch (e) {
        EventPolyfill[key] = val;
        EventPolyfill.prototype[key] = val;
      }
    });

    applyTo('Event', EventPolyfill);
  }

  if (typeof globalThis.CustomEvent === 'undefined') {
    function CustomEventPolyfill(type, init) {
      this.type = type || ''; this.bubbles = !!(init && init.bubbles);
      this.cancelable = !!(init && init.cancelable); this.detail = init ? init.detail : null;
      this.defaultPrevented = false; this.timeStamp = Date.now();
    }
    if (typeof globalThis.Event !== 'undefined') {
      CustomEventPolyfill.prototype = Object.create(globalThis.Event.prototype);
      CustomEventPolyfill.prototype.constructor = CustomEventPolyfill;
    }
    applyTo('CustomEvent', CustomEventPolyfill);
  }

  // ─── 6. EventTarget ─────────────────────────────────────────────────────────
  if (typeof globalThis.EventTarget === 'undefined') {
    function EventTargetPolyfill() { this._listeners = {}; }
    EventTargetPolyfill.prototype.addEventListener = function (type, listener) {
      if (!this._listeners[type]) this._listeners[type] = [];
      this._listeners[type].push(listener);
    };
    EventTargetPolyfill.prototype.removeEventListener = function (type, listener) {
      if (!this._listeners[type]) return;
      this._listeners[type] = this._listeners[type].filter(function (l) { return l !== listener; });
    };
    EventTargetPolyfill.prototype.dispatchEvent = function (event) {
      var listeners = this._listeners[event.type] || [];
      listeners.forEach(function (l) { l(event); });
      return !event.defaultPrevented;
    };
    applyTo('EventTarget', EventTargetPolyfill);
  }

  // ─── 7. AbortController / AbortSignal ───────────────────────────────────────
  if (typeof globalThis.AbortSignal === 'undefined') {
    function AbortSignal() {
      this.aborted = false; this.reason = undefined;
      this._listeners = [];
      this.onabort = null;
    }
    AbortSignal.prototype.addEventListener = function (type, listener) {
      if (type === 'abort') this._listeners.push(listener);
    };
    AbortSignal.prototype.removeEventListener = function (type, listener) {
      if (type === 'abort') {
        this._listeners = this._listeners.filter(function (l) { return l !== listener; });
      }
    };
    AbortSignal.prototype.throwIfAborted = function () {
      if (this.aborted) throw this.reason || new Error('Aborted');
    };
    AbortSignal.abort = function (reason) {
      var s = new AbortSignal(); s.aborted = true; s.reason = reason; return s;
    };
    AbortSignal.timeout = function (ms) {
      var s = new AbortSignal();
      setTimeout(function () {
        s.aborted = true;
        s.reason = new (globalThis.DOMException || Error)('TimeoutError', 'TimeoutError');
        s._listeners.forEach(function (l) { l({ type: 'abort' }); });
        if (s.onabort) s.onabort({ type: 'abort' });
      }, ms);
      return s;
    };
    applyTo('AbortSignal', AbortSignal);
  }

  if (typeof globalThis.AbortController === 'undefined') {
    function AbortController() { this.signal = new globalThis.AbortSignal(); }
    AbortController.prototype.abort = function (reason) {
      if (this.signal.aborted) return;
      this.signal.aborted = true;
      this.signal.reason = reason !== undefined ? reason : new (globalThis.DOMException || Error)('AbortError', 'AbortError');
      this.signal._listeners.forEach(function (l) { l({ type: 'abort' }); });
      if (this.signal.onabort) this.signal.onabort({ type: 'abort' });
    };
    applyTo('AbortController', AbortController);
  }

  // ─── 8. structuredClone ─────────────────────────────────────────────────────
  if (typeof globalThis.structuredClone === 'undefined') {
    applyTo('structuredClone', function (val) {
      return JSON.parse(JSON.stringify(val));
    });
  }

  // ─── 9. queueMicrotask ──────────────────────────────────────────────────────
  if (typeof globalThis.queueMicrotask === 'undefined') {
    applyTo('queueMicrotask', function (fn) { Promise.resolve().then(fn); });
  }

  // ─── 10. ResizeObserver / MutationObserver / IntersectionObserver ───────────
  if (typeof globalThis.ResizeObserver === 'undefined') {
    function ResizeObserver(callback) { this._cb = callback; }
    ResizeObserver.prototype.observe = function () {};
    ResizeObserver.prototype.unobserve = function () {};
    ResizeObserver.prototype.disconnect = function () {};
    applyTo('ResizeObserver', ResizeObserver);
  }

  if (typeof globalThis.MutationObserver === 'undefined') {
    function MutationObserver(callback) { this._cb = callback; }
    MutationObserver.prototype.observe = function () {};
    MutationObserver.prototype.disconnect = function () {};
    MutationObserver.prototype.takeRecords = function () { return []; };
    applyTo('MutationObserver', MutationObserver);
  }

  if (typeof globalThis.IntersectionObserver === 'undefined') {
    function IntersectionObserver(callback) { this._cb = callback; }
    IntersectionObserver.prototype.observe = function () {};
    IntersectionObserver.prototype.unobserve = function () {};
    IntersectionObserver.prototype.disconnect = function () {};
    IntersectionObserver.prototype.takeRecords = function () { return []; };
    applyTo('IntersectionObserver', IntersectionObserver);
  }

  // ─── 11. TextEncoder / TextDecoder ──────────────────────────────────────────
  if (typeof globalThis.TextEncoder === 'undefined') {
    function TextEncoder() {}
    TextEncoder.prototype.encoding = 'utf-8';
    TextEncoder.prototype.encode = function (str) {
      str = str || '';
      var bytes = [];
      for (var i = 0; i < str.length; i++) {
        var code = str.charCodeAt(i);
        if (code < 0x80) { bytes.push(code); }
        else if (code < 0x800) { bytes.push(0xC0 | (code >> 6)); bytes.push(0x80 | (code & 0x3F)); }
        else { bytes.push(0xE0 | (code >> 12)); bytes.push(0x80 | ((code >> 6) & 0x3F)); bytes.push(0x80 | (code & 0x3F)); }
      }
      return new Uint8Array(bytes);
    };
    applyTo('TextEncoder', TextEncoder);
  }

  if (typeof globalThis.TextDecoder === 'undefined') {
    function TextDecoder(encoding) { this.encoding = encoding || 'utf-8'; }
    TextDecoder.prototype.decode = function (bytes) {
      if (!bytes) return '';
      var arr = Array.prototype.slice.call(bytes);
      return arr.map(function (b) { return String.fromCharCode(b); }).join('');
    };
    applyTo('TextDecoder', TextDecoder);
  }

  // ─── 12. ReactNativeStartupTiming & performance object ──────────────────────
  // Polyfill performance.reactNativeStartupTiming and related RN performance APIs
  // that some web-oriented packages attempt to access on startup.
  (function () {
    var RNStartupTiming = {
      startTime: 0,
      initializeRuntimeStart: 0,
      initializeRuntimeEnd: 0,
      executeJavaScriptBundleEntryPointStart: 0,
      executeJavaScriptBundleEntryPointEnd: 0,
    };

    applyTo('ReactNativeStartupTiming', RNStartupTiming);

    // Ensure a performance object exists with all needed properties
    var existingPerf = globalThis.performance;
    if (!existingPerf || typeof existingPerf !== 'object') {
      existingPerf = {};
    }

    if (typeof existingPerf.now !== 'function') {
      existingPerf.now = function () { return Date.now(); };
    }
    if (!existingPerf.reactNativeStartupTiming) {
      existingPerf.reactNativeStartupTiming = RNStartupTiming;
    }
    if (!existingPerf.memory) {
      existingPerf.memory = new globalThis.MemoryInfo();
    }
    if (typeof existingPerf.mark !== 'function') {
      existingPerf.mark = function () {};
    }
    if (typeof existingPerf.measure !== 'function') {
      existingPerf.measure = function () {};
    }
    if (typeof existingPerf.clearMarks !== 'function') {
      existingPerf.clearMarks = function () {};
    }
    if (typeof existingPerf.clearMeasures !== 'function') {
      existingPerf.clearMeasures = function () {};
    }
    if (typeof existingPerf.getEntriesByName !== 'function') {
      existingPerf.getEntriesByName = function () { return []; };
    }
    if (typeof existingPerf.getEntriesByType !== 'function') {
      existingPerf.getEntriesByType = function () { return []; };
    }
    if (typeof existingPerf.getEntries !== 'function') {
      existingPerf.getEntries = function () { return []; };
    }

    applyTo('performance', existingPerf);
  })();

  // ─── 13. location stub ──────────────────────────────────────────────────────
  if (typeof globalThis.location === 'undefined') {
    applyTo('location', {
      href: 'rn://localhost/', hostname: 'localhost', protocol: 'rn:',
      pathname: '/', search: '', hash: '', port: '',
      assign: function () {}, replace: function () {}, reload: function () {},
    });
  }

  // ─── 14. navigator stub ─────────────────────────────────────────────────────
  if (typeof globalThis.navigator === 'undefined') {
    applyTo('navigator', {
      userAgent: 'ReactNative', platform: 'ReactNative',
      onLine: true, language: 'en-US',
    });
  }

  // ─── 15. crypto stub ────────────────────────────────────────────────────────
  if (typeof globalThis.crypto === 'undefined') {
    applyTo('crypto', {
      getRandomValues: function (arr) {
        for (var i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      },
      randomUUID: function () {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
          var r = Math.random() * 16 | 0;
          return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
      },
    });
  }

})();

