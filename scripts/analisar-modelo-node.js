const shapefile = require('shapefile');
const fs = require('fs');
const path = require('path');

const modelDir = 'modelo-shape';
const output = [];

async function analyzeAllShapefiles() {
  const files = fs.readdirSync(modelDir);
  const shpFiles = files.filter(f => f.endsWith('.shp'));

  for (const shpName of shpFiles) {
    const shpPath = path.join(modelDir, shpName);
    try {
      const source = await shapefile.open(shpPath);
      const features = [];
      
      let result;
      while (!(result = await source.read()).done) {
        features.push(result.value);
      }

      const info = {
        name: shpName.replace('.shp', ''),
        geometryType: features.length > 0 ? features[0].geometry.type : null,
        propertiesSchema: features.length > 0 ? Object.keys(features[0].properties) : [],
        numFeatures: features.length,
        sample: features.slice(0, 1)
      };
      output.push(info);
      console.log(`✓ Analyzed: ${shpName}`);
    } catch (err) {
      console.error(`✗ Error analyzing ${shpName}:`, err.message);
    }
  }

  fs.writeFileSync('modelo-shape-analysis.json', JSON.stringify(output, null, 2), 'utf-8');
  console.log('\n📊 Analysis saved to modelo-shape-analysis.json!');
}

analyzeAllShapefiles();