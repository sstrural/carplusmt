# DEM Loader Module

## Overview

The `DEMLoader` module loads and caches Digital Elevation Model (DEM) tiles from remote sources with graceful offline fallback. It supports multiple DEM sources (GEBCO global, USGS 3DEP) and implements memory + IndexedDB caching for offline capability and performance.

## Purpose

- **Remote DEM Loading**: Fetch 256×256 elevation tiles from GEBCO or USGS sources
- **Caching Strategy**: Multi-tier caching (memory + IndexedDB) for fast repeated access
- **Offline Support**: Pre-cached tiles available offline for APP slope analysis
- **Elevation Analysis**: Extract elevation and calculate slope at property locations
- **Graceful Degradation**: Continue functioning even if DEM unavailable

## Requirements Addressed

- **Requirement 3.1**: Load DEM tiles from remote sources
- **Requirement 3.4**: Cache tiles in IndexedDB for offline access
- **Requirement 3.5**: Fallback gracefully if DEM unavailable
- **Non-functional**: Timeout < 5 seconds per tile, offline capability

## API Reference

### Constructor

```javascript
const loader = new DEMLoader(options);
```

**Parameters:**
```javascript
{
  source: 'auto' | 'gebco' | 'usgs',  // DEM source (default: 'auto' tries both)
  timeout: 5000,                       // Request timeout in ms (default: 5000)
  useCache: true                       // Enable IndexedDB caching (default: true)
}
```

**Examples:**

```javascript
// Default auto-detection (tries GEBCO first, then USGS)
const loader = new DEMLoader();

// GEBCO only, 10 second timeout
const gebcoLoader = new DEMLoader({ source: 'gebco', timeout: 10000 });

// USGS only, no caching
const usgsLoader = new DEMLoader({ source: 'usgs', useCache: false });

// Offline mode (pre-cached tiles only)
const offlineLoader = new DEMLoader({ source: 'auto', timeout: 100 });
```

### Methods

#### `async loadTile(z, x, y)`

Load a DEM tile by Web Mercator tile coordinates.

```javascript
const tileData = await loader.loadTile(10, 512, 512);

if (tileData) {
  console.log(`Loaded tile: ${tileData.byteLength} bytes`);
} else {
  console.warn('Tile unavailable (network error or offline)');
}
```

**Parameters:**
- `z` (number): Zoom level (8-14 typical)
- `x` (number): Tile column
- `y` (number): Tile row

**Returns:** `Promise<ArrayBuffer|null>`
- `ArrayBuffer`: GeoTIFF tile data on success
- `null`: Timeout, network error, or tile unavailable

**Behavior:**
1. Check memory cache first (< 10ms)
2. Check IndexedDB cache if enabled
3. Request from remote source (GEBCO or USGS)
4. Cache result (memory + IndexedDB)
5. Return `null` if all attempts fail (graceful degradation)

**Performance:**
- Cached tile (memory): < 5ms
- Fresh download: 500-2000ms (depending on network)
- Timeout fallback: < 5100ms (5 sec timeout + overhead)

#### `getElevation(x, y, tileData, tileMetadata)`

Get elevation value at coordinates within a tile.

```javascript
const tileMetadata = {
  minX: -58.86,           // Tile bounding box min longitude
  minY: -13.22,           // Tile bounding box min latitude
  pixelSize: 0.0001       // Resolution in degrees (~10m at equator)
};

const elevation = loader.getElevation(-58.85, -13.21, tileData, tileMetadata);

if (elevation !== null) {
  console.log(`Elevation: ${elevation} meters`);
} else {
  console.warn('Elevation data unavailable at coordinates');
}
```

**Parameters:**
- `x` (number): Longitude (decimal degrees)
- `y` (number): Latitude (decimal degrees)
- `tileData` (ArrayBuffer): GeoTIFF tile data
- `tileMetadata` (Object): Tile bounds and resolution

**Returns:** `number|null`
- Elevation in meters if available
- `null` if data unavailable

**Note:** In current implementation, returns mock elevation for testing. Production implementation requires GeoTIFF decoding library (e.g., `geotiff.js`).

#### `async getSlopeAtPoint(x, y, tileData, tileMetadata)`

Calculate terrain slope at a point (for APP encosta classification).

```javascript
const slope = await loader.getSlopeAtPoint(-58.85, -13.21, tileData, tileMetadata);

if (slope !== null) {
  const isAPPEncosta = slope > 45;
  console.log(`Slope: ${slope}°, APP Encosta: ${isAPPEncosta}`);
} else {
  console.warn('Slope data unavailable');
}
```

**Parameters:** Same as `getElevation()`

**Returns:** `Promise<number|null>`
- Slope in degrees (0-90) if available
- `null` if data unavailable

**Slope Classification (for APP):**
- `slope ≤ 45°`: Not APP encosta (no protection required)
- `slope > 45°`: APP encosta (30m minimum setback from ridge)

**Note:** Calculation uses simplified gradient from neighboring pixels. Production implementation should use Sobel edge detection or similar for accurate slope maps.

#### `clearMemoryCache()`

Clear in-memory cache (does not affect IndexedDB).

```javascript
loader.clearMemoryCache();
console.log(`Memory cache cleared`);
```

**Use Cases:**
- Reduce memory usage if many tiles loaded
- Force reload from IndexedDB on next query
- Free up space for other data

#### `getCacheStats()`

Get current cache status.

```javascript
const stats = loader.getCacheStats();
console.log(stats);
// Output:
// {
//   memoryCacheSize: 3,
//   maxMemoryCacheSize: 10,
//   source: 'auto'
// }
```

**Returns:** Object with cache status
- `memoryCacheSize`: Tiles currently in memory
- `maxMemoryCacheSize`: Max tiles before pruning
- `source`: Current DEM source

## Usage Example: Slope Analysis Workflow

```javascript
import { DEMLoader } from './src/utils/demLoader.js';
import { HydrographyIndex } from './src/utils/hydrographyIndex.js';

// 1. Initialize loader
const demLoader = new DEMLoader({
  source: 'auto',
  timeout: 5000,
  useCache: true
});

// 2. Load DEM tile covering property (z10, x512, y512)
const tileData = await demLoader.loadTile(10, 512, 512);

if (!tileData) {
  console.warn('DEM unavailable, skipping slope analysis');
  // Continue with APP detection using only hydrography
} else {
  // 3. Define tile metadata
  const tileMetadata = {
    minX: -58.86,
    minY: -13.22,
    pixelSize: 0.0001
  };

  // 4. Analyze slopes within property
  const propertyBbox = [-58.86, -13.22, -58.83, -13.19];
  const slopeData = [];

  // Sample grid points within property
  const step = 0.001; // ~100m spacing
  for (let lon = propertyBbox[0]; lon < propertyBbox[2]; lon += step) {
    for (let lat = propertyBbox[1]; lat < propertyBbox[3]; lat += step) {
      const slope = await demLoader.getSlopeAtPoint(lon, lat, tileData, tileMetadata);
      
      if (slope !== null && slope > 45) {
        slopeData.push({
          x: lon,
          y: lat,
          slope: slope,
          appEncosta: true
        });
      }
    }
  }

  // 5. Calculate APP area from slope data
  const appEncostArea = slopeData.length * (step * step * 10000); // Convert to hectares
  console.log(`APP Encosta area: ${appEncostArea.toFixed(2)} ha`);
}
```

## Caching Strategy

### Memory Cache

- **Purpose**: Sub-10ms retrieval for recently accessed tiles
- **Size**: Up to 10 tiles (configurable `maxMemoryCacheSize`)
- **Eviction**: LRU (Least Recently Used) when exceeding max
- **Lifespan**: Session duration only

```javascript
// Add to memory cache
demLoader.memoryCache.set('dem_10_512_512', tileData);

// Access (fast)
const cached = demLoader.memoryCache.get('dem_10_512_512');
```

### IndexedDB Cache

- **Purpose**: Persistent tile cache across browser sessions
- **Size**: Limited by browser quota (typically 50GB+)
- **Eviction**: Oldest timestamp when quota exceeded (manual cleanup)
- **Lifespan**: Until browser cache cleared

```javascript
// Automatic caching to IndexedDB
const tileData = await demLoader.loadTile(10, 512, 512);
// Results automatically saved to IndexedDB

// Retrieve from IndexedDB
const cached = await getCachedDemTile('dem_10_512_512');
```

### Cache Hit Flow

```
1. Memory cache (< 5ms)
   ↓ Miss
2. IndexedDB cache (< 100ms)
   ↓ Miss
3. Remote fetch (GEBCO or USGS)
   - GEBCO: https://www.gebco.net/data/
   - USGS: https://elevation.nationalmap.gov/arcgis/
   ↓ Success or timeout
4. Cache result (memory + IndexedDB)
5. Return to caller
```

## Offline Support

The module gracefully handles offline scenarios:

```javascript
// Scenario 1: Online, fresh tiles
const loader1 = new DEMLoader({ source: 'auto' });
const tile1 = await loader1.loadTile(10, 512, 512);
// ✓ Loads from remote, caches locally

// Scenario 2: Offline, cached tiles available
const loader2 = new DEMLoader({ source: 'auto' });
const tile2 = await loader2.loadTile(10, 512, 512);
// ✓ Loads from IndexedDB, works offline

// Scenario 3: Offline, no cache available
const loader3 = new DEMLoader({ source: 'auto' });
const tile3 = await loader3.loadTile(10, 999, 999);
// Returns null, app continues with degraded functionality
```

## DEM Sources

### GEBCO (Global Bathymetry and Topography)

- **Coverage**: Global (land + ocean)
- **Resolution**: 15 arc-second (~500m)
- **Format**: NetCDF or GeoTIFF
- **Provider**: British Oceanographic Data Centre
- **URL**: https://www.gebco.net/data/

**Use Case**: Global baseline elevation, ocean bathymetry

### USGS 3DEP (3D Elevation Program)

- **Coverage**: USA, limited global
- **Resolution**: 1/3 arc-second (~10m) in USA
- **Format**: GeoTIFF tiles
- **Provider**: US Geological Survey
- **URL**: https://elevation.nationalmap.gov/arcgis/

**Use Case**: High-resolution elevation analysis in USA

### Auto Mode (Recommended)

```javascript
const loader = new DEMLoader({ source: 'auto' });

// 1. Attempts GEBCO first (global coverage, fast)
// 2. If GEBCO fails or timeout, attempts USGS 3DEP
// 3. Returns null if both unavailable
```

## Performance Characteristics

### Caching Performance

| Operation | Latency | Notes |
|-----------|---------|-------|
| Memory cache hit | < 5ms | In-memory lookup |
| IndexedDB cache hit | 50-200ms | Browser database access |
| Remote fetch (network) | 500-2000ms | Depends on connection |
| Timeout fallback | 5000-5100ms | Configurable timeout |

### Tile Size

- **GeoTIFF tile**: 256×256 pixels × 2 bytes = ~132KB per tile
- **10 tiles in cache**: ~1.3MB memory + IndexedDB

### Tested Scenarios

| Scenario | Status | Notes |
|----------|--------|-------|
| Load tile (fresh) | ✓ Pass | Timeout < 5 seconds |
| Repeated access (cached) | ✓ Pass | < 10ms from memory |
| Multiple tiles | ✓ Pass | LRU pruning works |
| Offline mode | ✓ Pass | Returns null gracefully |
| Network timeout | ✓ Pass | Continues operation |

## Integration with Other Modules

### With `hydrographyIndex.js`

```javascript
// Analyze elevation at river crossing points
const hydrographyIndex = new HydrographyIndex();
const demLoader = new DEMLoader();

const features = hydrographyIndex.search(propertyBbox);
const tileData = await demLoader.loadTile(10, 512, 512);

if (tileData) {
  features.forEach(feature => {
    if (feature.geometry.type === 'LineString') {
      const coords = feature.geometry.coordinates[0];
      const slope = await demLoader.getSlopeAtPoint(
        coords[0], coords[1], 
        tileData, tileMetadata
      );
      console.log(`${feature.properties.name}: ${slope}° slope`);
    }
  });
}
```

### With `storageManager.js`

```javascript
// Automatic persistence via storageManager
import { cacheDemTile, getCachedDemTile } from './storageManager.js';

const demLoader = new DEMLoader({ useCache: true });
const tile = await demLoader.loadTile(10, 512, 512);

// Automatically cached to IndexedDB by DEMLoader
// Later retrieval from cache
const cached = await getCachedDemTile('dem_10_512_512');
```

## Limitations

1. **GeoTIFF Decoding**: Current implementation returns mock elevation/slope. Production needs `geotiff.js` library for proper decoding.
2. **Remote Sources**: GEBCO/USGS URLs may change; requires maintenance.
3. **Coordinate System**: Assumes WGS84 (SRID:4326). Reprojection needed for local datums.
4. **Resolution**: Fixed 256×256 tiles. Multi-resolution tiles not supported.
5. **No Mesh Simplification**: Large tile requests not optimized; consider tiling strategy for huge properties.

## Testing

Comprehensive test suite in `tests/demLoader.test.js`:

```bash
npm run test -- tests/demLoader.test.js

# Run with coverage
npm run test:coverage
```

**Test Coverage:**
- Caching (memory + IndexedDB)
- Elevation and slope calculation
- Tile loading (timeout, fallback)
- Offline mode
- Performance benchmarks
- Cache statistics
- Integration workflows

## Error Handling

```javascript
const loader = new DEMLoader();

try {
  const tile = await loader.loadTile(10, 512, 512);
  
  if (!tile) {
    console.warn('DEM tile unavailable - using alternative data source');
    // Fallback: use lower-resolution DEM or skip analysis
  } else {
    // Process tile data
  }
} catch (error) {
  console.error('Unexpected error:', error);
  // Continue operation without DEM data
}
```

## Future Enhancements

1. **GeoTIFF Support**: Integrate `geotiff.js` for proper elevation decoding
2. **Cloud-Optimized GeoTIFF**: Use COG format for faster tile access
3. **Multi-Resolution**: Support 10m, 30m, 90m resolution selections
4. **Batch Loading**: Load multiple tiles concurrently
5. **Tile Validation**: Verify tile integrity and metadata
6. **Progressive Enhancement**: Show low-res while fetching high-res

## References

- **GEBCO**: https://www.gebco.net/ - Global Bathymetry and Topography
- **USGS 3DEP**: https://www.usgs.gov/3dep - US 3D Elevation Program
- **GeoTIFF**: https://www.geospatialworld.net/blogs/what-is-geotiff/ - GeoTIFF format
- **Web Mercator Tiles**: https://wiki.openstreetmap.org/wiki/Tiles - Tile coordinate system
