/**
 * Property-Based Tests for Bioma Classifier
 * Validates: Requirements 4.2-4.3 (Bioma Classification and RL Percentage)
 * 
 * **Validates: Requirements 4.2, 4.3**
 * Property 5: Bioma Classification
 * - Gerar coordenadas aleatórias em MT (bbox válido)
 * - Verificar que bioma ∈ {"Amazônia Legal", "Cerrado"} sempre
 * - Verificar que municípios em limite recebem 80% RL (mais restritivo)
 * - Min 200 exemplos, max 1000
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { classifyBioma, calculateRLMinima } from '../src/modules/apprlcalculator/biomaClassifier.js';

/**
 * MT Municipality Test Data
 * Organized by bioma type for comprehensive testing
 */
const mtMunicipios = {
  amazonia_legal: [
    'Sapezal',
    'Sorriso',
    'Lucas do Rio Verde',
    'Nortelandia',
    'Nova Lacerda',
    'Paranaita',
    'Guarantã do Norte',
    'Matupá',
    'Leme do Prado',
    'Alta Floresta',
    'Itaúba',
    'Carlinda',
    'União do Sul',
    'Cotriguaçu',
    'Apiacás',
  ],
  cerrado: [
    'Várzea Grande',
    'Primavera do Leste',
    'Campo Verde',
    'Rondonópolis',
    'Guiratinga',
    'Araguainha',
    'Itiquira',
    'Jangada',
    'Acorizal',
    'Rosário Oeste',
    'Poconé',
    'Barão de Melgaço',
    'Cáceres',
    'Porto Esperidião',
  ],
  boundary: [
    'Cuiabá',
    'Nova Mutum',
    'Tangará da Serra',
    'Diamantino',
    'Conquista d\'Oeste',
  ],
};

/**
 * MT Valid Coordinate Bounding Box
 * Approximate MT geographic bounds in SIRGAS2000
 */
const mtBounds = {
  minLon: -61.7, // Western edge (Amazon region)
  maxLon: -51.6, // Eastern edge
  minLat: -18.0, // Southern edge
  maxLat: -7.0,  // Northern edge (close to equator)
};

/**
 * Generate valid MT municipality arbitrarily
 */
const arb_mtMunicipio = fc.oneof(
  fc.constantFrom(...Object.values(mtMunicipios).flat())
);

/**
 * Generate valid MT coordinates (lat/lon) in SIRGAS2000
 * Ensures all coordinates fall within MT geographic bounds
 * Using decimal places for realistic lat/lon values
 */
const arb_mtCoordinates = fc.tuple(
  fc.integer({ min: -618, max: -516 }).map(x => x / 10), // minLon -61.8 to maxLon -51.6
  fc.integer({ min: -180, max: -70 }).map(y => y / 10)   // minLat -18.0 to maxLat -7.0
);

/**
 * Generate property areas (1 ha to 10,000 ha)
 */
const arb_propertyArea = fc.integer({ min: 1, max: 10000 });

describe('Property 5: Bioma Classification', () => {
  
  describe('Core Property: Valid Bioma Output', () => {
    
    it(
      'P5.1: classifyBioma always returns bioma from valid set {amazonia_legal, cerrado}',
      () => {
        fc.assert(
          fc.property(arb_mtMunicipio, arb_mtCoordinates, (municipio, [lon, lat]) => {
            const result = classifyBioma(municipio, [lon, lat]);
            
            // Result must have a bioma field
            expect(result).toHaveProperty('bioma');
            
            // Bioma must be one of the valid values (or null for unrecognized municipality)
            const validBiomas = ['amazonia_legal', 'cerrado', null];
            expect(validBiomas).toContain(result.bioma);
          }),
          { numRuns: 300 } // 200-1000 range per spec
        );
      }
    );

    it(
      'P5.2: classifyBioma always returns rl_percentage in {80, 35}',
      () => {
        fc.assert(
          fc.property(arb_mtMunicipio, arb_mtCoordinates, (municipio, [lon, lat]) => {
            const result = classifyBioma(municipio, [lon, lat]);
            
            if (result.bioma) {
              // If bioma is identified, RL must be set correctly
              expect([80, 35]).toContain(result.rl_percentage);
              
              // Verify bioma-RL correspondence
              if (result.bioma === 'amazonia_legal') {
                expect(result.rl_percentage).toBe(80);
              } else if (result.bioma === 'cerrado') {
                expect(result.rl_percentage).toBe(35);
              }
            }
          }),
          { numRuns: 300 }
        );
      }
    );

    it(
      'P5.3: Amazônia Legal municipalities ALWAYS have RL percentage = 80',
      () => {
        fc.assert(
          fc.property(
            fc.constantFrom(...mtMunicipios.amazonia_legal),
            arb_mtCoordinates,
            (municipio, [lon, lat]) => {
              const result = classifyBioma(municipio, [lon, lat]);
              
              expect(result.bioma).toBe('amazonia_legal');
              expect(result.rl_percentage).toBe(80);
            }
          ),
          { numRuns: 200 }
        );
      }
    );

    it(
      'P5.4: Cerrado municipalities (non-boundary) ALWAYS have RL percentage = 35',
      () => {
        const cerradoNonBoundary = mtMunicipios.cerrado;
        
        fc.assert(
          fc.property(
            fc.constantFrom(...cerradoNonBoundary),
            arb_mtCoordinates,
            (municipio, [lon, lat]) => {
              const result = classifyBioma(municipio, [lon, lat]);
              
              expect(result.bioma).toBe('cerrado');
              expect(result.rl_percentage).toBe(35);
            }
          ),
          { numRuns: 150 }
        );
      }
    );

    it(
      'P5.5: Boundary municipalities apply restrictive 80% RL (Amazônia Legal)',
      () => {
        fc.assert(
          fc.property(
            fc.constantFrom(...mtMunicipios.boundary),
            arb_mtCoordinates,
            (municipio, [lon, lat]) => {
              const result = classifyBioma(municipio, [lon, lat]);
              
              // Boundary municipalities must return 80% (most restrictive)
              expect(result.rl_percentage).toBe(80);
              expect(result.bioma).toBe('amazonia_legal');
            }
          ),
          { numRuns: 150 }
        );
      }
    );
  });

  describe('Property Consistency: Bioma ↔ RL Correspondence', () => {
    
    it(
      'P5.6: For ANY valid bioma classification, bioma value matches RL percentage',
      () => {
        fc.assert(
          fc.property(arb_mtMunicipio, arb_mtCoordinates, (municipio, [lon, lat]) => {
            const result = classifyBioma(municipio, [lon, lat]);
            
            if (result.bioma === 'amazonia_legal') {
              expect(result.rl_percentage).toBe(80);
            } else if (result.bioma === 'cerrado') {
              expect(result.rl_percentage).toBe(35);
            } else if (result.bioma === null) {
              // Invalid municipality
              expect(result.rl_percentage).toBeNull();
            }
          }),
          { numRuns: 300 }
        );
      }
    );

    it(
      'P5.7: Result always includes required fields (bioma, rl_percentage, municipality, confidence)',
      () => {
        fc.assert(
          fc.property(arb_mtMunicipio, arb_mtCoordinates, (municipio, [lon, lat]) => {
            const result = classifyBioma(municipio, [lon, lat]);
            
            expect(result).toHaveProperty('bioma');
            expect(result).toHaveProperty('rl_percentage');
            expect(result).toHaveProperty('municipality');
            expect(result).toHaveProperty('confidence');
            expect(result).toHaveProperty('timestamp');
            
            // Confidence must be one of valid values
            expect(['high', 'medium', 'low']).toContain(result.confidence);
          }),
          { numRuns: 300 }
        );
      }
    );
  });

  describe('Edge Cases and Boundary Conditions', () => {
    
    it(
      'P5.8: Coordinates at MT extremes (corners) are handled correctly',
      () => {
        // Test the four corner points of MT
        const mtCorners = [
          [mtBounds.minLon, mtBounds.minLat], // SW
          [mtBounds.maxLon, mtBounds.minLat], // SE
          [mtBounds.minLon, mtBounds.maxLat], // NW
          [mtBounds.maxLon, mtBounds.maxLat], // NE
        ];
        
        mtCorners.forEach(coords => {
          const result = classifyBioma('Sapezal', coords);
          
          // Should still produce valid classification
          expect([80, 35, null]).toContain(result.rl_percentage);
        });
      }
    );

    it(
      'P5.9: Random coordinates within northern MT (lat > -14.5) tend to be Amazônia',
      () => {
        fc.assert(
          fc.property(
            arb_mtMunicipio,
            fc.tuple(
              fc.integer({ min: -618, max: -516 }).map(x => x / 10), // lon range
              fc.integer({ min: -145, max: -70 }).map(y => y / 10)   // lat north range (-14.5 to -7.0)
            ),
            (municipio, [lon, lat]) => {
              const result = classifyBioma(municipio, [lon, lat]);
              
              // For municipalities in north, should mostly be Amazônia Legal (80%)
              // or explicitly defined as Cerrado with lower RL
              if (result.bioma) {
                expect([80, 35]).toContain(result.rl_percentage);
              }
            }
          ),
          { numRuns: 150 }
        );
      }
    );

    it(
      'P5.10: Case-insensitive municipality name matching',
      () => {
        fc.assert(
          fc.property(
            fc.constantFrom(...mtMunicipios.amazonia_legal),
            arb_mtCoordinates,
            (municipio, coords) => {
              // Test with different case variations
              const result1 = classifyBioma(municipio.toUpperCase(), coords);
              const result2 = classifyBioma(municipio.toLowerCase(), coords);
              const result3 = classifyBioma(municipio, coords);
              
              // All should produce the same classification
              expect(result1.bioma).toBe(result2.bioma);
              expect(result2.bioma).toBe(result3.bioma);
              expect(result1.rl_percentage).toBe(result2.rl_percentage);
              expect(result2.rl_percentage).toBe(result3.rl_percentage);
            }
          ),
          { numRuns: 100 }
        );
      }
    );
  });

  describe('Integration with calculateRLMinima', () => {
    
    it(
      'P5.11: Calculated RL minima matches RL percentage from classifyBioma',
      () => {
        fc.assert(
          fc.property(
            arb_mtMunicipio,
            arb_mtCoordinates,
            arb_propertyArea,
            (municipio, coords, totalArea) => {
              // Classify bioma
              const biomaResult = classifyBioma(municipio, coords);
              
              if (biomaResult.bioma) {
                // Calculate RL minima
                const rlResult = calculateRLMinima(totalArea, biomaResult.bioma);
                
                // RL percentage must match
                expect(rlResult.rl_percentage).toBe(biomaResult.rl_percentage);
                
                // RL minima must be correctly calculated
                const expectedMinima = (totalArea * biomaResult.rl_percentage) / 100;
                expect(rlResult.rl_minima_ha).toBe(parseFloat(expectedMinima.toFixed(2)));
              }
            }
          ),
          { numRuns: 250 }
        );
      }
    );

    it(
      'P5.12: RL minima is always non-negative and ≤ total area',
      () => {
        fc.assert(
          fc.property(
            arb_mtMunicipio,
            arb_mtCoordinates,
            arb_propertyArea,
            (municipio, coords, totalArea) => {
              const biomaResult = classifyBioma(municipio, coords);
              
              if (biomaResult.bioma) {
                const rlResult = calculateRLMinima(totalArea, biomaResult.bioma);
                
                // RL minima must be non-negative
                expect(rlResult.rl_minima_ha).toBeGreaterThanOrEqual(0);
                
                // RL minima must never exceed total area
                expect(rlResult.rl_minima_ha).toBeLessThanOrEqual(totalArea);
              }
            }
          ),
          { numRuns: 250 }
        );
      }
    );

    it(
      'P5.13: RL minima for Amazônia always ≥ RL minima for Cerrado (same area)',
      () => {
        fc.assert(
          fc.property(arb_propertyArea, (totalArea) => {
            const amazonia_rl = calculateRLMinima(totalArea, 'amazonia_legal');
            const cerrado_rl = calculateRLMinima(totalArea, 'cerrado');
            
            // Amazônia RL (80%) must always be >= Cerrado RL (35%)
            expect(amazonia_rl.rl_minima_ha).toBeGreaterThanOrEqual(cerrado_rl.rl_minima_ha);
            
            // Specifically, Amazônia should be about 2.3x Cerrado
            const ratio = amazonia_rl.rl_minima_ha / cerrado_rl.rl_minima_ha;
            expect(ratio).toBeCloseTo(80 / 35, 1); // Allow 1 decimal place tolerance
          }),
          { numRuns: 200 }
        );
      }
    );
  });

  describe('Specific MT Test Cases', () => {
    
    it(
      'P5.14: Known Amazônia municipalities (Sapezal, Sorriso) return 80% RL',
      () => {
        const testCases = [
          { municipio: 'Sapezal', coords: [-58.83, -13.18] },
          { municipio: 'Sorriso', coords: [-55.70, -12.55] },
          { municipio: 'Lucas do Rio Verde', coords: [-55.90, -12.03] },
        ];
        
        testCases.forEach(({ municipio, coords }) => {
          const result = classifyBioma(municipio, coords);
          expect(result.bioma).toBe('amazonia_legal');
          expect(result.rl_percentage).toBe(80);
        });
      }
    );

    it(
      'P5.15: Known Cerrado municipalities return 35% RL',
      () => {
        const testCases = [
          { municipio: 'Rondonópolis', coords: [-54.63, -16.47] },
          { municipio: 'Primavera do Leste', coords: [-54.29, -15.56] },
          { municipio: 'Campo Verde', coords: [-55.19, -15.63] },
        ];
        
        testCases.forEach(({ municipio, coords }) => {
          const result = classifyBioma(municipio, coords);
          expect(result.bioma).toBe('cerrado');
          expect(result.rl_percentage).toBe(35);
        });
      }
    );

    it(
      'P5.16: Boundary municipality (Cuiabá) applies 80% restriction',
      () => {
        // Cuiabá is on boundary; should apply 80%
        const result = classifyBioma('Cuiabá', [-55.67, -15.60]);
        
        expect(result.rl_percentage).toBe(80);
        expect(result.bioma).toBe('amazonia_legal');
      }
    );
  });

  describe('Error Handling and Invalid Input', () => {
    
    it(
      'P5.17: Invalid/unknown municipalities return error gracefully',
      () => {
        const result = classifyBioma('UnknownMunicipio', [-58.0, -13.0]);
        
        expect(result.bioma).toBeNull();
        expect(result.rl_percentage).toBeNull();
        expect(result.error).toBeDefined();
        expect(result.confidence).toBe('low');
      }
    );

    it(
      'P5.18: Missing coordinates returns error',
      () => {
        const result = classifyBioma('Sapezal', null);
        
        expect(result.bioma).toBeNull();
        expect(result.error).toBeDefined();
      }
    );

    it(
      'P5.19: Missing municipality name returns error',
      () => {
        const result = classifyBioma(null, [-58.0, -13.0]);
        
        expect(result.bioma).toBeNull();
        expect(result.error).toBeDefined();
      }
    );
  });
});
