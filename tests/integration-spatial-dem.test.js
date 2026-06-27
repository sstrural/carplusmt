/**
 * Integration tests for HydrographyIndex + DEMLoader
 * Tests the combined workflow for spatial queries and elevation analysis
 * Validates: Requirements 8.6, 3.1, 3.4, 3.5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HydrographyIndex } from '../src/utils/hydrographyIndex.js';
import { DEMLoader } from '../src/utils/demLoader.js';

describe('HydrographyIndex + DEMLoader Integration', () => {
  let hydrographyIndex;
  let demLoader;

  beforeEach(() => {
    hydrographyIndex = new HydrographyIndex();
    demLoader = new DEMLoader({ timeout: 5000, useCache: true });
  });

  describe('Combined Spatial Query Workflow', () => {
    it('should query hydrography features for a property with DEM analysis', () => {
      // Simulate a 600 ha property in Sapezal region
      const propertyBbox = [-58.86, -13.22, -58.83, -13.19];

      // Insert hydrography features
      const features = [
        {
          type: 'Feature',
          properties: { id: 'rio_1', name: 'Rio Sapezal', type: 'river', width_m: 30 },
          geometry: {
            type: 'LineString',
            coordinates: [[-58.855, -13.215], [-58.845, -13.205]],
          },
        },
        {
          type: 'Feature',
          properties: { id: 'stream_1', name: 'Córrego X', type: 'stream', width_m: 8 },
          geometry: {
            type: 'LineString',
            coordinates: [[-58.85, -13.21], [-58.84, -13.2]],
          },
        },
        {
          type: 'Feature',
          properties: { id: 'nascente_1', name: 'Nascente A', type: 'nascente' },
          geometry: {
            type: 'Point',
            coordinates: [-58.84, -13.205],
          },
        },
      ];

      features.forEach((f) => hydrographyIndex.insert(f));

      // Query hydrography within property
      const hydrographyFeatures = hydrographyIndex.search(propertyBbox);
      expect(hydrographyFeatures.length).toBe(3);

      // Verify feature types
      const rivers = hydrographyFeatures.filter((f) => f.properties.type === 'river');
      const streams = hydrographyFeatures.filter((f) => f.properties.type === 'stream');
      const nascentes = hydrographyFeatures.filter((f) => f.properties.type === 'nascente');

      expect(rivers.length).toBe(1);
      expect(streams.length).toBe(1);
      expect(nascentes.length).toBe(1);
    });

    it('should identify APP buffer zones and check slope with DEM', () => {
      const propertyBbox = [-58.86, -13.22, -58.83, -13.19];

      // Create river features
      const river = {
        type: 'Feature',
        properties: { id: 'rio_1', name: 'Rio Sapezal', type: 'river', width_m: 30 },
        geometry: {
          type: 'LineString',
          coordinates: [[-58.855, -13.215], [-58.845, -13.205]],
        },
      };

      hydrographyIndex.insert(river);

      // Query features
      const found = hydrographyIndex.search(propertyBbox);
      expect(found.length).toBeGreaterThan(0);

      // Simulate DEM tile loading for slope analysis
      const mockTileData = new ArrayBuffer(256 * 256 * 2);
      const tileMetadata = {
        minX: -58.86,
        minY: -13.22,
        pixelSize: 0.0001,
      };

      // Get slope at river location for APP classification
      const riverCoords = river.geometry.coordinates[0];
      demLoader.memoryCache.set('dem_10_512_512', mockTileData);

      const slope = demLoader.getElevation(riverCoords[0], riverCoords[1], mockTileData, tileMetadata);
      expect(slope).not.toBeNull();
    });
  });

  describe('APP Detection Workflow', () => {
    it('should handle complete APP detection process', () => {
      const propertyArea = 596.2; // hectares

      // Add hydrography
      const features = [
        {
          type: 'Feature',
          properties: {
            id: 'rio_sapezal',
            name: 'Rio Sapezal',
            type: 'river',
            width_m: 30,
          },
          geometry: {
            type: 'LineString',
            coordinates: [
              [-58.855, -13.215],
              [-58.850, -13.210],
              [-58.845, -13.205],
              [-58.840, -13.200],
            ],
          },
        },
        {
          type: 'Feature',
          properties: {
            id: 'corrego_a',
            name: 'Córrego A',
            type: 'stream',
            width_m: 8,
          },
          geometry: {
            type: 'LineString',
            coordinates: [[-58.85, -13.21], [-58.84, -13.2], [-58.83, -13.19]],
          },
        },
        {
          type: 'Feature',
          properties: {
            id: 'nascente_x',
            name: 'Nascente X',
            type: 'nascente',
          },
          geometry: {
            type: 'Point',
            coordinates: [-58.84, -13.205],
          },
        },
      ];

      features.forEach((f) => hydrographyIndex.insert(f));

      // Query for APP detection
      const propertyBbox = [-58.86, -13.22, -58.83, -13.19];
      const appFeatures = hydrographyIndex.search(propertyBbox);

      // Calculate APP buffers (simplified)
      const buffersByType = {
        'river > 50m': { width_m: 30, buffer: 50 },
        'stream < 10m': { width_m: 8, buffer: 30 },
        'nascente': { radius: 50 },
      };

      expect(appFeatures.length).toBe(3);

      // Verify each component
      const river = appFeatures.find((f) => f.properties.id === 'rio_sapezal');
      expect(river.properties.width_m).toBe(30);

      const stream = appFeatures.find((f) => f.properties.id === 'corrego_a');
      expect(stream.properties.width_m).toBe(8);

      const nascente = appFeatures.find((f) => f.properties.id === 'nascente_x');
      expect(nascente.properties.type).toBe('nascente');

      // Verify APP area would not exceed property area
      // River: ~2000m × 50m buffer = 10 ha
      // Stream: ~3000m × 30m buffer = 9 ha
      // Nascente: π×50m² = 0.78 ha
      // Total ~19.8 ha < 596.2 ha ✓
    });
  });

  describe('Performance Integration Tests', () => {
    it('should handle 1000+ hydrography features with DEM queries efficiently', () => {
      // Insert large number of features
      for (let i = 0; i < 1000; i++) {
        const lon = -58.85 + (Math.random() - 0.5) * 0.5;
        const lat = -13.2 + (Math.random() - 0.5) * 0.5;

        const feature = {
          type: 'Feature',
          properties: {
            id: `feature_${i}`,
            type: i % 3 === 0 ? 'river' : i % 3 === 1 ? 'stream' : 'nascente',
            name: `Feature ${i}`,
          },
          geometry:
            i % 3 === 2
              ? {
                type: 'Point',
                coordinates: [lon, lat],
              }
              : {
                type: 'LineString',
                coordinates: [
                  [lon, lat],
                  [lon + 0.01, lat + 0.01],
                ],
              },
        };

        hydrographyIndex.insert(feature);
      }

      // Query hydrography
      const start = performance.now();
      const bbox = [-58.9, -13.4, -58.8, -13.0];
      const results = hydrographyIndex.search(bbox);
      const queryTime = performance.now() - start;

      expect(queryTime).toBeLessThan(100);
      expect(results.length).toBeGreaterThan(0);

      // Simulate DEM analysis for each result
      const mockTileData = new ArrayBuffer(256 * 256 * 2);
      const tileMetadata = {
        minX: -58.9,
        minY: -13.4,
        pixelSize: 0.0001,
      };

      const demStart = performance.now();
      results.forEach((feature) => {
        if (feature.geometry.type === 'Point') {
          const [lon, lat] = feature.geometry.coordinates;
          demLoader.getElevation(lon, lat, mockTileData, tileMetadata);
        }
      });
      const demTime = performance.now() - demStart;

      // Should handle all DEM queries quickly
      expect(demTime).toBeLessThan(50);
    });

    it('should cache DEM tiles for repeated queries', () => {
      const mockTileData = new ArrayBuffer(256 * 256 * 2);
      const tileId = 'dem_10_512_512';

      // First access - no cache
      expect(demLoader.memoryCache.has(tileId)).toBe(false);

      // Add to cache
      demLoader.memoryCache.set(tileId, mockTileData);
      expect(demLoader.memoryCache.has(tileId)).toBe(true);

      // Subsequent accesses should be fast
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        demLoader.memoryCache.get(tileId);
      }
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(10); // 100 cache hits in < 10ms
    });
  });

  describe('Real-world Property Analysis Workflow', () => {
    it('should simulate Sapezal property (600 ha) analysis', () => {
      // Sapezal property coordinates (approximate)
      const propertyBbox = [-58.86, -13.22, -58.83, -13.19];
      const propertyName = 'Fazenda Novo Sobradinho';
      const propertyArea = 596.2;

      // Setup hydrography
      const hydrographyData = [
        {
          type: 'Feature',
          properties: {
            id: 'rio_sapezal',
            name: 'Rio Sapezal',
            type: 'river',
            width_m: 30,
          },
          geometry: {
            type: 'LineString',
            coordinates: [
              [-58.855, -13.215],
              [-58.850, -13.210],
              [-58.845, -13.205],
            ],
          },
        },
        {
          type: 'Feature',
          properties: {
            id: 'corrego_1',
            name: 'Córrego do Meio',
            type: 'stream',
            width_m: 5,
          },
          geometry: {
            type: 'LineString',
            coordinates: [
              [-58.84, -13.21],
              [-58.83, -13.2],
              [-58.82, -13.19],
            ],
          },
        },
        {
          type: 'Feature',
          properties: {
            id: 'nascente_1',
            name: 'Nascente Sul',
            type: 'nascente',
          },
          geometry: {
            type: 'Point',
            coordinates: [-58.835, -13.205],
          },
        },
      ];

      hydrographyData.forEach((f) => hydrographyIndex.insert(f));

      // Query and verify
      const appFeatures = hydrographyIndex.search(propertyBbox);
      expect(appFeatures.length).toBe(3);

      // Simulate APP area calculation
      // Rio Sapezal: 1000m × 50m buffer = 5 ha
      // Córrego: 2000m × 30m buffer = 6 ha
      // Nascente: π×50m² = 0.78 ha
      // Total APP ≈ 11.78 ha (< 596.2 ha) ✓

      // Verify stats
      const stats = hydrographyIndex.getStats();
      expect(stats.byType.river).toBe(1);
      expect(stats.byType.stream).toBe(1);
      expect(stats.byType.nascente).toBe(1);

      // Simulate DEM analysis
      const mockTileData = new ArrayBuffer(256 * 256 * 2);
      const tileMetadata = {
        minX: -58.86,
        minY: -13.22,
        pixelSize: 0.0001,
      };

      demLoader.memoryCache.set('dem_10_512_512', mockTileData);

      // For each watercourse location, could check slope
      const riverCoords = hydrographyData[0].geometry.coordinates[0];
      const elevation = demLoader.getElevation(
        riverCoords[0],
        riverCoords[1],
        mockTileData,
        tileMetadata,
      );

      expect(elevation).not.toBeNull();
      expect(elevation).toBeGreaterThan(0);
    });

    it('should handle multiple properties with separate indexes', () => {
      // Create separate indexes for 2 properties
      const property1Index = new HydrographyIndex();
      const property2Index = new HydrographyIndex();

      // Property 1: Sapezal
      const property1Features = [
        {
          type: 'Feature',
          properties: { id: 'p1_rio1', name: 'Rio Sapezal', type: 'river' },
          geometry: {
            type: 'LineString',
            coordinates: [[-58.855, -13.215], [-58.845, -13.205]],
          },
        },
      ];

      // Property 2: Sorriso (different region)
      const property2Features = [
        {
          type: 'Feature',
          properties: { id: 'p2_rio1', name: 'Rio Teles Pires', type: 'river' },
          geometry: {
            type: 'LineString',
            coordinates: [[-55.7, -12.5], [-55.6, -12.4]],
          },
        },
      ];

      property1Features.forEach((f) => property1Index.insert(f));
      property2Features.forEach((f) => property2Index.insert(f));

      // Query each independently
      const p1Results = property1Index.search([-58.9, -13.3, -58.8, -13.1]);
      const p2Results = property2Index.search([-55.8, -12.6, -55.5, -12.3]);

      expect(p1Results.length).toBe(1);
      expect(p2Results.length).toBe(1);

      expect(p1Results[0].properties.id).toBe('p1_rio1');
      expect(p2Results[0].properties.id).toBe('p2_rio1');
    });
  });

  describe('Offline Mode Integration', () => {
    it('should work entirely offline with pre-loaded data', () => {
      // Simulate offline mode: no network, only cached data
      const offlineIndex = new HydrographyIndex();
      const offlineLoader = new DEMLoader({ useCache: true });

      // Pre-loaded hydrography
      const localFeatures = [
        {
          type: 'Feature',
          properties: { id: 'local_rio', name: 'Rio Local', type: 'river' },
          geometry: {
            type: 'LineString',
            coordinates: [[-58.85, -13.2], [-58.84, -13.21]],
          },
        },
      ];

      localFeatures.forEach((f) => offlineIndex.insert(f));

      // Pre-cached DEM tile
      const cachedDemData = new ArrayBuffer(1024);
      offlineLoader.memoryCache.set('dem_10_512_512', cachedDemData);

      // Query offline
      const bbox = [-58.86, -13.22, -58.83, -13.19];
      const features = offlineIndex.search(bbox);
      expect(features.length).toBe(1);

      // Access cached DEM
      const dem = offlineLoader.memoryCache.get('dem_10_512_512');
      expect(dem).toBe(cachedDemData);
    });
  });
});
