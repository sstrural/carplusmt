/**
 * CAR-MT APP/RL Calculator - Main Entry Point
 * 
 * Bundles all core algorithms and utilities for the APP/RL calculator.
 * This entry point is used by esbuild to create a minified distribution bundle.
 * 
 * Exports:
 * - APP Detection algorithms (waterways, nascentes, slopes)
 * - Bioma classification and RL calculation
 * - Coverage integration and RL deficit calculation
 * - Supporting utilities (storage, geometry, DEM loading, spatial indexing)
 * - Web Worker interfaces
 */

// ── APP DETECTOR ──
export {
  detectAPPWaterways,
  detectAPPNascentes,
  detectAPPSlopes,
  detectHilltops,
  validateProjection,
  mergeNascenteBuffers,
  flagBoundaryNascentes,
} from './modules/apprlcalculator/appDetector.js';

// ── BIOMA CLASSIFIER ──
export {
  classifyBioma,
  calculateRLMinima,
  classifyBiomaList,
  getMunicipiosList,
} from './modules/apprlcalculator/biomaClassifier.js';

// ── COVERAGE INTEGRATOR ──
export {
  loadNativeCoverage,
  calculateNativeCoverage,
  calculateRLDeficit,
  validateCoverageDataAge,
  allowManualOverride,
} from './modules/apprlcalculator/coverageIntegrator.js';

// ── STORAGE MANAGER (Offline IndexedDB) ──
export {
  initDB,
  storeHydrography,
  loadHydrography,
  cacheDemTile,
  getCachedDemTile,
  saveCalculation,
  getAllCalculations,
  saveConfig,
  getConfig,
} from './utils/storageManager.js';

// ── GEOMETRY UTILITIES ──
export {
  createBuffer,
  calculateArea,
  getIntersection,
  unionGeometries,
} from './utils/geometryUtils.js';

// ── HYDROGRAPHY SPATIAL INDEX ──
export {
  HydrographyIndex,
} from './utils/hydrographyIndex.js';

// ── DEM LOADER ──
export {
  DEMLoader,
} from './utils/demLoader.js';

// ── APP/RL CALCULATOR ORCHESTRATOR ──
export {
  version as CALCULATOR_VERSION,
  apprlCalculatorReady,
} from './modules/apprlcalculator/index.js';

/**
 * Version info for tracking deployed builds
 */
export const VERSION = '1.0.0';
export const BUILD_DATE = new Date().toISOString();
