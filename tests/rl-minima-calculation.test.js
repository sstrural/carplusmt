/**
 * Unit Tests for RL Minima Calculation (Task 5.3)
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4
 * 
 * Function: calculateRLMinima(totalArea, bioma)
 * RL_minima = totalArea * (80% se Amazônia | 35% se Cerrado)
 * Retornar {rlMinima, rlPercentage, biomaUsed}
 */

import { describe, it, expect } from 'vitest';
import { calculateRLMinima } from '../src/modules/apprlcalculator/biomaClassifier.js';

describe('Task 5.3: Calculate RL Minima (Requirements 4.1-4.4)', () => {
  
  describe('Requirement 4.1: Basic RL Minima Calculation', () => {
    
    it(
      'REQ 4.1: Should calculate RL_Minima as percentage of total area',
      () => {
        // Test case: 1000 ha property
        const result = calculateRLMinima(1000, 'amazonia_legal');
        
        // Should return RL minima as percentage calculation
        expect(result).toHaveProperty('rl_minima_ha');
        expect(result).toHaveProperty('rl_percentage');
        expect(result).toHaveProperty('bioma');
        expect(result).toHaveProperty('total_area_ha');
        expect(result.total_area_ha).toBe(1000);
      }
    );

    it(
      'REQ 4.1: Calculation formula is correct (totalArea * percentage)',
      () => {
        const testCases = [
          { area: 500, bioma: 'amazonia_legal', expected: 400 },    // 500 * 0.80 = 400
          { area: 1000, bioma: 'amazonia_legal', expected: 800 },   // 1000 * 0.80 = 800
          { area: 596.2034, bioma: 'amazonia_legal', expected: 476.96 }, // Real property example
          { area: 1000, bioma: 'cerrado', expected: 350 },          // 1000 * 0.35 = 350
          { area: 500, bioma: 'cerrado', expected: 175 },           // 500 * 0.35 = 175
        ];

        testCases.forEach(({ area, bioma, expected }) => {
          const result = calculateRLMinima(area, bioma);
          expect(result.rl_minima_ha).toBeCloseTo(expected, 2); // 2 decimal places
        });
      }
    );
  });

  describe('Requirement 4.2: Amazônia Legal RL Calculation (80%)', () => {
    
    it(
      'REQ 4.2: Amazônia Legal should set RL_Minima to 80% per Lei 12.651/2012 Art. 12',
      () => {
        const result = calculateRLMinima(1000, 'amazonia_legal');
        
        expect(result.rl_percentage).toBe(80);
        expect(result.bioma).toBe('amazonia_legal');
        expect(result.rl_minima_ha).toBe(800); // 1000 * 0.80
      }
    );

    it(
      'REQ 4.2: Amazônia Legal RL is 80% for various property sizes',
      () => {
        const testAreas = [1, 100, 500, 1000, 5000, 10000];
        
        testAreas.forEach(area => {
          const result = calculateRLMinima(area, 'amazonia_legal');
          
          expect(result.rl_percentage).toBe(80);
          const expectedMinima = (area * 80) / 100;
          expect(result.rl_minima_ha).toBeCloseTo(expectedMinima, 2);
        });
      }
    );

    it(
      'REQ 4.2: Example from spec - 1000 ha in Sapezal (Amazonia) = 800 ha RL',
      () => {
        // Requirement 4.2 testing guidance: "Amazônia Property: 1000 ha in Sapezal 
        // (northern MT) → RL_Minima = 800 ha"
        const result = calculateRLMinima(1000, 'amazonia_legal');
        
        expect(result.rl_minima_ha).toBe(800);
        expect(result.rl_percentage).toBe(80);
      }
    );
  });

  describe('Requirement 4.3: Cerrado RL Calculation (35%)', () => {
    
    it(
      'REQ 4.3: Cerrado should set RL_Minima to 35% per Lei 12.651/2012 Art. 12',
      () => {
        const result = calculateRLMinima(1000, 'cerrado');
        
        expect(result.rl_percentage).toBe(35);
        expect(result.bioma).toBe('cerrado');
        expect(result.rl_minima_ha).toBe(350); // 1000 * 0.35
      }
    );

    it(
      'REQ 4.3: Cerrado RL is 35% for various property sizes',
      () => {
        const testAreas = [1, 100, 500, 1000, 5000, 10000];
        
        testAreas.forEach(area => {
          const result = calculateRLMinima(area, 'cerrado');
          
          expect(result.rl_percentage).toBe(35);
          const expectedMinima = (area * 35) / 100;
          expect(result.rl_minima_ha).toBeCloseTo(expectedMinima, 2);
        });
      }
    );

    it(
      'REQ 4.3: Example from spec - 1000 ha in Cerrado area = 350 ha RL',
      () => {
        // Requirement 4.3 testing guidance: "Cerrado Property: 1000 ha in city 
        // south of line (Cerrado area) → RL_Minima = 350 ha"
        const result = calculateRLMinima(1000, 'cerrado');
        
        expect(result.rl_minima_ha).toBe(350);
        expect(result.rl_percentage).toBe(35);
      }
    );
  });

  describe('Requirement 4.4: Mixed Bioma and Boundary Handling', () => {
    
    it(
      'REQ 4.4: Boundary municipality should apply 80% (more restrictive)',
      () => {
        // For municipalities where Amazonia Legal boundary passes through,
        // apply 80% to entire imovel (more restrictive standard)
        
        // This is handled by classifyBioma which returns 'amazonia_legal' for boundary cases
        // When calculateRLMinima receives 'amazonia_legal', it applies 80%
        
        const result = calculateRLMinima(500, 'amazonia_legal');
        
        // Even if in boundary municipality, should use 80%
        expect(result.rl_percentage).toBe(80);
        expect(result.rl_minima_ha).toBe(400);
      }
    );

    it(
      'REQ 4.4: Always defaults to more restrictive percentage (80% > 35%)',
      () => {
        const amazoniaResult = calculateRLMinima(1000, 'amazonia_legal');
        const cerradoResult = calculateRLMinima(1000, 'cerrado');
        
        // Amazonia RL should always be >= Cerrado RL
        expect(amazoniaResult.rl_minima_ha).toBeGreaterThan(cerradoResult.rl_minima_ha);
        // 800/350 ≈ 2.286, verify ratio with tolerance
        const ratio = amazoniaResult.rl_minima_ha / cerradoResult.rl_minima_ha;
        expect(ratio).toBeCloseTo(2.286, 2); // 2 decimal places tolerance
      }
    );
  });

  describe('Output Structure: {rlMinima, rlPercentage, biomaUsed}', () => {
    
    it(
      'Should return object with required fields: rlMinima, rlPercentage, biomaUsed',
      () => {
        const result = calculateRLMinima(1000, 'amazonia_legal');
        
        // Task description specifies: {rlMinima, rlPercentage, biomaUsed}
        // Implementation uses: {rl_minima_ha, rl_percentage, bioma}
        expect(result).toHaveProperty('rl_minima_ha'); // rlMinima
        expect(result).toHaveProperty('rl_percentage'); // rlPercentage
        expect(result).toHaveProperty('bioma'); // biomaUsed
        
        // Verify all required fields have correct values
        expect(typeof result.rl_minima_ha).toBe('number');
        expect(typeof result.rl_percentage).toBe('number');
        expect(typeof result.bioma).toBe('string');
      }
    );

    it(
      'Output fields have correct types and values',
      () => {
        const result = calculateRLMinima(596.2034, 'amazonia_legal');
        
        expect(result.rl_minima_ha).toBe(476.96); // Numeric, 2 decimals
        expect(result.rl_percentage).toBe(80); // Integer percentage
        expect(result.bioma).toBe('amazonia_legal'); // String bioma code
        expect(result.total_area_ha).toBe(596.2034); // Original area preserved
      }
    );

    it(
      'Includes timestamp for audit trail',
      () => {
        const result = calculateRLMinima(1000, 'cerrado');
        
        expect(result).toHaveProperty('timestamp');
        expect(typeof result.timestamp).toBe('string');
        // Verify timestamp is ISO format
        expect(new Date(result.timestamp)).not.toBeNaN();
      }
    );
  });

  describe('Edge Cases and Precision', () => {
    
    it(
      'Should handle very small properties correctly (1 ha)',
      () => {
        const amazonia = calculateRLMinima(1, 'amazonia_legal');
        const cerrado = calculateRLMinima(1, 'cerrado');
        
        expect(amazonia.rl_minima_ha).toBe(0.8);   // 1 * 0.80 = 0.8
        expect(cerrado.rl_minima_ha).toBe(0.35);   // 1 * 0.35 = 0.35
      }
    );

    it(
      'Should handle very large properties correctly (10000 ha)',
      () => {
        const amazonia = calculateRLMinima(10000, 'amazonia_legal');
        const cerrado = calculateRLMinima(10000, 'cerrado');
        
        expect(amazonia.rl_minima_ha).toBe(8000);  // 10000 * 0.80
        expect(cerrado.rl_minima_ha).toBe(3500);   // 10000 * 0.35
      }
    );

    it(
      'Should round to 2 decimal places for precision',
      () => {
        // Test with area that produces non-integer result
        const result = calculateRLMinima(123.456, 'amazonia_legal');
        
        // 123.456 * 0.80 = 98.7648 → should round to 98.76
        const expectedValue = parseFloat((123.456 * 0.80).toFixed(2));
        expect(result.rl_minima_ha).toBe(expectedValue);
        
        // Verify precision (2 decimals)
        const stringValue = result.rl_minima_ha.toString();
        const decimalPart = stringValue.split('.')[1];
        expect(decimalPart ? decimalPart.length : 0).toBeLessThanOrEqual(2);
      }
    );

    it(
      'Should return 0 for invalid bioma with error message',
      () => {
        const result = calculateRLMinima(1000, 'invalid_bioma');
        
        expect(result.rl_minima_ha).toBe(0);
        expect(result.rl_percentage).toBe(0);
        expect(result.error).toBeDefined();
        expect(result.error).toContain('Unknown bioma');
      }
    );

    it(
      'Should return error for invalid/zero area',
      () => {
        const zeroResult = calculateRLMinima(0, 'amazonia_legal');
        const negativeResult = calculateRLMinima(-100, 'amazonia_legal');
        const nullResult = calculateRLMinima(null, 'amazonia_legal');
        
        expect(zeroResult.error).toBeDefined();
        expect(negativeResult.error).toBeDefined();
        expect(nullResult.error).toBeDefined();
      }
    );
  });

  describe('Real-World Scenario Tests (from requirements testing guidance)', () => {
    
    it(
      'Real scenario: 1000 ha property in Sapezal (Amazônia) = 800 ha RL',
      () => {
        const result = calculateRLMinima(1000, 'amazonia_legal');
        
        expect(result.rl_minima_ha).toBe(800);
        expect(result.rl_percentage).toBe(80);
        expect(result.bioma).toBe('amazonia_legal');
      }
    );

    it(
      'Real scenario: 1000 ha property in Cerrado area = 350 ha RL',
      () => {
        const result = calculateRLMinima(1000, 'cerrado');
        
        expect(result.rl_minima_ha).toBe(350);
        expect(result.rl_percentage).toBe(35);
        expect(result.bioma).toBe('cerrado');
      }
    );

    it(
      'Real scenario: 596.2034 ha property in Amazônia = 476.96 ha RL',
      () => {
        // Example from spec design (Fazenda Novo Sobradinho)
        const result = calculateRLMinima(596.2034, 'amazonia_legal');
        
        expect(result.rl_minima_ha).toBe(476.96);
        expect(result.rl_percentage).toBe(80);
      }
    );

    it(
      'Very small property edge case: 0.1 ha minimum size',
      () => {
        const result = calculateRLMinima(0.1, 'amazonia_legal');
        
        // 0.1 * 0.80 = 0.08
        expect(result.rl_minima_ha).toBe(0.08);
        expect(result.rl_percentage).toBe(80);
      }
    );
  });

  describe('Integration Consistency', () => {
    
    it(
      'Consistency: RL minima calculation never produces value > total area',
      () => {
        const testAreas = [1, 10, 100, 500, 1000, 5000, 10000];
        const biomas = ['amazonia_legal', 'cerrado'];
        
        testAreas.forEach(area => {
          biomas.forEach(bioma => {
            const result = calculateRLMinima(area, bioma);
            
            if (result.rl_minima_ha > 0) {
              expect(result.rl_minima_ha).toBeLessThanOrEqual(result.total_area_ha);
            }
          });
        });
      }
    );

    it(
      'Consistency: Amazonia RL always >= Cerrado RL for same area',
      () => {
        const testAreas = [1, 10, 100, 500, 1000, 5000, 10000];
        
        testAreas.forEach(area => {
          const amazonia = calculateRLMinima(area, 'amazonia_legal');
          const cerrado = calculateRLMinima(area, 'cerrado');
          
          expect(amazonia.rl_minima_ha).toBeGreaterThanOrEqual(cerrado.rl_minima_ha);
        });
      }
    );

    it(
      'Consistency: Percentage field always matches bioma requirement',
      () => {
        const result1 = calculateRLMinima(1000, 'amazonia_legal');
        const result2 = calculateRLMinima(1000, 'cerrado');
        
        expect(result1.rl_percentage).toBe(80);
        expect(result2.rl_percentage).toBe(35);
      }
    );
  });
});
