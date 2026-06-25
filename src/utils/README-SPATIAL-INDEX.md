# Hydrography Spatial Index Module

## Overview

The `HydrographyIndex` is an R-tree based spatial indexing system for fast querying of hydrography features (rivers, streams, nascentes) across property boundaries. Built on top of RBush (an efficient JavaScript R-tree library), it enables sub-100ms queries on large datasets (1000+ features).

## Purpose

- **Fast Spatial Queries**: Query watercourses intersecting a property bounding box in < 100ms
- **APP Detection**: Identify all hydrography features that trigger APP (Área de Preservação Permanente) obligations
- **Distance-based Queries**: Find nascentes and watercourses within a given radius
- **Scalability**: Efficiently handle large hydrography datasets (MT IBGE 1:50,000 scale)

## Requirements Addressed

- **Requirement 8.6**: Fast queries on local hydrography database
- **Non-functional (Performance)**: Sub-100ms queries on 1000+ features with bounding box > 1000 ha

## API Reference

### Constructor

```javascript
const index = new HydrographyIndex(maxEntries = 9);
```

**Parameters:**
- `maxEntries` (number, optional): Maximum entries per tree node. Default 9 balances performance and memory.

### Methods

#### `insert(feature)`

Insert a GeoJSON feature into the index.

```javascript
const riverFeature = {
  type: 'Feature',
  properties: {
    id: 'rio_sapezal',
    name: 'Rio Sapezal',
    type: 'river', // or 'stream' or 'nascente'
    width_m: 30    // width in meters (for LineString)
  },
  geometry: {
    type: 'LineString',
    coordinates: [[-58.85, -13.2], [-58.84, -13.21], ...]
  }
};

index.insert(riverFeature);
```

**Supported Geometry Types:**
- `LineString`: Rivers, streams
- `Point`: Nascentes (spring points)
- `MultiLineString`: Complex watercourse networks

**Feature Properties Required:**
- `properties.id` (string): Unique identifier
- `properties.type` (string): 'river', 'stream', or 'nascente'
- `geometry`: Valid GeoJSON geometry

#### `search(bbox)`

Query features within a bounding box.

```javascript
const bbox = [-58.86, -13.22, -58.83, -13.19]; // [minLon, minLat, maxLon, maxLat]
const features = index.search(bbox);

// Result: Array of GeoJSON features
// [
//   { type: 'Feature', properties: {...}, geometry: {...} },
//   ...
// ]
```

**Returns:** Array of GeoJSON features intersecting the bbox.

**Performance:** Typically < 50ms for 1000 features with regional bbox (10km × 10km)

#### `queryByDistance(point, radiusMeters)`

Find features within a distance radius from a point.

```javascript
const nascente = [-58.85, -13.2];
const radius = 5000; // 5 kilometers

const nearby = index.queryByDistance(nascente, radius);
```

**Parameters:**
- `point` (Array): [longitude, latitude]
- `radiusMeters` (number): Search radius in meters

**Returns:** Array of features within the radius (approximate, uses degree-based bounding box)

**Note:** Distance calculation uses simplified approximation (1 degree ≈ 111 km). For precise distances, calculate separately using Turf.js `distance()`.

#### `getAll()`

Retrieve all features from the index.

```javascript
const allFeatures = index.getAll();
console.log(`Total features: ${allFeatures.length}`);
```

**Returns:** Array of all GeoJSON features in index

#### `clear()`

Clear all features from the index.

```javascript
index.clear();
```

#### `getStats()`

Get index statistics and composition.

```javascript
const stats = index.getStats();
console.log(stats);
// Output:
// {
//   totalFeatures: 1234,
//   byType: {
//     river: 45,
//     stream: 890,
//     nascente: 299,
//     unknown: 0
//   },
//   treeSize: 12
// }
```

## Usage Example: APP Detection Workflow

```javascript
import { HydrographyIndex } from './src/utils/hydrographyIndex.js';

// 1. Initialize index
const hydroIndex = new HydrographyIndex();

// 2. Load hydrography features (e.g., from IBGE GeoJSON)
const hydrographyGeoJSON = await fetch('/data/mt-hydrography.geojson').then(r => r.json());
hydrographyGeoJSON.features.forEach(f => hydroIndex.insert(f));

// 3. User defines property boundary (e.g., from CAR form or drawing)
const propertyBbox = [-58.86, -13.22, -58.83, -13.19];

// 4. Query intersecting hydrography
const appFeatures = hydroIndex.search(propertyBbox);
console.log(`Found ${appFeatures.length} watercourses for APP analysis`);

// 5. Calculate APP by watercourse type
const appByType = {
  rivers: appFeatures.filter(f => f.properties.type === 'river'),
  streams: appFeatures.filter(f => f.properties.type === 'stream'),
  nascentes: appFeatures.filter(f => f.properties.type === 'nascente')
};

// 6. For each river, create buffer based on width
appByType.rivers.forEach(river => {
  const width = river.properties.width_m;
  const buffer = width < 10 ? 30 : width < 50 ? 50 : 100;
  console.log(`${river.properties.name}: ${buffer}m buffer`);
});

// 7. Search nascentes within 100m of property boundary
const propertyCenter = [-58.845, -13.205];
const nearbyNascentes = hydroIndex.queryByDistance(propertyCenter, 100);
```

## Performance Characteristics

### Insertion
- Time: O(log N) per feature
- Memory: ~200 bytes per feature (including metadata)

### Query (Bounding Box)
- Time: O(log N) average case
- Regional query (10km × 10km): < 50ms for 1000 features
- Large bbox (1000+ ha): < 100ms for 1000 features

### Distance Query
- Time: O(log N) + filtering
- 5km radius query: < 100ms for 1000 features

### Tested Scenarios

| Dataset | Query Type | Size | Time | Status |
|---------|-----------|------|------|--------|
| 1000 features | Bbox (10km²) | Regional | < 50ms | ✓ Pass |
| 1000 features | Bbox (1000+ ha) | Large | < 100ms | ✓ Pass |
| 500 features | Distance (5km) | Large radius | < 50ms | ✓ Pass |
| 1000 features | Full scan | - | < 10ms | ✓ Pass |

## Data Model

### Feature Structure

```json
{
  "type": "Feature",
  "properties": {
    "id": "rio_sapezal",
    "name": "Rio Sapezal",
    "type": "river",
    "width_m": 30,
    "source": "ibge_1_50k"
  },
  "geometry": {
    "type": "LineString",
    "coordinates": [
      [-58.855, -13.215],
      [-58.850, -13.210],
      [-58.845, -13.205]
    ]
  }
}
```

### Supported Feature Types

| Type | Geometry | Description | Buffer Distance |
|------|----------|-------------|-----------------|
| river | LineString | Major watercourse | 50-100m |
| stream | LineString | Minor watercourse | 30m |
| nascente | Point | Spring/water source | 50m |

## Integration with Other Modules

### With `storageManager.js`

```javascript
import { loadHydrography } from './storageManager.js';
import { HydrographyIndex } from './hydrographyIndex.js';

// Load pre-cached hydrography from IndexedDB
const hydroData = await loadHydrography('mt-hydrography');
const index = new HydrographyIndex();

hydroData.features.forEach(f => index.insert(f));
```

### With `demLoader.js`

```javascript
// Use hydrography queries to identify elevation areas for analysis
const appFeatures = hydroIndex.search(propertyBbox);

// For each watercourse, could analyze elevation at crossing points
appFeatures.forEach(async (feature) => {
  if (feature.geometry.type === 'LineString') {
    const coords = feature.geometry.coordinates[0];
    const slope = await demLoader.getSlopeAtPoint(coords[0], coords[1], tileData, metadata);
    console.log(`Slope at ${feature.properties.name}: ${slope}°`);
  }
});
```

### With `geometryUtils.js` (future)

```javascript
// Use index query results with Turf.js for detailed analysis
import * as turf from '@turf/turf';

const appFeatures = hydroIndex.search(propertyBbox);
const propertyPoly = turf.polygon(propertyCoords);

appFeatures.forEach(feature => {
  const intersection = turf.intersect(feature, propertyPoly);
  const area = turf.area(intersection); // in square meters
  console.log(`APP area from ${feature.properties.name}: ${area / 10000} ha`);
});
```

## Offline Support

The index works entirely offline once features are loaded:

```javascript
// Initialization (can be done online)
const index = new HydrographyIndex();
const hydroGeoJSON = await fetch('/data/mt-hydrography.geojson').then(r => r.json());

// Insert all features into index
hydroGeoJSON.features.forEach(f => index.insert(f));

// Now works offline indefinitely
// - Queries: ✓
// - Insertions: ✓
// - Searches: ✓
// - No network required
```

## Limitations

1. **Distance Calculation**: Uses degree-based approximation, not geodetic distance. For precise distances, use `turf.distance()`.
2. **Geometry Types**: Only supports LineString, Point, and MultiLineString. Polygons not supported.
3. **No Persistence**: Index is in-memory only. For persistence, use `storageManager.js` to cache individual features.
4. **Relative Positioning**: Assumes WGS84 (SRID:4326) coordinates. Automatic reprojection from UTM/local projections needed before indexing.

## Testing

Comprehensive test suite in `tests/hydrographyIndex.test.js`:

```bash
npm run test -- tests/hydrographyIndex.test.js

# Run with coverage
npm run test:coverage
```

**Test Coverage:**
- Insertion of LineString, Point, MultiLineString features
- Bounding box searches (small, large, overlapping)
- Distance-based queries
- Performance with 1000+ features
- Statistics and cache management
- Real-world scenario (600 ha property in Sapezal region)

## Future Enhancements

1. **Geometry Simplification**: Reduce coordinate precision for very long linestrings
2. **Caching Strategy**: Implement LRU cache for frequent queries
3. **Async Indexing**: Build index asynchronously for large datasets
4. **Spatial Joins**: Support queries like "all nascentes near rivers"
5. **Export/Import**: Serialize indexed data for caching

## References

- **RBush**: https://github.com/mourner/rbush - R-tree spatial index implementation
- **R-trees**: https://en.wikipedia.org/wiki/R-tree - Overview of R-tree data structure
- **GeoJSON**: https://geojson.org/ - GeoJSON specification
- **IBGE Hydrography**: https://www.ibge.gov.br/ - Brazilian hydrography data source
