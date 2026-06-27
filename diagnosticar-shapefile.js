
const fs = require('fs');
const path = require('path');
const shapefile = require('shapefile');

// WKT para os fusos UTM do MT
const WKT = {
  '20S': 'PROJCS["SIRGAS_2000_UTM_Zone_20S",GEOGCS["GCS_SIRGAS_2000",DATUM["D_SIRGAS_2000",SPHEROID["GRS_1980",6378137.0,298.257222101]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",500000.0],PARAMETER["False_Northing",10000000.0],PARAMETER["Central_Meridian",-63.0],PARAMETER["Scale_Factor",0.9996],PARAMETER["Latitude_Of_Origin",0.0],UNIT["Meter",1.0]]',
  '21S': 'PROJCS["SIRGAS_2000_UTM_Zone_21S",GEOGCS["GCS_SIRGAS_2000",DATUM["D_SIRGAS_2000",SPHEROID["GRS_1980",6378137.0,298.257222101]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",500000.0],PARAMETER["False_Northing",10000000.0],PARAMETER["Central_Meridian",-57.0],PARAMETER["Scale_Factor",0.9996],PARAMETER["Latitude_Of_Origin",0.0],UNIT["Meter",1.0]]',
  '22S': 'PROJCS["SIRGAS_2000_UTM_Zone_22S",GEOGCS["GCS_SIRGAS_2000",DATUM["D_SIRGAS_2000",SPHEROID["GRS_1980",6378137.0,298.257222101]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",500000.0],PARAMETER["False_Northing",10000000.0],PARAMETER["Central_Meridian",-51.0],PARAMETER["Scale_Factor",0.9996],PARAMETER["Latitude_Of_Origin",0.0],UNIT["Meter",1.0]]'
};

async function diagnosticar(shapefilePath) {
  const prjPath = shapefilePath.replace('.shp', '.prj');
  const shpBase = path.basename(shapefilePath, '.shp');
  
  console.log('=== DIAGNÓSTICO DO SHAPEFILE ===');
  console.log('Arquivo:', shpBase);
  console.log('');
  
  // 1. Verificar arquivo .prj
  if (fs.existsSync(prjPath)) {
    const prjContent = fs.readFileSync(prjPath, 'utf8').trim();
    console.log('📄 Arquivo .prj encontrado');
    console.log('Conteúdo:', prjContent.substring(0, 150) + (prjContent.length > 150 ? '...' : ''));
    
    // Verificar qual fuso é
    if (prjContent.includes('20S')) console.log('🔍 Detectado: Fuso 20S');
    else if (prjContent.includes('21S')) console.log('🔍 Detectado: Fuso 21S');
    else if (prjContent.includes('22S')) console.log('🔍 Detectado: Fuso 22S');
    else if (prjContent.includes('GEOGCS')) console.log('⚠️  AVISO: Arquivo .prj está em coordenadas geográficas (graus), não UTM projetadas!');
    else console.log('❓ Fuso não identificado no .prj');
  } else {
    console.log('⚠️  AVISO: Arquivo .prj NÃO encontrado!');
  }
  console.log('');
  
  // 2. Ler o shapefile e verificar coordenadas
  try {
    const source = await shapefile.open(shapefilePath);
    console.log('🔍 Lendo geometria...');
    
    let firstFeature = true;
    let allCoordinates = [];
    
    while (true) {
      const result = await source.read();
      if (result.done) break;
      
      const feature = result.value;
      if (firstFeature) {
        firstFeature = false;
        console.log('Tipo de geometria:', feature.geometry.type);
      }
      
      // Coletar todas as coordenadas
      const coords = flattenCoordinates(feature.geometry.coordinates);
      allCoordinates.push(...coords);
    }
    
    if (allCoordinates.length > 0) {
      // Calcular bounding box
      const bbox = calculateBBox(allCoordinates);
      console.log('');
      console.log('📊 Bounding Box das coordenadas:');
      console.log('  Min X (E):', bbox.minX.toFixed(2));
      console.log('  Max X (E):', bbox.maxX.toFixed(2));
      console.log('  Min Y (N):', bbox.minY.toFixed(2));
      console.log('  Max Y (N):', bbox.maxY.toFixed(2));
      
      // Adivinhar o fuso com base nas coordenadas UTM
      const detectedZone = detectZoneFromUTM(bbox);
      console.log('');
      console.log('🧭 Fuso UTM sugerido com base nas coordenadas:', detectedZone);
      
      if (detectedZone === '21S') {
        console.log('✅ Isso corresponde ao memorial descritivo (Fazenda Novo Sobradinho, Sapezal/MT)');
      } else {
        console.log('⚠️  Verifique se este é o fuso correto!');
      }
    }
    
  } catch (err) {
    console.error('❌ Erro ao ler shapefile:', err.message);
  }
}

function flattenCoordinates(coords) {
  const flat = [];
  function walk(arr) {
    if (arr.length === 2 && typeof arr[0] === 'number') {
      flat.push(arr);
    } else {
      arr.forEach(walk);
    }
  }
  walk(coords);
  return flat;
}

function calculateBBox(coords) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  coords.forEach(([x, y]) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  });
  return { minX, minY, maxX, maxY };
}

function detectZoneFromUTM(bbox) {
  // Coordenadas UTM típicas para MT:
  // 20S: E ~ 100.000-300.000, N ~ 8.000.000-9.000.000
  // 21S: E ~ 200.000-400.000, N ~ 8.000.000-9.000.000
  // 22S: E ~ 300.000-500.000, N ~ 8.000.000-9.000.000
  
  const avgE = (bbox.minX + bbox.maxX) / 2;
  
  if (avgE < 200000) return '20S';
  if (avgE < 400000) return '21S';
  return '22S';
}

function corrigirPrj(shapefilePath, zona = '21S') {
  const prjPath = shapefilePath.replace('.shp', '.prj');
  console.log('');
  console.log('✏️  Corrigindo arquivo .prj para fuso', zona);
  fs.writeFileSync(prjPath, WKT[zona], 'utf8');
  console.log('✅ Arquivo .prj atualizado com sucesso!');
  console.log('   WKT:', WKT[zona].substring(0, 100) + '...');
}

// Uso
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Uso:');
  console.log('  Diagnosticar: node diagnosticar-shapefile.js <caminho-para-arquivo.shp>');
  console.log('  Corrigir:    node diagnosticar-shapefile.js <caminho-para-arquivo.shp> --corrigir <20S|21S|22S>');
  console.log('');
  console.log('Exemplos:');
  console.log('  node diagnosticar-shapefile.js ./meu-imovel.shp');
  console.log('  node diagnosticar-shapefile.js ./meu-imovel.shp --corrigir 21S');
} else {
  const shpPath = args[0];
  if (args.includes('--corrigir')) {
    const zonaIdx = args.indexOf('--corrigir') + 1;
    const zona = args[zonaIdx] || '21S';
    diagnosticar(shpPath).then(() => corrigirPrj(shpPath, zona));
  } else {
    diagnosticar(shpPath);
  }
}
