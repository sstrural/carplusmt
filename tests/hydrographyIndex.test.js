/**
 * Tests for HydrographyIndex spatial index
 * Validates: Requirements 8.6, Non-functional (Performance)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HydrographyIndex } from '../src/utils/hydrographyIndex.js';

describe('HydrographyIndex', () => {
  let index;

  beforeEach(() => {
    index = new HydrographyIndex();
  });

  describe('Constructor and Initialization', () => {
    it('should create index with default max entries', () => {
      expect(index.tree).toBeDefined();
      expect(index.featureMap).toBeDefined();
      expect(index.featureMap.size).toBe(0);
    });

    it('should create index with custom max entries', () => {
      const customIndex = new HydrographyIndex(16);
      expect(customIndex.tree).toBeDefined();
    });
  });

  describe('Insert and Retrieval', () => {
    it('should insert LineString feature (river)', () => {
      const riverFeature = {
        type: 'Feature',
        properties: {
          id: 'rio_1',
          name: 'Rio Sapezal',
          type: 'river',
          width_m: 25,
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [-58.85, -13.2],
            [-58.84, -13.21],
            [-58.83, -13.22],
          ],
        },
      };

      index.insert(riverFeature);
      expect(index.featureMap.size).toBe(1);
      expect(index.featureMap.has('rio_1')).toBe(true);
    });

    it('should insert Point feature (nascente)', () => {
      const nascenteFeature = {
        type: 'Feature',
        properties: {
          id: 'nascente_1',
          name: 'Nascente Córrego X',
          type: 'nascente',
        },
        geometry: {
          type: 'Point',
          coordinates: [-58.85, -13.2],
        },
      };

      index.insert(nascenteFeature);
      expect(index.featureMap.size).toBe(1);
      expect(index.featureMap.has('nascente_1')).toBe(true);
    });

    it('should insert MultiLineString feature', () => {
      const multiLineFeature = {
        type: 'Feature',
        properties: {
          id: 'multi_1',
          name: 'Multi Stream',
          type: 'stream',
        },
        geometry: {
          type: 'MultiLineString',
          coordinates: [
            [[-58.85, -13.2], [-58.84, -13.21]],
            [[-58.83, -13.22], [-58.82, -13.23]],
          ],
        },
      };

      index.insert(multiLineFeature);
      expect(index.featureMap.size).toBe(1);
    });

    it('should reject invalid features', () => {
      index.insert(null);
      index.insert({ properties: { id: 'test' } }); // Missing geometry
      index.insert({ geometry: {} }); // Missing properties
      expect(index.featureMap.size).toBe(0);
    });

    it('should reject unsupported geometry types', () => {
      const invalidFeature = {
        type: 'Feature',
        properties: { id: 'test', type: 'river' },
        geometry: { type: 'Polygon', coordinates: [[[-58.85, -13.2]]] },
      };
      index.insert(invalidFeature);
      expect(index.featureMap.size).toBe(0);
    });
  });

  describe('Bounding Box Search', () => {
    beforeEach(() => {
      // Insert test features
      const river = {
        type: 'Feature',
        properties: { id: 'rio_1', name: 'Rio Sapezal', type: 'river' },
        geometry: {
          type: 'LineString',
          coordinates: [[-58.85, -13.2], [-58.84, -13.21]],
        },
      };

      const stream = {
        type: 'Feature',
        properties: { id: 'stream_1', name: 'Stream A', type: 'stream' },
        geometry: {
          type: 'LineString',
          coordinates: [[-58.83, -13.19], [-58.82, -13.18]],
        },
      };

      const nascente = {
        type: 'Feature',
        properties: { id: 'nascente_1', name: 'Spring', type: 'nascente' },
        geometry: {
          type: 'Point',
          coordinates: [-58.84, -13.2],
        },
      };

      index.insert(river);
      index.insert(stream);
      index.insert(nascente);
    });

    it('should search features within bbox', () => {
      const bbox = [-58.86, -13.22, -58.83, -13.19];
      const results = index.search(bbox);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty results for non-overlapping bbox', () => {
      const bbox = [-60, -15, -59.5, -14.5];
      const results = index.search(bbox);
      expect(results.length).toBe(0);
    });

    it('should reject invalid bbox', () => {
      expect(() => index.search(null)).toThrow();
      expect(() => index.search([1, 2, 3])).toThrow(); // Wrong length
      expect(() => index.search('invalid')).toThrow();
    });

    it('should find all features in large bbox', () => {
      const largeBbox = [-59, -14, -58, -13];
      const results = index.search(largeBbox);
      expect(results.length).toBe(3);
    });
  });

  describe('Distance Query', () => {
    beforeEach(() => {
      const river = {
        type: 'Feature',
        properties: { id: 'rio_1', name: 'Rio Sapezal', type: 'river' },
        geometry: {
          type: 'LineString',
          coordinates: [[-58.85, -13.2], [-58.84, -13.21]],
        },
      };

      const stream = {
        type: 'Feature',
        properties: { id: 'stream_1', name: 'Stream A', type: 'stream' },
        geometry: {
          type: 'LineString',
          coordinates: [[-58.83, -13.19], [-58.82, -13.18]],
        },
      };

      index.insert(river);
      index.insert(stream);
    });

    it('should query features by distance from point', () => {
      const point = [-58.85, -13.2];
      const radiusMeters = 5000; // ~5km
      const results = index.queryByDistance(point, radiusMeters);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty for point far from features', () => {
      const point = [-59.5, -14.5];
      const radiusMeters = 1000; // 1km
      const results = index.queryByDistance(point, radiusMeters);
      expect(results.length).toBe(0);
    });

    it('should reject invalid parameters', () => {
      expect(() => index.queryByDistance(null, 1000)).toThrow();
      expect(() => index.queryByDistance([-58.85], 1000)).toThrow();
      expect(() => index.queryByDistance([-58.85, -13.2], 'invalid')).toThrow();
    });
  });

  describe('Utility Methods', () => {
    it('should return all features', () => {
      const river = {
        type: 'Feature',
        properties: { id: 'rio_1', type: 'river' },
        geometry: { type: 'LineString', coordinates: [[-58.85, -13.2], [-58.84, -13.21]] },
      };

      index.insert(river);
      const all = index.getAll();
      expect(all.length).toBe(1);
      expect(all[0].properties.id).toBe('rio_1');
    });

    it('should clear index', () => {
      const river = {
        type: 'Feature',
        properties: { id: 'rio_1', type: 'river' },
        geometry: { type: 'LineString', coordinates: [[-58.85, -13.2], [-58.84, -13.21]] },
      };

      index.insert(river);
      expect(index.featureMap.size).toBe(1);
      index.clear();
      expect(index.featureMap.size).toBe(0);
    });

    it('should return index statistics', () => {
      const river = {
        type: 'Feature',
        properties: { id: 'rio_1', type: 'river' },
        geometry: { type: 'LineString', coordinates: [[-58.85, -13.2], [-58.84, -13.21]] },
      };

      const nascente = {
        type: 'Feature',
        properties: { id: 'nascente_1', type: 'nascente' },
        geometry: { type: 'Point', coordinates: [-58.85, -13.2] },
      };

      index.insert(river);
      index.insert(nascente);

      const stats = index.getStats();
      expect(stats.totalFeatures).toBe(2);
      expect(stats.byType.river).toBe(1);
      expect(stats.byType.nascente).toBe(1);
    });
  });

  describe('Performance with Large Dataset', () => {
    it('should handle 1000+ features efficiently', () => {
      // Create 1000 random river features
      for (let i = 0; i < 1000; i++) {
        const lon = -58.85 + (Math.random() - 0.5) * 0.5;
        const lat = -13.2 + (Math.random() - 0.5) * 0.5;

        const feature = {
          type: 'Feature',
          properties: { id: `rio_${i}`, type: 'river', name: `Rio ${i}` },
          geometry: {
            type: 'LineString',
            coordinates: [
              [lon, lat],
              [lon + 0.01, lat + 0.01],
            ],
          },
        };

        index.insert(feature);
      }

      expect(index.featureMap.size).toBe(1000);

      // Measure query time
      const start = performance.now();
      const bbox = [-58.9, -13.4, -58.8, -13.0];
      const results = index.search(bbox);
      const elapsed = performance.now() - start;

      // Should complete in < 100ms for 1000 features
      expect(elapsed).toBeLessThan(100);
      console.log(`Query on 1000 features took ${elapsed.toFixed(2)}ms, found ${results.length} results`);
    });

    it('should handle large bounding box efficiently', () => {
      // Insert 500 features in a region
      for (let i = 0; i < 500; i++) {
        const lon = -58.85 + (Math.random() - 0.5) * 0.1;
        const lat = -13.2 + (Math.random() - 0.5) * 0.1;

        const feature = {
          type: 'Feature',
          properties: { id: `rio_${i}`, type: 'river' },
          geometry: {
            type: 'LineString',
            coordinates: [[lon, lat], [lon + 0.01, lat + 0.01]],
          },
        };

        index.insert(feature);
      }

      // Query large bbox (1000+ hectares)
      const start = performance.now();
      const largeBbox = [-59.0, -13.5, -58.7, -13.0];
      const results = index.search(largeBbox);
      const elapsed = performance.now() - start;

      // Should return results in < 100ms
      expect(elapsed).toBeLessThan(100);
      expect(results.length).toBeGreaterThan(0);
      console.log(`Large bbox query took ${elapsed.toFixed(2)}ms, found ${results.length} results`);
    });
  });

  describe('Integration Test - Real-world Scenario', () => {
    it('should handle complete APP detection workflow', () => {
      // Simulate a 600 ha property (Sapezal region)
      const propertyBbox = [-58.86, -13.22, -58.83, -13.19];

      // Add hydrography features
      const features = [
        {
          type: 'Feature',
          properties: { id: 'rio_sapezal', name: 'Rio Sapezal', type: 'river', width_m: 30 },
          geometry: {
            type: 'LineString',
            coordinates: [[-58.855, -13.215], [-58.845, -13.205]],
          },
        },
        {
          type: 'Feature',
          properties: { id: 'stream_1', name: 'Córrego A', type: 'stream', width_m: 8 },
          geometry: {
            type: 'LineString',
            coordinates: [[-58.85, -13.21], [-58.84, -13.2]],
          },
        },
        {
          type: 'Feature',
          properties: { id: 'nascente_1', name: 'Nascente X', type: 'nascente' },
          geometry: {
            type: 'Point',
            coordinates: [-58.84, -13.205],
          },
        },
      ];

      features.forEach((f) => index.insert(f));

      // Query features in property
      const start = performance.now();
      const found = index.search(propertyBbox);
      const elapsed = performance.now() - start;

      expect(found.length).toBe(3);
      expect(elapsed).toBeLessThan(50);

      // Verify feature properties
      const riverFeature = found.find((f) => f.properties.id === 'rio_sapezal');
      expect(riverFeature).toBeDefined();
      expect(riverFeature.properties.width_m).toBe(30);
    });
  });
});
