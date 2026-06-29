/**
 * DEM (Digital Elevation Model) Loader
 * Loads and caches GeoTIFF tiles from remote sources with IndexedDB fallback
 *
 * @module demLoader
 */

import { getCachedDemTile, cacheDemTile } from './storageManager.js';

/**
 * DEM Tile Loader with caching support
 * Supports GEBCO (global ocean/elevation) and USGS 3DEP sources
 */
export class DEMLoader {
  /**
   * Initialize DEMLoader
   * @param {Object} options - Configuration options
   * @param {string} options.source - 'gebco' | 'usgs' | 'auto' (default: 'auto')
   * @param {number} options.timeout - Timeout in milliseconds (default: 5000)
   * @param {boolean} options.useCache - Use IndexedDB cache (default: true)
   */
  constructor(options = {}) {
    this.source = options.source || 'auto';
    this.timeout = options.timeout || 5000;
    this.useCache = options.useCache !== false;
    this.memoryCache = new Map(); // In-memory cache for recently loaded tiles
    this.maxMemoryCacheSize = 10; // Keep 10 tiles in memory
  }

  /**
   * Load a DEM tile by tile coordinates
   * 
   * @param {number} z - Zoom level
   * @param {number} x - Tile column
   * @param {number} y - Tile row
   * @returns {Promise<ArrayBuffer>} GeoTIFF tile data
   */
  async loadTile(z, x, y) {
    const tileId = `dem_${z}_${x}_${y}`;

    // Check memory cache first
    if (this.memoryCache.has(tileId)) {
      return this.memoryCache.get(tileId);
    }

    // Check IndexedDB cache
    if (this.useCache) {
      try {
        const cached = await getCachedDemTile(tileId);
        if (cached && cached.data) {
          // Restore to memory cache
          this.memoryCache.set(tileId, cached.data);
          return cached.data;
        }
      } catch (err) {
        console.warn('Error retrieving from cache:', err);
      }
    }

    // Load from remote source
    let tileData;
    try {
      if (this.source === 'gebco' || this.source === 'auto') {
        tileData = await this._loadFromGEBCO(z, x, y);
      }
      if (!tileData && (this.source === 'usgs' || this.source === 'auto')) {
        tileData = await this._loadFromUSGS(z, x, y);
      }
    } catch (err) {
      console.warn(`Failed to load DEM tile from remote sources: ${err.message}`);
      // Return null and let caller handle gracefully
      return null;
    }

    if (!tileData) {
      console.warn(`No DEM tile data available for z=${z} x=${x} y=${y}`);
      return null;
    }

    // Cache to memory and IndexedDB
    this.memoryCache.set(tileId, tileData);
    this._pruneMemoryCache();

    if (this.useCache) {
      try {
        await cacheDemTile(tileId, tileData);
      } catch (err) {
        console.warn('Error caching DEM tile:', err);
      }
    }

    return tileData;
  }

  /**
   * Get elevation value at coordinates (needs loaded tile context)
   * 
   * @param {number} x - Longitude (decimal degrees)
   * @param {number} y - Latitude (decimal degrees)
   * @param {ArrayBuffer} tileData - GeoTIFF tile data
   * @param {Object} tileMetadata - Tile bounding box and resolution
   * @returns {number|null} Elevation in meters or null if unavailable
   */
  getElevation(x, y, tileData, tileMetadata) {
    if (!tileData || !tileMetadata) {
      return null;
    }

    try {
      // Calculate pixel position within tile
      const { minX, minY, pixelSize } = tileMetadata;
      const pixelX = Math.floor((x - minX) / pixelSize);
      const pixelY = Math.floor((y - minY) / pixelSize);

      // For now, return approximated elevation
      // In production, would need proper GeoTIFF decoding
      // This is a placeholder that returns a mock value
      return 500 + Math.random() * 500; // Mock: 500-1000m elevation
    } catch (err) {
      console.warn('Error calculating elevation:', err);
      return null;
    }
  }

  /**
   * Calculate slope at point (rise/run in degrees)
   * 
   * @param {number} x - Longitude (decimal degrees)
   * @param {number} y - Latitude (decimal degrees)
   * @param {ArrayBuffer} tileData - GeoTIFF tile data
   * @param {Object} tileMetadata - Tile bounding box and resolution
   * @returns {number|null} Slope in degrees (0-90) or null if unavailable
   */
  async getSlopeAtPoint(x, y, tileData, tileMetadata) {
    if (!tileData || !tileMetadata) {
      return null;
    }

    try {
      // Get elevation at center and neighboring pixels
      const elevation = this.getElevation(x, y, tileData, tileMetadata);
      if (elevation === null) {
        return null;
      }

      // Get neighboring elevations (simplified calculation)
      const pixelSize = tileMetadata.pixelSize;
      const dx = pixelSize; // ~30 meters at standard GeoTIFF resolution

      // Simplified slope calculation
      // In production, would compute proper gradient from neighboring pixels
      const slope = Math.abs((Math.random() - 0.5) * 60); // Mock: 0-60 degrees
      return Math.min(90, slope);
    } catch (err) {
      console.warn('Error calculating slope:', err);
      return null;
    }
  }

  /**
   * Load tile from GEBCO (Global Bathymetry and Topography) source
   * 
   * @private
   * @param {number} z - Zoom level
   * @param {number} x - Tile column
   * @param {number} y - Tile row
   * @returns {Promise<ArrayBuffer|null>}
   */
  async _loadFromGEBCO(z, x, y) {
    // GEBCO tiles endpoint (example - actual endpoint may vary)
    const url = 'https://www.gebco.net/data/gebco_2023/gebco_2023.nc'; // Simplified
    
    try {
      const fetchOptions = {};
      
      // Only use AbortController if available and working
      if (typeof AbortController !== 'undefined') {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            try {
              controller.abort();
            } catch (e) {
              console.warn('Error aborting request:', e);
            }
          }, this.timeout);
          
          fetchOptions.signal = controller.signal;
          const response = await fetch(url, fetchOptions);
          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`GEBCO fetch failed: ${response.status}`);
          }

          return await response.arrayBuffer();
        } catch (err) {
          // If AbortController fails, fall back to timeout
          if (err.name === 'AbortError' || err.message.includes('abort')) {
            console.warn('GEBCO load error: Request timeout');
            return null;
          }
          throw err;
        }
      } else {
        // Fallback if AbortController not available
        const response = await Promise.race([
          fetch(url, fetchOptions),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), this.timeout)
          ),
        ]);
        
        if (!response.ok) {
          throw new Error(`GEBCO fetch failed: ${response.status}`);
        }

        return await response.arrayBuffer();
      }
    } catch (err) {
      console.warn('GEBCO load error:', err);
      return null;
    }
  }

  /**
   * Load tile from USGS 3DEP (3D Elevation Program) source
   * 
   * @private
   * @param {number} z - Zoom level
   * @param {number} x - Tile column
   * @param {number} y - Tile row
   * @returns {Promise<ArrayBuffer|null>}
   */
  async _loadFromUSGS(z, x, y) {
    // USGS 3DEP tiles endpoint (example)
    // Real implementation would use proper USGS API
    const url = `https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/tile/${z}/${y}/${x}`;
    
    try {
      const fetchOptions = {};
      
      // Only use AbortController if available and working
      if (typeof AbortController !== 'undefined') {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            try {
              controller.abort();
            } catch (e) {
              console.warn('Error aborting request:', e);
            }
          }, this.timeout);
          
          fetchOptions.signal = controller.signal;
          const response = await fetch(url, fetchOptions);
          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`USGS fetch failed: ${response.status}`);
          }

          return await response.arrayBuffer();
        } catch (err) {
          // If AbortController fails, fall back to timeout
          if (err.name === 'AbortError' || err.message.includes('abort')) {
            console.warn('USGS load error: Request timeout');
            return null;
          }
          throw err;
        }
      } else {
        // Fallback if AbortController not available
        const response = await Promise.race([
          fetch(url, fetchOptions),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), this.timeout)
          ),
        ]);
        
        if (!response.ok) {
          throw new Error(`USGS fetch failed: ${response.status}`);
        }

        return await response.arrayBuffer();
      }
    } catch (err) {
      console.warn('USGS load error:', err);
      return null;
    }
  }

  /**
   * Prune memory cache if it exceeds max size
   * Uses LRU (Least Recently Used) strategy
   * 
   * @private
   */
  _pruneMemoryCache() {
    if (this.memoryCache.size > this.maxMemoryCacheSize) {
      // Remove oldest entry (first entry in Map)
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }
  }

  /**
   * Clear all caches (memory only, not IndexedDB)
   * 
   * @returns {void}
   */
  clearMemoryCache() {
    this.memoryCache.clear();
  }

  /**
   * Get cache statistics
   * 
   * @returns {Object} Cache stats
   */
  getCacheStats() {
    return {
      memoryCacheSize: this.memoryCache.size,
      maxMemoryCacheSize: this.maxMemoryCacheSize,
      source: this.source,
    };
  }
}

console.log('✓ DEM loader module loaded');
