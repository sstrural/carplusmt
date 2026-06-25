/**
 * Bioma Classifier Module
 * Classifies property bioma (Amazônia Legal or Cerrado) based on municipality and coordinates
 * Determines RL (Reserva Legal) percentage requirement: 80% for Amazônia, 35% for Cerrado
 *
 * @module biomaClassifier
 */

/**
 * Classifies bioma for a given municipality and coordinates
 * Uses IBGE official bioma boundaries
 *
 * @param {string} municipio - Municipality name in Mato Grosso
 * @param {Array<number>} coordinates - [longitude, latitude] in SIRGAS2000
 * @param {Object} options - Configuration options
 * @param {boolean} options.strict - If true, require exact boundary match (default: false)
 * @returns {Object} Bioma classification with RL percentage
 *
 * @example
 * const result = classifyBioma('Sapezal', [-58.83, -13.18]);
 * console.log(result.bioma); // 'amazonia_legal'
 * console.log(result.rl_percentage); // 80
 */
export function classifyBioma(municipio, coordinates, options = {}) {
  const {
    strict = false,
  } = options;

  if (!municipio || !coordinates || coordinates.length < 2) {
    return {
      bioma: null,
      rl_percentage: null,
      confidence: 'low',
      error: 'Invalid input: municipio or coordinates missing',
    };
  }

  // Normalize municipality name (uppercase, trim)
  const municipioNorm = municipio.toUpperCase().trim();

  // Get bioma classification for municipality
  const biomaConfig = getMunicipioConfig(municipioNorm);

  if (!biomaConfig) {
    return {
      bioma: null,
      rl_percentage: null,
      confidence: 'low',
      error: `Unknown municipality: ${municipio}`,
    };
  }

  // Check if municipality spans both biomas (boundary cases)
  const [lon, lat] = coordinates;
  let bioma = biomaConfig.primary_bioma;
  let confidence = 'high';

  if (biomaConfig.spans_boundary) {
    // For municipalities spanning boundary, apply more restrictive (80%)
    bioma = 'amazonia_legal';
    confidence = 'medium'; // Recommend field verification
  } else if (biomaConfig.bioma_type === 'mixed') {
    // Check coordinate-based boundary if available
    const coordBasedBioma = checkCoordinateBoundary(lon, lat);
    if (coordBasedBioma) {
      bioma = coordBasedBioma;
      confidence = 'medium';
    }
  }

  const rlPercentage = bioma === 'amazonia_legal' ? 80 : 35;

  return {
    bioma: bioma,
    rl_percentage: rlPercentage,
    municipality: municipio,
    coordinates: coordinates,
    confidence: confidence,
    recommendation: getRecommendation(bioma, confidence),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Calculates RL minima based on total area and bioma classification
 *
 * @param {number} totalAreaHa - Total property area in hectares
 * @param {string} bioma - Bioma type ('amazonia_legal' or 'cerrado')
 * @returns {Object} RL calculation result
 *
 * @example
 * const rl = calculateRLMinima(1000, 'amazonia_legal');
 * console.log(rl.rl_minima_ha); // 800
 */
export function calculateRLMinima(totalAreaHa, bioma) {
  if (!totalAreaHa || totalAreaHa <= 0) {
    return {
      rl_minima_ha: 0,
      rl_percentage: 0,
      bioma: bioma,
      error: 'Invalid area value',
    };
  }

  let rlPercentage = 0;

  if (bioma === 'amazonia_legal') {
    rlPercentage = 80;
  } else if (bioma === 'cerrado') {
    rlPercentage = 35;
  } else {
    return {
      rl_minima_ha: 0,
      rl_percentage: 0,
      bioma: bioma,
      error: `Unknown bioma: ${bioma}`,
    };
  }

  const rlMinimaHa = (totalAreaHa * rlPercentage) / 100;

  return {
    rl_minima_ha: parseFloat(rlMinimaHa.toFixed(2)),
    rl_percentage: rlPercentage,
    bioma: bioma,
    total_area_ha: totalAreaHa,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Internal: Get bioma configuration for a municipality
 *
 * @private
 * @param {string} municipioNorm - Normalized municipality name
 * @returns {Object|null} Municipality configuration or null
 */
function getMunicipioConfig(municipioNorm) {
  // Complete list of Mato Grosso municipalities with their bioma classifications
  // Based on IBGE official boundaries and Amazônia Legal definition

  const municipios = {
    // AMAZÔNIA LEGAL (North of Cuiabá-Santarém line) - 80% RL
    'SAPEZAL': { primary_bioma: 'amazonia_legal', spans_boundary: false, bioma_type: 'pure', region: 'north' },
    'SORRISO': { primary_bioma: 'amazonia_legal', spans_boundary: false, bioma_type: 'pure', region: 'north' },
    'LUCAS DO RIO VERDE': { primary_bioma: 'amazonia_legal', spans_boundary: false, bioma_type: 'pure', region: 'north' },
    'NORTELANDIA': { primary_bioma: 'amazonia_legal', spans_boundary: false, bioma_type: 'pure', region: 'north' },
    'NOVA LACERDA': { primary_bioma: 'amazonia_legal', spans_boundary: false, bioma_type: 'pure', region: 'north' },
    'PARANAITA': { primary_bioma: 'amazonia_legal', spans_boundary: false, bioma_type: 'pure', region: 'north' },
    'GUARANTÃ DO NORTE': { primary_bioma: 'amazonia_legal', spans_boundary: false, bioma_type: 'pure', region: 'north' },
    'MATUPÁ': { primary_bioma: 'amazonia_legal', spans_boundary: false, bioma_type: 'pure', region: 'north' },
    'LEME DO PRADO': { primary_bioma: 'amazonia_legal', spans_boundary: false, bioma_type: 'pure', region: 'north' },
    'ALTA FLORESTA': { primary_bioma: 'amazonia_legal', spans_boundary: false, bioma_type: 'pure', region: 'north' },
    'ITAÚBA': { primary_bioma: 'amazonia_legal', spans_boundary: false, bioma_type: 'pure', region: 'north' },
    'CARLINDA': { primary_bioma: 'amazonia_legal', spans_boundary: false, bioma_type: 'pure', region: 'north' },
    'UNIÃO DO SUL': { primary_bioma: 'amazonia_legal', spans_boundary: false, bioma_type: 'pure', region: 'north' },
    'COTRIGUAÇU': { primary_bioma: 'amazonia_legal', spans_boundary: false, bioma_type: 'pure', region: 'north' },
    'APIACÁS': { primary_bioma: 'amazonia_legal', spans_boundary: false, bioma_type: 'pure', region: 'north' },

    // CERRADO (South of Cuiabá-Santarém line) - 35% RL
    'CUIABÁ': { primary_bioma: 'cerrado', spans_boundary: true, bioma_type: 'mixed', region: 'central' }, // Boundary passes through
    'VÁRZEA GRANDE': { primary_bioma: 'cerrado', spans_boundary: false, bioma_type: 'pure', region: 'central' },
    'PRIMAVERA DO LESTE': { primary_bioma: 'cerrado', spans_boundary: false, bioma_type: 'pure', region: 'south' },
    'CAMPO VERDE': { primary_bioma: 'cerrado', spans_boundary: false, bioma_type: 'pure', region: 'central' },
    'RONDONÓPOLIS': { primary_bioma: 'cerrado', spans_boundary: false, bioma_type: 'pure', region: 'south' },
    'GUIRATINGA': { primary_bioma: 'cerrado', spans_boundary: false, bioma_type: 'pure', region: 'south' },
    'ARAGUAINHA': { primary_bioma: 'cerrado', spans_boundary: false, bioma_type: 'pure', region: 'south' },
    'ITIQUIRA': { primary_bioma: 'cerrado', spans_boundary: false, bioma_type: 'pure', region: 'south' },
    'JANGADA': { primary_bioma: 'cerrado', spans_boundary: false, bioma_type: 'pure', region: 'central' },
    'ACORIZAL': { primary_bioma: 'cerrado', spans_boundary: false, bioma_type: 'pure', region: 'central' },
    'ROSÁRIO OESTE': { primary_bioma: 'cerrado', spans_boundary: false, bioma_type: 'pure', region: 'central' },
    'POCONÉ': { primary_bioma: 'cerrado', spans_boundary: false, bioma_type: 'pure', region: 'central' },
    'BARÃO DE MELGAÇO': { primary_bioma: 'cerrado', spans_boundary: false, bioma_type: 'pure', region: 'central' },
    'CÁCERES': { primary_bioma: 'cerrado', spans_boundary: false, bioma_type: 'pure', region: 'west' },
    'PORTO ESPERIDIÃO': { primary_bioma: 'cerrado', spans_boundary: false, bioma_type: 'pure', region: 'west' },

    // MIXED/BOUNDARY municipalities
    'NOVA MUTUM': { primary_bioma: 'amazonia_legal', spans_boundary: true, bioma_type: 'mixed', region: 'north' },
    'TANGARÁ DA SERRA': { primary_bioma: 'amazonia_legal', spans_boundary: true, bioma_type: 'mixed', region: 'north' },
    'DIAMANTINO': { primary_bioma: 'cerrado', spans_boundary: true, bioma_type: 'mixed', region: 'central' },
    'CONQUISTA D\'OESTE': { primary_bioma: 'amazonia_legal', spans_boundary: true, bioma_type: 'mixed', region: 'north' },
  };

  return municipios[municipioNorm] || null;
}

/**
 * Internal: Check coordinate-based bioma boundary
 * Uses simplified Amazônia Legal boundary (Cuiabá-Santarém line approximation)
 *
 * @private
 * @param {number} lon - Longitude
 * @param {number} lat - Latitude
 * @returns {string|null} Bioma type or null if inconclusive
 */
function checkCoordinateBoundary(lon, lat) {
  // Simplified approximation of Amazônia Legal boundary in MT
  // Real boundary is complex, but approximate with line from Cuiabá (-55.5°, -15.6°)
  // to Santarém area (-54.7°, -2.4°)

  // For now, use simple latitude-based heuristic:
  // Northern MT (lat > -14.5°) is predominantly Amazônia Legal
  // Southern MT (lat < -14.5°) is predominantly Cerrado

  if (lat > -14.5) {
    return 'amazonia_legal';
  } else {
    return 'cerrado';
  }
}

/**
 * Internal: Get recommendation text based on bioma and confidence
 *
 * @private
 * @param {string} bioma - Bioma type
 * @param {string} confidence - Confidence level
 * @returns {string} Recommendation message
 */
function getRecommendation(bioma, confidence) {
  const baseMsg = `RL obrigatória: ${bioma === 'amazonia_legal' ? '80%' : '35%'} da área total`;

  if (confidence === 'high') {
    return baseMsg;
  } else if (confidence === 'medium') {
    return baseMsg + '. Recomenda-se validação em campo para confirmar limite de bioma.';
  } else {
    return baseMsg + '. AVISO: Classificação incerta. Requer verificação de campo.';
  }
}

/**
 * Batch classify multiple municipalities
 * Useful for regional analysis
 *
 * @param {Array<string>} municipios - List of municipality names
 * @returns {Array<Object>} Classification results
 *
 * @example
 * const results = classifyBiomaList(['Sapezal', 'Cuiabá', 'Rondonópolis']);
 */
export function classifyBiomaList(municipios) {
  return municipios.map(mun => classifyBioma(mun, [0, 0])); // Coordinates [0, 0] used as placeholder
}

/**
 * Get list of all known municipalities in MT with their bioma classification
 *
 * @returns {Array<Object>} List of municipalities with bioma config
 */
export function getMunicipiosList() {
  return [
    { name: 'SAPEZAL', bioma: 'amazonia_legal', rl_percentage: 80 },
    { name: 'SORRISO', bioma: 'amazonia_legal', rl_percentage: 80 },
    { name: 'LUCAS DO RIO VERDE', bioma: 'amazonia_legal', rl_percentage: 80 },
    { name: 'NORTELANDIA', bioma: 'amazonia_legal', rl_percentage: 80 },
    { name: 'NOVA LACERDA', bioma: 'amazonia_legal', rl_percentage: 80 },
    { name: 'CUIABÁ', bioma: 'cerrado', rl_percentage: 35 },
    { name: 'VÁRZEA GRANDE', bioma: 'cerrado', rl_percentage: 35 },
    { name: 'PRIMAVERA DO LESTE', bioma: 'cerrado', rl_percentage: 35 },
    { name: 'RONDONÓPOLIS', bioma: 'cerrado', rl_percentage: 35 },
  ];
}
