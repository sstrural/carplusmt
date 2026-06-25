/**
 * Geometry Utilities
 * Helper functions for geometric operations using Turf.js
 *
 * @module geometryUtils
 */

import * as turf from '@turf/turf';

console.log('✓ Geometry utilities module initialized');

/**
 * Create a buffer around a geometry
 * @param {GeoJSON} geometry - The input geometry
 * @param {number} distance - Buffer distance in kilometers
 * @param {string} unit - Unit of distance ('kilometers', 'meters', etc.)
 * @returns {GeoJSON} - Buffered geometry
 */
export function createBuffer(geometry, distance, unit = 'meters') {
  try {
    const bufferDistance = unit === 'meters' ? distance / 1000 : distance;
    return turf.buffer(geometry, bufferDistance, { units: 'kilometers' });
  } catch (error) {
    console.error('Error creating buffer:', error);
    throw error;
  }
}

/**
 * Calculate the area of a geometry in hectares
 * @param {GeoJSON} geometry - The geometry
 * @returns {number} - Area in hectares
 */
export function calculateArea(geometry) {
  try {
    const areaM2 = turf.area(geometry);
    const areaHa = areaM2 / 10000; // Convert m² to hectares
    return Math.round(areaHa * 100) / 100; // Round to 2 decimal places
  } catch (error) {
    console.error('Error calculating area:', error);
    throw error;
  }
}

/**
 * Calculate intersection of two geometries
 * @param {GeoJSON} geom1 - First geometry
 * @param {GeoJSON} geom2 - Second geometry
 * @returns {GeoJSON|null} - Intersection geometry or null if no intersection
 */
export function getIntersection(geom1, geom2) {
  try {
    return turf.intersect(geom1, geom2);
  } catch (error) {
    console.error('Error calculating intersection:', error);
    return null;
  }
}

/**
 * Union multiple geometries
 * @param {GeoJSON[]} geometries - Array of geometries
 * @returns {GeoJSON} - Unified geometry
 */
export function unionGeometries(geometries) {
  try {
    if (geometries.length === 0) {
      return null;
    }
    if (geometries.length === 1) {
      return geometries[0];
    }

    let result = geometries[0];
    for (let i = 1; i < geometries.length; i++) {
      const unioned = turf.union(result, geometries[i]);
      result = unioned;
    }
    return result;
  } catch (error) {
    console.error('Error unioning geometries:', error);
    throw error;
  }
}

console.log('✓ Geometry utilities ready');
