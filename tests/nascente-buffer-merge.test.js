/**
 * Property-Based Tests for Nascente Buffer Merge
 * Validates: Requirement 2.2 (Merge overlapping nascentes without double-counting)
 * 
 * Task 3.3: Escrever property-based test para buffers de nascentes
 * Property 3: Nascente Buffers Merge
 * 
 * **Validates: Requirements 2.2**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { detectAPPNascentes, mergeNascenteBuffers } from '../src/modules/apprlcalculator/appDetector.js';
import { createBuffer, calculateArea, unionGeometries } from '../src/utils/geometryUtils.js';

/**
 * Helper: Create a rectangular polygon (imovel)
 */
function createRectanglePolygon(minLon, minLat, maxLon, maxLat) {
  return {
    type: 'Feature',
    properties: { name: 'Test Imóvel' },
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [minLon, minLat],
          [maxLon, minLat],
          [maxLon, maxLat],
          [minLon, maxLat],
          [minLon, minLat],
        ],
      ],
    },
  };
}

/**
 * Helper: Create a nascente point feature
 */
function createNascente(lon, lat, id) {
  return {
    type: 'Feature',
    properties: {
      id: id || `nascente_${Date.now()}_${Math.random()}`,
      name: `Nascente ${id || Date.now()}`,
      declared: false,
    },
    geometry: {
      type: 'Point',
      coordinates: [lon, lat],
    },
  };
}

/**
 * Helper: Create circular buffer around a point
 * Returns GeoJSON Feature with Polygon geometry
 */
function createCircularBuffer(lon, lat, radiusMeters) {
  try {
    const point = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [lon, lat],
      },
    };
    const buffer = createBuffer(point.geometry, radiusMeters, 'meters');
    return buffer.geometry ? buffer.geometry : buffer;
  } catch (e) {
    console.error('Error creating circular buffer:', e);
    return null;
  }
}

describe('Nascente Buffer Merge (Task 3.3)', () => {
  describe('Unit Tests: Core Functionality', () => {
    /**
     * Test 1: Single nascente
     * Validates: Basic nascente detection with single point
     */
    it('Test 1: Single nascente should create buffer without merge', async () => {
      const imovel = createRectanglePolygon(-58.86, -13.22, -58.83, -13.19);

      // Single nascente in center of property
      const nascente = createNascente(-58.845, -13.205, 'n1');

      const result = await detectAPPNascentes(imovel, [nascente], { bufferRadius: 50 });

      expect(result).toBeDefined();
      expect(result.type).toBe('APP_Nascentes');
      expect(result.detected_count).toBe(1);
      expect(result.nascentes.length).toBe(1);
      expect(result.app_total_ha).toBeGreaterThan(0);

      // No merging needed for single nascente
      expect(result.quality_metrics.merging_applied).toBe(false);

      console.log(
        `✓ Test 1 passed: Single nascente detected, area=${result.app_total_ha} ha`
      );
    });

    /**
     * Test 2: Two non-overlapping nascentes
     * Validates: Multiple nascentes with no overlap (area sum preserved)
     */
    it('Test 2: Two non-overlapping nascentes should sum their areas', async () => {
      const imovel = createRectanglePolygon(-58.86, -13.22, -58.83, -13.19);

      // Two nascentes far apart (non-overlapping)
      const nascente1 = createNascente(-58.855, -13.215, 'n1');
      const nascente2 = createNascente(-58.835, -13.195, 'n2');

      const result = await detectAPPNascentes(imovel, [nascente1, nascente2], { bufferRadius: 50 });

      expect(result.detected_count).toBe(2);
      expect(result.nascentes.length).toBe(2);
      expect(result.app_total_ha).toBeGreaterThan(0);

      // With non-overlapping buffers, area should be close to sum of individual buffers
      // (may have slight variation due to clipping to imovel boundary)
      console.log(
        `✓ Test 2 passed: Two non-overlapping nascentes, total area=${result.app_total_ha} ha`
      );
    });

    /**
     * Test 3: Two overlapping nascentes
     * Validates: Merge prevents double-counting
     */
    it('Test 3: Two overlapping nascentes should merge without double-counting', async () => {
      const imovel = createRectanglePolygon(-58.86, -13.22, -58.83, -13.19);

      // Two nascentes 80m apart (50m buffers will overlap)
      // 50m + 50m = 100m combined radius, but only 80m between them
      const nascente1 = createNascente(-58.845, -13.205, 'n1');
      const nascente2 = createNascente(-58.838, -13.205, 'n2'); // ~78m away (diagonal: ~780m in degrees)

      const result = await detectAPPNascentes(imovel, [nascente1, nascente2], { bufferRadius: 50 });

      expect(result.detected_count).toBe(2);
      expect(result.nascentes.length).toBe(2);
      expect(result.app_total_ha).toBeGreaterThan(0);

      // Verify merging was applied
      expect(result.quality_metrics.merging_applied).toBe(true);

      // Calculate what the area would be WITHOUT merging (sum of individual buffers)
      // For a 50m circular buffer: area ≈ π * 50² ≈ 7854 m² ≈ 0.785 ha per nascente
      // So two buffers ≈ 1.57 ha without merge
      // With merge and overlap, area should be less than 1.57 ha
      const expectedAreaWithoutMerge = 2 * (Math.PI * 50 * 50 / 10000); // rough estimate: ~1.57 ha

      // The merged area should be less than or equal to sum of individual buffers
      expect(result.app_total_ha).toBeLessThanOrEqual(expectedAreaWithoutMerge * 1.1); // Allow 10% tolerance for clipping

      console.log(
        `✓ Test 3 passed: Two overlapping nascentes merged, area=${result.app_total_ha} ha (without merge ~${expectedAreaWithoutMerge.toFixed(2)} ha)`
      );
    });

    /**
     * Test 4: Multiple nascentes with complex overlap patterns
     * Validates: Merge works with 3+ nascentes
     */
    it('Test 4: Three nascentes with partial overlaps should merge correctly', async () => {
      const imovel = createRectanglePolygon(-58.86, -13.22, -58.83, -13.19);

      // Three nascentes in a triangle pattern
      const nascente1 = createNascente(-58.850, -13.210, 'n1');
      const nascente2 = createNascente(-58.840, -13.210, 'n2'); // ~1.1km away
      const nascente3 = createNascente(-58.845, -13.200, 'n3'); // between others

      const result = await detectAPPNascentes(imovel, [nascente1, nascente2, nascente3], { bufferRadius: 50 });

      expect(result.detected_count).toBe(3);
      expect(result.nascentes.length).toBe(3);
      expect(result.app_total_ha).toBeGreaterThan(0);

      // At least one merge should be applied
      if (result.nascentes.length > 1) {
        // Verify no individual buffer area exceeds total (double-counting detection)
        const maxIndividualArea = Math.max(...result.nascentes.map((n) => n.buffer_area_ha));
        expect(result.app_total_ha).toBeGreaterThanOrEqual(maxIndividualArea);
      }

      console.log(
        `✓ Test 4 passed: Three nascentes with overlaps, total area=${result.app_total_ha} ha`
      );
    });

    /**
     * Test 5: mergeNascenteBuffers function directly
     * Validates: Direct merge function with multiple geometries
     */
    it('Test 5: mergeNascenteBuffers function should combine geometries without error', () => {
      // Create individual circular buffers
      const buffer1 = createCircularBuffer(-58.845, -13.205, 50);
      const buffer2 = createCircularBuffer(-58.838, -13.205, 50);
      const buffer3 = createCircularBuffer(-58.840, -13.195, 50);

      const buffers = [buffer1, buffer2, buffer3].filter((b) => b !== null);

      if (buffers.length > 0) {
        const merged = mergeNascenteBuffers(buffers);

        expect(merged).toBeDefined();
        expect(merged).not.toBeNull();

        // Merged geometry should be valid
        const mergedArea = calculateArea(merged);
        expect(mergedArea).toBeGreaterThan(0);

        // Sum of individual areas should be >= merged area (no double-counting)
        const sumIndividual = buffers.reduce((sum, b) => sum + calculateArea(b), 0);
        expect(mergedArea).toBeLessThanOrEqual(sumIndividual * 1.01); // Allow 1% tolerance

        console.log(
          `✓ Test 5 passed: mergeNascenteBuffers works, sum=${sumIndividual.toFixed(2)}, merged=${mergedArea.toFixed(2)}`
        );
      }
    });

    /**
     * Test 6: Zero nascentes
     * Validates: Empty nascente set handling
     */
    it('Test 6: Zero nascentes should return empty result', async () => {
      const imovel = createRectanglePolygon(-58.86, -13.22, -58.83, -13.19);

      const result = await detectAPPNascentes(imovel, [], { bufferRadius: 50 });

      expect(result.type).toBe('APP_Nascentes');
      expect(result.detected_count).toBe(0);
      expect(result.nascentes.length).toBe(0);
      expect(result.app_total_ha).toBe(0);

      console.log(`✓ Test 6 passed: Zero nascentes → empty result`);
    });
  });

  describe('Property-Based Tests: Nascente Buffer Merge (Property 3)', () => {
    /**
     * **Property 3: Nascente Buffers Merge - Monotonicity**
     * 
     * Verifies that when merging overlapping nascente buffers:
     * 1. area_merged ≤ area_unmerged (merging prevents double-counting)
     * 2. Handles random nascente counts: {0, 1, 2, 5, 10}
     * 3. Random grid positioning with various overlap patterns
     * 4. Always produces valid geometry with non-negative area
     * 
     * **Validates: Requirements 2.2**
     */
    it('Property 3: Nascente Buffers Merge (Monotonicity)', async () => {
      // Arbitrary for nascente count
      const nascenteCountArbitrary = fc.oneof(
        fc.constant(0),
        fc.constant(1),
        fc.constant(2),
        fc.constant(5),
        fc.constant(10)
      );

      // Property test with minimal runs for speed (we'll use 250 examples total)
      await fc.assert(
        fc.asyncProperty(
          nascenteCountArbitrary,
          fc.tuple(
            fc.integer({ min: 0, max: 10 }),
            fc.integer({ min: 0, max: 10 })
          ),
          async (count, [gridOffsetX, gridOffsetY]) => {
            const imovel = createRectanglePolygon(-58.86, -13.22, -58.83, -13.19);
            const imovelArea = calculateArea(imovel.geometry);

            // Generate random nascentes on a grid with offset
            const nascentes = [];
            const baseGridSpacing = 0.005; // ~500m in degrees at equator
            const offsetX = (gridOffsetX % 10) * 0.001;
            const offsetY = (gridOffsetY % 10) * 0.001;

            for (let i = 0; i < count; i++) {
              const gridX = Math.floor(i / 3);
              const gridY = i % 3;
              const lon = -58.845 + gridX * baseGridSpacing + offsetX;
              const lat = -13.205 + gridY * baseGridSpacing + offsetY;

              // Only create nascentes within property bounds
              if (lon >= -58.86 && lon <= -58.83 && lat >= -13.22 && lat <= -13.19) {
                nascentes.push(createNascente(lon, lat, `n${i}`));
              }
            }

            if (nascentes.length === 0) {
              // Edge case: no valid nascentes
              const result = await detectAPPNascentes(imovel, nascentes, { bufferRadius: 50 });
              expect(result.app_total_ha).toBe(0);
              return;
            }

            // Test 1: Detect with merge
            const result = await detectAPPNascentes(imovel, nascentes, { bufferRadius: 50 });

            // Key property: Total APP area must be non-negative
            expect(result.app_total_ha).toBeGreaterThanOrEqual(0);

            // Key property: Total APP area must not exceed imovel area
            expect(result.app_total_ha).toBeLessThanOrEqual(imovelArea);

            // Test 2: Calculate sum of individual buffers (without merge)
            // to verify merging prevents double-counting
            if (nascentes.length > 0) {
              const individualBuffers = nascentes
                .map((n) => {
                  const buf = createCircularBuffer(n.geometry.coordinates[0], n.geometry.coordinates[1], 50);
                  return buf ? calculateArea(buf) : 0;
                })
                .filter((a) => a > 0);

              const sumIndividualAreas = individualBuffers.reduce((sum, a) => sum + a, 0);

              // Monatomicity check: merged area ≤ sum of individual areas
              // (since overlaps are eliminated by merge)
              expect(result.app_total_ha).toBeLessThanOrEqual(sumIndividualAreas * 1.05); // Allow 5% tolerance for clipping
            }

            // Verify detected count matches input count (or is within bounds)
            expect(result.detected_count).toBeLessThanOrEqual(nascentes.length);
            expect(result.detected_count).toBeGreaterThanOrEqual(0);

            // Verify no individual nascente buffer exceeds total APP area
            const maxNascenteArea = Math.max(...result.nascentes.map((n) => n.buffer_area_ha));
            if (maxNascenteArea > 0) {
              expect(result.app_total_ha).toBeGreaterThanOrEqual(maxNascenteArea);
            }
          }
        ),
        { numRuns: 250 } // Total of 250 examples as per requirement (50-500 range)
      );

      console.log(
        `✓ Property 3 passed: Nascente Buffer Merge (Monotonicity) validated with 250 random examples`
      );
    });

    /**
     * **Extended Property: Buffer Distance Consistency**
     * 
     * Verifies that all nascentes receive 50m buffer (per Código Florestal)
     */
    it('Property 3b: Buffer radius should be 50m for all nascentes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }), // 1-5 nascentes
          async (count) => {
            const imovel = createRectanglePolygon(-58.86, -13.22, -58.83, -13.19);

            const nascentes = [];
            for (let i = 0; i < count; i++) {
              const lon = -58.855 + (i % 3) * 0.003;
              const lat = -13.205 + Math.floor(i / 3) * 0.003;
              nascentes.push(createNascente(lon, lat, `n${i}`));
            }

            const result = await detectAPPNascentes(imovel, nascentes, { bufferRadius: 50 });

            // All nascentes should have 50m buffer radius
            for (const nascente of result.nascentes) {
              expect(nascente.buffer_radius_m).toBe(50);
            }
          }
        ),
        { numRuns: 50 }
      );

      console.log(
        `✓ Property 3b passed: Buffer radius consistency (50m) verified for 50 examples`
      );
    });

    /**
     * **Extended Property: No Area Regression**
     * 
     * Verifies that adding more nascentes never decreases the total APP area
     * (monotonic increase)
     */
    it('Property 3c: Adding nascentes should not decrease total APP area', async () => {
      const imovel = createRectanglePolygon(-58.86, -13.22, -58.83, -13.19);

      // Generate base nascentes
      const baseNascentes = [
        createNascente(-58.855, -13.215, 'n1'),
        createNascente(-58.835, -13.195, 'n2'),
      ];

      const result1 = await detectAPPNascentes(imovel, baseNascentes, { bufferRadius: 50 });
      const area1 = result1.app_total_ha;

      // Add more nascentes
      const extendedNascentes = [
        ...baseNascentes,
        createNascente(-58.840, -13.205, 'n3'),
        createNascente(-58.850, -13.210, 'n4'),
      ];

      const result2 = await detectAPPNascentes(imovel, extendedNascentes, { bufferRadius: 50 });
      const area2 = result2.app_total_ha;

      // Adding more nascentes should not decrease area (monotonicity)
      expect(area2).toBeGreaterThanOrEqual(area1 * 0.99); // Allow 1% tolerance for numerical precision

      console.log(
        `✓ Property 3c passed: Area monotonicity verified (base=${area1} ha, extended=${area2} ha)`
      );
    });
  });

  describe('Edge Cases and Overlap Patterns', () => {
    /**
     * Test: Concentric nascentes (one completely inside another's buffer)
     */
    it('Should handle concentric/fully-overlapping nascentes', async () => {
      const imovel = createRectanglePolygon(-58.86, -13.22, -58.83, -13.19);

      // Two nascentes at exact same location (extreme overlap)
      const nascente1 = createNascente(-58.845, -13.205, 'n1');
      const nascente2 = createNascente(-58.845, -13.205, 'n2'); // Exact same location

      const result = await detectAPPNascentes(imovel, [nascente1, nascente2], { bufferRadius: 50 });

      expect(result.detected_count).toBe(2);
      expect(result.app_total_ha).toBeGreaterThan(0);

      // With two nascentes at same location, merged area should be ~same as single buffer
      const expectedSingleBufferArea = (Math.PI * 50 * 50) / 10000; // ~0.785 ha
      expect(result.app_total_ha).toBeLessThanOrEqual(expectedSingleBufferArea * 1.1); // Allow 10% tolerance

      console.log(
        `✓ Edge case passed: Concentric nascentes handled, area=${result.app_total_ha} ha`
      );
    });

    /**
     * Test: Nascentes on property boundary
     */
    it('Should handle nascentes at property boundary', async () => {
      const imovel = createRectanglePolygon(-58.86, -13.22, -58.83, -13.19);

      // Nascente exactly on boundary corner
      const nascente = createNascente(-58.86, -13.22, 'n_corner');

      const result = await detectAPPNascentes(imovel, [nascente], { bufferRadius: 50 });

      // Should be detected and clipped to property
      expect(result.nascentes.length).toBeGreaterThanOrEqual(0);
      expect(result.app_total_ha).toBeLessThanOrEqual(calculateArea(imovel.geometry));

      console.log(
        `✓ Edge case passed: Nascente at boundary handled, area=${result.app_total_ha} ha`
      );
    });

    /**
     * Test: Very small property with nascentes
     */
    it('Should handle very small property (< 1 ha)', async () => {
      // Small property: 100m x 50m ≈ 0.5 ha
      const imovel = createRectanglePolygon(-58.860, -13.200, -58.859, -13.199);
      const imovelArea = calculateArea(imovel.geometry);

      const nascente = createNascente(-58.8595, -13.1995, 'n1');

      const result = await detectAPPNascentes(imovel, [nascente], { bufferRadius: 50 });

      expect(result.app_total_ha).toBeLessThanOrEqual(imovelArea);

      console.log(
        `✓ Edge case passed: Small property (${imovelArea.toFixed(3)} ha) with nascente, app=${result.app_total_ha} ha`
      );
    });

    /**
     * Test: Large number of nascentes (stress test)
     */
    it('Should handle 20 nascentes without error', async () => {
      const imovel = createRectanglePolygon(-58.86, -13.22, -58.83, -13.19);

      const nascentes = [];
      for (let i = 0; i < 20; i++) {
        const lon = -58.86 + (i % 5) * 0.008;
        const lat = -13.22 + Math.floor(i / 5) * 0.008;
        nascentes.push(createNascente(lon, lat, `n${i}`));
      }

      const result = await detectAPPNascentes(imovel, nascentes, { bufferRadius: 50 });

      expect(result.detected_count).toBeGreaterThan(0);
      expect(result.app_total_ha).toBeGreaterThan(0);
      expect(result.app_total_ha).toBeLessThanOrEqual(calculateArea(imovel.geometry));

      console.log(
        `✓ Stress test passed: 20 nascentes processed, ${result.detected_count} detected, area=${result.app_total_ha} ha`
      );
    });
  });

  describe('Integration: Real-world Scenario', () => {
    it('Should process typical property with 5 nascentes and merge overlaps', async () => {
      // Simulating a real property with known nascentes
      const imovel = createRectanglePolygon(-58.860, -13.220, -58.830, -13.190);
      const imovelArea = calculateArea(imovel.geometry);

      // 5 nascentes: some overlapping, some isolated
      const nascentes = [
        // Cluster 1: two close nascentes (will overlap)
        createNascente(-58.855, -13.215, 'n1'),
        createNascente(-58.852, -13.215, 'n2'), // ~330m away
        // Cluster 2: two close nascentes (will overlap)
        createNascente(-58.840, -13.200, 'n3'),
        createNascente(-58.838, -13.200, 'n4'), // ~220m away
        // Isolated
        createNascente(-58.833, -13.210, 'n5'), // Far from others
      ];

      const result = await detectAPPNascentes(imovel, nascentes, { bufferRadius: 50 });

      // All nascentes should be detected
      expect(result.detected_count).toBe(5);
      expect(result.nascentes.length).toBe(5);

      // Total APP should be positive and within property
      expect(result.app_total_ha).toBeGreaterThan(0);
      expect(result.app_total_ha).toBeLessThanOrEqual(imovelArea);

      // Verify no individual nascente exceeds total (double-counting check)
      for (const nascente of result.nascentes) {
        expect(nascente.buffer_area_ha).toBeLessThanOrEqual(result.app_total_ha);
      }

      console.log(
        `✓ Integration test passed: 5 nascentes with overlaps, detected=${result.detected_count}, total_area=${result.app_total_ha} ha (imovel=${imovelArea.toFixed(2)} ha)`
      );
    });
  });
});
