/**
 * Vitest Global Setup
 * Initializes mocks and polyfills for browser APIs not available in jsdom
 */

import { vi } from 'vitest';

// Mock IndexedDB for testing environments
class MockIndexedDB {
  open(dbName, version) {
    const request = {
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: new MockIDBDatabase(),
      error: null,
    };

    // Simulate async behavior
    setTimeout(() => {
      if (request.onupgradeneeded) {
        request.onupgradeneeded({ target: request });
      }
      if (request.onsuccess) {
        request.onsuccess();
      }
    }, 0);

    return request;
  }
}

class MockIDBDatabase {
  constructor() {
    this.objectStoreNames = {
      contains: () => false,
    };
    this.objectStores = {};
  }

  transaction(storeNames, mode) {
    return new MockIDBTransaction(this.objectStores);
  }

  createObjectStore(storeName, options = {}) {
    if (!this.objectStores[storeName]) {
      this.objectStores[storeName] = new MockIDBObjectStore();
    }
    // Update objectStoreNames to reflect the new store
    const originalContains = this.objectStoreNames.contains;
    this.objectStoreNames.contains = (name) => {
      return name === storeName || originalContains(name);
    };
    return this.objectStores[storeName];
  }
}

class MockIDBTransaction {
  constructor(objectStores = {}) {
    this.objectStores = objectStores;
  }

  objectStore(storeName) {
    if (!this.objectStores[storeName]) {
      this.objectStores[storeName] = new MockIDBObjectStore();
    }
    return this.objectStores[storeName];
  }
}

class MockIDBObjectStore {
  put(data) {
    return {
      onsuccess: null,
      onerror: null,
      result: 1,
      error: null,
    };
  }

  get(key) {
    const request = {
      onsuccess: null,
      onerror: null,
      result: null,
      error: null,
    };

    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess();
      }
    }, 0);

    return request;
  }

  getAll() {
    const request = {
      onsuccess: null,
      onerror: null,
      result: [],
      error: null,
    };

    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess();
      }
    }, 0);

    return request;
  }

  add(data) {
    return {
      onsuccess: null,
      onerror: null,
      result: 1,
      error: null,
    };
  }
}

// Setup global IndexedDB mock if not available
if (typeof globalThis.indexedDB === 'undefined') {
  globalThis.indexedDB = new MockIndexedDB();
}

// Setup AbortController polyfill if not fully implemented
if (typeof globalThis.AbortController === 'undefined') {
  class AbortController {
    constructor() {
      this.signal = new AbortSignal();
    }

    abort() {
      if (this.signal.onabort) {
        this.signal.onabort();
      }
    }
  }

  class AbortSignal {
    constructor() {
      this.aborted = false;
      this.onabort = null;
    }
  }

  globalThis.AbortController = AbortController;
  globalThis.AbortSignal = AbortSignal;
}

// Fix AbortSignal type checking for fetch
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options = {}) => {
  if (options.signal) {
    // Ensure signal is properly handled even in jsdom
    if (!(options.signal instanceof AbortSignal)) {
      // Create a new proper signal if needed
      const controller = new AbortController();
      options.signal = controller.signal;
    }
  }
  return originalFetch.call(globalThis, url, options).catch((err) => {
    // Handle timeout and abort gracefully
    if (err.name === 'AbortError' || err.message.includes('abort')) {
      throw new Error('Request timeout or aborted');
    }
    throw err;
  });
};

console.log('✓ Vitest global setup initialized with IndexedDB and AbortController mocks');
