/**
 * Hydrography Spatial Index
 * Uses RBush (R-tree) for fast spatial queries of watercourses
 *
 * @module hydrographyIndex
 */

import RBush from 'rbush';

/**
 * Spatial index for hydrography features (rivers, streams, points)
 * Supports efficient bounding box and distance queries
 */
export class HydrographyIndex {
  /**
   * Initialize a new hydrography spatial index
   * @param {number} maxEntries - Max entries per tree node (default 9)
   */
  constructor(maxEntries = 9) {
    this.tree = new RBush(maxEntries);
    this.featureMap = new Map(); // Maps item.id to original feature
  }

  /**
   * Insert a hydrography feature into the index
   * Supports LineString (rivers/streams) and Point (nascentes)
   * 
   * @param {Object} feature - GeoJSON Feature object
   * @param {string} feature.properties.id - Unique feature ID
   * @param {string} feature.properties.name - Feature name (optional)
   * @param {string} feature.properties.type - 'river' | 'stream' | 'nascente'
   * @param {number} feature.properties.width_m - Width in meters (for LineString)
   * @param {Object} feature.geometry - GeoJSON geometry
   * @returns {void}
   */
  insert(feature) {
    if (!feature || !feature.geometry || !feature.properties?.id) {
      console.warn('Invalid feature for hydrography index', feature);
      return;
    }

    const id = feature.properties.id;
    const geometry = feature.geometry;
    let bbox;

    if (geometry.type === 'LineString') {
      // For LineString, calculate bounding box from coordinates
      bbox = this._calculateLineStringBbox(geometry.coordinates);
    } else if (geometry.type === 'Point') {
      // For Point, create a small bbox around the point
      const [lon, lat] = geometry.coordinates;
      const tolerance = 0.0001; // ~10 meters at equator
      bbox = [lon - tolerance, lat - tolerance, lon + tolerance, lat + tolerance];
    } else if (geometry.type === 'MultiLineString') {
      // For MultiLineString, calculate bbox from all coordinates
      const allCoords = geometry.coordinates.flat();
      bbox = this._calculateLineStringBbox(allCoords);
    } else {
      console.warn('Unsupported geometry type for hydrography index:', geometry.type);
      return;
    }

    // RBush format: [minX, minY, maxX, maxY, id]
    const item = {
      minX: bbox[0],
      minY: bbox[1],
      maxX: bbox[2],
      maxY: bbox[3],
      id,
    };

    this.tree.insert(item);
    this.featureMap.set(id, feature);
  }

  /**
   * Search for watercourses within a bounding box
   * 
   * @param {Array} bbox - [minLon, minLat, maxLon, maxLat]
   * @returns {Array} Array of GeoJSON features found in bbox
   */
  search(bbox) {
    if (!bbox || bbox.length !== 4) {
      throw new Error('Invalid bbox: must be [minLon, minLat, maxLon, maxLat]');
    }

    const [minLon, minLat, maxLon, maxLat] = bbox;

    // Query RBush with bbox
    const searchBox = {
      minX: minLon,
      minY: minLat,
      maxX: maxLon,
      maxY: maxLat,
    };

    const results = this.tree.search(searchBox);

    // Map item IDs back to original features
    return results
      .map((item) => this.featureMap.get(item.id))
      .filter((feature) => feature !== undefined);
  }

  /**
   * Query watercourses within a certain distance from a point
   * Uses approximate distance calculation (no projection)
   * 
   * @param {Array} point - [longitude, latitude]
   * @param {number} radiusMeters - Search radius in meters
   * @returns {Array} Array of features within distance radius
   */
  queryByDistance(point, radiusMeters) {
    if (!point || point.length !== 2 || typeof radiusMeters !== 'number') {
      throw new Error('Invalid parameters: point must be [lon, lat] and radiusMeters must be a number');
    }

    const [lon, lat] = point;

    // Convert meters to degrees (approximate)
    // At equator: 1 degree ≈ 111 km ≈ 111000 meters
    const radiusDegrees = radiusMeters / 111000;

    // Create search bbox
    const bbox = [
      lon - radiusDegrees,
      lat - radiusDegrees,
      lon + radiusDegrees,
      lat + radiusDegrees,
    ];

    return this.search(bbox);
  }

  /**
   * Get all features from index
   * 
   * @returns {Array} All GeoJSON features in index
   */
  getAll() {
    return Array.from(this.featureMap.values());
  }

  /**
   * Clear the index
   * 
   * @returns {void}
   */
  clear() {
    this.tree.clear();
    this.featureMap.clear();
  }

  /**
   * Get index statistics
   * 
   * @returns {Object} Statistics about index contents
   */
  getStats() {
    const all = this.getAll();
    const byType = {
      river: 0,
      stream: 0,
      nascente: 0,
      unknown: 0,
    };

    all.forEach((feature) => {
      const type = feature.properties?.type || 'unknown';
      byType[type] = (byType[type] || 0) + 1;
    });

    return {
      totalFeatures: all.length,
      byType,
      treeSize: this.tree.data.children.length,
    };
  }

  /**
   * Calculate bounding box from LineString coordinates
   * 
   * @private
   * @param {Array} coordinates - Array of [lon, lat] pairs
   * @returns {Array} [minLon, minLat, maxLon, maxLat]
   */
  _calculateLineStringBbox(coordinates) {
    let minLon = Infinity;
    let minLat = Infinity;
    let maxLon = -Infinity;
    let maxLat = -Infinity;

    for (const [lon, lat] of coordinates) {
      minLon = Math.min(minLon, lon);
      minLat = Math.min(minLat, lat);
      maxLon = Math.max(maxLon, lon);
      maxLat = Math.max(maxLat, lat);
    }

    return [minLon, minLat, maxLon, maxLat];
  }
}

console.log('✓ Hydrography spatial index module loaded');
