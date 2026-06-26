
const fs = require('fs');
const path = require('path');
const { DBFFile } = require('dbffile');

async function readDBF(name, folder = 'temp-modelo') {
  const dbfPath = path.join(__dirname, folder, name + '.dbf');
  
  console.log('\n=== DBF structure for', name, 'from', folder, ' ===');
  
  try {
    let dbf = await DBFFile.open(dbfPath);
    console.log('DBF fields:', JSON.stringify(dbf.fields, null, 2));
    console.log('Record count:', dbf.recordCount);
    console.log('\nRecords:');
    let records = await dbf.readRecords();
    for (let rec of records) {
      console.log(JSON.stringify(rec, null, 2));
    }
  } catch (err) {
    console.error('Error reading DBF', name, ':', err);
  }
}

async function run() {
  const shapes = ['ATP', 'AIR', 'AREA_CONSOLIDADA', 'TIPOLOGIA_VEGETAL', 'ARL', 'NASCENTE'];
  // Ler DBF dos shapefiles modelo
  console.log('--- Reading from modelo-shape ---');
  for (const s of shapes) {
    await readDBF(s, 'modelo-shape');
  }
}

run();
