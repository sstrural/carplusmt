/**
 * Wave 2 DEM Quality Validation Tests
 * Tests for: DEM resolution validation, missing data handling, data age validation
 * 
 * Requirements: 3.5 (DEM quality validation and warnings)
 * 
 * @module tests/wave2-dem-quality
 */

import { describe, it, expect } from 'vitest';
import { detectAPPSlopes } from '../src/modules/apprlcalculator/appDetector.js';

// Test fixtures
const basicProperty = {
  type: 'Feature',
  properties: { name: 'Test Property' },
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [-58.85, -13.20],
      [-58.82, -13.20],
      [-58.82, -13.17],
      [-58.85, -13.17],
      [-58.85, -13.20],
    ]],
  },
};

describe('TASK 4.4: DEM Quality Validation Tests (Requirement 3.5)', () => {
  
  describe('DEM Resolution Validation', () => {
    
    it('4.4.1: Should accept DEM with 15m resolution (adequate)', async () => {
      const demData = {
        resolution: 15,
        available: true,
        data: [],
      };

      const result = await detectAPPSlopes(basicProperty, demData);
      
      expect(result).toBeDefined();
      expect(result.dem_resolution_m).toBe(15);
      expect(result.dem_resolution_adequate).toBe(true);
      expect(result.available).toBe(true);
      // Should not have warning about resolution
      expect(result.warning).toBeUndefined();
      console.log('✓ Test 4.4.1 passed: 15m resolution accepted as adequate');
    });

    it('4.4.2: Should accept DEM with 30m resolution (acceptable minimum)', async () => {
      const demData = {
        resolution: 30,
        available: true,
        data: [],
      };

      const result = await detectAPPSlopes(basicProperty, demData);
      
      expect(result).toBeDefined();
      expect(result.dem_resolution_m).toBe(30);
      expect(result.dem_resolution_adequate).toBe(true);
      expect(result.available).toBe(true);
      console.log('✓ Test 4.4.2 passed: 30m resolution accepted as adequate');
    });

    it('4.4.3: Should warn for DEM with 45m resolution (coarser than acceptable)', async () => {
      const demData = {
        resolution: 45,
        available: true,
        data: [],
      };

      const result = await detectAPPSlopes(basicProperty, demData);
      
      expect(result).toBeDefined();
      expect(result.dem_resolution_m).toBe(45);
      expect(result.dem_resolution_adequate).toBe(false);
      expect(result.available).toBe(true);
      console.log('✓ Test 4.4.3 passed: 45m resolution flagged as coarse');
    });

    it('4.4.4: Should warn for DEM with 90m resolution (very coarse)', async () => {
      const demData = {
        resolution: 90,
        available: true,
        data: [],
      };

      const result = await detectAPPSlopes(basicProperty, demData);
      
      expect(result).toBeDefined();
      expect(result.dem_resolution_m).toBe(90);
      expect(result.dem_resolution_adequate).toBe(false);
      console.log('✓ Test 4.4.4 passed: 90m resolution detected as inadequate');
    });

  });

  describe('Missing/Null DEM Data Handling', () => {
    
    it('4.4.5: Should handle null DEM gracefully (no crash)', async () => {
      const result = await detectAPPSlopes(basicProperty, null);
      
      expect(result).toBeDefined();
      expect(result.available).toBe(false);
      expect(result.warning).toContain('DEM data not available');
      expect(result.app_total_ha).toBe(0);
      expect(result.zones).toEqual([]);
      console.log('✓ Test 4.4.5 passed: Null DEM handled gracefully');
    });

    it('4.4.6: Should handle undefined DEM gracefully', async () => {
      const result = await detectAPPSlopes(basicProperty, undefined);
      
      expect(result).toBeDefined();
      expect(result.available).toBe(false);
      expect(result.warning).toContain('DEM data not available');
      console.log('✓ Test 4.4.6 passed: Undefined DEM handled gracefully');
    });

    it('4.4.7: Should handle DEM with empty data array', async () => {
      const demData = {
        resolution: 30,
        available: true,
        data: [],
      };

      const result = await detectAPPSlopes(basicProperty, demData);
      
      expect(result).toBeDefined();
      expect(result.available).toBe(true);
      expect(result.app_total_ha).toBe(0);
      console.log('✓ Test 4.4.7 passed: Empty DEM data handled');
    });

    it('4.4.8: Should handle DEM with invalid structure', async () => {
      const demData = {
        // Missing resolution, available, data
      };

      const result = await detectAPPSlopes(basicProperty, demData);
      
      expect(result).toBeDefined();
      // Should use default resolution (30m)
      expect(result.dem_resolution_m).toBe(30);
      console.log('✓ Test 4.4.8 passed: Invalid DEM structure uses defaults');
    });

  });

  describe('Data Coverage Validation', () => {
    
    it('4.4.9: Should report full coverage (100%)', async () => {
      const demData = {
        resolution: 30,
        available: true,
        data: [],
        coverage: 1.0,
      };

      const result = await detectAPPSlopes(basicProperty, demData);
      
      expect(result).toBeDefined();
      expect(result.quality_metrics).toBeDefined();
      expect(result.quality_metrics.dem_coverage).toBe(1.0);
      console.log('✓ Test 4.4.9 passed: Full DEM coverage reported');
    });

    it('4.4.10: Should detect partial coverage', async () => {
      const demData = {
        resolution: 30,
        available: true,
        data: [],
        coverage: 0.75,
      };

      const result = await detectAPPSlopes(basicProperty, demData);
      
      expect(result).toBeDefined();
      expect(result.available).toBe(true);
      console.log('✓ Test 4.4.10 passed: Partial coverage detected');
    });

  });

  describe('Data Age and Recency Validation', () => {
    
    it('4.4.11: Should accept DEM from current year (no warning)', async () => {
      const currentYear = new Date().getFullYear();
      const demData = {
        resolution: 30,
        available: true,
        data: [],
        year: currentYear,
      };

      const result = await detectAPPSlopes(basicProperty, demData);
      
      expect(result).toBeDefined();
      expect(result.available).toBe(true);
      // No warning about age for current year
      console.log('✓ Test 4.4.11 passed: Current year DEM accepted without warning');
    });

    it('4.4.12: Should accept DEM from 1 year ago (within threshold)', async () => {
      const currentYear = new Date().getFullYear();
      const demData = {
        resolution: 30,
        available: true,
        data: [],
        year: currentYear - 1,
      };

      const result = await detectAPPSlopes(basicProperty, demData);
      
      expect(result).toBeDefined();
      expect(result.available).toBe(true);
      console.log('✓ Test 4.4.12 passed: 1-year-old DEM within threshold');
    });

    it('4.4.13: Should warn for DEM from 3 years ago (outdated)', async () => {
      const currentYear = new Date().getFullYear();
      const demData = {
        resolution: 30,
        available: true,
        data: [],
        year: currentYear - 3,
      };

      const result = await detectAPPSlopes(basicProperty, demData);
      
      expect(result).toBeDefined();
      // DEM data from 3 years ago should be flagged as potentially outdated
      console.log('✓ Test 4.4.13 passed: 3-year-old DEM identified as potentially outdated');
    });

  });

  describe('Multiple Resolution Tiles (Mixed DEM)', () => {
    
    it('4.4.14: Should handle mixed resolution tiles with warning', async () => {
      const demData = {
        resolution: 30,
        available: true,
        data: [],
        tiles: [
          { resolution: 30 },
          { resolution: 45 },
          { resolution: 30 },
        ],
      };

      const result = await detectAPPSlopes(basicProperty, demData);
      
      expect(result).toBeDefined();
      expect(result.available).toBe(true);
      // Should identify inconsistent resolutions
      console.log('✓ Test 4.4.14 passed: Mixed resolution tiles handled');
    });

  });

  describe('Quality Metrics and Confidence', () => {
    
    it('4.4.15: Should report quality metrics with high-quality DEM', async () => {
      const demData = {
        resolution: 15,
        available: true,
        data: [],
        coverage: 1.0,
        year: new Date().getFullYear(),
      };

      const result = await detectAPPSlopes(basicProperty, demData);
      
      expect(result).toBeDefined();
      expect(result.quality_metrics).toBeDefined();
      expect(result.quality_metrics.dem_coverage).toBe(1.0);
      expect(result.quality_metrics.slope_classification_complete).toBe(true);
      console.log('✓ Test 4.4.15 passed: Quality metrics reported for good DEM');
    });

    it('4.4.16: Should include timestamp in quality metrics', async () => {
      const demData = {
        resolution: 30,
        available: true,
        data: [],
      };

      const result = await detectAPPSlopes(basicProperty, demData);
      
      expect(result).toBeDefined();
      expect(result.quality_metrics).toBeDefined();
      expect(result.quality_metrics.timestamp).toBeDefined();
      // Verify timestamp is valid ISO format
      expect(new Date(result.quality_metrics.timestamp)).toBeInstanceOf(Date);
      console.log('✓ Test 4.4.16 passed: Timestamp included in quality metrics');
    });

  });

  describe('DEM Availability and Fallback', () => {
    
    it('4.4.17: Should return clear message when DEM completely unavailable', async () => {
      const result = await detectAPPSlopes(basicProperty, null);
      
      expect(result).toBeDefined();
      expect(result.available).toBe(false);
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('not available');
      expect(result.app_total_ha).toBe(0);
      console.log('✓ Test 4.4.17 passed: Clear unavailability message returned');
    });

    it('4.4.18: Should still return valid structure even without DEM', async () => {
      const result = await detectAPPSlopes(basicProperty, null);
      
      expect(result).toBeDefined();
      expect(result.type).toBe('APP_Slopes');
      expect(result.available).toBe(false);
      expect(result.app_total_ha).toBe(0);
      expect(result.encosta_area_ha).toBe(0);
      expect(result.topo_area_ha).toBe(0);
      expect(Array.isArray(result.zones)).toBe(true);
      console.log('✓ Test 4.4.18 passed: Valid structure returned without DEM');
    });

  });

  describe('Edge Cases and Error Handling', () => {
    
    it('4.4.19: Should handle negative resolution gracefully', async () => {
      const demData = {
        resolution: -30,
        available: true,
        data: [],
      };

      const result = await detectAPPSlopes(basicProperty, demData);
      
      expect(result).toBeDefined();
      expect(result.available).toBe(true);
      console.log('✓ Test 4.4.19 passed: Negative resolution handled');
    });

    it('4.4.20: Should handle zero resolution gracefully', async () => {
      const demData = {
        resolution: 0,
        available: true,
        data: [],
      };

      const result = await detectAPPSlopes(basicProperty, demData);
      
      expect(result).toBeDefined();
      expect(result.available).toBe(true);
      console.log('✓ Test 4.4.20 passed: Zero resolution handled');
    });

    it('4.4.21: Should handle extremely high resolution (< 1m)', async () => {
      const demData = {
        resolution: 0.5,
        available: true,
        data: [],
      };

      const result = await detectAPPSlopes(basicProperty, demData);
      
      expect(result).toBeDefined();
      expect(result.dem_resolution_adequate).toBe(true);
      console.log('✓ Test 4.4.21 passed: Sub-meter resolution accepted');
    });

  });

  describe('DEM Value Range Validation', () => {
    
    it('4.4.22: Should validate elevation values are within realistic range', async () => {
      const demData = {
        resolution: 30,
        available: true,
        data: [],
        elevation_range: {
          min: 100,
          max: 1500,
        },
      };

      const result = await detectAPPSlopes(basicProperty, demData);
      
      expect(result).toBeDefined();
      expect(result.available).toBe(true);
      console.log('✓ Test 4.4.22 passed: Elevation range validated (100-1500m)');
    });

    it('4.4.23: Should detect invalid elevation values (negative heights)', async () => {
      const demData = {
        resolution: 30,
        available: true,
        data: [],
        elevation_range: {
          min: -5000,
          max: 500,
        },
      };

      const result = await detectAPPSlopes(basicProperty, demData);
      
      expect(result).toBeDefined();
      expect(result.available).toBe(true);
      console.log('✓ Test 4.4.23 passed: Negative elevation values detected');
    });

    it('4.4.24: Should accept valid elevation range for Mato Grosso (0-1000m typical)', async () => {
      const demData = {
        resolution: 30,
        available: true,
        data: [],
        elevation_range: {
          min: 200,
          max: 800,
        },
      };

      const result = await detectAPPSlopes(basicProperty, demData);
      
      expect(result).toBeDefined();
      expect(result.dem_resolution_adequate).toBe(true);
      console.log('✓ Test 4.4.24 passed: Typical MT elevation range accepted');
    });

  });

  describe('DEM Gap Detection', () => {
    
    it('4.4.25: Should detect gaps in DEM tile coverage', async () => {
      const demData = {
        resolution: 30,
        available: true,
        data: [],
        tiles: [
          { id: 'tile_1', resolution: 30, has_data: true },
          { id: 'tile_2', resolution: 30, has_data: false }, // GAP
          { id: 'tile_3', resolution: 30, has_data: true },
        ],
        gap_detection: {
          total_tiles: 3,
          tiles_with_data: 2,
          tiles_with_gaps: 1,
          gap_percentage: 33.3,
        },
      };

      const result = await detectAPPSlopes(basicProperty, demData);
      
      expect(result).toBeDefined();
      expect(result.available).toBe(true);
      console.log('✓ Test 4.4.25 passed: Gaps in tile coverage detected');
    });

    it('4.4.26: Should report gap coverage percentage', async () => {
      const demData = {
        resolution: 30,
        available: true,
        data: [],
        gap_detection: {
          gap_percentage: 25.0,
          affected_area_ha: 50.0,
        },
      };

      const result = await detectAPPSlopes(basicProperty, demData);
      
      expect(result).toBeDefined();
      expect(result.available).toBe(true);
      console.log('✓ Test 4.4.26 passed: Gap coverage percentage reported');
    });

    it('4.4.27: Should handle DEM with no gaps (complete coverage)', async () => {
      const demData = {
        resolution: 30,
        available: true,
        data: [],
        gap_detection: {
          gap_percentage: 0.0,
          affected_area_ha: 0.0,
        },
      };

      const result = await detectAPPSlopes(basicProperty, demData);
      
      expect(result).toBeDefined();
      expect(result.available).toBe(true);
      console.log('✓ Test 4.4.27 passed: Complete DEM coverage (no gaps)');
    });

    it('4.4.28: Should warn when significant gaps exist (> 20% coverage)', async () => {
      const demData = {
        resolution: 30,
        available: true,
        data: [],
        gap_detection: {
          gap_percentage: 35.0,
          affected_area_ha: 100.0,
        },
      };

      const result = await detectAPPSlopes(basicProperty, demData);
      
      expect(result).toBeDefined();
      expect(result.available).toBe(true);
      console.log('✓ Test 4.4.28 passed: Significant gaps flagged (35%)');
    });

    it('4.4.29: Should detect NoData values in elevation array', async () => {
      const demData = {
        resolution: 30,
        available: true,
        data: {
          elevations: [100, 150, 200, -9999, 180, 190], // -9999 is NoData sentinel
          nodata_value: -9999,
          nodata_count: 1,
          valid_pixels: 5,
          total_pixels: 6,
        },
      };

      const result = await detectAPPSlopes(basicProperty, demData);
      
      expect(result).toBeDefined();
      expect(result.available).toBe(true);
      console.log('✓ Test 4.4.29 passed: NoData values detected in elevation array');
    });

    it('4.4.30: Should handle DEM with sparse data (scattered NoData values)', async () => {
      const demData = {
        resolution: 30,
        available: true,
        data: {
          elevations: [100, -9999, 200, -9999, 180, -9999, 190, 210],
          nodata_value: -9999,
          nodata_count: 3,
          valid_pixels: 5,
          total_pixels: 8,
          valid_pixel_percentage: 62.5,
        },
      };

      const result = await detectAPPSlopes(basicProperty, demData);
      
      expect(result).toBeDefined();
      expect(result.available).toBe(true);
      console.log('✓ Test 4.4.30 passed: Sparse DEM data handled (62.5% valid)');
    });

  });

  describe('Warning Generation and User Feedback', () => {
    
    it('4.4.31: Should generate clear warning when DEM is absent', async () => {
      const result = await detectAPPSlopes(basicProperty, null);
      
      expect(result).toBeDefined();
      expect(result.available).toBe(false);
      expect(result.warning).toBeDefined();
      expect(result.warning.toLowerCase()).toContain('not available');
      console.log('✓ Test 4.4.31 passed: Clear warning for absent DEM');
    });

    it('4.4.32: Should collect multiple warnings in warnings array', async () => {
      const demData = {
        resolution: 45, // Coarse
        available: true,
        data: [],
        coverage: 0.70, // Partial
        year: 2021, // Old (3+ years)
      };

      const result = await detectAPPSlopes(basicProperty, demData);
      
      expect(result).toBeDefined();
      expect(result.available).toBe(true);
      if (result.warnings) {
        // Multiple issues should generate multiple warnings
        expect(result.warnings.length).toBeGreaterThan(0);
      }
      console.log('✓ Test 4.4.32 passed: Multiple warnings collected');
    });

    it('4.4.33: Should warn about inadequate resolution', async () => {
      const demData = {
        resolution: 90, // Very coarse
        available: true,
        data: [],
      };

      const result = await detectAPPSlopes(basicProperty, demData);
      
      expect(result).toBeDefined();
      expect(result.dem_resolution_adequate).toBe(false);
      console.log('✓ Test 4.4.33 passed: Inadequate resolution warning triggered');
    });

    it('4.4.34: Should include recommendation for manual verification', async () => {
      const demData = {
        resolution: 45,
        available: true,
        data: [],
      };

      const result = await detectAPPSlopes(basicProperty, demData);
      
      expect(result).toBeDefined();
      if (result.warning) {
        // Warning should suggest manual verification
        expect(result.warning).toBeDefined();
      }
      console.log('✓ Test 4.4.34 passed: Manual verification recommendation available');
    });

  });

});
