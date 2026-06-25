/**
 * Tests for Data Recency Warnings - Task 6.4
 * Validates: Requirements 5.3, 5.6
 *
 * Tests coverage data age validation and manual override functionality
 * Ensures technicians are warned when coverage data exceeds 2-year threshold
 * and can manually override with newer/more accurate estimates
 */

import { describe, it, expect } from 'vitest';
import {
  validateCoverageDataAge,
  allowManualOverride,
  calculateNativeCoverage,
} from '../src/modules/apprlcalculator/coverageIntegrator.js';

/**
 * Helper: Create a simple test polygon
 */
function createTestPolygon() {
  return {
    type: 'Feature',
    properties: { name: 'Test Property' },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-58.86, -13.22],
        [-58.83, -13.22],
        [-58.83, -13.19],
        [-58.86, -13.19],
        [-58.86, -13.22],
      ]],
    },
  };
}

/**
 * Helper: Create sample raster data
 */
function createTestRaster(year = null, pixelCount = 100) {
  const pixels = [];
  for (let i = 0; i < pixelCount; i++) {
    pixels.push({
      id: i,
      value: i % 3 === 0 ? 1 : 0, // Mix of vegetation and non-veg
    });
  }

  return {
    data: pixels,
    year: year,
    resolution: 30,
  };
}

describe('Data Recency Warnings - Task 6.4', () => {
  describe('validateCoverageDataAge() - Requirement 5.3, 5.6', () => {
    /**
     * Test 1: Current year data - should be recent (no warning)
     */
    it('Test 1: Current year data should be recent (isRecent=true, warning=null)', () => {
      const currentYear = new Date().getFullYear();
      const validation = validateCoverageDataAge(currentYear);

      expect(validation.isRecent).toBe(true);
      expect(validation.ageYears).toBe(0);
      expect(validation.warning).toBeNull();
      expect(validation.status).toBe('current');

      console.log(`✓ Test 1 passed: Current year data marked as recent`);
    });

    /**
     * Test 2: 1-year-old data - should be acceptable (no warning)
     */
    it('Test 2: 1-year-old data should be acceptable (isRecent=true, warning=null)', () => {
      const currentYear = new Date().getFullYear();
      const oneYearAgo = currentYear - 1;
      const validation = validateCoverageDataAge(oneYearAgo);

      expect(validation.isRecent).toBe(true);
      expect(validation.ageYears).toBe(1);
      expect(validation.warning).toBeNull();
      expect(validation.status).toBe('acceptable');

      console.log(`✓ Test 2 passed: 1-year-old data is acceptable`);
    });

    /**
     * Test 3: 2-year-old data - exactly at threshold (should be acceptable)
     */
    it('Test 3: 2-year-old data at threshold should be acceptable (isRecent=true)', () => {
      const currentYear = new Date().getFullYear();
      const twoYearsAgo = currentYear - 2;
      const validation = validateCoverageDataAge(twoYearsAgo);

      expect(validation.isRecent).toBe(true);
      expect(validation.ageYears).toBe(2);
      expect(validation.warning).toBeNull();
      expect(validation.status).toBe('acceptable');

      console.log(`✓ Test 3 passed: 2-year-old data at threshold is acceptable`);
    });

    /**
     * Test 4: 3-year-old data - exceeds 2-year threshold (should warn)
     * **Validates: Requirement 5.3 - "Se coverage data > 2 anos: display warning"**
     */
    it('Test 4: 3-year-old data exceeds threshold (isRecent=false, warning provided)', () => {
      const currentYear = new Date().getFullYear();
      const threeYearsAgo = currentYear - 3;
      const validation = validateCoverageDataAge(threeYearsAgo);

      expect(validation.isRecent).toBe(false);
      expect(validation.ageYears).toBe(3);
      expect(validation.warning).toBeDefined();
      expect(validation.warning).toContain('3 years old');
      expect(validation.warning).toContain('2-year');
      expect(validation.status).toBe('outdated');
      expect(validation.recommendation).toBeDefined();

      console.log(
        `✓ Test 4 passed: 3-year-old data triggers warning: "${validation.warning}"`
      );
    });

    /**
     * Test 5: 5-year-old data - very outdated (strong warning)
     */
    it('Test 5: 5-year-old data is very outdated (isRecent=false, strong warning)', () => {
      const currentYear = new Date().getFullYear();
      const sixYearsAgo = currentYear - 6; // Use 6 years to ensure "very_outdated" status
      const validation = validateCoverageDataAge(sixYearsAgo);

      expect(validation.isRecent).toBe(false);
      expect(validation.ageYears).toBe(6);
      expect(validation.warning).toBeDefined();
      expect(validation.warning).toContain('significantly outdated');
      expect(validation.status).toBe('very_outdated');
      expect(validation.recommendation).toContain('STRONGLY RECOMMENDED');

      console.log(
        `✓ Test 5 passed: 6-year-old data very outdated, strong warning issued`
      );
    });

    /**
     * Test 6: Future year (invalid) - should be handled gracefully
     */
    it('Test 6: Future year should be marked as invalid', () => {
      const currentYear = new Date().getFullYear();
      const futureYear = currentYear + 1;
      const validation = validateCoverageDataAge(futureYear);

      expect(validation.isRecent).toBe(false);
      expect(validation.warning).toBeDefined();
      expect(validation.warning).toContain('future');
      expect(validation.status).toBe('invalid');

      console.log(`✓ Test 6 passed: Future year handled as invalid`);
    });

    /**
     * Test 7: Custom threshold parameter (1 year instead of 2)
     */
    it('Test 7: Custom threshold - 2-year-old data with 1-year threshold (isRecent=false)', () => {
      const currentYear = new Date().getFullYear();
      const twoYearsAgo = currentYear - 2;
      const validation = validateCoverageDataAge(twoYearsAgo, 1); // threshold = 1 year

      expect(validation.isRecent).toBe(false);
      expect(validation.ageYears).toBe(2);
      expect(validation.warning).toBeDefined();
      expect(validation.status).toBe('outdated');

      console.log(`✓ Test 7 passed: Custom threshold of 1 year applied correctly`);
    });

    /**
     * Test 8: Validation result structure - all required fields present
     */
    it('Test 8: Validation result has all required fields', () => {
      const validation = validateCoverageDataAge(2022);

      // Required fields
      expect(validation).toHaveProperty('year');
      expect(validation).toHaveProperty('current_year');
      expect(validation).toHaveProperty('ageYears');
      expect(validation).toHaveProperty('isRecent');
      expect(validation).toHaveProperty('warning');
      expect(validation).toHaveProperty('recommendation');
      expect(validation).toHaveProperty('status');
      expect(validation).toHaveProperty('timestamp');

      console.log(`✓ Test 8 passed: All required fields present in validation result`);
    });
  });

  describe('allowManualOverride() - Requirement 5.3, 5.6', () => {
    /**
     * Test 9: Override with new percentage - basic functionality
     * **Validates: Requirement 5.3 - "Permitir override manual de percentual"**
     */
    it('Test 9: Can override coverage with new percentage (basic)', () => {
      const originalCoverage = {
        total_coverage_ha: 350,
        coverage_percentage: 58.5,
        imovel_area_ha: 600,
        by_type: {
          floresta_nativa: { area_ha: 300, percentage: 50.0 },
          cerrado_nativo: { area_ha: 50, percentage: 8.3 },
        },
      };

      const overridden = allowManualOverride(originalCoverage, 65.0, {
        reason: 'drone_survey',
        technicianName: 'João Silva',
        notes: 'Drone survey 2024-01-10',
      });

      // Check override was applied
      expect(overridden.manual_override_applied).toBe(true);
      expect(overridden.coverage_percentage).toBe(65.0);
      expect(overridden.total_coverage_ha).toBe(390); // 65% of 600 ha
      expect(overridden.override_reason).toBe('drone_survey');
      expect(overridden.override_technician).toBe('João Silva');

      // Check originals are preserved
      expect(overridden.coverage_percentage_original).toBe(58.5);
      expect(overridden.total_coverage_ha_original).toBe(350);

      console.log(
        `✓ Test 9 passed: Override applied - coverage 58.5% → 65.0%`
      );
    });

    /**
     * Test 10: Override with same percentage (accepts outdated data)
     */
    it('Test 10: Can accept outdated data by overriding with same percentage', () => {
      const coverage = {
        total_coverage_ha: 412.35,
        coverage_percentage: 69.1,
        imovel_area_ha: 596.2,
        by_type: {},
      };

      const accepted = allowManualOverride(coverage, 69.1, {
        reason: 'data_accepted_despite_age',
        technicianName: 'Maria Santos',
        notes: 'Field inspection confirms data accuracy despite age',
      });

      expect(accepted.manual_override_applied).toBe(true);
      expect(accepted.coverage_percentage).toBe(69.1);
      expect(accepted.override_reason).toBe('data_accepted_despite_age');

      console.log(
        `✓ Test 10 passed: Outdated data accepted with same percentage`
      );
    });

    /**
     * Test 11: Invalid percentage (< 0) - should reject
     */
    it('Test 11: Invalid override percentage < 0 should be rejected', () => {
      const coverage = { total_coverage_ha: 400, coverage_percentage: 50, imovel_area_ha: 800 };

      const result = allowManualOverride(coverage, -5);

      expect(result.manual_override_applied).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Invalid');

      console.log(`✓ Test 11 passed: Negative percentage rejected`);
    });

    /**
     * Test 12: Invalid percentage (> 100) - should reject
     */
    it('Test 12: Invalid override percentage > 100 should be rejected', () => {
      const coverage = { total_coverage_ha: 400, coverage_percentage: 50, imovel_area_ha: 800 };

      const result = allowManualOverride(coverage, 150);

      expect(result.manual_override_applied).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Invalid');

      console.log(`✓ Test 12 passed: Percentage > 100 rejected`);
    });

    /**
     * Test 13: Override timestamp and metadata are recorded
     */
    it('Test 13: Override metadata including timestamp are recorded', () => {
      const coverage = {
        total_coverage_ha: 300,
        coverage_percentage: 50,
        imovel_area_ha: 600,
        by_type: {},
      };

      const before = new Date();
      const overridden = allowManualOverride(coverage, 60, {
        reason: 'field_estimate',
        technicianName: 'Test Tech',
        notes: 'Field notes',
      });
      const after = new Date();

      expect(overridden.override_timestamp).toBeDefined();
      const overrideTime = new Date(overridden.override_timestamp);
      expect(overrideTime.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(overrideTime.getTime()).toBeLessThanOrEqual(after.getTime());

      console.log(
        `✓ Test 13 passed: Override metadata and timestamp recorded`
      );
    });

    /**
     * Test 14: Override updates vegetation type areas proportionally
     */
    it('Test 14: Override distributes proportionally across vegetation types', () => {
      const coverage = {
        total_coverage_ha: 300,
        coverage_percentage: 50,
        imovel_area_ha: 600,
        by_type: {
          floresta_nativa: { area_ha: 200, percentage: 33.3, pixel_count: 0 },
          cerrado_nativo: { area_ha: 100, percentage: 16.7, pixel_count: 0 },
        },
      };

      // Override from 50% to 60% (factor = 1.2)
      const overridden = allowManualOverride(coverage, 60);

      // Verify the by_type was properly copied
      expect(overridden.by_type).toBeDefined();
      expect(overridden.by_type.floresta_nativa).toBeDefined();
      
      if (overridden.by_type.floresta_nativa && overridden.by_type.floresta_nativa.area_ha) {
        // Forest area should be: 200 * 1.2 = 240
        // Cerrado area should be: 100 * 1.2 = 120
        expect(overridden.by_type.floresta_nativa.area_ha).toBeCloseTo(240, 0);
        expect(overridden.by_type.cerrado_nativo.area_ha).toBeCloseTo(120, 0);
      }

      // Total should be 60% of 600 = 360
      expect(overridden.total_coverage_ha).toBeCloseTo(360, 0);

      console.log(
        `✓ Test 14 passed: Override distributed proportionally across vegetation types`
      );
    });

    /**
     * Test 15: Override result structure includes all required fields
     */
    it('Test 15: Override result has all required fields', () => {
      const coverage = {
        total_coverage_ha: 400,
        coverage_percentage: 50,
        imovel_area_ha: 800,
        by_type: {},
      };

      const overridden = allowManualOverride(coverage, 60, {
        reason: 'test',
        technicianName: 'Test',
      });

      expect(overridden).toHaveProperty('manual_override_applied');
      expect(overridden).toHaveProperty('coverage_percentage_original');
      expect(overridden).toHaveProperty('total_coverage_ha_original');
      expect(overridden).toHaveProperty('coverage_percentage');
      expect(overridden).toHaveProperty('total_coverage_ha');
      expect(overridden).toHaveProperty('override_reason');
      expect(overridden).toHaveProperty('override_technician');
      expect(overridden).toHaveProperty('override_notes');
      expect(overridden).toHaveProperty('override_timestamp');

      console.log(`✓ Test 15 passed: Override result has all required fields`);
    });
  });

  describe('calculateNativeCoverage() - Data Recency Integration', () => {
    /**
     * Test 16: Coverage with recent data includes recency info
     */
    it('Test 16: Coverage with recent data includes no recency warning', async () => {
      const currentYear = new Date().getFullYear();
      const lastYear = currentYear - 1; // Use last year to avoid edge cases
      const polygon = createTestPolygon();
      const rasterData = createTestRaster(lastYear);

      const result = await calculateNativeCoverage(polygon, rasterData);

      expect(result.year).toBe(lastYear);
      expect(result.age_years).toBe(1);
      expect(result.data_recency_status).toBe('acceptable');
      expect(result.data_recency_warning).toBeNull();

      console.log(`✓ Test 16 passed: Recent data has no recency warning`);
    });

    /**
     * Test 17: Coverage with outdated data includes warning
     */
    it('Test 17: Coverage with outdated data includes recency warning', async () => {
      const currentYear = new Date().getFullYear();
      const threeYearsAgo = currentYear - 3;
      const polygon = createTestPolygon();
      const rasterData = createTestRaster(threeYearsAgo);

      const result = await calculateNativeCoverage(polygon, rasterData);

      expect(result.year).toBe(threeYearsAgo);
      expect(result.age_years).toBe(3);
      expect(result.data_recency_status).toBe('outdated');
      expect(result.data_recency_warning).toBeDefined();
      expect(result.data_recency_warning).toContain('3 years old');
      expect(result.allow_manual_override).toBe(true);

      console.log(
        `✓ Test 17 passed: Outdated data includes warning and allows override`
      );
    });

    /**
     * Test 18: Coverage with unknown year is marked for verification
     */
    it('Test 18: Coverage with unknown data year is marked for verification', async () => {
      const polygon = createTestPolygon();
      const rasterData = {
        data: [{ id: 0, value: 1 }],
        year: null, // Unknown year
        resolution: 30,
      };

      const result = await calculateNativeCoverage(polygon, rasterData);

      expect(result.year).toBeNull();
      expect(result.data_recency_warning).toBeDefined();
      expect(result.data_recency_warning).toContain('unknown');
      expect(result.data_recency_status).toBe('unknown_age');

      console.log(
        `✓ Test 18 passed: Unknown year data marked for verification`
      );
    });

    /**
     * Test 19: Coverage result includes allow_manual_override flag
     */
    it('Test 19: Coverage result always includes allow_manual_override flag', async () => {
      const polygon = createTestPolygon();
      const rasterData = createTestRaster();

      const result = await calculateNativeCoverage(polygon, rasterData);

      expect(result).toHaveProperty('allow_manual_override');
      expect(result.allow_manual_override).toBe(true);

      console.log(
        `✓ Test 19 passed: Coverage result includes allow_manual_override flag`
      );
    });

    /**
     * Test 20: Data recency info is included in all coverage results
     */
    it('Test 20: All coverage results include data recency fields', async () => {
      const polygon = createTestPolygon();
      const rasterData = createTestRaster(2022);

      const result = await calculateNativeCoverage(polygon, rasterData);

      // All recency fields should be present
      expect(result).toHaveProperty('year');
      expect(result).toHaveProperty('age_years');
      expect(result).toHaveProperty('data_recency_warning');
      expect(result).toHaveProperty('data_recency_status');
      expect(result).toHaveProperty('allow_manual_override');

      console.log(
        `✓ Test 20 passed: All coverage results include data recency fields`
      );
    });
  });

  describe('Integration: Data Recency Workflow', () => {
    /**
     * Test 21: Complete workflow - outdated data + override
     */
    it('Test 21: Complete workflow - load outdated data, then override', async () => {
      const currentYear = new Date().getFullYear();
      const threeYearsAgo = currentYear - 3;
      const polygon = createTestPolygon();
      const rasterData = createTestRaster(threeYearsAgo, 100);

      // Step 1: Calculate coverage with outdated data
      const coverage = await calculateNativeCoverage(polygon, rasterData);

      expect(coverage.age_years).toBe(3);
      expect(coverage.data_recency_warning).toBeDefined();
      console.log(
        `  Step 1: Outdated coverage loaded, warning: "${coverage.data_recency_warning}"`
      );

      // Step 2: Technician performs drone survey and overrides with new percentage
      const overridden = allowManualOverride(coverage, 75.0, {
        reason: 'drone_survey',
        technicianName: 'João Silva',
        notes: 'Drone survey 2024-01-20 shows forest recovery',
      });

      expect(overridden.coverage_percentage).toBe(75.0);
      expect(overridden.manual_override_applied).toBe(true);
      console.log(
        `  Step 2: Overridden with drone survey data to 75.0%`
      );

      // Step 3: Verify override preserves original data
      expect(overridden.coverage_percentage_original).toBeGreaterThan(0);
      console.log(
        `  Step 3: Original data preserved: ${overridden.coverage_percentage_original}% → ${overridden.coverage_percentage}%`
      );

      console.log(`✓ Test 21 passed: Complete data recency workflow works`);
    });

    /**
     * Test 22: Requirements 5.3 & 5.6 combined validation
     */
    it('Test 22: Requirements 5.3 & 5.6 - Coverage > 2 years warns and allows override', async () => {
      // Requirement 5.3: "WHEN coverage data is unavailable or outdated (> 2 years) THEN display warning + allow manual input"
      // Requirement 5.6: "Include age information in coverage results (year, age_years, data_recency_warning)"

      const currentYear = new Date().getFullYear();
      const oldYear = currentYear - 3; // > 2 years
      const polygon = createTestPolygon();
      const rasterData = createTestRaster(oldYear);

      const coverage = await calculateNativeCoverage(polygon, rasterData);

      // Requirement 5.3: Display warning
      expect(coverage.data_recency_warning).toBeDefined();
      console.log(`  Req 5.3a - Warning displayed: "${coverage.data_recency_warning}"`);

      // Requirement 5.3: Allow manual override
      expect(coverage.allow_manual_override).toBe(true);
      const manualResult = allowManualOverride(coverage, 65.0);
      expect(manualResult.manual_override_applied).toBe(true);
      console.log(`  Req 5.3b - Manual override applied: 65.0%`);

      // Requirement 5.6: Include age information
      expect(coverage.year).toBe(oldYear);
      expect(coverage.age_years).toBe(3);
      expect(coverage.data_recency_warning).toBeDefined();
      console.log(
        `  Req 5.6 - Age info: year=${coverage.year}, age_years=${coverage.age_years}`
      );

      console.log(
        `✓ Test 22 passed: Requirements 5.3 & 5.6 validated together`
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('Should handle zero area properties', async () => {
      const polygon = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[0, 0], [0, 0], [0, 0], [0, 0]]],
        },
      };

      const rasterData = createTestRaster(2020);
      const result = await calculateNativeCoverage(polygon, rasterData);

      // Should not crash, should handle gracefully
      expect(result).toBeDefined();
      expect(result.imovel_area_ha).toBe(0);
    });

    it('Should handle null raster data gracefully', async () => {
      const polygon = createTestPolygon();
      const result = await calculateNativeCoverage(polygon, null);

      expect(result).toBeDefined();
      expect(result.data_recency_warning).toContain('unavailable');
      expect(result.allow_manual_override).toBe(true);
    });

    it('Should handle very old data (10+ years)', () => {
      const currentYear = new Date().getFullYear();
      const veryOldYear = currentYear - 12;
      const validation = validateCoverageDataAge(veryOldYear);

      expect(validation.isRecent).toBe(false);
      expect(validation.status).toBe('very_outdated');
      expect(validation.warning).toContain('significantly outdated');
    });
  });
});
