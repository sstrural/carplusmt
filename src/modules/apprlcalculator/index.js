/**
 * APP/RL Calculator Main Module
 * Core module for calculating APP (Áreas de Preservação Permanente)
 * and RL (Reserva Legal) for properties in Mato Grosso
 *
 * @module apprlcalculator
 */

console.log('✓ APP/RL Calculator module initialized');

// Core calculation modules
export { 
  classifyBioma, 
  calculateRLMinima,
  getMunicipiosList,
  classifyBiomaList
} from './biomaClassifier.js';

export { 
  detectAPPWaterways,
  detectAPPNascentes,
  detectAPPSlopes,
  detectHilltops
} from './appDetector.js';

export {
  loadNativeCoverage,
  calculateNativeCoverage,
  allowManualOverride,
  validateCoverageDataAge
} from './coverageIntegrator.js';

export const version = '1.0.0';
export const apprlCalculatorReady = true;
