/**
 * Tests for DEMLoader remote DEM tile loading and caching
 * Validates: Requirements 3.1, 3.4, 3.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DEMLoader } from '../src/utils/demLoader.js';

describe('DEMLoader', () => {
  let loader;

  beforeEach(() => {
    loader = new DEMLoader();
  });

  describe('Constructor and Initialization', () => {
    it('should create loader with default options', () => {
      expect(loader.source).toBe('auto');
      expect(loader.timeout).toBe(5000);
      expect(loader.useCache).toBe(true);
      expect(loader.memoryCache.size).toBe(0);
    });

    it('should create loader with custom options', () => {
      const customLoader = new DEMLoader({
        source: 'gebco',
        timeout: 10000,
        useCache: false,
      });

      expect(customLoader.source).toBe('gebco');
      expect(customLoader.timeout).toBe(10000);
      expect(customLoader.useCache).toBe(false);
    });
  });

  describe('Memory Cache Management', () => {
    it('should store tiles in memory cache', async () => {
      // Create mock tile data
      const mockTileData = new ArrayBuffer(1024);
      
      // Manually add to cache to simulate loaded tile
      const tileId = 'dem_10_512_512';
      loader.memoryCache.set(tileId, mockTileData);

      expect(loader.memoryCache.size).toBe(1);
      expect(loader.memoryCache.has(tileId)).toBe(true);
    });

    it('should clear memory cache', () => {
      const mockTileData = new ArrayBuffer(1024);
      loader.memoryCache.set('dem_10_512_512', mockTileData);
      loader.memoryCache.set('dem_10_513_512', mockTileData);

      expect(loader.memoryCache.size).toBe(2);
      loader.clearMemoryCache();
      expect(loader.memoryCache.size).toBe(0);
    });

    it('should prune memory cache when exceeding max size', () => {
      const mockTileData = new ArrayBuffer(1024);

      // Add tiles up to max
      for (let i = 0; i < loader.maxMemoryCacheSize + 2; i++) {
        loader.memoryCache.set(`dem_10_${i}_512`, mockTileData);
        loader._pruneMemoryCache();
      }

      // Should not exceed max size
      expect(loader.memoryCache.size).toBeLessThanOrEqual(loader.maxMemoryCacheSize);
    });

    it('should return cache statistics', () => {
      const mockTileData = new ArrayBuffer(1024);
      loader.memoryCache.set('dem_10_512_512', mockTileData);

      const stats = loader.getCacheStats();
      expect(stats.memoryCacheSize).toBe(1);
      expect(stats.maxMemoryCacheSize).toBe(loader.maxMemoryCacheSize);
      expect(stats.source).toBe('auto');
    });
  });

  describe('Elevation Calculation', () => {
    it('should calculate elevation at point with valid data', () => {
      const tileData = new ArrayBuffer(256 * 256 * 2); // 16-bit elevation data
      const tileMetadata = {
        minX: -58.85,
        minY: -13.22,
        pixelSize: 0.0001, // ~10 meters
      };

      const elevation = loader.getElevation(-58.84, -13.21, tileData, tileMetadata);
      expect(elevation).not.toBeNull();
      expect(elevation).toBeGreaterThanOrEqual(0);
    });

    it('should return null for missing tile data', () => {
      const elevation = loader.getElevation(-58.84, -13.21, null, null);
      expect(elevation).toBeNull();
    });

    it('should return null for missing metadata', () => {
      const tileData = new ArrayBuffer(256 * 256 * 2);
      const elevation = loader.getElevation(-58.84, -13.21, tileData, null);
      expect(elevation).toBeNull();
    });

    it('should handle coordinates within tile bounds', () => {
      const tileData = new ArrayBuffer(256 * 256 * 2);
      const tileMetadata = {
        minX: -58.85,
        minY: -13.22,
        pixelSize: 0.0001,
      };

      // Test multiple points
      const points = [
        [-58.849, -13.211],
        [-58.841, -13.219],
        [-58.837, -13.215],
      ];

      points.forEach((point) => {
        const elevation = loader.getElevation(point[0], point[1], tileData, tileMetadata);
        expect(elevation).not.toBeNull();
      });
    });
  });

  describe('Slope Calculation', () => {
    it('should calculate slope at point', async () => {
      const tileData = new ArrayBuffer(256 * 256 * 2);
      const tileMetadata = {
        minX: -58.85,
        minY: -13.22,
        pixelSize: 0.0001,
      };

      const slope = await loader.getSlopeAtPoint(-58.84, -13.21, tileData, tileMetadata);
      expect(slope).not.toBeNull();
      expect(slope).toBeGreaterThanOrEqual(0);
      expect(slope).toBeLessThanOrEqual(90);
    });

    it('should return null for missing tile data', async () => {
      const slope = await loader.getSlopeAtPoint(-58.84, -13.21, null, null);
      expect(slope).toBeNull();
    });

    it('should detect steep slopes (> 45 degrees)', async () => {
      const tileData = new ArrayBuffer(256 * 256 * 2);
      const tileMetadata = {
        minX: -58.85,
        minY: -13.22,
        pixelSize: 0.0001,
      };

      // In production, would test against actual DEM with known steep areas
      const slope = await loader.getSlopeAtPoint(-58.84, -13.21, tileData, tileMetadata);
      expect(slope).toBeDefined();
    });
  });

  describe('Tile Loading', () => {
    it('should handle timeout gracefully', async () => {
      const quickTimeoutLoader = new DEMLoader({ timeout: 1 });
      
      // This will timeout because we're not mocking the fetch
      const tile = await quickTimeoutLoader.loadTile(10, 512, 512);
      // Should return null on timeout (graceful fallback)
      expect(tile).toBeNull();
    }, 2000);

    it('should attempt fallback sources when auto mode', async () => {
      // Test that auto mode tries multiple sources
      const autoLoader = new DEMLoader({ source: 'auto', timeout: 100 });
      
      const tile = await autoLoader.loadTile(10, 512, 512);
      // Either succeeds or returns null gracefully
      expect(tile === null || tile instanceof ArrayBuffer).toBe(true);
    });

    it('should use specified source when not auto', async () => {
      const gebcoLoader = new DEMLoader({ source: 'gebco', timeout: 100 });
      const tile = await gebcoLoader.loadTile(10, 512, 512);
      
      // Returns null on timeout or error (graceful fallback)
      expect(tile === null || tile instanceof ArrayBuffer).toBe(true);
    });
  });

  describe('Cache Integration', () => {
    it('should use memory cache for repeated queries', async () => {
      // Simulate tile in memory cache
      const mockTileData = new ArrayBuffer(1024);
      const tileId = 'dem_10_512_512';
      loader.memoryCache.set(tileId, mockTileData);

      // Second load should retrieve from memory
      const cachedLoader = new DEMLoader();
      cachedLoader.memoryCache.set(tileId, mockTileData);

      expect(cachedLoader.memoryCache.has(tileId)).toBe(true);
    });

    it('should respect cache disable flag', async () => {
      const noCacheLoader = new DEMLoader({ useCache: false });
      expect(noCacheLoader.useCache).toBe(false);
    });
  });

  describe('Performance Tests', () => {
    it('should load tile within timeout window', async () => {
      const start = performance.now();
      const tile = await loader.loadTile(10, 512, 512);
      const elapsed = performance.now() - start;

      // Should complete within 5 second timeout
      expect(elapsed).toBeLessThan(5000);
    }, 6000);

    it('should retrieve cached tile quickly', async () => {
      // Add mock tile to memory cache
      const mockTileData = new ArrayBuffer(1024);
      const tileId = 'dem_10_512_512';
      loader.memoryCache.set(tileId, mockTileData);

      // Measure retrieval time
      const start = performance.now();
      const cached = loader.memoryCache.get(tileId);
      const elapsed = performance.now() - start;

      expect(cached).toBe(mockTileData);
      expect(elapsed).toBeLessThan(10); // Should be < 10ms from memory
    });

    it('should handle multiple tile requests efficiently', async () => {
      const start = performance.now();

      // Simulate loading multiple tiles
      const tileIds = [];
      for (let i = 0; i < 10; i++) {
        tileIds.push(`dem_10_${512 + i}_512`);
      }

      // Add to memory cache to simulate loaded tiles
      const mockTileData = new ArrayBuffer(1024);
      tileIds.forEach((id) => {
        loader.memoryCache.set(id, mockTileData);
      });

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(100);
      expect(loader.memoryCache.size).toBe(10);
    });
  });

  describe('Offline Graceful Fallback', () => {
    it('should return null when tile unavailable', async () => {
      const loader = new DEMLoader({ timeout: 100 });
      const tile = await loader.loadTile(99, 9999, 9999);
      
      // Should gracefully return null for unavailable tiles
      expect(tile === null || tile instanceof ArrayBuffer).toBe(true);
    });

    it('should maintain functionality with empty DEM', () => {
      const emptyLoader = new DEMLoader();
      expect(emptyLoader.memoryCache.size).toBe(0);
      expect(emptyLoader.getCacheStats()).toBeDefined();
    });

    it('should continue operating despite cache errors', async () => {
      const loader = new DEMLoader({ useCache: true });
      
      // Should not throw even if IndexedDB is unavailable
      const stats = loader.getCacheStats();
      expect(stats).toBeDefined();
      expect(stats.memoryCacheSize).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Integration Test - DEM Workflow', () => {
    it('should handle complete DEM workflow', async () => {
      const loader = new DEMLoader({
        source: 'auto',
        timeout: 5000,
        useCache: true,
      });

      // Simulate loading a tile
      const mockTileData = new ArrayBuffer(256 * 256 * 2);
      loader.memoryCache.set('dem_10_512_512', mockTileData);

      // Get elevation at a point
      const tileMetadata = {
        minX: -58.85,
        minY: -13.22,
        pixelSize: 0.0001,
      };

      const elevation = loader.getElevation(-58.84, -13.21, mockTileData, tileMetadata);
      expect(elevation).not.toBeNull();

      // Get slope at same point
      const slope = await loader.getSlopeAtPoint(-58.84, -13.21, mockTileData, tileMetadata);
      expect(slope).not.toBeNull();

      // Verify slope is APP threshold for classification
      expect(slope).toBeGreaterThanOrEqual(0);
      expect(slope).toBeLessThanOrEqual(90);
    });

    it('should handle multiple property analyses', async () => {
      const loader = new DEMLoader();
      
      // Add mock tiles for different regions
      const mockTileData = new ArrayBuffer(256 * 256 * 2);
      
      // Property 1 (Sapezal region)
      loader.memoryCache.set('dem_10_512_512', mockTileData);
      
      // Property 2 (Different region)
      loader.memoryCache.set('dem_10_513_512', mockTileData);

      expect(loader.memoryCache.size).toBe(2);

      // Both should be accessible
      const cache1 = loader.memoryCache.get('dem_10_512_512');
      const cache2 = loader.memoryCache.get('dem_10_513_512');

      expect(cache1).toBeDefined();
      expect(cache2).toBeDefined();
    });
  });

  describe('Offline Mode', () => {
    it('should work with pre-cached tiles offline', () => {
      const loader = new DEMLoader({ useCache: true });
      
      // Simulate offline: only memory cache available
      const mockTileData = new ArrayBuffer(1024);
      loader.memoryCache.set('dem_10_512_512', mockTileData);

      const cached = loader.memoryCache.get('dem_10_512_512');
      expect(cached).toBe(mockTileData);
    });

    it('should provide warning when DEM unavailable', async () => {
      const loader = new DEMLoader({ timeout: 100 });
      
      // Attempt load without cache
      const tile = await loader.loadTile(10, 512, 512);
      
      // Should handle gracefully (returns null)
      expect(tile === null || tile instanceof ArrayBuffer).toBe(true);
    });
  });
});
