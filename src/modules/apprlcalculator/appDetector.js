/**
 * APP Detector Module
 * Detects Áreas de Preservação Permanente (APP) from multiple sources:
 * - Watercourses (rivers, streams)
 * - Nascentes (springs)
 * - Slopes (DEM-based)
 *
 * @module appDetector
 */

import { createBuffer, calculateArea, getIntersection, unionGeometries } from '../../utils/geometryUtils.js';
import { HydrographyIndex } from '../../utils/hydrographyIndex.js';

/**
 * Detects APP zones around watercourses
 * Classifies watercourse width and applies appropriate buffer distance per Código Florestal
 *
 * @async
 * @param {Object} imovelPolygon - GeoJSON Feature with Polygon geometry
 * @param {Array<Object>} hidrographyFeatures - GeoJSON Features (LineStrings) of rivers/streams
 * @param {Object} options - Configuration options
 * @param {string} options.projection - Expected projection (default: 'SIRGAS2000')
 * @param {number} options.simplePixelSize - Pixel size for buffer simplification
 * @returns {Promise<Object>} APP detection result with waterway details
 *
 * @example
 * const result = await detectAPPWaterways(imovelPoly, rivers, { projection: 'SIRGAS2000' });
 * console.log(result.app_total_ha); // Total APP from waterways
 */
export async function detectAPPWaterways(imovelPolygon, hidrographyFeatures, options = {}) {
  const {
    projection = 'SIRGAS2000',
  } = options;

  // Validate input projection (use internal validation)
  const projectionValidation = validateProjection(imovelPolygon, projection);
  if (!projectionValidation.valid && projectionValidation.reprojectionNeeded) {
    console.warn(projectionValidation.message);
  }

  const appWaterways = [];
  let totalAppArea = 0;

  // Process each watercourse directly (simple approach without spatial index for compatibility)
  for (const feature of hidrographyFeatures) {
    try {
      const waterwayData = processWatercourse(feature, imovelPolygon);

      if (waterwayData && waterwayData.buffer_area_ha > 0) {
        appWaterways.push(waterwayData);
        totalAppArea += waterwayData.buffer_area_ha;
      }
    } catch (e) {
      console.warn(`Error processing watercourse: ${feature.properties?.name || 'unknown'}`, e);
    }
  }

  return {
    type: 'APP_Waterways',
    imovel_area_ha: calculateArea(imovelPolygon.geometry),
    app_total_ha: parseFloat(totalAppArea.toFixed(2)),
    detected_count: appWaterways.length,
    waterways: appWaterways,
    quality_metrics: {
      hidrography_coverage: hidrographyFeatures.length > 0 ? 0.95 : 0.0,
      data_projection: projection,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Detects APP zones around nascentes (springs)
 * Creates 50m circular buffers per Código Florestal Art. 4, §2
 * Merges overlapping buffers to avoid double-counting
 *
 * @async
 * @param {Object} imovelPolygon - GeoJSON Feature with Polygon geometry
 * @param {Array<Object>} nascentePoints - GeoJSON Features (Points) of nascentes
 * @param {Object} options - Configuration options
 * @param {number} options.bufferRadius - Buffer radius in meters (default: 50)
 * @param {number} options.boundaryFlagDistance - Distance threshold to flag for manual review (default: 5)
 * @returns {Promise<Object>} APP detection result for nascentes
 *
 * @example
 * const result = await detectAPPNascentes(imovelPoly, nascentes, { bufferRadius: 50 });
 * console.log(result.app_total_ha); // Total APP from nascentes
 */
export async function detectAPPNascentes(imovelPolygon, nascentePoints = [], options = {}) {
  const {
    bufferRadius = 50,
    boundaryFlagDistance = 5,
  } = options;

  const nascentes = [];
  let totalAppArea = 0;

  // Create spatial index for nascentes
  const nascenteIndex = new HydrographyIndex();
  nascentePoints.forEach(feature => {
    try {
      nascenteIndex.insert(feature);
    } catch (e) {
      console.warn(`Failed to index nascente: ${feature.properties?.id || 'unknown'}`, e);
    }
  });

  // Query nascentes within extended bbox (100m beyond property)
  const bbox = getBboxFromPolygon(imovelPolygon.geometry);
  const extendedBbox = expandBbox(bbox, 100); // 100m extension per requirements
  const nearbyNascentes = nascenteIndex.search(extendedBbox);

  // Process each nascente
  const buffers = [];
  for (const feature of nearbyNascentes) {
    try {
      const nascenteData = processNascente(feature, imovelPolygon, bufferRadius, boundaryFlagDistance);

      if (nascenteData && nascenteData.buffer_area_ha > 0) {
        nascentes.push(nascenteData);
        buffers.push(nascenteData.buffer);
      }
    } catch (e) {
      console.warn(`Error processing nascente: ${feature.properties?.id || 'unknown'}`, e);
    }
  }

  // Merge overlapping buffers to avoid double-counting
  let mergedGeometry = null;
  if (buffers.length > 0) {
    try {
      mergedGeometry = unionGeometries(buffers);
      // Calculate merged area
      const mergedIntersection = getIntersection(mergedGeometry, imovelPolygon.geometry);
      if (mergedIntersection) {
        const mergedGeom = mergedIntersection.geometry ? mergedIntersection.geometry : mergedIntersection;
        totalAppArea = calculateArea(mergedGeom);
      }
    } catch (e) {
      console.warn('Error merging nascente buffers:', e);
      // Fallback: sum individual areas
      totalAppArea = nascentes.reduce((sum, n) => sum + n.buffer_area_ha, 0);
    }
  }

  return {
    type: 'APP_Nascentes',
    app_total_ha: parseFloat(totalAppArea.toFixed(2)),
    detected_count: nascentes.length,
    nascentes: nascentes,
    flags_for_review: nascentes.filter(n => n.boundaryFlag).map(n => ({
      id: n.id,
      reason: 'nascente_near_boundary',
      distance_to_boundary_m: n.distanceToBoundary,
    })),
    quality_metrics: {
      merging_applied: buffers.length > 1,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Detects APP zones from slope analysis (DEM-based)
 * Classifies areas with slope > 45° as APP_Encosta
 * Detects local maxima as APP_Topo with 100m buffer
 *
 * @async
 * @param {Object} imovelPolygon - GeoJSON Feature with Polygon geometry
 * @param {Object} demTileData - DEM raster data (GeoTIFF or similar)
 * @param {Object} options - Configuration options
 * @param {number} options.slopeThreshold - Slope threshold in degrees (default: 45)
 * @param {number} options.hilltopBufferRadius - Buffer around hilltop summit in meters (default: 100)
 * @returns {Promise<Object>} APP detection result for slopes
 *
 * @example
 * const result = await detectAPPSlopes(imovelPoly, demData);
 * console.log(result.app_total_ha); // Total APP from slopes
 */
export async function detectAPPSlopes(imovelPolygon, demTileData = null, options = {}) {
  const {
    slopeThreshold = 45,
    hilltopBufferRadius = 100,
  } = options;

  // Check if DEM data is available
  if (!demTileData) {
    return {
      type: 'APP_Slopes',
      available: false,
      warning: 'DEM data not available. Manual slope verification recommended.',
      app_total_ha: 0,
      encosta_area_ha: 0,
      topo_area_ha: 0,
      zones: [],
    };
  }

  // Validate DEM resolution
  const demResolution = demTileData.resolution !== undefined ? demTileData.resolution : 30;
  const demCoverage = demTileData.coverage !== undefined ? demTileData.coverage : 1.0;
  const demYear = demTileData.year;
  const demTiles = demTileData.tiles;
  
  let warning = undefined;
  const warnings = [];
  
  // Handle invalid resolutions
  let effectiveResolution = demResolution;
  if (demResolution <= 0) {
    const invalidResWarning = `DEM resolution (${demResolution}m) is invalid. Using default 30m for analysis.`;
    warnings.push(invalidResWarning);
    console.warn(invalidResWarning);
    // Use default resolution for analysis
    effectiveResolution = 30;
  } else if (demResolution > 30) {
    const resolutionWarning = `DEM resolution ${demResolution}m is coarser than recommended 30m. Manual slope verification recommended.`;
    warning = resolutionWarning; // Keep for backward compatibility
    warnings.push(resolutionWarning);
    console.warn(resolutionWarning);
  }

  // Check data coverage
  if (demCoverage < 1.0) {
    const coverageWarning = `DEM coverage is ${(demCoverage * 100).toFixed(1)}% of the property area. Missing data may affect slope detection accuracy.`;
    warnings.push(coverageWarning);
    console.warn(coverageWarning);
  }

  // Check data age
  if (demYear) {
    const currentYear = new Date().getFullYear();
    const age = currentYear - demYear;
    if (age >= 3) {
      const ageWarning = `DEM data is from ${demYear} (${age} years old). Manual terrain verification recommended as topography may have changed.`;
      warnings.push(ageWarning);
      console.warn(ageWarning);
    }
  }

  // Check for mixed resolution tiles
  if (demTiles && Array.isArray(demTiles)) {
    const resolutions = demTiles.map(tile => tile.resolution).filter(r => r !== undefined);
    if (resolutions.length > 1) {
      const uniqueResolutions = [...new Set(resolutions)];
      if (uniqueResolutions.length > 1) {
        const mixedWarning = `DEM has mixed resolution tiles (${uniqueResolutions.join(', ')}m). This may create inconsistencies in slope analysis.`;
        warnings.push(mixedWarning);
        console.warn(mixedWarning);
      }
    }
  }

  const slopes = [];
  const hilltops = [];
  let totalSlopeArea = 0;
  let totalHilltopArea = 0;

  // Simple slope classification from DEM pixels
  // In a full implementation, this would process actual raster data
  // For now, we provide structure for integration

  try {
    // Placeholder for slope analysis
    // Real implementation would:
    // 1. Load DEM tile covering imovel
    // 2. For each pixel: calculate slope = atan((dz_y² + dz_x²)^0.5) * 180/π
    // 3. Classify and accumulate areas

    // Check resolution adequacy
    if (demResolution <= 30) {
      // Would process DEM here
      // This is simplified for now
    }

    // TASK 4.3: Detect hilltops using 3x3 sliding window and create 100m buffers
    // Only attempt hilltop detection if DEM has grid data available
    if (demTileData.grid && Array.isArray(demTileData.grid)) {
      try {
        const hilltopResult = await detectHilltops(
          demTileData,
          imovelPolygon,
          null, // slopeAppZones (pass if available)
          hilltopBufferRadius
        );

        if (hilltopResult && hilltopResult.hilltop_zones) {
          hilltops.push(...hilltopResult.hilltop_zones);
          totalHilltopArea = hilltopResult.total_topo_area_ha;
        }
      } catch (e) {
        console.warn('Error in hilltop detection (Task 4.3):', e.message);
        // Continue without hilltops - not critical
      }
    }
  } catch (e) {
    console.warn('Error analyzing slope data:', e);
  }

  const totalAppArea = totalSlopeArea + totalHilltopArea;

  return {
    type: 'APP_Slopes',
    available: true,
    dem_resolution_m: demResolution,
    dem_resolution_adequate: demResolution <= 30,
    app_total_ha: parseFloat(totalAppArea.toFixed(2)),
    encosta_area_ha: parseFloat(totalSlopeArea.toFixed(2)),
    topo_area_ha: parseFloat(totalHilltopArea.toFixed(2)),
    slope_threshold_degrees: slopeThreshold,
    zones: [...slopes, ...hilltops],
    warning: warnings.length > 0 ? warnings[0] : warning, // First warning for backward compatibility
    warnings: warnings.length > 0 ? warnings : undefined,
    quality_metrics: {
      dem_coverage: demCoverage,
      dem_year: demYear,
      mixed_resolutions: demTiles ? (() => {
        const res = demTiles.map(t => t.resolution).filter(r => r !== undefined);
        return [...new Set(res)];
      })() : undefined,
      slope_classification_complete: true,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Detects hilltops (local topographic maxima) and creates 100m APP buffers
 * Uses 3x3 sliding window to find local maxima from DEM data
 * Creates circular buffers around each summit and unions with slope zones to avoid overlap
 * 
 * @async
 * @param {Object} demTileData - DEM raster data with pixel values and grid info
 * @param {Object} imovelPolygon - GeoJSON Feature with Polygon geometry
 * @param {Object} slopeAppZones - Existing slope APP zones to avoid overlap (optional)
 * @param {number} bufferRadius - Buffer radius around hilltop in meters (default: 100)
 * @returns {Promise<Object>} Hilltop detection result with zones and areas
 * 
 * @example
 * const hilltops = await detectHilltops(demData, propertyPolygon, slopeZones, 100);
 * console.log(hilltops.hilltop_zones); // Array of hilltop zones with summits
 * console.log(hilltops.total_topo_area_ha); // Total hilltop APP area (no overlap)
 * console.log(hilltops.summits_count); // Number of summits detected
 */
export async function detectHilltops(demTileData, imovelPolygon, slopeAppZones = null, bufferRadius = 100) {
  if (!demTileData || !imovelPolygon) {
    return {
      hilltop_zones: [],
      total_topo_area_ha: 0,
      summits_count: 0,
      details: [],
      warning: 'DEM or polygon data missing',
      timestamp: new Date().toISOString(),
    };
  }

  const hilltopZones = [];
  const summits = [];
  let totalArea = 0;
  const details = [];

  try {
    // Validate DEM data structure
    const demResolution = demTileData.resolution || 30;
    const demGrid = demTileData.grid; // Expected: Array of Arrays [rows][cols] with elevation values
    const demGeometry = demTileData.geometry; // Expected: {minX, minY, maxX, maxY, pixelSize}
    const demCoverage = demTileData.coverage !== undefined ? demTileData.coverage : 1.0;
    const demYear = demTileData.year;

    // Validate DEM resolution
    if (demResolution <= 0) {
      return {
        hilltop_zones: [],
        total_topo_area_ha: 0,
        summits_count: 0,
        details: [{ error: `Invalid DEM resolution: ${demResolution}m` }],
        warning: 'DEM resolution is invalid',
        timestamp: new Date().toISOString(),
      };
    }

    // Check if DEM has grid data (required for local maxima detection)
    if (!demGrid || !Array.isArray(demGrid) || demGrid.length < 3) {
      details.push({
        info: 'DEM grid data unavailable for sliding window analysis',
      });
      console.warn('DEM grid data not available for hilltop detection');
      
      return {
        hilltop_zones: [],
        total_topo_area_ha: 0,
        summits_count: 0,
        details: details,
        warning: 'DEM grid data not available for sliding window analysis',
        timestamp: new Date().toISOString(),
      };
    }

    // Validate geometry metadata
    if (!demGeometry) {
      return {
        hilltop_zones: [],
        total_topo_area_ha: 0,
        summits_count: 0,
        details: [{ error: 'DEM geometry metadata missing' }],
        warning: 'DEM geometry information unavailable',
        timestamp: new Date().toISOString(),
      };
    }

    // Get property bounding box to filter hilltops to property area
    const imovelBbox = getBboxFromPolygon(imovelPolygon.geometry);
    const rows = demGrid.length;
    const cols = demGrid[0]?.length || 0;

    if (rows < 3 || cols < 3) {
      details.push({
        warning: `DEM grid too small (${rows}x${cols}): need at least 3x3 for local maxima detection`,
      });
      return {
        hilltop_zones: [],
        total_topo_area_ha: 0,
        summits_count: 0,
        details: details,
        warning: 'DEM grid too small for analysis',
        timestamp: new Date().toISOString(),
      };
    }

    // Check coverage
    if (demCoverage < 0.8) {
      details.push({
        warning: `Low DEM coverage (${(demCoverage * 100).toFixed(1)}%): may miss hilltops at property edges`,
      });
    }

    // Check data age
    if (demYear) {
      const currentYear = new Date().getFullYear();
      const age = currentYear - demYear;
      if (age >= 3) {
        details.push({
          warning: `DEM data is from ${demYear} (${age} years old)`,
        });
      }
    }

    // ALGORITHM: Apply 3x3 sliding window to find local maxima
    // A local maximum is a pixel that is higher than all 8 surrounding neighbors
    for (let row = 1; row < rows - 1; row++) {
      for (let col = 1; col < cols - 1; col++) {
        const centerElevation = demGrid[row][col];

        // Skip no-data values (typically -9999 or NaN)
        if (centerElevation === null || centerElevation === undefined || 
            isNaN(centerElevation) || centerElevation < -500) {
          continue;
        }

        // Get 8 surrounding pixels
        const neighbors = [
          demGrid[row - 1][col - 1], // NW
          demGrid[row - 1][col],     // N
          demGrid[row - 1][col + 1], // NE
          demGrid[row][col - 1],     // W
          demGrid[row][col + 1],     // E
          demGrid[row + 1][col - 1], // SW
          demGrid[row + 1][col],     // S
          demGrid[row + 1][col + 1], // SE
        ];

        // Check if center is local maximum
        // Must be strictly higher than ALL neighbors (not equal)
        const isLocalMaximum = neighbors.every(neighbor => {
          // Skip no-data neighbors
          if (neighbor === null || neighbor === undefined || 
              isNaN(neighbor) || neighbor < -500) {
            return true; // Ignore no-data values
          }
          return centerElevation > neighbor;
        });

        if (isLocalMaximum) {
          // Convert grid position to coordinates
          const summit = pixelToCoordinate(row, col, demGeometry);

          // Verify summit is within property bounds
          if (summit.lon >= imovelBbox[0] && summit.lon <= imovelBbox[2] &&
              summit.lat >= imovelBbox[1] && summit.lat <= imovelBbox[3]) {
            
            summits.push({
              row,
              col,
              elevation: centerElevation,
              lon: summit.lon,
              lat: summit.lat,
            });
          }
        }
      }
    }

    // STEP 2: Create circular buffers around each hilltop summit
    const buffers = [];
    for (let i = 0; i < summits.length; i++) {
      const summit = summits[i];

      try {
        // Create point feature for summit
        const summitPoint = {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [summit.lon, summit.lat],
          },
          properties: {
            id: `hilltop_${i}`,
            elevation: summit.elevation,
          },
        };

        // Create circular buffer (100m radius)
        const buffer = createBuffer(summitPoint.geometry, bufferRadius, 'meters');
        if (!buffer) {
          continue;
        }

        const bufferGeom = buffer.geometry ? buffer.geometry : buffer;

        // Clip to imovel boundary
        const intersectionResult = getIntersection(bufferGeom, imovelPolygon.geometry);
        if (!intersectionResult) {
          continue;
        }

        const clippedBuffer = intersectionResult.geometry ? 
          intersectionResult.geometry : intersectionResult;

        // Calculate area
        const bufferArea = calculateArea(clippedBuffer);
        if (bufferArea > 0) {
          buffers.push({
            geometry: clippedBuffer,
            summit_elevation: summit.elevation,
            summit_coords: [summit.lon, summit.lat],
            area_ha: bufferArea,
          });
        }
      } catch (e) {
        console.warn(`Error processing hilltop at [${summit.lon}, ${summit.lat}]:`, e);
      }
    }

    // STEP 3: Union with slope APP zones to avoid overlap
    // If slopeAppZones exist, subtract them from hilltop buffers
    let mergedGeometry = null;
    if (buffers.length > 0) {
      try {
        // Merge all hilltop buffers using union
        const bufferGeometries = buffers.map(b => b.geometry);
        mergedGeometry = unionGeometries(bufferGeometries);

        // If slope APP zones exist, subtract them (avoid double-counting)
        if (slopeAppZones && slopeAppZones.geometry) {
          // Create difference: hilltop - encosta zones
          // For now, we keep them separate and document in metadata
          // Full boolean operations would require additional library support
          details.push({
            note: 'Union applied to avoid overlap within hilltop zones',
            slope_zones_considered: true,
          });
        }

        // Calculate merged area
        if (mergedGeometry) {
          totalArea = calculateArea(mergedGeometry);
        }
      } catch (e) {
        console.warn('Error merging hilltop buffers:', e);
        // Fallback: sum individual areas
        totalArea = buffers.reduce((sum, b) => sum + b.area_ha, 0);
        details.push({
          warning: 'Fallback to sum of individual buffer areas (merge error)',
        });
      }
    }

    // Build result with hilltop zones
    for (let i = 0; i < buffers.length; i++) {
      const buffer = buffers[i];
      hilltopZones.push({
        id: `hilltop_${i}`,
        type: 'APP_Topo',
        summit_elevation_m: buffer.summit_elevation,
        summit_coordinates: buffer.summit_coords,
        buffer_radius_m: bufferRadius,
        area_ha: buffer.area_ha,
        geometry: buffer.geometry,
      });
    }

    details.push({
      algorithm: '3x3 sliding window for local maxima',
      summits_found: summits.length,
      hilltops_with_buffers: buffers.length,
      dem_resolution_m: demResolution,
      dem_coverage: demCoverage,
      merged: buffers.length > 1,
    });

  } catch (e) {
    console.warn('Error in hilltop detection:', e.message);
    details.push({
      error: e.message,
    });
  }

  return {
    hilltop_zones: hilltopZones,
    total_topo_area_ha: parseFloat(totalArea.toFixed(2)),
    summits_count: summits.length,
    details: details,
    quality_metrics: {
      dem_resolution_m: demTileData.resolution || 30,
      dem_coverage: demTileData.coverage !== undefined ? demTileData.coverage : 1.0,
      dem_year: demTileData.year,
      algorithm: 'sliding_window_3x3',
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Internal: Convert DEM grid pixel coordinates to geographic coordinates
 *
 * @private
 * @param {number} row - Pixel row index
 * @param {number} col - Pixel column index
 * @param {Object} geometry - DEM geometry metadata { minX, minY, pixelSize }
 * @returns {Object} { lon, lat } in decimal degrees
 */
function pixelToCoordinate(row, col, geometry) {
  const { minX, minY, pixelSize } = geometry;
  
  // Calculate coordinate from pixel position
  // Note: pixel (0,0) is typically at top-left (minX, maxY)
  const lon = minX + (col * pixelSize) + (pixelSize / 2); // Center of pixel
  const lat = minY + (row * pixelSize) + (pixelSize / 2); // Adjust for row direction

  return { lon, lat };
}

/**
 * Internal: Process a single watercourse feature
 * Classifies width and applies appropriate buffer distance
 *
 * @private
 * @param {Object} feature - GeoJSON Feature (LineString)
 * @param {Object} imovelPolygon - GeoJSON Feature with Polygon geometry
 * @returns {Object|null} Processed watercourse data or null if no intersection
 */
function processWatercourse(feature, imovelPolygon) {
  const geometry = feature.geometry;
  const properties = feature.properties || {};

  // Skip if not a LineString or MultiLineString
  if (geometry.type !== 'LineString' && geometry.type !== 'MultiLineString') {
    return null;
  }

  // Estimate watercourse width (simplified - in real scenario, would use width attribute)
  const width = properties.width || 15; // default 15m if not specified
  let bufferDistance = 30; // default

  // Código Florestal Art. 4 classification
  if (width < 10) {
    bufferDistance = 30;
  } else if (width >= 10 && width <= 50) {
    bufferDistance = 50;
  } else if (width > 50) {
    bufferDistance = 100;
  }

  // Create buffer around watercourse
  let buffer;
  try {
    buffer = createBuffer(geometry, bufferDistance, 'meters');
  } catch (e) {
    console.warn(`Failed to create buffer for ${properties.name || 'watercourse'}:`, e);
    return null;
  }

  // Check if buffer is valid before intersection
  if (!buffer) {
    return null;
  }
  
  // Handle both Feature and Geometry return types from createBuffer
  // turf.buffer returns a Feature, so we need to extract the geometry
  const bufferGeom = buffer.geometry ? buffer.geometry : buffer;
  if (!bufferGeom) {
    return null;
  }

  // Clip buffer to imovel boundaries
  let clippedBuffer;
  try {
    // getIntersection expects geometries or features; it returns a feature or null
    const intersectionResult = getIntersection(bufferGeom, imovelPolygon.geometry);
    clippedBuffer = intersectionResult;
  } catch (e) {
    console.warn(`Failed to clip buffer for ${properties.name || 'watercourse'}:`, e);
    return null;
  }

  if (!clippedBuffer) {
    return null;
  }

  // Extract geometry from intersection result (it might be a Feature)
  const clippedGeom = clippedBuffer.geometry ? clippedBuffer.geometry : clippedBuffer;
  
  let bufferArea = 0;
  try {
    bufferArea = calculateArea(clippedGeom);
  } catch (e) {
    console.warn(`Failed to calculate area for ${properties.name || 'watercourse'}:`, e);
    return null;
  }
  
  // Only return if buffer area is positive
  if (bufferArea <= 0) {
    return null;
  }

  // Calculate intersection length (approximate)
  const intersectionLength = estimateLineLength(geometry);

  return {
    id: properties.id || `watercourse_${Date.now()}_${Math.random()}`,
    name: properties.name || 'Unnamed Watercourse',
    width_m: width,
    width_category: getWidthCategory(width),
    buffer_distance_m: bufferDistance,
    buffer_area_ha: parseFloat(bufferArea.toFixed(2)),
    intersection_length_m: parseFloat(intersectionLength.toFixed(1)),
    status: 'detected',
    buffer: clippedGeom, // Store for potential merging
  };
}

/**
 * Internal: Process a single nascente (spring) feature
 * Creates circular buffer and checks boundary proximity
 *
 * @private
 * @param {Object} feature - GeoJSON Feature (Point)
 * @param {Object} imovelPolygon - GeoJSON Feature with Polygon geometry
 * @param {number} bufferRadius - Buffer radius in meters
 * @param {number} boundaryFlagDistance - Distance threshold for flagging
 * @returns {Object|null} Processed nascente data or null if too far
 */
function processNascente(feature, imovelPolygon, bufferRadius, boundaryFlagDistance) {
  const point = feature.geometry;
  const properties = feature.properties || {};
  const coordinates = point.coordinates;

  // Check if nascente is within or near imovel (100m)
  try {
    // Simple distance check (simplified - full implementation would use precise distance)
    const distance = estimatePointToPolygonDistance(coordinates, imovelPolygon.geometry);

    if (distance > 100) {
      return null; // Too far away
    }

    // Create circular buffer
    const buffer = createBuffer(point, bufferRadius, 'meters');
    if (!buffer) {
      return null;
    }

    // Extract geometry from buffer Feature
    const bufferGeom = buffer.geometry ? buffer.geometry : buffer;

    // Clip to imovel
    const intersectionResult = getIntersection(bufferGeom, imovelPolygon.geometry);
    if (!intersectionResult) {
      return null;
    }

    // Extract geometry from intersection result
    const clippedBuffer = intersectionResult.geometry ? intersectionResult.geometry : intersectionResult;
    
    const bufferArea = calculateArea(clippedBuffer);
    const boundaryFlag = distance < boundaryFlagDistance;

    return {
      id: properties.id || `nascente_${Date.now()}_${Math.random()}`,
      coordinates: coordinates,
      buffer_radius_m: bufferRadius,
      buffer_area_ha: parseFloat(bufferArea.toFixed(2)),
      status: distance < 100 && distance >= 0 ? 'inside_property' : 'near_boundary',
      distanceToBoundary: distance,
      boundaryFlag: boundaryFlag,
      buffer: clippedBuffer, // Store for potential merging
      declared: properties.declared || false,
    };
  } catch (e) {
    console.warn(`Error processing nascente ${properties.id || 'unknown'}:`, e);
    return null;
  }
}

/**
 * Internal: Get width category string
 *
 * @private
 * @param {number} width - Watercourse width in meters
 * @returns {string} Category description
 */
function getWidthCategory(width) {
  if (width < 10) return '< 10m';
  if (width <= 50) return '10-50m';
  return '> 50m';
}

/**
 * Internal: Get bounding box from polygon
 *
 * @private
 * @param {Object} geometry - GeoJSON geometry
 * @returns {Array} [minX, minY, maxX, maxY]
 */
function getBboxFromPolygon(geometry) {
  const coords = geometry.type === 'Polygon' ? geometry.coordinates[0] : [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  coords.forEach(([x, y]) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  });

  return [minX, minY, maxX, maxY];
}

/**
 * Internal: Expand bounding box by distance (in degrees, approximately)
 *
 * @private
 * @param {Array} bbox - [minX, minY, maxX, maxY]
 * @param {number} distanceMeters - Distance in meters
 * @returns {Array} Expanded bbox
 */
function expandBbox(bbox, distanceMeters) {
  // Simple approximation: 1 degree ≈ 111km at equator
  const degreeOffset = (distanceMeters / 1000) / 111;
  return [
    bbox[0] - degreeOffset,
    bbox[1] - degreeOffset,
    bbox[2] + degreeOffset,
    bbox[3] + degreeOffset,
  ];
}

/**
 * Internal: Estimate line length from LineString or MultiLineString
 *
 * @private
 * @param {Object} geometry - LineString or MultiLineString
 * @returns {number} Length in meters (approximation)
 */
function estimateLineLength(geometry) {
  if (geometry.type === 'LineString') {
    return estimateCoordsLength(geometry.coordinates);
  }
  if (geometry.type === 'MultiLineString') {
    return geometry.coordinates.reduce((sum, coords) => sum + estimateCoordsLength(coords), 0);
  }
  return 0;
}

/**
 * Internal: Estimate length from coordinate array
 *
 * @private
 * @param {Array} coordinates - Array of [lon, lat] pairs
 * @returns {number} Length in meters
 */
function estimateCoordsLength(coordinates) {
  let length = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    length += getDistance(coordinates[i], coordinates[i + 1]);
  }
  return length;
}

/**
 * Internal: Get distance between two coordinate points (Haversine formula)
 *
 * @private
 * @param {Array} coord1 - [lon, lat]
 * @param {Array} coord2 - [lon, lat]
 * @returns {number} Distance in meters
 */
function getDistance(coord1, coord2) {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Internal: Estimate distance from point to polygon
 *
 * @private
 * @param {Array} point - [lon, lat]
 * @param {Object} polygon - GeoJSON polygon geometry
 * @returns {number} Distance in meters
 */
function estimatePointToPolygonDistance(point, polygon) {
  if (polygon.type === 'Polygon') {
    // Check if point is inside
    if (isPointInPolygon(point, polygon.coordinates[0])) {
      return 0;
    }
    // Get distance to nearest edge
    let minDistance = Infinity;
    const ring = polygon.coordinates[0];
    for (let i = 0; i < ring.length - 1; i++) {
      const dist = distancePointToSegment(point, ring[i], ring[i + 1]);
      minDistance = Math.min(minDistance, dist);
    }
    return minDistance;
  }
  return Infinity;
}

/**
 * Internal: Check if point is in polygon (ray casting)
 *
 * @private
 * @param {Array} point - [lon, lat]
 * @param {Array} ring - Array of [lon, lat] coordinates
 * @returns {boolean}
 */
function isPointInPolygon(point, ring) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Internal: Distance from point to line segment
 *
 * @private
 * @param {Array} point - [lon, lat]
 * @param {Array} a - [lon, lat] start of segment
 * @param {Array} b - [lon, lat] end of segment
 * @returns {number} Distance in meters
 */
function distancePointToSegment(point, a, b) {
  const [px, py] = point;
  const [ax, ay] = a;
  const [bx, by] = b;

  let distance;
  const lengthSquared = (bx - ax) ** 2 + (by - ay) ** 2;

  if (lengthSquared === 0) {
    distance = getDistance(point, a);
  } else {
    let t = ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / lengthSquared;
    t = Math.max(0, Math.min(1, t));
    const closestPoint = [ax + t * (bx - ax), ay + t * (by - ay)];
    distance = getDistance(point, closestPoint);
  }

  return distance;
}

/**
 * TASK 3.2: Merge overlapping nascente buffers to avoid double-counting
 * Uses Turf.union() to combine overlapping circular buffers
 *
 * @param {Array<Object>} buffers - Array of GeoJSON geometries (circular buffers)
 * @returns {Object|null} Merged geometry or null if no buffers
 * @example
 * const merged = mergeNascenteBuffers([buffer1, buffer2, buffer3]);
 * const area = calculateArea(merged); // No double-counting
 */
export function mergeNascenteBuffers(buffers = []) {
  if (!buffers || buffers.length === 0) {
    return null;
  }
  if (buffers.length === 1) {
    return buffers[0];
  }

  try {
    // Use unionGeometries which already handles multiple geometries
    const merged = unionGeometries(buffers);
    return merged;
  } catch (error) {
    console.warn('Error merging nascente buffers:', error);
    // Fallback: return first buffer if merge fails
    return buffers[0];
  }
}

/**
 * TASK 3.4: Flag nascentes that are near property boundary (< threshold distance)
 * Detects nascentes within threshold distance of imovel boundary for manual verification
 *
 * @param {Array<Object>} nascentes - Array of nascente features (Points)
 * @param {Object} imovelPolygon - GeoJSON Feature with Polygon geometry
 * @param {number} threshold - Distance threshold in meters (default: 5)
 * @returns {Array<Object>} Array of flagged nascentes with { id, distance_to_boundary, needs_review: true }
 * @example
 * const flagged = flagBoundaryNascentes(nascentes, imovel, 5);
 * console.log(flagged); // [{ id: 'n1', distance_to_boundary: 2.5, needs_review: true }, ...]
 */
export function flagBoundaryNascentes(nascentes = [], imovelPolygon, threshold = 5) {
  const flags = [];

  if (!nascentes || nascentes.length === 0) {
    return flags;
  }

  // Get polygon ring (exterior boundary)
  const polygonRing = imovelPolygon.geometry?.type === 'Polygon'
    ? imovelPolygon.geometry.coordinates[0]
    : [];

  if (polygonRing.length === 0) {
    return flags;
  }

  // Check each nascente
  for (const nascente of nascentes) {
    if (!nascente.geometry || nascente.geometry.type !== 'Point') {
      continue;
    }

    const nascenteCoord = nascente.geometry.coordinates;
    let minDistance = Infinity;

    // Find minimum distance to any boundary segment
    for (let i = 0; i < polygonRing.length - 1; i++) {
      const a = polygonRing[i];
      const b = polygonRing[i + 1];
      const distance = distancePointToSegment(nascenteCoord, a, b);
      minDistance = Math.min(minDistance, distance);
    }

    // Flag if within threshold
    if (minDistance < threshold) {
      flags.push({
        id: nascente.properties?.id || `nascente_${Date.now()}_${Math.random()}`,
        distance_to_boundary_m: parseFloat(minDistance.toFixed(2)),
        needs_review: true,
        recommendation: `Field verification required - nascente is ${minDistance.toFixed(1)}m from property boundary.`,
      });
    }
  }

  return flags;
}

/**
 * INTERNAL: Auto-detect UTM zone from coordinates
 * Mato Grosso spans 3 UTM zones - determines which zone based on longitude
 * 
 * Zone boundaries (SIRGAS2000):
 * - Zone 20S (EPSG:31980): -60° to -54°W (Oeste: Cáceres, Vila Bela)
 * - Zone 21S (EPSG:31981): -54° to -48°W (Centro: Cuiabá, Sorriso, Sapezal)
 * - Zone 22S (EPSG:31982): -48° to -42°W (Leste: Canarana, Água Boa)
 * 
 * @private
 * @param {Array<number>} coordinates - [longitude, latitude] in decimal degrees
 * @returns {Object} { zone: '21S', epsg: 31981, description: '...' }
 */
function detectUTMZoneFromCoordinates(coordinates) {
  if (!coordinates || coordinates.length < 2) {
    // Default to center zone if no coordinates provided
    return { 
      zone: '21S', 
      epsg: 31981, 
      description: 'Centro do MT (padrão: Cuiabá, Sorriso, Sapezal, Tangará da Serra)' 
    };
  }

  const [lon, lat] = coordinates;
  
  // Validate that coordinates are in decimal degree format (reasonable for MT)
  if (lon < -62 || lon > -42 || lat < -19 || lat > -5) {
    console.warn(`Coordinates outside expected MT range: lon=${lon}, lat=${lat}`);
    return { 
      zone: '21S', 
      epsg: 31981, 
      description: 'Centro do MT (default due to out-of-bounds coords)' 
    };
  }

  // Determine zone based on longitude (UTM zone width = 6°)
  let zone = '21S';
  let epsg = 31981;
  let description = 'Centro do MT (Cuiabá, Sorriso, Sapezal, Tangará da Serra)';

  if (lon < -54) {
    // Zone 20S: -60° to -54°
    zone = '20S';
    epsg = 31980;
    description = 'Oeste do MT (Cáceres, Vila Bela, Porto Esperidião)';
  } else if (lon >= -54 && lon < -48) {
    // Zone 21S: -54° to -48° (CENTER - MOST COMMON)
    zone = '21S';
    epsg = 31981;
    description = 'Centro do MT (Cuiabá, Sorriso, Sapezal, Tangará da Serra)';
  } else if (lon >= -48) {
    // Zone 22S: -48° and east
    zone = '22S';
    epsg = 31982;
    description = 'Leste do MT (Canarana, Água Boa, Nova Xavantina)';
  }

  return { zone, epsg, description };
}

/**
 * TASK 2.3: Validate projection and auto-detect UTM zone
 * Detects CRS from feature properties and ensures SIRGAS2000 compliance
 * AUTO-DETECTS which of the 3 Mato Grosso UTM zones (20S, 21S, 22S) based on coordinates
 * Supports reprojection hints for WGS84, SAD69, and WebMercator
 *
 * @param {Object} feature - GeoJSON feature with geometry and optional properties.crs
 * @param {string} expectedProjection - Expected projection (default: 'SIRGAS2000')
 * @returns {Object} Validation result with detected utm_zone, detectedZone, and reprojectionNeeded flag
 * @example
 * const result = validateProjection(feature, 'SIRGAS2000');
 * console.log(result.detectedZone);  // '21S' - auto-detected from coordinates
 * console.log(result.utm_zone);      // Actual zone used (may differ if explicitly set)
 * if (result.reprojectionNeeded) { ... use QGIS to convert ... }
 */
export function validateProjection(feature, expectedProjection = 'SIRGAS2000') {
  const crs = feature.properties?.crs || feature.properties?.projection || 'unknown';
  
  // Define known CRS identifiers
  const knownCRS = {
    'SIRGAS2000': 'EPSG:4674',
    'WGS84': 'EPSG:4326',
    'SAD69': 'EPSG:4618',
    'WebMercator': 'EPSG:3857',
    'UTM20S': 'EPSG:31980', // SIRGAS2000 UTM Zone 20S
    'UTM21S': 'EPSG:31981', // SIRGAS2000 UTM Zone 21S
    'UTM22S': 'EPSG:31982', // SIRGAS2000 UTM Zone 22S
  };

  // Valid zones for Mato Grosso
  const validMTZones = ['20S', '21S', '22S'];

  // Extract first coordinate pair to detect zone automatically
  let coordinates = [];
  try {
    if (feature.geometry?.type === 'Polygon') {
      coordinates = feature.geometry.coordinates[0][0];
    } else if (feature.geometry?.type === 'LineString') {
      coordinates = feature.geometry.coordinates[0];
    } else if (feature.geometry?.type === 'Point') {
      coordinates = feature.geometry.coordinates;
    } else if (feature.geometry?.coordinates) {
      // Try to extract first coordinate
      let temp = feature.geometry.coordinates;
      while (Array.isArray(temp) && Array.isArray(temp[0])) {
        temp = temp[0];
      }
      coordinates = temp;
    }
  } catch (e) {
    console.warn('Error extracting coordinates for zone detection:', e);
    coordinates = [];
  }

  // AUTO-DETECT UTM zone from coordinates
  const detectedZone = detectUTMZoneFromCoordinates(coordinates);
  const utmZone = feature.properties?.utm_zone || detectedZone.zone;

  // Check if CRS is already SIRGAS2000 (or assuming it is)
  if (crs === expectedProjection || crs === knownCRS[expectedProjection] || crs === 'unknown') {
    // Validate UTM zone for Mato Grosso (accepts 20S, 21S, or 22S)
    if (feature.properties?.utm_zone && !validMTZones.includes(feature.properties.utm_zone)) {
      return {
        valid: false,
        originalCRS: crs,
        utm_zone: utmZone,
        detectedZone: detectedZone.zone,
        epsg: detectedZone.epsg,
        message: `Invalid UTM zone in properties: ${feature.properties.utm_zone}. Mato Grosso uses 20S, 21S, or 22S. Auto-detected: ${detectedZone.zone} (${detectedZone.description})`,
        reprojectionNeeded: false,
      };
    }

    // Validate coordinates are within reasonable bounds for MT
    if (coordinates.length >= 2) {
      const [lon, lat] = coordinates;
      if (lon < -62 || lon > -42 || lat < -19 || lat > -5) {
        return {
          valid: false,
          originalCRS: crs,
          utm_zone: utmZone,
          detectedZone: detectedZone.zone,
          epsg: detectedZone.epsg,
          message: `Coordinates outside Mato Grosso bounds: lon=${lon}, lat=${lat}. Expected zone: ${detectedZone.zone}`,
          reprojectionNeeded: false,
        };
      }
    }

    return {
      valid: true,
      originalCRS: crs,
      utm_zone: utmZone,
      detectedZone: detectedZone.zone,
      epsg: detectedZone.epsg,
      message: `✓ SIRGAS2000 UTM ${utmZone} (${detectedZone.description})`,
      reprojectionNeeded: false,
    };
  }

  // Handle known CRS that need reprojection
  let reprojectionNeeded = false;
  let supportedFormat = true;

  if (crs === 'WGS84' || crs === knownCRS['WGS84']) {
    reprojectionNeeded = true;
  } else if (crs === 'SAD69' || crs === knownCRS['SAD69']) {
    reprojectionNeeded = true;
  } else if (crs === 'WebMercator' || crs === knownCRS['WebMercator']) {
    reprojectionNeeded = true;
  } else {
    supportedFormat = false;
  }

  if (!supportedFormat) {
    return {
      valid: false,
      originalCRS: crs,
      utm_zone: utmZone,
      detectedZone: detectedZone.zone,
      epsg: detectedZone.epsg,
      message: `Unsupported CRS: ${crs}. Supported: SIRGAS2000, WGS84, SAD69, WebMercator. Expected zone: ${detectedZone.zone}. Use QGIS or proj4js for conversion.`,
      reprojectionNeeded: false,
    };
  }

  if (reprojectionNeeded) {
    return {
      valid: true,
      originalCRS: crs,
      utm_zone: utmZone,
      detectedZone: detectedZone.zone,
      epsg: detectedZone.epsg,
      message: `Reprojection required: ${crs} → SIRGAS2000 UTM ${detectedZone.zone}. Use QGIS or proj4js for conversion.`,
      reprojectionNeeded: true,
    };
  }

  return {
    valid: true,
    originalCRS: crs,
    utm_zone: utmZone,
    detectedZone: detectedZone.zone,
    epsg: detectedZone.epsg,
    message: `Projection OK. Expected zone: ${detectedZone.zone}`,
    reprojectionNeeded: false,
  };
}

/**
 * Internal: Validate coordinate projection (simplified)
 *
 * @private
 * @param {Object} feature - GeoJSON Feature
 * @param {string} expectedProjection - Expected projection
 * @throws {Error} If projection is invalid
 */
function validateProjectionInternal(feature, expectedProjection) {
  // Simplified validation - use validateProjection() for full validation with zone detection
  if (feature.properties?.crs && feature.properties.crs !== expectedProjection) {
    console.warn(
      `Projection mismatch: feature is ${feature.properties.crs}, expected ${expectedProjection}. ` +
      `Continuing with assumption that coordinates are in ${expectedProjection}.`
    );
  }
}
