# APP/RL Calculator - Implementation Guide

## Project Structure

```
project-root/
├── src/
│   ├── modules/
│   │   └── apprlcalculator/      # Core APP/RL calculation engine
│   │       └── index.js
│   ├── workers/                  # Web Workers for heavy computations
│   │   └── appCalculationWorker.js
│   └── utils/                    # Utility functions
│       ├── geometryUtils.js      # Geometry operations (Turf.js)
│       └── storageManager.js     # IndexedDB data persistence
├── public/
│   └── data/                     # Pre-loaded data (IBGE hydrography, etc.)
├── tests/                        # Test files
│   └── setup.test.js
├── .eslintrc.json                # ESLint configuration
├── vitest.config.js              # Vitest configuration
└── package.json                  # Project dependencies and scripts
```

## Installation & Setup

### 1. Install Dependencies
```bash
npm install
```

All required dependencies are installed:
- **turf.js** - Geographic spatial analysis
- **rbush** - Spatial indexing (R-tree)
- **jspdf** - PDF generation
- **geotiff** - GeoTIFF reading for DEM
- **leaflet** - Map visualization
- **pako** - Data compression
- **vitest** - Test runner
- **eslint** - Code linting

### 2. Verify Installation

Run the test suite to validate setup:
```bash
npm test
```

Expected output:
```
✓ tests/setup.test.js (4)
  ✓ Project Setup Validation (4)
    ✓ should verify module structure is initialized
    ✓ should have correct version
    ✓ should verify ES6 module syntax works
    ✓ should have directories structure

Test Files: 1 passed (1)
Tests: 4 passed (4)
```

### 3. Lint Code

Check code quality:
```bash
npm run lint
```

Auto-fix issues:
```bash
npm run lint:fix
```

## Available Scripts

```bash
# Testing
npm test                 # Run tests once
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report
npm run test:pbt        # Run property-based tests only

# Linting
npm run lint            # Check code style
npm run lint:fix        # Auto-fix code style issues

# Building
npm run build           # Production build (minified)
npm run build:watch     # Development build with watch
npm run build:apprl     # Build APP/RL calculator module
npm run dev             # Development build

```

## Core Modules

### geometryUtils.js
Utility functions for geometric operations using Turf.js:
- `createBuffer()` - Create buffers around geometries
- `calculateArea()` - Calculate area in hectares
- `getIntersection()` - Find intersection between geometries
- `unionGeometries()` - Merge multiple geometries

### storageManager.js
IndexedDB management for offline data:
- `initDB()` - Initialize database
- `storeHydrography()` / `loadHydrography()` - Manage hydrography data
- `cacheDemTile()` / `getCachedDemTile()` - DEM tile caching
- `saveCalculation()` / `getAllCalculations()` - Store calculation history
- `saveConfig()` / `getConfig()` - Application configuration

### appCalculationWorker.js
Web Worker for offloading heavy computations:
- Receives messages from main thread
- Performs APP/RL calculations
- Returns results without blocking UI

## Console Output for Validation

When the application initializes, you should see:

```javascript
console.log output:
✓ APP/RL Calculator module initialized
✓ Geometry utilities module initialized
✓ Geometry utilities ready
✓ Storage manager module initialized
✓ Storage manager ready
✓ APP Calculation Worker initialized
✓ APP Calculation Worker ready
```

## Status

✅ **Task 1.1 Complete:**
- ✅ Directory structure created
- ✅ Dependencies installed (turf.js, rbush, jspdf, geotiff)
- ✅ Build scripts configured (esbuild)
- ✅ Test runner configured (Vitest)
- ✅ Linter configured (ESLint)
- ✅ `npm install` successful
- ✅ Tests passing (4/4)
- ✅ Code linting validated

## Next Steps (Task 1.2-1.5)

1. **1.2**: Implement IndexedDB schema and CRUD operations
2. **1.3**: Load and bundle MT hidrography data (IBGE 1:50k GeoJSON)
3. **1.4**: Implement RBush spatial indexing for watercourse queries
4. **1.5**: Add DEM tile loading and caching system

## Notes

- All modules support ES6+ syntax
- IndexedDB used for offline-first architecture
- Web Workers handle heavy computations
- Turf.js provides geographic calculations
- ESLint enforces code consistency
- Vitest provides fast test execution
