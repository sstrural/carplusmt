
const fs = require('fs');
const path = require('path');
const shapefile = require('shapefile');

const modelDir = path.join(__dirname, 'modelo-shape');
const outputPath = path.join(__dirname, 'model-analysis.json');

async function main() {
  console.log('Analyzing model shapefiles in:', modelDir);
  
  const files = fs.readdirSync(modelDir);
  const shpFiles = files.filter(f => f.endsWith('.shp'));
  
  const results = {};
  
  for (const file of shpFiles) {
    const name = path.basename(file, '.shp');
    console.log(`\n--- ${name} ---`);
    
    try {
      const source = await shapefile.open(path.join(modelDir, file));
      const features = [];
      
      let result;
      while (!(result = await source.read()).done) {
        features.push(result.value);
      }
      
      console.log(`Number of features: ${features.length}`);
      if (features.length > 0) {
        console.log(`Geometry type: ${features[0].geometry.type}`);
        console.log(`Properties: ${Object.keys(features[0].properties)}`);
        console.log('Sample properties:', features[0].properties);
      }
      
      // Also check for .dbf to get field types
      const dbfPath = path.join(modelDir, `${name}.dbf`);
      if (fs.existsSync(dbfPath)) {
        console.log('DBF file exists');
      }
      
      // Check for .prj
      const prjPath = path.join(modelDir, `${name}.prj`);
      if (fs.existsSync(prjPath)) {
        const prjContent = fs.readFileSync(prjPath, 'utf-8');
        console.log('PRJ file exists:', prjContent.substring(0, 100) + '...');
      }
      
      results[name] = {
        featureCount: features.length,
        geometryType: features.length > 0 ? features[0].geometry.type : null,
        properties: features.length > 0 ? Object.keys(features[0].properties) : [],
        sampleFeature: features.length > 0 ? features[0] : null
      };
      
    } catch (err) {
      console.error(`Error analyzing ${file}:`, err.message);
      results[name] = { error: err.message };
    }
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\nFull analysis saved to ${outputPath}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
