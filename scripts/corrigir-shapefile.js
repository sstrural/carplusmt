
const fs = require('fs');
const path = require('path');

// WKT para SIRGAS 2000 / UTM zone 21S (EPSG:31981)
const WKT_31981 = 'PROJCS["SIRGAS_2000_UTM_Zone_21S",GEOGCS["GCS_SIRGAS_2000",DATUM["D_SIRGAS_2000",SPHEROID["GRS_1980",6378137.0,298.257222101]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",500000.0],PARAMETER["False_Northing",10000000.0],PARAMETER["Central_Meridian",-57.0],PARAMETER["Scale_Factor",0.9996],PARAMETER["Latitude_Of_Origin",0.0],UNIT["Meter",1.0]]';

function corrigirPrj(shapefilePath) {
  const prjPath = shapefilePath.replace('.shp', '.prj');
  
  if (!fs.existsSync(prjPath)) {
    console.log(`Arquivo .prj não encontrado em ${prjPath}`);
    return;
  }
  
  const conteudoAtual = fs.readFileSync(prjPath, 'utf8');
  console.log('Conteúdo atual do .prj:', conteudoAtual);
  
  console.log('\nAtualizando para SIRGAS 2000 / UTM Zone 21S (EPSG:31981)...');
  fs.writeFileSync(prjPath, WKT_31981, 'utf8');
  
  console.log('✓ Arquivo .prj corrigido com sucesso!');
}

// Uso: node corrigir-shapefile.js caminho/para/arquivo.shp
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Uso: node corrigir-shapefile.js <caminho-do-shapefile>');
  console.log('Exemplo: node corrigir-shapefile.js ./modelo-shape/AIR.shp');
} else {
  corrigirPrj(args[0]);
}
