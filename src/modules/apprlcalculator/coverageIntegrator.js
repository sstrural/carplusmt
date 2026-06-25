/**
 * Coverage Integrator Module
 * Loads and integrates native vegetation coverage data (MapBiomas, PRODES)
 * Calculates intersection with property and classifies by vegetation type
 *
 * @module coverageIntegrator
 */

/**
 * Loads native coverage raster data for a given location
 * Supports MapBiomas (preferred) and PRODES as sources
 *
 * @async
 * @param {Object} imovelBbox - Bounding box [minLon, minLat, maxLon, maxLat]
 * @param {string} dataSource - Data source ('mapbiomas' | 'prodes' | 'auto')
 * @param {Object} options - Configuration options
 * @param {number} options.minYear - Minimum year for data (default: current year - 2)
 * @param {boolean} options.allowManualFallback - If true, allow manual input when data unavailable
 * @returns {Promise<Object>} Coverage raster data or warning if unavailable
 *
 * @example
 * const coverage = await loadNativeCoverage(bbox, 'mapbiomas');
 * console.log(coverage.available); // true or false
 */
export async function loadNativeCoverage(imovelBbox, dataSource = 'auto', options = {}) {
  const {
    minYear = new Date().getFullYear() - 2,
    allowManualFallback = true,
  } = options;

  const result = {
    available: false,
    source: null,
    data: null,
    year: null,
    resolution_m: null,
    warning: null,
    recommendation: null,
  };

  try {
    // Try MapBiomas first (preferred source)
    if (dataSource === 'auto' || dataSource === 'mapbiomas') {
      const mapbiomasResult = await tryLoadMapBiomas(imovelBbox, minYear);
      if (mapbiomasResult.available) {
        return {
          ...result,
          ...mapbiomasResult,
        };
      }
    }

    // Try PRODES as fallback
    if (dataSource === 'auto' || dataSource === 'prodes') {
      const prodesResult = await tryLoadPRODES(imovelBbox, minYear);
      if (prodesResult.available) {
        return {
          ...result,
          ...prodesResult,
        };
      }
    }

    // No raster data available
    result.warning = 'Coverage raster data not available for this location';
    result.recommendation = allowManualFallback ? 'Allow manual input of coverage percentage' : 'Unable to calculate coverage';

    return result;
  } catch (error) {
    console.error('Error loading coverage data:', error);
    result.warning = `Error loading coverage data: ${error.message}`;
    return result;
  }
}

/**
 * Validates coverage data age and provides warnings/recommendations
 * Used to alert technicians when coverage data may be outdated
 * **Validates: Requirements 5.3, 5.6**
 *
 * @param {number} year - Year of coverage data
 * @param {number} thresholdYears - Age threshold in years (default: 2)
 * @returns {Object} Validation result with warning and recommendation
 *
 * @example
 * const validation = validateCoverageDataAge(2021);
 * console.log(validation.isRecent); // false
 * console.log(validation.ageYears); // 3
 * console.log(validation.warning); // "Coverage data is 3 years old..."
 * console.log(validation.recommendation); // "Consider drone survey..."
 *
 * @example
 * const validation = validateCoverageDataAge(new Date().getFullYear());
 * console.log(validation.isRecent); // true
 * console.log(validation.ageYears); // 0
 * console.log(validation.warning); // null
 */
export function validateCoverageDataAge(year, thresholdYears = 2) {
  const currentYear = new Date().getFullYear();
  const dataAge = currentYear - year;

  const result = {
    year: year,
    current_year: currentYear,
    ageYears: dataAge,
    isRecent: dataAge <= thresholdYears,
    warning: null,
    recommendation: null,
    status: 'current',
  };

  if (dataAge < 0) {
    // Future year (invalid but don't crash)
    result.warning = `Data year ${year} is in the future`;
    result.status = 'invalid';
    result.isRecent = false;
  } else if (dataAge === 0) {
    // Current year - no warning
    result.status = 'current';
    result.isRecent = true;
  } else if (dataAge === 1) {
    // 1 year old - acceptable, no warning but informational
    result.status = 'acceptable';
    result.isRecent = true;
  } else if (dataAge <= thresholdYears) {
    // Within threshold - acceptable but note
    result.status = 'acceptable';
    result.isRecent = true;
  } else if (dataAge > thresholdYears && dataAge <= 5) {
    // Outdated - warn
    result.warning = `Coverage data is from ${year} (${dataAge} years old) - exceeds 2-year recency threshold`;
    result.recommendation = 'Consider drone survey for current coverage validation';
    result.status = 'outdated';
    result.isRecent = false;
  } else {
    // Very outdated - strong warning
    result.warning = `Coverage data is from ${year} (${dataAge} years old) - significantly outdated. Recommendations based on this data may be unreliable.`;
    result.recommendation = 'STRONGLY RECOMMENDED: Obtain drone survey or field assessment for current coverage validation. Data is too old for reliable APP/RL calculations.';
    result.status = 'very_outdated';
    result.isRecent = false;
  }

  result.timestamp = new Date().toISOString();
  return result;
}

/**
 * Allows technician to manually override coverage data with custom percentage
 * Used when coverage data is outdated, unavailable, or technician has field evidence
 * **Validates: Requirements 5.3, 5.6**
 *
 * @param {Object} coverageResult - Current coverage calculation result
 * @param {number} overridePercentage - Manual coverage percentage to use (0-100)
 * @param {Object} options - Configuration options
 * @param {string} options.reason - Reason for override (e.g., 'drone_survey', 'field_estimate', 'data_unavailable')
 * @param {string} options.technicianName - Name of technician making override
 * @param {string} options.notes - Additional notes about the override
 * @returns {Object} Updated coverage result with override applied
 *
 * @example
 * const coverage = await calculateNativeCoverage(imovel, rasterData);
 * console.log(coverage.coverage_percentage); // 45.2% (from 3-year-old data)
 *
 * const overridden = allowManualOverride(coverage, 55.0, {
 *   reason: 'drone_survey',
 *   technicianName: 'João Silva',
 *   notes: 'Drone survey conducted 2024-01-10, shows recent forest recovery'
 * });
 * console.log(overridden.coverage_percentage); // 55.0%
 * console.log(overridden.manual_override_applied); // true
 * console.log(overridden.override_reason); // 'drone_survey'
 *
 * @example
 * // Technician accepts outdated data despite warning
 * const accepted = allowManualOverride(coverage, coverage.coverage_percentage, {
 *   reason: 'data_accepted_despite_age',
 *   technicianName: 'Maria Santos',
 *   notes: 'Field inspection confirms data accuracy despite age'
 * });
 */
export function allowManualOverride(coverageResult, overridePercentage, options = {}) {
  const {
    reason = 'user_input',
    technicianName = 'Unknown',
    notes = '',
  } = options;

  // Validate percentage input
  if (typeof overridePercentage !== 'number' || overridePercentage < 0 || overridePercentage > 100) {
    return {
      ...coverageResult,
      error: `Invalid override percentage: ${overridePercentage}. Must be between 0 and 100.`,
      manual_override_applied: false,
    };
  }

  // Calculate overridden coverage area
  const overriddenCoverageHa = (overridePercentage / 100) * (coverageResult.imovel_area_ha || 0);

  // Create updated result
  const overriddenResult = {
    ...coverageResult,
    coverage_percentage_original: coverageResult.coverage_percentage,
    total_coverage_ha_original: coverageResult.total_coverage_ha,
    coverage_percentage: parseFloat(overridePercentage.toFixed(1)),
    total_coverage_ha: parseFloat(overriddenCoverageHa.toFixed(2)),
    manual_override_applied: true,
    override_reason: reason,
    override_technician: technicianName,
    override_notes: notes,
    override_timestamp: new Date().toISOString(),
  };

  // Mark that this was manually overridden
  if (!overriddenResult.by_type) {
    overriddenResult.by_type = {};
  }

  // Update by_type to reflect override (distribute proportionally)
  if (overriddenResult.total_coverage_ha_original && overriddenResult.total_coverage_ha_original > 0 && Object.keys(overriddenResult.by_type).length > 0) {
    const scaleFactor = overriddenCoverageHa / coverageResult.total_coverage_ha_original;
    for (const [vegType, vegData] of Object.entries(overriddenResult.by_type)) {
      if (vegData && vegData.area_ha !== undefined) {
        overriddenResult.by_type[vegType].area_ha = parseFloat((vegData.area_ha * scaleFactor).toFixed(2));
        overriddenResult.by_type[vegType].percentage = parseFloat(
          ((overriddenResult.by_type[vegType].area_ha / (overriddenResult.imovel_area_ha || 1)) * 100).toFixed(1)
        );
      }
    }
  }

  return overriddenResult;
}

/**
 * Calculates native coverage area by intersecting raster with property polygon
 * Classifies vegetation types and sums by category
 * Includes data recency validation and warnings
 * **Validates: Requirements 5.2, 5.4, 5.5**
 *
 * @async
 * @param {Object} imovelPolygon - GeoJSON Feature with Polygon geometry (SIRGAS2000)
 * @param {Object} rasterData - Raster coverage data with pixels/grid
 * @param {Object} options - Configuration options
 * @param {Object} options.vegClassification - Vegetation type classification map
 * @param {number} options.pixelSizeM - Pixel size in meters for area calculation (default: 30)
 * @param {number} options.dataRecencyThreshold - Years threshold for warning (default: 2)
 * @returns {Promise<Object>} Coverage calculation result with breakdown by vegetation type
 *
 * @description
 * For each pixel in overlap with imovel polygon:
 * - IF pixel value is in native vegetation list → accumulate area
 * - Classify by vegetation type (Floresta, Cerrado, Caatinga, etc.)
 * - Return totals and breakdown with confidence metrics
 *
 * @example
 * // With recent coverage data
 * const coverage = await calculateNativeCoverage(imovelGeom, rasterData);
 * console.log(coverage.total_coverage_ha); // 412.35
 * console.log(coverage.coverage_percentage); // 69.1
 * console.log(coverage.by_type);
 * // {
 * //   floresta_nativa: { area_ha: 350.25, percentage: 58.7, pixel_count: 389 },
 * //   cerrado_nativo: { area_ha: 62.10, percentage: 10.4, pixel_count: 69 }
 * // }
 * console.log(coverage.data_recency_warning); // null (data is recent)
 * console.log(coverage.year); // 2023
 *
 * @example
 * // With outdated coverage data (3 years old)
 * const coverage = await calculateNativeCoverage(imovelGeom, oldRasterData);
 * console.log(coverage.data_recency_warning); // Warning about age
 * console.log(coverage.year); // 2021
 * console.log(coverage.age_years); // 3
 */
export async function calculateNativeCoverage(imovelPolygon, rasterData, options = {}) {
  const {
    vegClassification = {
      floresta_nativa: [1, 2, 3, 4],  // MapBiomas native forest classes
      cerrado_nativo: [11, 12],        // MapBiomas native cerrado
      caatinga_nativa: [13],           // MapBiomas native caatinga
    },
    pixelSizeM = 30,  // Default 30m pixel size (MapBiomas standard)
    dataRecencyThreshold = 2, // 2-year threshold per Requirements 5.3, 5.6
  } = options;

  const result = {
    total_coverage_ha: 0,
    coverage_percentage: 0,
    imovel_area_ha: 0,
    by_type: {},
    resolution_m: pixelSizeM,
    pixels_in_imovel: 0,
    pixels_classified: 0,
    pixels_native_coverage: 0,
    timestamp: new Date().toISOString(),
    // Data recency fields (Requirements 5.2, 5.3)
    year: null,
    age_years: null,
    data_recency_warning: null,
    data_recency_status: null,
    allow_manual_override: true,
    // Data quality metrics (Requirement 5.2)
    data_quality: {},
  };

  try {
    // Check if raster data is valid (Requirement 5.2)
    if (!rasterData) {
      result.warning = 'No raster data provided';
      result.recommendation = 'Manual coverage percentage input required';
      result.data_recency_warning = 'Coverage data unavailable';
      result.data_recency_status = 'unavailable';
      return result;
    }

    // Initialize vegetation type counters
    for (const vegType of Object.keys(vegClassification)) {
      result.by_type[vegType] = {
        area_ha: 0,
        percentage: 0,
        pixel_count: 0,
      };
    }

    // Calculate imovel area in hectares (Requirement 5.2)
    result.imovel_area_ha = calculatePolygonArea(imovelPolygon.geometry);
    
    if (result.imovel_area_ha <= 0) {
      result.warning = 'Imovel polygon has zero or negative area';
      result.error = 'Invalid polygon geometry';
      return result;
    }

    // Validate raster resolution (Requirement 5.2)
    if (rasterData.resolution && rasterData.resolution > 30) {
      result.warning = `Raster resolution ${rasterData.resolution}m is coarser than optimal 30m`;
    }

    // Validate and track data age (Requirements 5.3, 5.6)
    if (rasterData.year) {
      result.year = rasterData.year;
      const recencyValidation = validateCoverageDataAge(rasterData.year, dataRecencyThreshold);
      result.age_years = recencyValidation.ageYears;
      result.data_recency_status = recencyValidation.status;
      result.data_recency_warning = recencyValidation.warning;
      result.data_recency_recommendation = recencyValidation.recommendation;
      // Also set warning field for backward compatibility
      if (recencyValidation.warning) {
        result.warning = recencyValidation.warning;
      }
    } else if (rasterData.data && Array.isArray(rasterData.data) && rasterData.data.length > 0) {
      // Data available but year unknown - treat as potentially old
      result.data_recency_warning = 'Data year is unknown - age cannot be verified';
      result.data_recency_status = 'unknown_age';
      result.warning = result.data_recency_warning;
    }

    // TASK 6.2: Process raster data - intersect with imovel polygon
    // For each pixel in overlap: IF value ∈ [floresta_nativa, cerrado_nativo, ...] → accumulate area
    // **Validates: Requirements 5.2, 5.4, 5.5**
    if (rasterData.data && Array.isArray(rasterData.data) && rasterData.data.length > 0) {
      const pixelAreaHa = (pixelSizeM * pixelSizeM) / 10000;

      // Process each pixel in the raster
      for (const pixel of rasterData.data) {
        if (!pixel || pixel.value === null || pixel.value === undefined) continue;

        // Check if pixel is within imovel bounds (simple check)
        // In production, would use proper point-in-polygon test
        if (pixel.in_imovel === false) continue;

        result.pixels_in_imovel++;

        // Classify by vegetation type (Requirement 5.4, 5.5)
        // Check which vegetation type this pixel belongs to
        let pixelClassified = false;
        for (const [vegType, pixelValues] of Object.entries(vegClassification)) {
          if (Array.isArray(pixelValues) && pixelValues.includes(pixel.value)) {
            result.by_type[vegType].pixel_count++;
            result.by_type[vegType].area_ha += pixelAreaHa;
            result.pixels_classified++;
            result.pixels_native_coverage++;
            pixelClassified = true;
            break; // Each pixel classified to only one type
          }
        }

        // If pixel is not classified, it's non-native (ignore it)
        // This handles deforested, agriculture, water, etc.
      }

      // Sum total coverage from all vegetation types (Requirement 5.2)
      for (const vegData of Object.values(result.by_type)) {
        result.total_coverage_ha += vegData.area_ha;
      }

      // Ensure total doesn't exceed imovel area (safety clipping)
      // This can occur due to pixel boundaries not perfectly aligning with polygon
      if (result.total_coverage_ha > result.imovel_area_ha) {
        const scaleFactor = result.imovel_area_ha / result.total_coverage_ha;
        for (const vegData of Object.values(result.by_type)) {
          vegData.area_ha = parseFloat((vegData.area_ha * scaleFactor).toFixed(2));
        }
        result.total_coverage_ha = result.imovel_area_ha;
        result.clipping_applied = true;
      }
    }

    // Calculate percentages for each type (Requirement 5.4, 5.5)
    if (result.imovel_area_ha > 0) {
      result.coverage_percentage = parseFloat(
        ((result.total_coverage_ha / result.imovel_area_ha) * 100).toFixed(1)
      );

      for (const [vegType, vegData] of Object.entries(result.by_type)) {
        vegData.percentage = parseFloat(
          ((vegData.area_ha / result.imovel_area_ha) * 100).toFixed(1)
        );
      }
    }

    // Add data quality metrics (Requirement 5.2)
    result.data_quality = {
      resolution_adequate: !rasterData.resolution || rasterData.resolution <= 30,
      age_current: !rasterData.year || (new Date().getFullYear() - rasterData.year) <= dataRecencyThreshold,
      pixels_processed: result.pixels_classified,
      pixels_total: result.pixels_in_imovel,
      coverage_fraction: result.pixels_in_imovel > 0 ? parseFloat((result.pixels_classified / result.pixels_in_imovel).toFixed(3)) : 0,
    };

    // Round final values for consistency
    result.total_coverage_ha = parseFloat(result.total_coverage_ha.toFixed(2));
    result.coverage_percentage = parseFloat(result.coverage_percentage.toFixed(1));

    return result;
  } catch (error) {
    console.error('Error calculating coverage:', error);
    result.error = error.message;
    result.data_recency_status = 'error';
    return result;
  }
}

/**
 * Internal: Try loading MapBiomas data
 * @private
 */
async function tryLoadMapBiomas(bbox, minYear) {
  const result = {
    available: false,
    source: null,
    data: null,
    year: null,
    resolution_m: null,
    warning: null,
  };

  try {
    // In a real implementation, this would:
    // 1. Query MapBiomas collection API for available years
    // 2. Download GeoTIFF tiles covering the bbox
    // 3. Cache tiles locally

    const currentYear = new Date().getFullYear();
    
    // Simplified check - in production would call actual API
    // For now, mark as potentially available if within recent years
    const availableYear = currentYear - 1; // Use last year as example

    if (availableYear >= minYear) {
      result.available = true;
      result.source = 'mapbiomas';
      result.year = availableYear;
      result.resolution_m = 30;
      // result.data would be loaded raster data
    }

    return result;
  } catch (error) {
    console.warn('MapBiomas loading failed:', error.message);
    return result;
  }
}

/**
 * Internal: Try loading PRODES data
 * @private
 */
async function tryLoadPRODES(bbox, minYear) {
  const result = {
    available: false,
    source: null,
    data: null,
    year: null,
    resolution_m: null,
    warning: null,
  };

  try {
    // In a real implementation, this would:
    // 1. Query INPE PRODES database for available years
    // 2. Download tiles covering the bbox
    // 3. Parse deforestation data

    const currentYear = new Date().getFullYear();
    
    // Simplified check - PRODES typically lags by 1 year
    const availableYear = currentYear - 1;

    if (availableYear >= minYear) {
      result.available = true;
      result.source = 'prodes';
      result.year = availableYear;
      result.resolution_m = 30;
      // result.data would be loaded raster data
    }

    return result;
  } catch (error) {
    console.warn('PRODES loading failed:', error.message);
    return result;
  }
}

/**
 * Internal: Calculate polygon area in hectares
 * @private
 */
function calculatePolygonArea(geometry) {
  if (!geometry || geometry.type !== 'Polygon') {
    return 0;
  }

  // Use Shoelace formula for polygon area
  const coordinates = geometry.coordinates[0];
  let area = 0;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lon1, lat1] = coordinates[i];
    const [lon2, lat2] = coordinates[i + 1];
    area += (lon1 * lat2 - lon2 * lat1);
  }

  area = Math.abs(area / 2);

  // Convert from degrees² to hectares (approximation)
  // At equator, 1 degree = 111.32 km
  const metersPerDegree = 111320;
  const areaM2 = area * metersPerDegree * metersPerDegree;
  const areaHa = areaM2 / 10000;

  return parseFloat(areaHa.toFixed(2));
}

/**
 * Calculates RL (Reserva Legal) Deficit
 * Determines how much additional native vegetation coverage is needed to achieve compliance
 *
 * @param {number} rlMinima - RL minimum requirement in hectares (e.g., 80% or 35% of property)
 * @param {number} currentCoverage - Current native vegetation coverage in hectares
 * @returns {Object} RL Deficit calculation result with {deficitHa, deficitPercentage, status}
 *
 * @description
 * RL Deficit = MAX(0, rlMinima - currentCoverage)
 * 
 * If currentCoverage >= rlMinima: deficitHa = 0, status = "compliant"
 * If currentCoverage < rlMinima: deficitHa = difference, status = "deficit"
 *
 * The function validates inputs and provides comprehensive output with error handling
 * for edge cases (negative values, null inputs, zero area properties).
 *
 * @example
 * // Property with 800 ha RL requirement but only 700 ha coverage
 * const result = calculateRLDeficit(800, 700);
 * // Returns:
 * // {
 * //   deficitHa: 100,
 * //   deficitPercentage: 12.5,
 * //   status: "deficit",
 * //   rlMinima: 800,
 * //   currentCoverage: 700,
 * //   compliant: false,
 * //   timestamp: "2024-01-15T10:30:00Z"
 * // }
 *
 * @example
 * // Property with 500 ha RL requirement and 600 ha coverage (compliant)
 * const result = calculateRLDeficit(500, 600);
 * // Returns:
 * // {
 * //   deficitHa: 0,
 * //   deficitPercentage: 0,
 * //   status: "compliant",
 * //   rlMinima: 500,
 * //   currentCoverage: 600,
 * //   compliant: true,
 * //   timestamp: "2024-01-15T10:30:00Z"
 * // }
 */
export function calculateRLDeficit(rlMinima, currentCoverage) {
  const result = {
    deficitHa: 0,
    deficitPercentage: 0,
    status: null,
    rlMinima: rlMinima,
    currentCoverage: currentCoverage,
    compliant: false,
    timestamp: new Date().toISOString(),
    valid: true,
    errors: [],
    warnings: [],
  };

  try {
    // Input validation
    if (rlMinima === null || rlMinima === undefined) {
      result.valid = false;
      result.errors.push('rlMinima is required and cannot be null');
      result.status = 'error';
      return result;
    }

    if (currentCoverage === null || currentCoverage === undefined) {
      result.valid = false;
      result.errors.push('currentCoverage is required and cannot be null');
      result.status = 'error';
      return result;
    }

    // Type conversion and validation
    const rlMinimaNum = Number(rlMinima);
    const currentCoverageNum = Number(currentCoverage);

    if (isNaN(rlMinimaNum)) {
      result.valid = false;
      result.errors.push(`rlMinima must be a number, received: ${typeof rlMinima}`);
      result.status = 'error';
      return result;
    }

    if (isNaN(currentCoverageNum)) {
      result.valid = false;
      result.errors.push(`currentCoverage must be a number, received: ${typeof currentCoverage}`);
      result.status = 'error';
      return result;
    }

    // Validate non-negative values
    if (rlMinimaNum < 0) {
      result.valid = false;
      result.errors.push(`rlMinima cannot be negative: ${rlMinimaNum}`);
      result.status = 'error';
      return result;
    }

    if (currentCoverageNum < 0) {
      result.valid = false;
      result.errors.push(`currentCoverage cannot be negative: ${currentCoverageNum}`);
      result.status = 'error';
      return result;
    }

    // Calculate deficit using MAX(0, rlMinima - currentCoverage)
    result.deficitHa = Math.max(0, rlMinimaNum - currentCoverageNum);

    // Calculate deficit percentage relative to RL Minima
    // If RL Minima is zero, percentage is 0 (no requirement = no deficit)
    if (rlMinimaNum > 0) {
      result.deficitPercentage = parseFloat(
        ((result.deficitHa / rlMinimaNum) * 100).toFixed(2)
      );
    } else {
      result.deficitPercentage = 0;
      if (currentCoverageNum > 0) {
        result.warnings.push('RL Minima is zero, but coverage exists');
      }
    }

    // Determine compliance status
    if (result.deficitHa === 0) {
      result.status = 'compliant';
      result.compliant = true;
    } else {
      result.status = 'deficit';
      result.compliant = false;
    }

    // Edge case warning: coverage exceeds requirement significantly
    if (currentCoverageNum > rlMinimaNum * 1.5) {
      result.warnings.push('Coverage significantly exceeds RL requirement (>150%)');
    }

    // Round values to 2 decimal places for consistency
    result.deficitHa = parseFloat(result.deficitHa.toFixed(2));
    result.rlMinima = parseFloat(rlMinimaNum.toFixed(2));
    result.currentCoverage = parseFloat(currentCoverageNum.toFixed(2));

    return result;
  } catch (error) {
    result.valid = false;
    result.status = 'error';
    result.errors.push(`Unexpected error in calculateRLDeficit: ${error.message}`);
    console.error('Error calculating RL Deficit:', error);
    return result;
  }
}

export default {
  loadNativeCoverage,
  calculateNativeCoverage,
  validateCoverageDataAge,
  allowManualOverride,
  calculateRLDeficit,
};
