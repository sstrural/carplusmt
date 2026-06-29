/**
 * Storage Manager
 * Manages IndexedDB for offline data persistence
 *
 * @module storageManager
 */

const DB_NAME = 'appRLCalculatorDB';
const DB_VERSION = 1;

let db = null;
let isIndexedDBAvailable = false;

// Check if IndexedDB is available
if (typeof indexedDB !== 'undefined') {
  isIndexedDBAvailable = true;
}

console.log('✓ Storage manager module initialized');

/**
 * Initialize IndexedDB connection
 * @returns {Promise<IDBDatabase>}
 */
export function initDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    // Handle case where IndexedDB is not available (testing environment)
    if (!isIndexedDBAvailable || typeof indexedDB === 'undefined') {
      console.warn('IndexedDB not available, using in-memory fallback');
      // Return a mock database that won't actually persist
      resolve({
        transaction: () => ({ objectStore: () => ({ put: () => ({}), get: () => ({}) }) }),
      });
      return;
    }

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB initialization failed:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        db = request.result;
        console.log('✓ IndexedDB initialized successfully');
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const database = event.target.result;

        // Create object stores
        if (!database.objectStoreNames.contains('hydrography')) {
          database.createObjectStore('hydrography', { keyPath: 'id' });
        }
        if (!database.objectStoreNames.contains('demTiles')) {
          database.createObjectStore('demTiles', { keyPath: 'tileId' });
        }
        if (!database.objectStoreNames.contains('calculations')) {
          database.createObjectStore('calculations', { keyPath: 'id', autoIncrement: true });
        }
        if (!database.objectStoreNames.contains('config')) {
          database.createObjectStore('config', { keyPath: 'key' });
        }

        console.log('✓ IndexedDB schema created');
      };
    } catch (err) {
      console.error('Error initializing IndexedDB:', err);
      reject(err);
    }
  });
}

/**
 * Store hydrography data
 * @param {Object} data - Hydrography GeoJSON data
 * @returns {Promise}
 */
export function storeHydrography(data) {
  return initDB().then((database) => {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(['hydrography'], 'readwrite');
      const store = transaction.objectStore('hydrography');
      const request = store.put(data);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log('✓ Hydrography data stored');
        resolve(request.result);
      };
    });
  });
}

/**
 * Load hydrography data
 * @param {string} id - Data ID
 * @returns {Promise}
 */
export function loadHydrography(id = 'mt-hydrography') {
  return initDB().then((database) => {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(['hydrography'], 'readonly');
      const store = transaction.objectStore('hydrography');
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        if (request.result) {
          console.log('✓ Hydrography data loaded');
        }
        resolve(request.result);
      };
    });
  });
}

/**
 * Cache DEM tile
 * @param {string} tileId - Tile identifier
 * @param {ArrayBuffer} tileData - Tile raster data
 * @returns {Promise}
 */
export function cacheDemTile(tileId, tileData) {
  return initDB().then((database) => {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(['demTiles'], 'readwrite');
      const store = transaction.objectStore('demTiles');
      const request = store.put({ tileId, data: tileData, timestamp: Date.now() });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log(`✓ DEM tile cached: ${tileId}`);
        resolve(request.result);
      };
    });
  });
}

/**
 * Get cached DEM tile
 * @param {string} tileId - Tile identifier
 * @returns {Promise}
 */
export function getCachedDemTile(tileId) {
  return initDB().then((database) => {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(['demTiles'], 'readonly');
      const store = transaction.objectStore('demTiles');
      const request = store.get(tileId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  });
}

/**
 * Save calculation result
 * @param {Object} calculation - Calculation data
 * @returns {Promise}
 */
export function saveCalculation(calculation) {
  return initDB().then((database) => {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(['calculations'], 'readwrite');
      const store = transaction.objectStore('calculations');
      const data = {
        ...calculation,
        timestamp: Date.now(),
      };
      const request = store.add(data);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log('✓ Calculation saved');
        resolve(request.result);
      };
    });
  });
}

/**
 * Get all calculations
 * @returns {Promise}
 */
export function getAllCalculations() {
  return initDB().then((database) => {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(['calculations'], 'readonly');
      const store = transaction.objectStore('calculations');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log(`✓ Loaded ${request.result.length} calculations`);
        resolve(request.result);
      };
    });
  });
}

/**
 * Save configuration
 * @param {string} key - Config key
 * @param {*} value - Config value
 * @returns {Promise}
 */
export function saveConfig(key, value) {
  return initDB().then((database) => {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(['config'], 'readwrite');
      const store = transaction.objectStore('config');
      const request = store.put({ key, value });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log(`✓ Config saved: ${key}`);
        resolve(request.result);
      };
    });
  });
}

/**
 * Get configuration
 * @param {string} key - Config key
 * @returns {Promise}
 */
export function getConfig(key) {
  return initDB().then((database) => {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(['config'], 'readonly');
      const store = transaction.objectStore('config');
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result?.value);
    });
  });
}

console.log('✓ Storage manager ready');
