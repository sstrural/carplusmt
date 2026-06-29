
const fs = require('fs');
const pdf = require('pdf-parse');

async function main() {
  const pdfPath = 'C:\\Users\\SSTECNOL\\Desktop\\CAR\\MANUAL DE OPERACAO DO SIMCAR - CADASTRO.pdf';
  
  try {
    console.log('Extraindo texto do PDF...');
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdf(dataBuffer);
    
    console.log('Texto extraído com sucesso!');
    fs.writeFileSync('manual-simcar-texto.txt', data.text, 'utf8');
    console.log('Texto completo salvo em manual-simcar-texto.txt');
    
    // Análise de seções importantes
    console.log('\n\n=== ANÁLISE RÁPIDA DO MANUAL DO SIMCAR ===');
    
    const texto = data.text;
    
    // Procurar seções relevantes
    const secoes = [
      { nome: 'Dados do Imóvel Rural', pattern: /(Dados do Imóvel Rural|Imóvel Rural).*?(?=\n\s*[A-Z])/gis },
      { nome: 'Coordenadas', pattern: /(Coordenadas|UTM|Latitude|Longitude).*?(?=\n\s*[A-Z])/gis },
      { nome: 'Shapefile', pattern: /(Shapefile|Shp|Arquivo.*Shape).*?(?=\n\s*[A-Z])/gis },
      { nome: 'Validação', pattern: /(Validação|Verificação|Erro).*?(?=\n\s*[A-Z])/gis },
      { nome: 'Documentos', pattern: /(Documento|Memorial|ART|Matrícula).*?(?=\n\s*[A-Z])/gis },
      { nome: 'Proprietário', pattern: /(Proprietário|Titular|CPF|CNPJ).*?(?=\n\s*[A-Z])/gis }
    ];
    
    secoes.forEach(secao => {
      const matches = texto.match(secao.pattern);
      if (matches && matches.length > 0) {
        console.log(`\n--- ${secao.nome} ---`);
        console.log(matches[0].slice(0, 800).trim() + '...\n');
      }
    });
    
  } catch (err) {
    console.error('Erro:', err);
  }
}

main();
