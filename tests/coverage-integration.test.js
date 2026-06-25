/**
 * Tests for Coverage Integration - Native Coverage Calculation
 * Task 6.3: Property-Based Tests for Coverage Area Calculation
 * Validates: Requirements 5.2, 5.4
 *
 * Property 6: Coverage Area ≤ Imovel
 * **Validates: Requirements 5.2**
 * - Gerar rasters aleatórios + polygons aleatórios
 * - Verificar que coverage_area ≤ imovel_area sempre
 * - Verificar que soma de tipos = total (consistência)
 * - Min 100 exemplos, max 500
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { calculateNativeCoverage, calculateRLDeficit } from '../src/modules/apprlcalculator/coverageIntegrator.js';
import { calculateArea } from '../src/utils/geometryUtils.js';

/**
 * Helper: Create a simple rectangular polygon at given coordinates
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
          [minLon, minLat], // Close ring
        ],
      ],
    },
  };
}

/**
 * Helper: Generate synthetic raster data with random coverage pixels
 * Creates raster data with multiple vegetation type pixels
 * 
 * @param {number} pixelCount - Number of pixels to generate
 * @param {array} vegetationTypes - Array of [value, weight] for weighted distribution
 * @returns {object} Raster data object
 */
function generateSyntheticRaster(pixelCount, vegetationTypes = null) {
  // Default vegetation type distribution if not provided
  const vegTypes = vegetationTypes || [
    [1, 0.3], // Floresta nativa 30%
    [2, 0.2], // Cerrado nativo 20%
    [0, 0.5], // Non-vegetation (e.g., pasture) 50%
  ];

  // Create weighted distribution
  const pixelValues = [];
  for (const [value, weight] of vegTypes) {
    const count = Math.floor(pixelCount * weight);
    for (let i = 0; i < count; i++) {
      pixelValues.push(value);
    }
  }

  // Shuffle pixels
  for (let i = pixelValues.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pixelValues[i], pixelValues[j]] = [pixelValues[j], pixelValues[i]];
  }

  // Ensure we have exactly pixelCount pixels
  while (pixelValues.length < pixelCount) {
    pixelValues.push(0);
  }
  pixelValues.length = pixelCount;

  // Convert to raster data format
  const data = pixelValues.map((value, idx) => ({
    id: idx,
    value: value,
    position: idx,
  }));

  return {
    data: data,
    resolution: 30, // MapBiomas standard 30m pixels
    year: 2023,
    format: 'synthetic',
  };
}

/**
 * Helper: Calculate area in hectares from number of pixels
 * At 30m resolution: 1 pixel = 0.09 ha (30m x 30m = 900 m² = 0.09 ha)
 */
function pixelsToHectares(pixelCount) {
  const pixelSizeM = 30;
  const pixelAreaHa = (pixelSizeM * pixelSizeM) / 10000; // = 0.09
  return pixelCount * pixelAreaHa;
}

describe('Coverage Integration - Native Coverage Calculation (Task 6.3)', () => {
  describe('Unit Tests: Core Functionality', () => {
    /**
     * Test 1: Basic coverage calculation
     */
    it('Test 1: Should calculate coverage area correctly from raster pixels', async () => {
      const imovel = createRectanglePolygon(-58.86, -13.22, -58.83, -13.19);
      const imovelArea = calculateArea(imovel.geometry);

      // Generate raster with 100 pixels: 30 floresta (value=1), 20 cerrado (value=11), 50 non-veg (value=0)
      const rasterData = generateSyntheticRaster(100, [
        [1, 0.3], // 30 pixels of floresta nativa
        [11, 0.2], // 20 pixels of cerrado nativo
        [0, 0.5], // 50 pixels of non-vegetation
      ]);

      const result = await calculateNativeCoverage(imovel, rasterData, {
        vegClassification: {
          floresta_nativa: [1, 2, 3, 4],
          cerrado_nativo: [11, 12],
          caatinga_nativa: [13],
        },
      });

      // Verify result structure
      expect(result).toBeDefined();
      expect(result.total_coverage_ha).toBeGreaterThan(0);
      expect(result.coverage_percentage).toBeGreaterThan(0);
      // imovel_area_ha is calculated from polygon, should exist and be positive
      expect(result.imovel_area_ha).toBeGreaterThan(0);

      // Verify by_type breakdown
      expect(result.by_type.floresta_nativa).toBeDefined();
      expect(result.by_type.floresta_nativa.area_ha).toBeGreaterThan(0);
      expect(result.by_type.cerrado_nativo).toBeDefined();
      expect(result.by_type.cerrado_nativo.area_ha).toBeGreaterThan(0);

      console.log(
        `✓ Test 1 passed: Coverage calculated, total=${result.total_coverage_ha} ha, percentage=${result.coverage_percentage}%`
      );
    });

    /**
     * Test 2: Empty raster returns zero coverage
     */
    it('Test 2: Should return zero coverage for empty raster', async () => {
      const imovel = createRectanglePolygon(-58.86, -13.22, -58.83, -13.19);

      // Raster with all non-vegetation pixels (value 0)
      const rasterData = generateSyntheticRaster(100, [[0, 1.0]]);

      const result = await calculateNativeCoverage(imovel, rasterData);

      expect(result.total_coverage_ha).toBe(0);
      expect(result.coverage_percentage).toBe(0);

      console.log(`✓ Test 2 passed: Empty raster → coverage = 0`);
    });

    /**
     * Test 3: Vegetation type consistency - sum of types equals total
     */
    it('Test 3: Should ensure sum of vegetation types equals total coverage', async () => {
      const imovel = createRectanglePolygon(-58.86, -13.22, -58.83, -13.19);

      const rasterData = generateSyntheticRaster(150, [
        [1, 0.4], // Floresta
        [11, 0.35], // Cerrado
        [0, 0.25], // Non-veg
      ]);

      const result = await calculateNativeCoverage(imovel, rasterData);

      // Sum coverage from all vegetation types
      let sumVegTypes = 0;
      for (const vegType of Object.keys(result.by_type)) {
        sumVegTypes += result.by_type[vegType].area_ha;
      }

      // Sum of types must equal total coverage (with small floating point tolerance)
      expect(Math.abs(sumVegTypes - result.total_coverage_ha)).toBeLessThan(0.001);

      console.log(
        `✓ Test 3 passed: Sum of types (${sumVegTypes.toFixed(4)}) = total (${result.total_coverage_ha.toFixed(4)})`
      );
    });

    /**
     * Test 4: Coverage never exceeds property area (clipping validation)
     */
    it('Test 4: Should clip coverage to never exceed imovel area', async () => {
      const imovel = createRectanglePolygon(-58.86, -13.22, -58.83, -13.19);
      const imovelArea = calculateArea(imovel.geometry);

      // Generate raster with many vegetation pixels (simulating complete coverage)
      const rasterData = generateSyntheticRaster(500, [
        [1, 0.9], // 90% vegetation pixels
        [0, 0.1], // 10% non-veg
      ]);

      const result = await calculateNativeCoverage(imovel, rasterData);

      // The critical assertion: total coverage must not exceed property area
      expect(result.total_coverage_ha).toBeLessThanOrEqual(imovelArea);

      // Even with very high vegetation, should be clipped
      if (result.clipping_applied) {
        console.log(`✓ Test 4 passed: Clipping was applied, coverage=${result.total_coverage_ha} ha ≤ imovel=${imovelArea} ha`);
      } else {
        console.log(`✓ Test 4 passed: No clipping needed, coverage=${result.total_coverage_ha} ha ≤ imovel=${imovelArea} ha`);
      }
    });

    /**
     * Test 5: No raster data returns appropriate result
     */
    it('Test 5: Should handle missing raster data gracefully', async () => {
      const imovel = createRectanglePolygon(-58.86, -13.22, -58.83, -13.19);

      const result = await calculateNativeCoverage(imovel, null);

      expect(result).toBeDefined();
      expect(result.total_coverage_ha).toBe(0);
      expect(result.warning).toBeDefined();
      expect(result.recommendation).toBeDefined();

      console.log(`✓ Test 5 passed: Null raster handled, warning="${result.warning}"`);
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Property 6: Coverage Area ≤ Imovel
     * **Validates: Requirements 5.2**
     * 
     * For any random property area and any random raster with vegetation pixels,
     * the calculated coverage area must never exceed the property area.
     * This is the fundamental constraint enforced by clipping.
     */
    it('Property 6: Coverage Area ≤ Imovel Area (100-500 examples)', async () => {
      // Generate random properties with varying sizes and locations
      const propertyArbitrary = fc
        .tuple(
          fc.integer({ min: -5895, max: -5870 }).map(v => v / 100), // minLon in MT
          fc.integer({ min: -1335, max: -1310 }).map(v => v / 100)  // minLat in MT
        )
        .chain(([minLon, minLat]) =>
          fc.tuple(
            fc.constant(minLon),
            fc.constant(minLat),
            fc.integer({ min: 1, max: 15 }).map(d => minLon + d / 100), // maxLon (1-15 x 0.01 deg away)
            fc.integer({ min: 1, max: 15 }).map(d => minLat + d / 100)  // maxLat
          )
        );

      await fc.assert(
        fc.asyncProperty(
          propertyArbitrary,
          fc.integer({ min: 50, max: 500 }), // random pixel count
          fc.array(
            fc.tuple(
              fc.integer({ min: 0, max: 50 }),
              fc.integer({ min: 1, max: 100 }).map(v => v / 100) // Use integer then divide for safe float
            ),
            { minLength: 1, maxLength: 3 }
          ), // vegetation type distribution
          async (coords, pixelCount, vegDistribution) => {
            const [minLon, minLat, maxLon, maxLat] = coords;

            // Create random property polygon
            const imovel = createRectanglePolygon(minLon, minLat, maxLon, maxLat);
            const imovelArea = calculateArea(imovel.geometry);

            // Normalize distribution to sum to 1
            const totalWeight = vegDistribution.reduce((sum, [_, weight]) => sum + weight, 0);
            const normalizedDist = vegDistribution.map(([val, weight]) => [val, weight / totalWeight]);

            // Generate random raster
            const rasterData = generateSyntheticRaster(pixelCount, normalizedDist);

            // Calculate coverage
            const result = await calculateNativeCoverage(imovel, rasterData);

            // CRITICAL PROPERTY: Coverage area must never exceed property area
            expect(result.total_coverage_ha).toBeLessThanOrEqual(imovelArea + 0.01); // Small tolerance for floating point

            // Additional invariant: percentage should be between 0 and 100
            expect(result.coverage_percentage).toBeGreaterThanOrEqual(0);
            expect(result.coverage_percentage).toBeLessThanOrEqual(100);
          }
        ),
        { numRuns: 200 } // 200 examples (within 100-500 range)
      );

      console.log(
        `✓ Property 6 passed: Coverage area ≤ imovel area for 200 random combinations of properties and rasters`
      );
    });

    /**
     * Property 6b: Sum of Vegetation Types Consistency
     * **Validates: Requirements 5.2 (consistency)**
     * 
     * For any raster and property combination, the sum of all individual
     * vegetation type areas must equal the total coverage area.
     */
    it('Property 6b: Sum of Vegetation Types = Total Coverage (consistency)', async () => {
      const propertyArbitrary = fc
        .tuple(
          fc.integer({ min: -5895, max: -5870 }).map(v => v / 100),
          fc.integer({ min: -1335, max: -1310 }).map(v => v / 100)
        )
        .chain(([minLon, minLat]) =>
          fc.tuple(
            fc.constant(minLon),
            fc.constant(minLat),
            fc.integer({ min: 1, max: 15 }).map(d => minLon + d / 100),
            fc.integer({ min: 1, max: 15 }).map(d => minLat + d / 100)
          )
        );

      await fc.assert(
        fc.asyncProperty(
          propertyArbitrary,
          fc.integer({ min: 30, max: 400 }),
          async (coords, pixelCount) => {
            const [minLon, minLat, maxLon, maxLat] = coords;
            const imovel = createRectanglePolygon(minLon, minLat, maxLon, maxLat);

            // Random vegetation distribution
            const rasterData = generateSyntheticRaster(pixelCount, [
              [1, Math.random()],   // floresta_nativa
              [11, Math.random()],  // cerrado_nativo
              [0, Math.random()],   // non-vegetation
            ]);

            const result = await calculateNativeCoverage(imovel, rasterData);

            // Sum all vegetation types
            let typeSum = 0;
            for (const vegType of Object.keys(result.by_type)) {
              typeSum += result.by_type[vegType].area_ha;
            }

            // Sum must equal total (within floating point tolerance)
            const tolerance = 0.001; // 0.001 ha = 10 m²
            expect(Math.abs(typeSum - result.total_coverage_ha)).toBeLessThan(tolerance);
          }
        ),
        { numRuns: 150 }
      );

      console.log(
        `✓ Property 6b passed: Sum of vegetation types = total coverage for 150 random examples`
      );
    });

    /**
     * Property 6c: Monotonicity - More vegetation pixels → Higher coverage
     * **Validates: Requirements 5.2 (monotonicity)**
     * 
     * For fixed property and vegetation types, increasing the number of
     * vegetation pixels should not decrease coverage area (monotonicity).
     */
    it('Property 6c: Monotonicity - More vegetation pixels → More or equal coverage', async () => {
      const imovel = createRectanglePolygon(-58.86, -13.22, -58.83, -13.19);

      // Generate two rasters with different pixel counts
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 50, max: 200 }), // pixelCount1
          fc.integer({ min: 50, max: 200 }),  // pixelCount2
          async (pixelCount1, pixelCount2) => {
            // Ensure we have two different sizes
            const smallerPixelCount = Math.min(pixelCount1, pixelCount2);
            const largerPixelCount = Math.max(pixelCount1, pixelCount2) + 50;

            // Same vegetation distribution for both
            const vegDist = [[1, 0.5], [11, 0.3], [0, 0.2]];

            const raster1 = generateSyntheticRaster(smallerPixelCount, vegDist);
            const raster2 = generateSyntheticRaster(largerPixelCount, vegDist);

            const result1 = await calculateNativeCoverage(imovel, raster1);
            const result2 = await calculateNativeCoverage(imovel, raster2);

            // With more pixels of same distribution, coverage should be >= previous
            // (or equal if clipping was applied)
            expect(result2.total_coverage_ha).toBeGreaterThanOrEqual(result1.total_coverage_ha * 0.99); // 1% tolerance for rounding
          }
        ),
        { numRuns: 100 }
      );

      console.log(
        `✓ Property 6c passed: Monotonicity verified for 100 random pixel count pairs`
      );
    });

    /**
     * Property 6d: Coverage Percentage ≤ 100%
     * **Validates: Requirements 5.2 (percentage bound)**
     * 
     * Coverage percentage should always be between 0 and 100.
     */
    it('Property 6d: Coverage Percentage is always 0-100%', async () => {
      const propertyArbitrary = fc
        .tuple(
          fc.integer({ min: -5895, max: -5870 }).map(v => v / 100),
          fc.integer({ min: -1335, max: -1310 }).map(v => v / 100)
        )
        .chain(([minLon, minLat]) =>
          fc.tuple(
            fc.constant(minLon),
            fc.constant(minLat),
            fc.integer({ min: 1, max: 15 }).map(d => minLon + d / 100),
            fc.integer({ min: 1, max: 15 }).map(d => minLat + d / 100)
          )
        );

      await fc.assert(
        fc.asyncProperty(
          propertyArbitrary,
          fc.integer({ min: 20, max: 500 }),
          async (coords, pixelCount) => {
            const [minLon, minLat, maxLon, maxLat] = coords;
            const imovel = createRectanglePolygon(minLon, minLat, maxLon, maxLat);

            const rasterData = generateSyntheticRaster(pixelCount, [
              [1, Math.random()],
              [11, Math.random()],
              [0, Math.random()],
            ]);

            const result = await calculateNativeCoverage(imovel, rasterData);

            // Percentage must be in [0, 100]
            expect(result.coverage_percentage).toBeGreaterThanOrEqual(0);
            expect(result.coverage_percentage).toBeLessThanOrEqual(100);

            // Also verify for each vegetation type
            for (const vegType of Object.keys(result.by_type)) {
              expect(result.by_type[vegType].percentage).toBeGreaterThanOrEqual(0);
              expect(result.by_type[vegType].percentage).toBeLessThanOrEqual(100);
            }
          }
        ),
        { numRuns: 150 }
      );

      console.log(
        `✓ Property 6d passed: Coverage percentage always in [0, 100] for 150 random examples`
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('Should handle very small pixel counts (edge case)', async () => {
      const imovel = createRectanglePolygon(-58.86, -13.22, -58.83, -13.19);
      const rasterData = generateSyntheticRaster(1, [[1, 1.0]]); // Just 1 pixel

      const result = await calculateNativeCoverage(imovel, rasterData);

      expect(result.total_coverage_ha).toBeGreaterThanOrEqual(0);
      expect(result.coverage_percentage).toBeGreaterThanOrEqual(0);
      expect(result.coverage_percentage).toBeLessThanOrEqual(100);
    });

    it('Should handle very large pixel counts (edge case)', async () => {
      const imovel = createRectanglePolygon(-58.86, -13.22, -58.83, -13.19);
      const rasterData = generateSyntheticRaster(10000, [[1, 1.0]]); // 10k pixels

      const result = await calculateNativeCoverage(imovel, rasterData);

      expect(result.total_coverage_ha).toBeLessThanOrEqual(calculateArea(imovel.geometry));
      expect(result.coverage_percentage).toBeLessThanOrEqual(100);

      console.log(`✓ Edge case passed: 10k pixels handled, coverage=${result.total_coverage_ha} ha`);
    });

    it('Should handle all vegetation types in single raster', async () => {
      const imovel = createRectanglePolygon(-58.86, -13.22, -58.83, -13.19);

      const rasterData = {
        data: [
          { id: 0, value: 1 }, // floresta
          { id: 1, value: 11 }, // cerrado
          { id: 2, value: 13 }, // caatinga
          { id: 3, value: 0 },  // non-veg
        ],
        resolution: 30,
        year: 2023,
      };

      const result = await calculateNativeCoverage(imovel, rasterData);

      // All vegetation types should have some coverage
      expect(result.by_type.floresta_nativa.area_ha).toBeGreaterThan(0);
      expect(result.by_type.cerrado_nativo.area_ha).toBeGreaterThan(0);
      expect(result.by_type.caatinga_nativa.area_ha).toBeGreaterThan(0);

      // Total should be sum of three types
      const typeSum =
        result.by_type.floresta_nativa.area_ha +
        result.by_type.cerrado_nativo.area_ha +
        result.by_type.caatinga_nativa.area_ha;
      expect(Math.abs(typeSum - result.total_coverage_ha)).toBeLessThan(0.001);
    });

    it('Should generate appropriate warnings for old data', async () => {
      const imovel = createRectanglePolygon(-58.86, -13.22, -58.83, -13.19);

      const rasterData = generateSyntheticRaster(100, [[1, 0.5]]);
      rasterData.year = 2020; // 3+ years old

      const result = await calculateNativeCoverage(imovel, rasterData);

      // Should have warning about data age
      expect(result.warning).toBeDefined();
      expect(result.warning.toLowerCase()).toContain('year');

      console.log(`✓ Edge case passed: Old data warning generated: "${result.warning}"`);
    });
  });

  describe('Integration: Real-world Scenarios', () => {
    it('Should process forest-dominated property correctly', async () => {
      const imovel = createRectanglePolygon(-58.860, -13.220, -58.830, -13.190);

      // Simulate MapBiomas data: mostly forest with some cerrado
      const rasterData = generateSyntheticRaster(500, [
        [1, 0.65], // 65% native forest
        [11, 0.20], // 20% native cerrado
        [0, 0.15], // 15% non-vegetation
      ]);

      const result = await calculateNativeCoverage(imovel, rasterData);

      // Should have some coverage
      expect(result.total_coverage_ha).toBeGreaterThan(0);
      expect(result.coverage_percentage).toBeGreaterThan(0);
      expect(result.coverage_percentage).toBeLessThanOrEqual(100);

      // Forest should be dominant (more than cerrado)
      expect(result.by_type.floresta_nativa.area_ha).toBeGreaterThan(
        result.by_type.cerrado_nativo.area_ha
      );

      // Percentages should add up correctly
      let percentSum = 0;
      for (const vegType of Object.keys(result.by_type)) {
        percentSum += result.by_type[vegType].percentage;
      }
      expect(percentSum).toBeLessThanOrEqual(100);
      expect(percentSum).toBeGreaterThan(0);

      console.log(
        `✓ Integration test passed: Forest-dominated property, coverage=${result.total_coverage_ha} ha (${result.coverage_percentage}%)`
      );
    });

    it('Should process degraded property correctly', async () => {
      const imovel = createRectanglePolygon(-58.860, -13.220, -58.830, -13.190);

      // Simulate degraded property: mostly non-vegetation
      const rasterData = generateSyntheticRaster(500, [
        [1, 0.15], // Only 15% native forest
        [11, 0.05], // Only 5% cerrado
        [0, 0.80], // 80% degraded (pasture, agriculture, bare soil)
      ]);

      const result = await calculateNativeCoverage(imovel, rasterData);

      // Should have low coverage
      expect(result.total_coverage_ha).toBeGreaterThan(0);
      expect(result.coverage_percentage).toBeLessThan(25); // Less than 25% coverage

      console.log(
        `✓ Integration test passed: Degraded property, coverage=${result.total_coverage_ha} ha (${result.coverage_percentage}%)`
      );
    });
  });
});

/**
 * Tests for RL Deficit Calculation
 * Task 6.5: Implementar cálculo de RL Deficit
 * Validates: Requirements 5.5, 5.6
 *
 * Property 4: RL Deficit Non-Negative
 * **Valida: Requirements 4.6, 5.5**
 * - Gerar RL_minima e coverage aleatórios (0-100% de property area)
 * - Verificar que RL_deficit ≥ 0 sempre (monotonicidade)
 * - Verificar que RL_deficit ≤ RL_minima
 * - Min 500 exemplos
 */
describe('RL Deficit Calculation (Task 6.5)', () => {
  describe('Unit Tests: Core Functionality', () => {
    /**
     * Test 1: Basic deficit calculation - property with deficit
     */
    it('Test 1: Should calculate deficit correctly when coverage < requirement', () => {
      // Property requires 800 ha RL, but only has 700 ha coverage
      const result = calculateRLDeficit(800, 700);

      expect(result.valid).toBe(true);
      expect(result.deficitHa).toBe(100);
      expect(result.deficitPercentage).toBe(12.5);
      expect(result.status).toBe('deficit');
      expect(result.compliant).toBe(false);

      console.log(
        `✓ Test 1 passed: Deficit calculated, deficitHa=${result.deficitHa}, deficitPercentage=${result.deficitPercentage}%`
      );
    });

    /**
     * Test 2: Compliant property - zero deficit
     */
    it('Test 2: Should return zero deficit when coverage >= requirement', () => {
      // Property requires 500 ha RL, has 600 ha coverage
      const result = calculateRLDeficit(500, 600);

      expect(result.valid).toBe(true);
      expect(result.deficitHa).toBe(0);
      expect(result.deficitPercentage).toBe(0);
      expect(result.status).toBe('compliant');
      expect(result.compliant).toBe(true);

      console.log(`✓ Test 2 passed: Compliant property, deficitHa=0`);
    });

    /**
     * Test 3: Exact match - zero deficit
     */
    it('Test 3: Should return zero deficit when coverage equals requirement exactly', () => {
      const result = calculateRLDeficit(400, 400);

      expect(result.valid).toBe(true);
      expect(result.deficitHa).toBe(0);
      expect(result.deficitPercentage).toBe(0);
      expect(result.status).toBe('compliant');
      expect(result.compliant).toBe(true);

      console.log(`✓ Test 3 passed: Exact match, deficitHa=0`);
    });

    /**
     * Test 4: Zero requirement - no deficit possible
     */
    it('Test 4: Should handle zero requirement (no RL obligation)', () => {
      const result = calculateRLDeficit(0, 100);

      expect(result.valid).toBe(true);
      expect(result.deficitHa).toBe(0);
      expect(result.deficitPercentage).toBe(0);
      expect(result.status).toBe('compliant');
      expect(result.warnings.length).toBeGreaterThan(0); // Should have warning about zero requirement

      console.log(`✓ Test 4 passed: Zero requirement handled, warning generated`);
    });

    /**
     * Test 5: Zero coverage - full deficit
     */
    it('Test 5: Should calculate full deficit when coverage is zero (complete deforestation)', () => {
      const result = calculateRLDeficit(800, 0);

      expect(result.valid).toBe(true);
      expect(result.deficitHa).toBe(800);
      expect(result.deficitPercentage).toBe(100);
      expect(result.status).toBe('deficit');

      console.log(`✓ Test 5 passed: Complete deforestation, deficitHa=${result.deficitHa}`);
    });

    /**
     * Test 6: Result object contains required fields
     */
    it('Test 6: Should return complete result object with all required fields', () => {
      const result = calculateRLDeficit(600, 500);

      expect(result).toHaveProperty('deficitHa');
      expect(result).toHaveProperty('deficitPercentage');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('rlMinima');
      expect(result).toHaveProperty('currentCoverage');
      expect(result).toHaveProperty('compliant');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');

      console.log(`✓ Test 6 passed: All required fields present in result object`);
    });

    /**
     * Test 7: Large values handling
     */
    it('Test 7: Should handle large hectare values correctly', () => {
      // Large property: 10,000 ha requirement, 8,500 ha coverage
      const result = calculateRLDeficit(10000, 8500);

      expect(result.valid).toBe(true);
      expect(result.deficitHa).toBe(1500);
      expect(result.deficitPercentage).toBe(15);
      expect(result.status).toBe('deficit');

      console.log(`✓ Test 7 passed: Large values, deficitHa=${result.deficitHa}`);
    });

    /**
     * Test 8: Decimal/float values handling
     */
    it('Test 8: Should handle decimal hectare values with proper rounding', () => {
      // Decimal values: 800.5 ha requirement, 700.25 ha coverage
      const result = calculateRLDeficit(800.5, 700.25);

      expect(result.valid).toBe(true);
      expect(result.deficitHa).toBe(100.25);
      expect(result.deficitPercentage).toBeCloseTo(12.52, 1); // ~12.5%
      expect(result.status).toBe('deficit');

      console.log(
        `✓ Test 8 passed: Decimal values, deficitHa=${result.deficitHa}, deficitPercentage=${result.deficitPercentage}%`
      );
    });

    /**
     * Test 9: Very small deficit
     */
    it('Test 9: Should handle very small deficit amounts', () => {
      // Tiny deficit: 100 ha requirement, 99.99 ha coverage
      const result = calculateRLDeficit(100, 99.99);

      expect(result.valid).toBe(true);
      expect(result.deficitHa).toBeCloseTo(0.01, 2);
      expect(result.deficitPercentage).toBeCloseTo(0.01, 1);
      expect(result.status).toBe('deficit');

      console.log(`✓ Test 9 passed: Tiny deficit handled, deficitHa=${result.deficitHa}`);
    });

    /**
     * Test 10: Excess coverage warning
     */
    it('Test 10: Should generate warning when coverage significantly exceeds requirement', () => {
      // Coverage is 150% of requirement
      const result = calculateRLDeficit(500, 800);

      expect(result.valid).toBe(true);
      expect(result.deficitHa).toBe(0);
      expect(result.status).toBe('compliant');
      expect(result.warnings.length).toBeGreaterThan(0); // Should warn about excess coverage
      expect(result.warnings[0]).toContain('significantly exceeds');

      console.log(`✓ Test 10 passed: Excess coverage warning generated`);
    });
  });

  describe('Error Handling Tests', () => {
    /**
     * Test: Null rlMinima
     */
    it('Should reject null rlMinima with error', () => {
      const result = calculateRLDeficit(null, 500);

      expect(result.valid).toBe(false);
      expect(result.status).toBe('error');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('rlMinima');

      console.log(`✓ Error test passed: Null rlMinima rejected`);
    });

    /**
     * Test: Null currentCoverage
     */
    it('Should reject null currentCoverage with error', () => {
      const result = calculateRLDeficit(600, null);

      expect(result.valid).toBe(false);
      expect(result.status).toBe('error');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('currentCoverage');

      console.log(`✓ Error test passed: Null currentCoverage rejected`);
    });

    /**
     * Test: Non-numeric rlMinima
     */
    it('Should reject non-numeric rlMinima with error', () => {
      const result = calculateRLDeficit('invalid', 500);

      expect(result.valid).toBe(false);
      expect(result.status).toBe('error');
      expect(result.errors.length).toBeGreaterThan(0);

      console.log(`✓ Error test passed: Non-numeric rlMinima rejected`);
    });

    /**
     * Test: Non-numeric currentCoverage
     */
    it('Should reject non-numeric currentCoverage with error', () => {
      const result = calculateRLDeficit(600, 'invalid');

      expect(result.valid).toBe(false);
      expect(result.status).toBe('error');
      expect(result.errors.length).toBeGreaterThan(0);

      console.log(`✓ Error test passed: Non-numeric currentCoverage rejected`);
    });

    /**
     * Test: Negative rlMinima
     */
    it('Should reject negative rlMinima with error', () => {
      const result = calculateRLDeficit(-100, 500);

      expect(result.valid).toBe(false);
      expect(result.status).toBe('error');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('negative');

      console.log(`✓ Error test passed: Negative rlMinima rejected`);
    });

    /**
     * Test: Negative currentCoverage
     */
    it('Should reject negative currentCoverage with error', () => {
      const result = calculateRLDeficit(600, -100);

      expect(result.valid).toBe(false);
      expect(result.status).toBe('error');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('negative');

      console.log(`✓ Error test passed: Negative currentCoverage rejected`);
    });

    /**
     * Test: Undefined rlMinima
     */
    it('Should reject undefined rlMinima with error', () => {
      const result = calculateRLDeficit(undefined, 500);

      expect(result.valid).toBe(false);
      expect(result.status).toBe('error');
      expect(result.errors[0]).toContain('rlMinima');

      console.log(`✓ Error test passed: Undefined rlMinima rejected`);
    });

    /**
     * Test: Both parameters null
     */
    it('Should reject when both parameters are null', () => {
      const result = calculateRLDeficit(null, null);

      expect(result.valid).toBe(false);
      expect(result.status).toBe('error');
      expect(result.errors.length).toBeGreaterThan(0);

      console.log(`✓ Error test passed: Both null parameters rejected`);
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Property 4: RL Deficit Non-Negative
     * **Valida: Requirements 4.6, 5.5**
     * 
     * For any valid RL_minima and coverage values, the deficit must always be >= 0.
     * This is guaranteed by using MAX(0, difference).
     */
    it('Property 4: RL Deficit is always non-negative (500 examples)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 10000 }).map(v => v / 10), // RL minima: 0-1000 ha
          fc.integer({ min: 0, max: 10000 }).map(v => v / 10), // Coverage: 0-1000 ha
          (rlMinima, coverage) => {
            const result = calculateRLDeficit(rlMinima, coverage);

            // CRITICAL PROPERTY: Deficit must never be negative
            expect(result.deficitHa).toBeGreaterThanOrEqual(0);

            // Deficit should never exceed RL minima
            expect(result.deficitHa).toBeLessThanOrEqual(rlMinima);

            // Result should be valid
            expect(result.valid).toBe(true);
            expect(result.status).not.toBe('error');
          }
        ),
        { numRuns: 500 }
      );

      console.log(`✓ Property 4 passed: RL Deficit is non-negative for 500 random examples`);
    });

    /**
     * Property 4b: Monotonicity - Less coverage → More deficit
     * **Validates: Requirements 5.5 (monotonicity)**
     * 
     * For fixed RL_minima, when coverage increases, deficit should decrease (or stay same).
     */
    it('Property 4b: Monotonicity - Increasing coverage → Decreasing or equal deficit', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 10000 }).map(v => v / 10), // RL minima: 10-1000 ha
          fc.integer({ min: 0, max: 10000 }).map(v => v / 10),   // Coverage 1: 0-1000 ha
          fc.integer({ min: 0, max: 10000 }).map(v => v / 10),   // Coverage 2: 0-1000 ha
          (rlMinima, coverage1, coverage2) => {
            const result1 = calculateRLDeficit(rlMinima, coverage1);
            const result2 = calculateRLDeficit(rlMinima, Math.max(coverage1, coverage2));

            // If coverage increases, deficit should not increase
            // (monotonicity: more coverage = less deficit)
            expect(result2.deficitHa).toBeLessThanOrEqual(result1.deficitHa + 0.001); // Small tolerance for rounding

            // Both results should be valid
            expect(result1.valid).toBe(true);
            expect(result2.valid).toBe(true);
          }
        ),
        { numRuns: 300 }
      );

      console.log(`✓ Property 4b passed: Monotonicity verified for 300 random examples`);
    });

    /**
     * Property 4c: Bounded percentage
     * **Validates: Requirements 5.5 (percentage bound)**
     * 
     * Deficit percentage should always be between 0 and 100%.
     */
    it('Property 4c: Deficit percentage always in [0, 100]%', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 50000 }).map(v => v / 10), // RL minima: > 0
          fc.integer({ min: 0, max: 50000 }).map(v => v / 10),  // Coverage: >= 0
          (rlMinima, coverage) => {
            const result = calculateRLDeficit(rlMinima, coverage);

            if (result.valid) {
              // Percentage should be bounded [0, 100]
              expect(result.deficitPercentage).toBeGreaterThanOrEqual(0);
              expect(result.deficitPercentage).toBeLessThanOrEqual(100);
            }
          }
        ),
        { numRuns: 400 }
      );

      console.log(`✓ Property 4c passed: Deficit percentage bounded in [0, 100]% for 400 examples`);
    });

    /**
     * Property 4d: Compliance determination
     * **Validates: Requirements 4.6**
     * 
     * A property is compliant if and only if deficitHa == 0.
     */
    it('Property 4d: Compliance status correct (deficitHa == 0 ⟺ compliant)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 10000 }).map(v => v / 10),
          fc.integer({ min: 0, max: 10000 }).map(v => v / 10),
          (rlMinima, coverage) => {
            const result = calculateRLDeficit(rlMinima, coverage);

            if (result.valid) {
              // If deficitHa is 0, status must be 'compliant' and compliant=true
              if (result.deficitHa === 0) {
                expect(result.status).toBe('compliant');
                expect(result.compliant).toBe(true);
              } else {
                // If deficitHa > 0, status must be 'deficit' and compliant=false
                expect(result.status).toBe('deficit');
                expect(result.compliant).toBe(false);
              }
            }
          }
        ),
        { numRuns: 400 }
      );

      console.log(`✓ Property 4d passed: Compliance status always correct for 400 examples`);
    });

    /**
     * Property 4e: MAX formula verification
     * **Validates: Requirements 5.5 (formula: MAX(0, rlMinima - coverage))**
     * 
     * Deficit must exactly equal MAX(0, rlMinima - coverage).
     */
    it('Property 4e: Deficit equals MAX(0, rlMinima - coverage)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 50000 }).map(v => v / 10),
          fc.integer({ min: 0, max: 50000 }).map(v => v / 10),
          (rlMinima, coverage) => {
            const result = calculateRLDeficit(rlMinima, coverage);
            const expectedDeficit = Math.max(0, rlMinima - coverage);

            if (result.valid) {
              // Deficit must equal the MAX formula result (with small float tolerance)
              expect(Math.abs(result.deficitHa - expectedDeficit)).toBeLessThan(0.001);
            }
          }
        ),
        { numRuns: 500 }
      );

      console.log(`✓ Property 4e passed: Formula MAX(0, rlMinima - coverage) verified for 500 examples`);
    });

    /**
     * Property 4f: Additivity of deficit changes
     * **Validates: Requirements 5.5 (additivity)**
     * 
     * If coverage increases by ΔC, deficit decreases by ΔC (up to hitting 0).
     */
    it('Property 4f: Additivity - Deficit changes match coverage delta', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 10000 }).map(v => v / 10), // RL minima
          fc.integer({ min: 0, max: 5000 }).map(v => v / 10),    // Initial coverage
          fc.integer({ min: 1, max: 2000 }).map(v => v / 10),    // Coverage delta
          (rlMinima, coverage1, delta) => {
            const coverage2 = coverage1 + delta;

            const result1 = calculateRLDeficit(rlMinima, coverage1);
            const result2 = calculateRLDeficit(rlMinima, coverage2);

            if (result1.valid && result2.valid) {
              const deficitChange = result1.deficitHa - result2.deficitHa;

              // Deficit decrease should equal or exceed the coverage increase
              // (can't go below 0, so delta might be capped)
              expect(deficitChange).toBeGreaterThanOrEqual(0);
              expect(deficitChange).toBeLessThanOrEqual(delta + 0.001);
            }
          }
        ),
        { numRuns: 300 }
      );

      console.log(`✓ Property 4f passed: Additivity verified for 300 examples`);
    });
  });

  describe('Integration: Real-world Scenarios', () => {
    /**
     * Scenario 1: Amazônia property with deficit
     */
    it('Scenario 1: Amazônia property (1000 ha, 80% RL required)', () => {
      // 1000 ha property in Amazônia Legal requires 800 ha RL
      // Current coverage: 700 ha
      const rlMinima = 800;
      const currentCoverage = 700;

      const result = calculateRLDeficit(rlMinima, currentCoverage);

      expect(result.valid).toBe(true);
      expect(result.deficitHa).toBe(100);
      expect(result.deficitPercentage).toBe(12.5);
      expect(result.status).toBe('deficit');

      console.log(
        `✓ Scenario 1 passed: Amazônia property, deficitHa=${result.deficitHa} ha (${result.deficitPercentage}%)`
      );
    });

    /**
     * Scenario 2: Cerrado property compliant
     */
    it('Scenario 2: Cerrado property (1000 ha, 35% RL required, compliant)', () => {
      // 1000 ha property in Cerrado requires 350 ha RL
      // Current coverage: 400 ha (above requirement)
      const rlMinima = 350;
      const currentCoverage = 400;

      const result = calculateRLDeficit(rlMinima, currentCoverage);

      expect(result.valid).toBe(true);
      expect(result.deficitHa).toBe(0);
      expect(result.status).toBe('compliant');
      expect(result.compliant).toBe(true);

      console.log(
        `✓ Scenario 2 passed: Cerrado property compliant, deficitHa=0`
      );
    });

    /**
     * Scenario 3: Small property with total deficit
     */
    it('Scenario 3: Small property (50 ha, 40 ha RL required, complete deforestation)', () => {
      // 50 ha property requires 40 ha RL (80% Amazônia)
      // Current coverage: 0 ha (completely deforested)
      const rlMinima = 40;
      const currentCoverage = 0;

      const result = calculateRLDeficit(rlMinima, currentCoverage);

      expect(result.valid).toBe(true);
      expect(result.deficitHa).toBe(40);
      expect(result.deficitPercentage).toBe(100);
      expect(result.status).toBe('deficit');

      console.log(
        `✓ Scenario 3 passed: Complete deforestation, deficitHa=${result.deficitHa} ha (100%)`
      );
    });

    /**
     * Scenario 4: Large property with small deficit
     */
    it('Scenario 4: Large property (5000 ha, 4000 ha RL required, 3950 ha coverage)', () => {
      const rlMinima = 4000;
      const currentCoverage = 3950;

      const result = calculateRLDeficit(rlMinima, currentCoverage);

      expect(result.valid).toBe(true);
      expect(result.deficitHa).toBe(50);
      expect(result.deficitPercentage).toBeCloseTo(1.25, 1);
      expect(result.status).toBe('deficit');

      console.log(
        `✓ Scenario 4 passed: Large property with small deficit, deficitHa=${result.deficitHa} ha`
      );
    });
  });
});
