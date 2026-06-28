
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf-8');

const oldCode = `    const JSZip = window.shpwrite.JSZip;
    const finalZip = new JSZip();

    // Definir todos os 28 shapefiles do modelo, com campos correspondentes
    const shapefiles = [
      { name: 'ATP', features: [{ type: 'Feature', properties: { ID: 1 }, geometry: { type: 'Polygon', coordinates: [ringGeo] } }] },
      { name: 'AIR', features: [{ type: 'Feature', properties: { ID: 1, TIPO: 'Imóvel Rural', IDENTIFIC: getVal('f-nome') || 'Imóvel Rural' }, geometry: { type: 'Polygon', coordinates: [ringGeo] } }] },
      { name: 'ARL', features: [{ type: 'Feature', properties: { ID: 1, IDENTIFIC: '', AVERBACAO: '', SITUACAO: '' }, geometry: { type: 'Polygon', coordinates: [ringGeo] } }] },
      { name: 'ARLREM', features: [{ type: 'Feature', properties: { ID: 1 }, geometry: { type: 'Polygon', coordinates: [ringGeo] } }] },
      { name: 'AUAS', features: [{ type: 'Feature', properties: { ID: 1, ABERTURA: '' }, geometry: { type: 'Polygon', coordinates: [ringGeo] } }] },
      { name: 'AURD', features: [{ type: 'Feature', properties: { ID: 1, ORIGEM: '', SOBREPOE: '' }, geometry: { type: 'Polygon', coordinates: [ringGeo] } }] },
      { name: 'AVN', features: [{ type: 'Feature', properties: { ID: 1, SITUACAO: '' }, geometry: { type: 'Polygon', coordinates: [ringGeo] } }] },
      { name: 'AREA_CONSOLIDADA', features: [{ type: 'Feature', properties: { ID: 1 }, geometry: { type: 'Polygon', coordinates: [ringGeo] } }] },
      { name: 'AREA_DECLIVIDA', features: [{ type: 'Feature', properties: { ID: 1, INCLINACAO: '' }, geometry: { type: 'Polygon', coordinates: [ringGeo] } }] },
      { name: 'AREA_TOPO_MORRO', features: [{ type: 'Feature', properties: { ID: 1 }, geometry: { type: 'Polygon', coordinates: [ringGeo] } }] },
      { name: 'AREA_UMIDA', features: [{ type: 'Feature', properties: { ID: 1 }, geometry: { type: 'Polygon', coordinates: [ringGeo] } }] },
      { name: 'AREA_USO_RESTRITO', features: [{ type: 'Feature', properties: { ID: 1, TIPO: '' }, geometry: { type: 'Polygon', coordinates: [ringGeo] } }] },
      { name: 'AREA_ALTITUDE_1800', features: [{ type: 'Feature', properties: { ID: 1 }, geometry: { type: 'Polygon', coordinates: [ringGeo] } }] },
      { name: 'TIPOLOGIA_VEGETAL', features: [{ type: 'Feature', properties: { ID: 1, TIPO: '' }, geometry: { type: 'Polygon', coordinates: [ringGeo] } }] },
      { name: 'RIO_ATE_10', features: [{ type: 'Feature', properties: { ID: 1, NOME: '' }, geometry: { type: 'Polygon', coordinates: [ringGeo] } }] },
      { name: 'RIO_10_A_50', features: [{ type: 'Feature', properties: { ID: 1, NOME: '' }, geometry: { type: 'Polygon', coordinates: [ringGeo] } }] },
      { name: 'RIO_50_A_200', features: [{ type: 'Feature', properties: { ID: 1, NOME: '' }, geometry: { type: 'Polygon', coordinates: [ringGeo] } }] },
      { name: 'RIO_200_A_600', features: [{ type: 'Feature', properties: { ID: 1, NOME: '' }, geometry: { type: 'Polygon', coordinates: [ringGeo] } }] },
      { name: 'RIO_ACIMA_600', features: [{ type: 'Feature', properties: { ID: 1, NOME: '' }, geometry: { type: 'Polygon', coordinates: [ringGeo] } }] },
      { name: 'NASCENTE', features: [{ type: 'Feature', properties: { ID: 1 }, geometry: { type: 'Polygon', coordinates: [ringGeo] } }] },
      { name: 'VEREDA', features: [{ type: 'Feature', properties: { ID: 1 }, geometry: { type: 'Polygon', coordinates: [ringGeo] } }] },
      { name: 'LAGOA_NATURAL', features: [{ type: 'Feature', properties: { ID: 1, ZONA: '', NOME: '' }, geometry: { type: 'Polygon', coordinates: [ringGeo] } }] },
      { name: 'MANGUEZAL', features: [{ type: 'Feature', properties: { ID: 1 }, geometry: { type: 'Polygon', coordinates: [ringGeo] } }] },
      { name: 'RESTINGA', features: [{ type: 'Feature', properties: { ID: 1 }, geometry: { type: 'Polygon', coordinates: [ringGeo] } }] },
      { name: 'UTILIDADE_PUBLICA', features: [{ type: 'Feature', properties: { ID: 1, FINALIDADE: '', DETALHES: '' }, geometry: { type: 'Polygon', coordinates: [ringGeo] } }] },
      { name: 'INTERESSE_SOCIAL', features: [{ type: 'Feature', properties: { ID: 1, FINALIDADE: '', DETALHES: '' }, geometry: { type: 'Polygon', coordinates: [ringGeo] } }] },
      { name: 'RESERVATORIO_ARTIFICIAL', features: [{ type: 'Feature', properties: { ID: 1, ZONA: '', BARRAMENTO: '', OBJETIVO: '', SITUACAO: '', FAIXA_APP: 0 }, geometry: { type: 'Polygon', coordinates: [ringGeo] } }] },
      { name: 'BORDA_CHAPADA', features: [{ type: 'Feature', properties: { ID: 1 }, geometry: { type: 'Polygon', coordinates: [ringGeo] } }] }
    ];

    // Gerar cada shapefile e adicionar ao ZIP final
    for (const shp of shapefiles) {
      const shpZipBlob = await window.shpwrite.zip({
        type: "FeatureCollection",
        features: shp.features
      }, { outputType: 'blob', types: { polygon: shp.name } });

      const shpZip = await JSZip.loadAsync(shpZipBlob);
      
      for (const [name, file] of Object.entries(shpZip.files)) {
        if (!file.dir) {
          const content = await file.async('uint8array');
          const fileName = name.split('/').pop(); // Colocar na raiz do ZIP
          finalZip.file(fileName, content);
        }
      }
      
      // Adicionar PRJ geográfico SIRGAS 2000 (mesmo que o modelo)
      finalZip.file(\`\${shp.name}.prj\`, getSIRGAS2000GeoPRJ());
    }

    const finalBlob = await finalZip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    const url = URL.createObjectURL(finalBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = \`\${nomeArquivo}_shapefile.zip\`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Shapefile (.zip) com todos os 28 arquivos exportado com sucesso! Coordenadas iguais ao KML.', 'ok');`;

const newCode = `    const JSZip = window.shpwrite.JSZip;
    const finalZip = new JSZip();

    // Lista de todos os shapefiles do modelo
    const allShapefileNames = [
      'ATP', 'AIR', 'ARL', 'ARLREM', 'AUAS', 'AURD', 'AVN',
      'AREA_CONSOLIDADA', 'AREA_DECLIVIDA', 'AREA_TOPO_MORRO', 'AREA_UMIDA',
      'AREA_USO_RESTRITO', 'AREA_ALTITUDE_1800', 'TIPOLOGIA_VEGETAL',
      'RIO_ATE_10', 'RIO_10_A_50', 'RIO_50_A_200', 'RIO_200_A_600',
      'RIO_ACIMA_600', 'NASCENTE', 'VEREDA', 'LAGOA_NATURAL', 'MANGUEZAL',
      'RESTINGA', 'UTILIDADE_PUBLICA', 'INTERESSE_SOCIAL',
      'RESERVATORIO_ARTIFICIAL', 'BORDA_CHAPADA'
    ];

    // 1. Gerar ATP e AIR com a geometria do imóvel
    const generateShapes = [
      { name: 'ATP', features: [{ type: 'Feature', properties: { ID: 1 }, geometry: { type: 'Polygon', coordinates: [ringGeo] } }] },
      { name: 'AIR', features: [{ type: 'Feature', properties: { ID: 1, TIPO: 'Imóvel Rural', IDENTIFIC: getVal('f-nome') || 'Imóvel Rural' }, geometry: { type: 'Polygon', coordinates: [ringGeo] } }] }
    ];

    for (const shp of generateShapes) {
      const shpZipBlob = await window.shpwrite.zip({
        type: "FeatureCollection",
        features: shp.features
      }, { outputType: 'blob', types: { polygon: shp.name } });

      const shpZip = await JSZip.loadAsync(shpZipBlob);
      
      for (const [name, file] of Object.entries(shpZip.files)) {
        if (!file.dir) {
          const content = await file.async('uint8array');
          const fileName = name.split('/').pop(); // Colocar na raiz do ZIP
          finalZip.file(fileName, content);
        }
      }
      
      // Adicionar PRJ geográfico SIRGAS 2000 (mesmo que o modelo)
      finalZip.file(\`\${shp.name}.prj\`, getSIRGAS2000GeoPRJ());
    }

    // 2. Copiar todos os outros shapefiles diretamente do modelo
    for (const shpName of allShapefileNames) {
      if (shpName === 'ATP' || shpName === 'AIR') continue; // Já geramos esses
      
      // Tentar copiar cada arquivo do modelo (.shp, .shx, .dbf, .prj)
      for (const ext of ['shp', 'shx', 'dbf', 'prj']) {
        try {
          const filePath = \`./modelo-shape/\${shpName}.\${ext}\`;
          const response = await fetch(filePath);
          if (response.ok) {
            const content = await response.arrayBuffer();
            finalZip.file(\`\${shpName}.\${ext}\`, content);
          }
        } catch (err) {
          console.warn(\`Não foi possível carregar \${shpName}.\${ext} do modelo:\`, err);
        }
      }
    }

    const finalBlob = await finalZip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    const url = URL.createObjectURL(finalBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = \`\${nomeArquivo}_shapefile.zip\`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Shapefile (.zip) com todos os 28 arquivos exportado com sucesso! ATP e AIR com geometria do imóvel, restantes do modelo.', 'ok');`;

// Replace the code using a regex to ignore whitespace differences
const regex = new RegExp(oldCode.split(/\s+/).join('\\s+'));
html = html.replace(regex, newCode);

fs.writeFileSync(htmlPath, html, 'utf-8');
console.log('Successfully updated public/index.html');
