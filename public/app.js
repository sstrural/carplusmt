if (window.location.protocol.startsWith('http')) {
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = './manifest.json';
    document.head.appendChild(link);
  }
</script>
<meta name="theme-color" content="#1b3a2d">
<link rel="stylesheet" href="styles.css">
</head>
<body>

<header class="header">
  <div class="header-inner">
    <div class="logo">
      <svg class="logo-mark" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="45" fill="#1b3a2d"/>
        <circle cx="50" cy="50" r="35" fill="none" stroke="#c49a3c" stroke-width="5"/>
<path d="M35 50 L50 35 L65 50 L50 65 Z" fill="#c49a3c"/>
      </svg>
      <div>
        <div class="logo-name">CAR-MT Analisador</div>
        <div class="logo-sub">Memorial Descritivo · SIMCAR · Mato Grosso</div>
      </div>
    </div>
    <div style="display: flex; align-items: center; gap: 1rem;">
      <button onclick="reconfigureAPI()" style="background: transparent; border: 1px solid rgba(255,255,255,.2); color: rgba(255,255,255,.7); padding: 4px 8px; border-radius: 4px; font-size: .7rem; cursor: pointer;">⚙️ Config</button>
      <div class="header-tag">SEMA-MT · SIMCAR</div>
    </div>
  </div>
</header>

<main class="main">

  <!-- STEPPER -->
  <div class="stepper">
    <div class="step-item active" id="st-1"><span class="sn">Etapa 1</span>Importar</div>
    <div class="step-item" id="st-2"><span class="sn">Etapa 2</span>Revisar</div>
    <div class="step-item" id="st-3"><span class="sn">Etapa 3</span>Relatório</div>
  </div>

  <!-- ── PAINEL 1: UPLOAD ── -->
  <div id="panel-upload" class="panel visible">

    <div class="drop-zone" id="drop-zone">
      <span class="dz-icon">📂</span>
      <div class="dz-title">Importe o Memorial Descritivo, ART ou Shapefile</div>
      <div class="dz-sub">
        Arraste os arquivos aqui ou clique para selecionar.<br>
        Importe um shapefile para usar suas coordenadas diretamente.
      </div>
      <div class="format-chips">
        <span class="chip">PDF</span>
        <span class="chip">DOCX</span>
        <span class="chip">TXT</span>
        <span class="chip">SHP</span>
        <span class="chip">ZIP</span>
      </div>
      <input type="file" id="file-input" accept=".pdf,.docx,.doc,.txt,.shp,.dbf,.shx,.prj,.zip" multiple>
    </div>

    <div class="divider">ou</div>
    <button class="btn-ghost" onclick="goToForm()">✏️ Preencher dados manualmente</button>

    <!-- Processing -->
    <div class="processing" id="proc-upload" style="margin-top:1.5rem">
      <div class="spinner"></div>
      <div class="proc-title">Lendo e interpretando o memorial...</div>
      <div class="proc-sub">A IA está extraindo dados, coordenadas e calculando o KML</div>
      <div class="proc-steps">
        <div class="proc-step" id="ps-0"><div class="dot"></div>Lendo arquivo...</div>
        <div class="proc-step" id="ps-1"><div class="dot"></div>Extraindo texto do documento...</div>
        <div class="proc-step" id="ps-2"><div class="dot"></div>Identificando coordenadas UTM...</div>
        <div class="proc-step" id="ps-3"><div class="dot"></div>Extraindo dados do imóvel e responsáveis...</div>
        <div class="proc-step" id="ps-4"><div class="dot"></div>Calculando extremos e gerando KML...</div>
        <div class="proc-step" id="ps-5"><div class="dot"></div>Preenchendo formulário...</div>
      </div>
    </div>

  </div>

  <!-- ── PAINEL 2: FORMULÁRIO ── -->
  <div id="panel-form" class="panel">

    <div id="file-badge"></div>

    <!-- Memorial -->
    <div class="card">
      <div class="card-head">Texto do Memorial Descritivo</div>
      <div class="card-body">
        <label>Conteúdo extraído do arquivo</label>
        <textarea id="f-memorial" placeholder="Cole ou edite aqui o texto completo do memorial descritivo..."></textarea>
        <p class="field-hint">Texto extraído automaticamente. Edite para corrigir OCR ou complementar se necessário.</p>
      </div>
    </div>

    <!-- Imóvel -->
    <div class="card">
      <div class="card-head">Dados do Imóvel</div>
      <div class="card-body">
        <div class="form-section-title">Identificação</div>
        <div class="grid-2">
          <div class="col-full">
            <label>Nome do Imóvel</label>
            <input id="f-nome" placeholder="Nome da propriedade rural">
          </div>
          <div><label>Município/UF</label><input id="f-municipio" placeholder="Município/UF"></div>
          <div><label>Área (ha)</label><input id="f-area" placeholder="0,0000"></div>
          <div><label>Perímetro (m)</label><input id="f-perimetro" placeholder="0,00"></div>
          <div><label>Matrícula</label><input id="f-matricula" placeholder="Número"></div>
          <div><label>CCIR</label><input id="f-ccir" placeholder="Código"></div>
          <div><label>CNS / Código INCRA</label><input id="f-cns" placeholder="Código"></div>
          <div>
            <label>Datum / Fuso UTM</label>
            <select id="f-datum">
              <option value="SIRGAS2000_20S">SIRGAS2000 – Fuso 20S (MC 63°W)</option>
              <option value="SIRGAS2000_21S" selected>SIRGAS2000 – Fuso 21S (MC 57°W)</option>
              <option value="SIRGAS2000_22S">SIRGAS2000 – Fuso 22S (MC 51°W)</option>
              <option value="SAD69_21S">SAD69 – Fuso 21S</option>
            </select>
          </div>
          <div>
            <label>Bioma</label>
            <select id="f-bioma">
              <option value="cerr" selected>Cerrado (35% RL mínima)</option>
              <option value="amz">Amazônia (80% RL mínima)</option>
            </select>
          </div>
          <div>
            <label>Área de Vegetação Nativa Existente (ha)</label>
            <input id="f-vegetacao-existente" type="number" placeholder="0,00">
            <p class="field-hint">Área de vegetação nativa que já existe no imóvel</p>
          </div>
          <div class="col-full">
            <label>Confrontantes</label>
            <input id="f-confrontantes" placeholder="Descreva os confrontantes">
          </div>
        </div>

        <div class="form-section-title">Módulo Fiscal e Porte</div>
        <div class="grid-2">
          <div>
            <label>Módulo Fiscal Municipal (ha)</label>
            <input id="f-modulo" type="number" value="75" min="1" max="500">
            <p class="field-hint">Sapezal/MT = 75 ha · Sorriso/MT = 75 ha · Sinop/MT = 80 ha</p>
          </div>
          <div>
            <label>Tipo de Domínio</label>
            <select id="f-tipo">
              <option value="rural_privado">Rural Privado</option>
              <option value="assentamento">Assentamento</option>
              <option value="quilombola">Quilombola</option>
              <option value="indigena">Indígena</option>
            </select>
          </div>
          <div>
            <label>Finalidade do CAR</label>
            <select id="f-finalidade">
              <option value="usucapiao">Usucapião</option>
              <option value="registro">Registro / Matrícula</option>
              <option value="regularizacao">Regularização Fundiária</option>
              <option value="car_novo">CAR Novo</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Proprietário -->
    <div class="card">
      <div class="card-head">Proprietário / Interessado</div>
      <div class="card-body">
        <div class="grid-2">
          <div class="col-full"><label>Nome Completo</label><input id="f-prop-nome" placeholder="Nome Completo"></div>
          <div><label>CPF</label><input id="f-prop-cpf" placeholder="000.000.000-00"></div>
          <div><label>E-mail (opcional)</label><input id="f-prop-email" type="email" placeholder="email@dominio.com.br"></div>
          <div><label>Telefone (opcional)</label><input id="f-prop-tel" placeholder="(66) 9 0000-0000"></div>
        </div>
      </div>
    </div>

    <!-- Engenheiro -->
    <div class="card">
      <div class="card-head">Engenheiro Responsável pelo Georreferenciamento</div>
      <div class="card-body">
        <div class="grid-2">
          <div class="col-full"><label>Nome Completo</label><input id="f-eng-nome" placeholder="Nome Completo"></div>
          <div><label>CREA</label><input id="f-eng-crea" placeholder="Registro do CREA"></div>
          <div><label>Código INCRA</label><input id="f-eng-incra" placeholder="Código"></div>
          <div><label>ART Nº</label><input id="f-eng-art" placeholder="Número da ART"></div>
          <div><label>Data do Levantamento</label><input id="f-eng-data" type="date"></div>
          <div><label>Local do Levantamento</label><input id="f-eng-local" placeholder="Cidade/UF"></div>
        </div>
      </div>
    </div>

    <!-- Responsável CAR -->
    <div class="card">
      <div class="card-head">Responsável Técnico pelo CAR</div>
      <div class="card-body">
        <p class="field-hint" style="margin-bottom:.8rem">Profissional habilitado que assina o preenchimento no SIMCAR. Pode ser o mesmo engenheiro.</p>
        <div class="grid-2">
          <div class="col-full"><label>Nome Completo</label><input id="f-resp-nome" placeholder="Nome do responsável pelo CAR"></div>
          <div><label>CPF</label><input id="f-resp-cpf" placeholder="000.000.000-00"></div>
          <div><label>Conselho / Registro</label><input id="f-resp-conselho" placeholder="Conselho/Registro"></div>
        </div>
      </div>
    </div>

    <!-- Coordenadas SIMCAR -->
    <div class="card">
      <div class="card-head">Coordenadas para o SIMCAR — Área de Abrangência</div>
      <div class="card-body">
        <p class="field-hint" style="margin-bottom:.8rem">
          Calculadas automaticamente a partir dos vértices extremos do memorial (graus decimais, SIRGAS2000).
          Verifique se estão dentro de Mato Grosso antes de prosseguir.
        </p>
        <div class="grid-2">
          <div>
            <label>Inferior Esquerda · Longitude</label>
            <input id="f-inf-lon" placeholder="-58.848416">
          </div>
          <div>
            <label>Inferior Esquerda · Latitude</label>
            <input id="f-inf-lat" placeholder="-13.192708">
          </div>
          <div>
            <label>Superior Direita · Longitude</label>
            <input id="f-sup-lon" placeholder="-58.811384">
          </div>
          <div>
            <label>Superior Direita · Latitude</label>
            <input id="f-sup-lat" placeholder="-13.168352">
          </div>
        </div>
      </div>
    </div>

    <!-- VALIDAÇÃO GEOMÉTRICA -->
    <div class="card" id="validacao-geometrica" style="display:none">
      <div class="card-head">Validação Geométrica — Eliminar Rejeições SIGEF</div>
      <div class="card-body" id="validacao-content">
        <!-- Conteúdo será preenchido pelo JavaScript -->
      </div>
    </div>

    <div class="btn-row">
      <button class="btn-secondary" onclick="goToUpload()">← Voltar</button>
      <button class="btn-primary" id="btn-analisar" onclick="analisar()">
        <span>🔍</span><span>Gerar Relatório + KML</span>
      </button>
    </div>

    <div class="processing" id="proc-analise" style="margin-top:1.5rem">
      <div class="spinner"></div>
      <div class="proc-title">Validando e gerando relatório...</div>
      <div class="proc-sub">Verificando completude dos dados para o SIMCAR</div>
    </div>

  </div>

  <!-- ── PAINEL 3: RESULTADO ── -->
  <div id="panel-result" class="panel"></div>

</main>

<div class="toast" id="toast"></div>

<!-- VENDOR SCRIPTS -->
<script src="./vendor/jspdf.umd.min.js"></script>

<!-- APP SCRIPT -->
<script src="./app.js"></script>

<!-- CONFIG MODAL -->
<div class="config-overlay" id="config-overlay">
  <div class="config-modal">
    <div class="config-title">
      <span>⚙️</span> Configurações
    </div>
    
    <!-- Tabs -->
    <div class="config-tabs">
      <button class="config-tab active" onclick="showConfigTab('api')">API Key</button>
      <button class="config-tab" onclick="showConfigTab('branding')">Branding</button>
    </div>
    
    <!-- API Key Tab -->
    <div id="config-tab-api" class="config-tab-content">
      <div class="config-subtitle">
        Para usar o CAR-MT Analisador, você precisa de uma API key gratuita do Groq para processar os memoriais descritivos com IA.
      </div>
      <input 
        type="password" 
        class="config-input" 
        id="api-key-input"
        placeholder="Cole sua API key do Groq aqui (ex: gsk_...)"
        maxlength="200"
      >
      <div class="config-help">
        <strong>Como obter sua API key gratuita:</strong><br>
        1. Acesse <a href="https://console.groq.com/keys" target="_blank">console.groq.com/keys</a><br>
        2. Crie uma conta gratuita<br>
        3. Clique em "Create API Key" e copie a chave<br>
        4. Cole acima e clique em "Salvar"
      </div>
    </div>
    
    <!-- Branding Tab -->
    <div id="config-tab-branding" class="config-tab-content" style="display: none;">
      <div class="config-subtitle">
        Personalize o sistema com a identidade visual do seu escritório!
      </div>
      
      <label style="display: block; margin-top: 15px; font-weight: 600;">Nome do Escritório</label>
      <input 
        type="text" 
        class="config-input" 
        id="branding-nome-input"
        placeholder="Nome da sua Empresa"
        onchange="saveConfig()"
      >
      
      <label style="display: block; margin-top: 15px; font-weight: 600;">Logo do Escritório (URL ou Base64)</label>
      <input 
        type="text" 
        class="config-input" 
        id="branding-logo-input"
        placeholder="URL ou Base64 da sua logo"
      >
      
      <div class="config-help" style="margin-top: 10px;">
        Dica: Use uma imagem quadrada (512x512px) para melhor resultado.
      </div>
    </div>
    
    <div class="config-actions">
      <button class="btn-config secondary" onclick="skipConfig()">Pular (Modo Offline)</button>
      <button class="btn-config primary" onclick="saveConfig()">💾 Salvar</button>
    </div>
  </div>
</div>

<script>
'use strict';

// ── CONFIGURAÇÃO ──
// A API key será inserida pelo usuário na interface
let GROQ_API_KEY = '';

// ── PASSIVO AMBIENTAL ──
const PassivoAmbiental = {
  calcular: function(areaTotalHa, perimetroM, vegetacaoExistenteHa, bioma) {
    // bioma: 'cerr' (Cerrado) ou 'amz' (Amazônia)
    const areaTotalM2 = areaTotalHa * 10000;
    
    // Cálculo de APP (aproximado: perímetro × 30m, 50m, 100m)
    const app30M2 = perimetroM * 30;
    const app50M2 = perimetroM * 50;
    const app100M2 = perimetroM * 100;
    const app30Ha = app30M2 / 10000;
    const app50Ha = app50M2 / 10000;
    const app100Ha = app100M2 / 10000;
    
    // Cálculo de RL mínima
    const rlPercentual = bioma === 'amz' ? 0.8 : 0.35;
    const rlMinimaHa = areaTotalHa * rlPercentual;
    
    // Déficit de RL
    const deficitRlHa = Math.max(0, rlMinimaHa - vegetacaoExistenteHa);
    
    // Déficit total (RL + APP, simplificado)
    const deficitTotalHa = deficitRlHa + app30Ha; // Usando APP 30m como base
    
    // Estimativa de custo (R$ 15.000/ha de recuperação, valor referência)
    const custoRecuperacao = deficitTotalHa * 15000;
    
    return {
      areaTotalHa,
      perimetroM,
      vegetacaoExistenteHa,
      bioma,
      biomaNome: bioma === 'amz' ? 'Amazônia' : 'Cerrado',
      rl: {
        percentualMinimo: rlPercentual * 100,
        minimaHa: rlMinimaHa,
        deficitHa: deficitRlHa,
        deficitPercentual: areaTotalHa > 0 ? (deficitRlHa / areaTotalHa) * 100 : 0
      },
      app: {
        ha30: app30Ha,
        ha50: app50Ha,
        ha100: app100Ha
      },
      deficitTotalHa,
      custoRecuperacao
    };
  }
};

// ── ANÁLISE DOS LAYERS SIMCAR ──
const AnalisadorLayers = {
  // Definição das regras para cada layer
  layerRules: [
    {
      name: 'ATP',
      category: 'auto',
      description: 'Vértices do memorial descritivo',
      source: 'memorial',
      effort: null
    },
    {
      name: 'AIR',
      category: 'auto',
      description: 'Mesmo polígono do ATP',
      source: 'memorial',
      effort: null
    },
    {
      name: 'ARL',
      category: 'auto',
      description: 'Cálculo automático baseado no bioma — posição estimada',
      source: 'memorial',
      effort: null,
      note: 'Posição da ARL deve ser ajustada pelo RT'
    },
    {
      name: 'AVN',
      category: 'image',
      description: 'Google Earth / MapBiomas — digitalização manual',
      source: 'imagem',
      effort: '30–60 min'
    },
    {
      name: 'TIPOLOGIA_VEGETAL',
      category: 'image',
      description: 'Imagem + confirmação do RT em campo',
      source: 'imagem',
      effort: '5 min'
    },
    {
      name: 'AREA_CONSOLIDADA',
      category: 'mapbiomas',
      description: 'MapBiomas 2008 — obrigatório para marco legal',
      source: 'mapbiomas',
      effort: '30–60 min'
    },
    {
      name: 'ARLREM',
      category: 'mapbiomas',
      description: 'Apenas se AVN < RL mínima — área a recuperar',
      source: 'mapbiomas',
      effort: '10 min no QGIS',
      conditional: true
    },
    {
      name: 'AUAS',
      category: 'mapbiomas',
      description: 'Uso agrossilvopastoril pré-2008',
      source: 'mapbiomas',
      effort: '30 min'
    },
    {
      name: 'AURD',
      category: 'mapbiomas',
      description: 'Supressão pós-2008 — PRODES/DETER',
      source: 'mapbiomas',
      effort: '30 min'
    },
    {
      name: 'NASCENTE',
      category: 'field',
      description: 'Levantamento in loco com GPS — não tem no memorial',
      source: 'campo',
      effort: 'Visita de campo'
    },
    {
      name: 'RIO_ATE_10',
      category: 'auto',
      description: 'APP de rio até 10m — buffer 30m',
      source: 'memorial',
      effort: null,
      note: 'Confirmar largura do rio em campo'
    },
    {
      name: 'RIO_10_A_50',
      category: 'field',
      description: 'APP de rio 10–50m — só se confirmado em campo',
      source: 'campo',
      effort: 'Visita de campo'
    },
    {
      name: 'RIO_50_A_200',
      category: 'field',
      description: 'APP de rio 50–200m — só se confirmado em campo',
      source: 'campo',
      effort: 'Visita de campo'
    },
    {
      name: 'RIO_200_A_600',
      category: 'field',
      description: 'APP de rio 200–600m — só se confirmado em campo',
      source: 'campo',
      effort: 'Visita de campo'
    },
    {
      name: 'RIO_ACIMA_600',
      category: 'field',
      description: 'APP de rio > 600m — só se confirmado em campo',
      source: 'campo',
      effort: 'Visita de campo'
    },
    {
      name: 'LAGOA_NATURAL',
      category: 'field',
      description: 'Imagem satélite + confirmação campo',
      source: 'campo',
      effort: '30 min'
    },
    {
      name: 'AREA_UMIDA',
      category: 'field',
      description: 'Imagem satélite + confirmação campo',
      source: 'campo',
      effort: '30 min'
    },
    {
      name: 'RESERVATORIO_ARTIFICIAL',
      category: 'field',
      description: 'Imagem satélite (visível como espelho d\'água)',
      source: 'campo',
      effort: '15 min'
    },
    {
      name: 'AREA_TOPO_MORRO',
      category: 'mdt',
      description: 'SRTM — 1/3 superior do morro',
      source: 'mdt',
      effort: '1–2h no QGIS'
    },
    {
      name: 'AREA_DECLIVIDADE',
      category: 'mdt',
      description: 'SRTM — declividade >25° (Cerrado) ou >45°',
      source: 'mdt',
      effort: '1h no QGIS'
    },
    {
      name: 'BORDA_CHAPADA',
      category: 'mdt',
      description: 'SRTM — faixa de 100m do topo de chapada',
      source: 'mdt',
      effort: '1–2h no QGIS'
    },
    {
      name: 'AREA_ALTITUDE_1800',
      category: 'na',
      description: 'Altitude > 1800m — geralmente não se aplica em MT',
      source: null,
      effort: null
    },
    {
      name: 'MANGUEZAL',
      category: 'na',
      description: 'Ecossistema costeiro — não se aplica em MT',
      source: null,
      effort: null
    },
    {
      name: 'RESTINGA',
      category: 'na',
      description: 'Ecossistema costeiro — não se aplica em MT',
      source: null,
      effort: null
    },
    {
      name: 'VEREDA',
      category: 'na',
      description: 'Improvável na maioria dos casos — confirmar em campo',
      source: null,
      effort: null
    },
    {
      name: 'INTERESSE_SOCIAL',
      category: 'na',
      description: 'Caso específico — não se aplica por padrão',
      source: null,
      effort: null
    },
    {
      name: 'UTILIDADE_PUBLICA',
      category: 'na',
      description: 'Caso específico — não se aplica por padrão',
      source: null,
      effort: null
    }
  ],

  // Analisar layers com base nos dados do memorial
  analisar: function(dados) {
    const areaTotal = parseFloat(dados.area) || 0;
    const bioma = dados.bioma || 'cerr';
    const vegetacaoExistente = parseFloat(dados.vegetacao_existente) || 0;
    const rlPercentual = bioma === 'amz' ? 0.8 : 0.35;
    const rlMinima = areaTotal * rlPercentual;

    // Contar layers por categoria
    const stats = {
      auto: 0,
      fieldImage: 0,
      mapbiomas: 0,
      na: 0
    };

    this.layerRules.forEach(layer => {
      if (layer.category === 'auto') stats.auto++;
      else if (['field', 'image', 'mdt'].includes(layer.category)) stats.fieldImage++;
      else if (layer.category === 'mapbiomas') stats.mapbiomas++;
      else if (layer.category === 'na') stats.na++;
    });

    return {
      layers: this.layerRules,
      stats,
      dados: {
        areaTotal,
        bioma,
        vegetacaoExistente,
        rlMinima,
        rlPercentual
      }
    };
  },

  // Renderizar HTML da análise
  renderizarHTML: function(analise) {
    const { layers, stats, dados } = analise;

    // Badges CSS inline
    const badgeStyles = {
      auto: 'background:#dcfce7;color:#15803d',
      image: 'background:#dbeafe;color:#1e40af',
      mapbiomas: 'background:#ede9fe;color:#5b21b6',
      field: 'background:#fff7ed;color:#92400e',
      mdt: 'background:#fce7f3;color:#9d174d',
      na: 'background:#f1f5f9;color:#64748b'
    };

    const badgeTexts = {
      auto: '✅ Automático',
      image: '🛰️ Imagem',
      mapbiomas: '🗂️ MapBiomas',
      field: '🚶 Campo',
      mdt: '📡 MDT',
      na: '➖ N/A'
    };

    // Renderizar tabela principal
    const tabelaResumo = layers.map(layer => `
      <tr>
        <td class="layer-nome">${layer.name}</td>
        <td><span class="badge" style="${badgeStyles[layer.category]};padding:2px 7px;border-radius:10px;font-size:10px;font-weight:700;display:inline-flex;align-items:center;gap:3px">${badgeTexts[layer.category]}</span></td>
        <td>${layer.description}${layer.note ? '<div class="obs" style="font-size:10px;color:#c2860a;margin-top:2px;font-style:italic">' + layer.note + '</div>' : ''}</td>
      </tr>
    `).join('');

    // Renderizar layers automáticos
    const layersAuto = layers.filter(l => l.category === 'auto').map(layer => `
      <div class="regra" style="background:#fff;border:1px solid #d0d8cc;border-radius:8px;overflow:hidden;margin-bottom:10px">
        <div class="regra-head" style="display:flex;gap:10px;align-items:center;padding:9px 12px;border-bottom:1px solid #eef2ec">
          <span class="regra-icon" style="font-size:18px">🗺️</span>
          <div>
            <div class="regra-titulo" style="font-size:13px;font-weight:700">${layer.name}</div>
            <span class="badge" style="${badgeStyles.auto};padding:2px 7px;border-radius:10px;font-size:10px;font-weight:700">100% automático</span>
          </div>
        </div>
        <div class="regra-body" style="padding:10px 12px;display:flex;flex-direction:column;gap:6px">
          <div class="regra-item" style="display:flex;gap:8px;align-items:flex-start;font-size:12px;line-height:1.5">
            <span class="dot" style="width:6px;height:6px;border-radius:50%;background:#2d8653;flex-shrink:0;margin-top:5px"></span>
            <span>${layer.description}</span>
          </div>
        </div>
      </div>
    `).join('');

    // Renderizar layers manuais
    const layersManuais = layers.filter(l => ['field', 'image', 'mapbiomas', 'mdt'].includes(l.category)).map(layer => `
      <tr>
        <td class="layer-nome">${layer.name}</td>
        <td>${layer.description}</td>
        <td>${layer.effort || '-'}</td>
      </tr>
    `).join('');

    // Renderizar layers não aplicáveis
    const layersNA = layers.filter(l => l.category === 'na').map(layer => `
      <tr>
        <td class="layer-nome">${layer.name}</td>
        <td>${layer.description}</td>
      </tr>
    `).join('');

    // HTML completo
    return `
      <div class="card">
        <div class="card-head">📋 Análise dos Layers SIMCAR</div>
        <div class="card-body">
          <!-- Tabs -->
          <div style="display:flex;background:#fff;border-bottom:2px solid #d0d8cc;overflow-x:auto;margin-bottom:15px">
            <div class="tab-layer on" onclick="showLayerTab(0)" style="padding:9px 16px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;color:#1a5c38;border-bottom:3px solid #1a5c38;margin-bottom:-2px">📊 Resumo</div>
            <div class="tab-layer" onclick="showLayerTab(1)" style="padding:9px 16px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;color:#666;border-bottom:3px solid transparent;margin-bottom:-2px">✅ Automáticos</div>
            <div class="tab-layer" onclick="showLayerTab(2)" style="padding:9px 16px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;color:#666;border-bottom:3px solid transparent;margin-bottom:-2px">✏️ Manuais</div>
            <div class="tab-layer" onclick="showLayerTab(3)" style="padding:9px 16px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;color:#666;border-bottom:3px solid transparent;margin-bottom:-2px">➖ Não se aplica</div>
          </div>

          <!-- Resumo -->
          <div class="sec-layer on" id="sec-layer-0">
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
              <div style="background:#fff;border:1px solid #d0d8cc;border-radius:8px;padding:12px;text-align:center">
                <div style="font-size:28px;font-weight:800;line-height:1;color:#15803d">${stats.auto}</div>
                <div style="font-size:10px;color:#666;margin-top:4px;text-transform:uppercase;letter-spacing:.04em">Automáticos</div>
              </div>
              <div style="background:#fff;border:1px solid #d0d8cc;border-radius:8px;padding:12px;text-align:center">
                <div style="font-size:28px;font-weight:800;line-height:1;color:#c2860a">${stats.fieldImage}</div>
                <div style="font-size:10px;color:#666;margin-top:4px;text-transform:uppercase;letter-spacing:.04em">Campo/Imagem</div>
              </div>
              <div style="background:#fff;border:1px solid #d0d8cc;border-radius:8px;padding:12px;text-align:center">
                <div style="font-size:28px;font-weight:800;line-height:1;color:#1a5c9c">${stats.mapbiomas}</div>
                <div style="font-size:10px;color:#666;margin-top:4px;text-transform:uppercase;letter-spacing:.04em">MapBiomas</div>
              </div>
              <div style="background:#fff;border:1px solid #d0d8cc;border-radius:8px;padding:12px;text-align:center">
                <div style="font-size:28px;font-weight:800;line-height:1;color:#888">${stats.na}</div>
                <div style="font-size:10px;color:#666;margin-top:4px;text-transform:uppercase;letter-spacing:.04em">Não se aplica</div>
              </div>
            </div>

            <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #d0d8cc">
              <thead>
                <tr>
                  <th style="background:#e8f0e4;padding:8px 10px;text-align:left;font-size:11px;font-weight:700;color:#1a4d2a;border-bottom:1px solid #d0d8cc">Layer</th>
                  <th style="background:#e8f0e4;padding:8px 10px;text-align:left;font-size:11px;font-weight:700;color:#1a4d2a;border-bottom:1px solid #d0d8cc">Status</th>
                  <th style="background:#e8f0e4;padding:8px 10px;text-align:left;font-size:11px;font-weight:700;color:#1a4d2a;border-bottom:1px solid #d0d8cc">Fonte</th>
                </tr>
              </thead>
              <tbody>
                ${tabelaResumo}
              </tbody>
            </table>
          </div>

          <!-- Automáticos -->
          <div class="sec-layer" id="sec-layer-1" style="display:none">
            <div style="display:flex;flex-direction:column;gap:10px">
              ${layersAuto}
            </div>
          </div>

          <!-- Manuais -->
          <div class="sec-layer" id="sec-layer-2" style="display:none">
            <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #d0d8cc">
              <thead>
                <tr>
                  <th style="background:#e8f0e4;padding:8px 10px;text-align:left;font-size:11px;font-weight:700;color:#1a4d2a;border-bottom:1px solid #d0d8cc">Layer</th>
                  <th style="background:#e8f0e4;padding:8px 10px;text-align:left;font-size:11px;font-weight:700;color:#1a4d2a;border-bottom:1px solid #d0d8cc">Fonte</th>
                  <th style="background:#e8f0e4;padding:8px 10px;text-align:left;font-size:11px;font-weight:700;color:#1a4d2a;border-bottom:1px solid #d0d8cc">Esforço</th>
                </tr>
              </thead>
              <tbody>
                ${layersManuais}
              </tbody>
            </table>
          </div>

          <!-- Não se aplica -->
          <div class="sec-layer" id="sec-layer-3" style="display:none">
            <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #d0d8cc">
              <thead>
                <tr>
                  <th style="background:#e8f0e4;padding:8px 10px;text-align:left;font-size:11px;font-weight:700;color:#1a4d2a;border-bottom:1px solid #d0d8cc">Layer</th>
                  <th style="background:#e8f0e4;padding:8px 10px;text-align:left;font-size:11px;font-weight:700;color:#1a4d2a;border-bottom:1px solid #d0d8cc">Por que não se aplica</th>
                </tr>
              </thead>
              <tbody>
                ${layersNA}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    `;
  }
};

// Função global para alternar tabs da análise de layers
window.showLayerTab = function(n) {
  document.querySelectorAll('.tab-layer').forEach((t, i) => {
    t.style.color = i === n ? '#1a5c38' : '#666';
    t.style.borderBottom = i === n ? '3px solid #1a5c38' : '3px solid transparent';
  });
  document.querySelectorAll('.sec-layer').forEach((s, i) => {
    s.style.display = i === n ? 'block' : 'none';
  });
};

// ── GERADOR DE RELATÓRIO PDF ──
const GeradorPDF = {
  gerar: function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 50;
    const marginLeft = 60;
    const marginRight = 60;
    const contentWidth = pageWidth - marginLeft - marginRight;

    // --- CABEÇALHO COM BRANDING ---
    doc.setFillColor(27, 58, 45); // --c-forest
    doc.rect(0, 0, pageWidth, 80, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(BRANDING.nome, pageWidth / 2, 40, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const headerSubtitle = S.validacaoAceita 
      ? 'Relatório CAR Digital - Memorial Descritivo Rural Validado' 
      : 'Relatório de Memorial Descritivo Rural - CAR-MT';
    doc.text(headerSubtitle, pageWidth / 2, 60, { align: 'center' });

    if (S.validacaoAceita) {
      // Adicionar selo CAR Digital
      doc.setFillColor(196, 154, 60); // --c-gold
      doc.rect(pageWidth - 150, 20, 130, 40, 'F');
      doc.setTextColor(27, 58, 45);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('CAR DIGITAL', pageWidth - 85, 42, { align: 'center' });
      doc.setFontSize(9);
      doc.text('Validação Automática', pageWidth - 85, 55, { align: 'center' });
      doc.setFontSize(10);
      doc.text('✅', pageWidth - 135, 45, { align: 'left' });
    }

    yPos = 100;

    // --- 1. DADOS DO IMÓVEL ---
    this.addSectionTitle(doc, '1. Dados do Imóvel', marginLeft, yPos);
    yPos += 25;

    const dadosImovel = [
      ['Nome do Imóvel', getVal('f-nome') || 'Não informado'],
      ['Município/UF', getVal('f-municipio') || 'Não informado'],
      ['Área Declarada', (getVal('f-area') || '0') + ' ha'],
      ['Perímetro Declarado', (getVal('f-perimetro') || '0') + ' m'],
      ['Matrícula', getVal('f-matricula') || 'Não informado'],
      ['CCIR', getVal('f-ccir') || 'Não informado'],
      ['CNS/INCRA', getVal('f-cns') || 'Não informado'],
      ['Datum/Fuso UTM', getVal('f-datum') || 'Não informado'],
      ['Bioma', (getVal('f-bioma') === 'amz' ? 'Amazônia' : 'Cerrado')],
      ['Área de Vegetação Nativa Existente', (getVal('f-vegetacao-existente') || '0') + ' ha'],
      ['Confrontantes', getVal('f-confrontantes') || 'Não informado'],
      ['Módulo Fiscal Municipal', (getVal('f-modulo') || '75') + ' ha'],
      ['Tipo de Domínio', this.getTipoDominioText(getVal('f-tipo'))],
      ['Finalidade do CAR', this.getFinalidadeCarText(getVal('f-finalidade'))]
    ];

    this.addKeyValuePairs(doc, dadosImovel, marginLeft, yPos, contentWidth);
    yPos += (dadosImovel.length * 18) + 20;

    // --- 2. DADOS DO PROPRIETÁRIO ---
    if (yPos > pageHeight - 150) { doc.addPage(); yPos = 50; }
    this.addSectionTitle(doc, '2. Proprietário/Interessado', marginLeft, yPos);
    yPos += 25;

    const dadosProp = [
      ['Nome Completo', getVal('f-prop-nome') || 'Não informado'],
      ['CPF', getVal('f-prop-cpf') || 'Não informado'],
      ['E-mail', getVal('f-prop-email') || 'Não informado'],
      ['Telefone', getVal('f-prop-tel') || 'Não informado']
    ];
    this.addKeyValuePairs(doc, dadosProp, marginLeft, yPos, contentWidth);
    yPos += (dadosProp.length * 18) + 20;

    // --- 3. ENGENHEIRO RESPONSÁVEL ---
    if (yPos > pageHeight - 150) { doc.addPage(); yPos = 50; }
    this.addSectionTitle(doc, '3. Engenheiro Responsável pelo Georreferenciamento', marginLeft, yPos);
    yPos += 25;

    const dadosEng = [
      ['Nome Completo', getVal('f-eng-nome') || 'Não informado'],
      ['CREA', getVal('f-eng-crea') || 'Não informado'],
      ['Código INCRA', getVal('f-eng-incra') || 'Não informado'],
      ['ART Nº', getVal('f-eng-art') || 'Não informado'],
      ['Data do Levantamento', getVal('f-eng-data') || 'Não informado'],
      ['Local do Levantamento', getVal('f-eng-local') || 'Não informado']
    ];
    this.addKeyValuePairs(doc, dadosEng, marginLeft, yPos, contentWidth);
    yPos += (dadosEng.length * 18) + 20;

    // --- 4. RESPONSÁVEL TÉCNICO CAR ---
    if (yPos > pageHeight - 150) { doc.addPage(); yPos = 50; }
    this.addSectionTitle(doc, '4. Responsável Técnico pelo CAR', marginLeft, yPos);
    yPos += 25;

    const dadosResp = [
      ['Nome Completo', getVal('f-resp-nome') || 'Não informado'],
      ['CPF', getVal('f-resp-cpf') || 'Não informado'],
      ['Conselho/Registro', getVal('f-resp-conselho') || 'Não informado']
    ];
    this.addKeyValuePairs(doc, dadosResp, marginLeft, yPos, contentWidth);
    yPos += (dadosResp.length * 18) + 20;

    // --- 5. COORDENADAS SIMCAR (ÁREA DE ABRANGÊNCIA) ---
    if (yPos > pageHeight - 150) { doc.addPage(); yPos = 50; }
    this.addSectionTitle(doc, '5. Coordenadas para o SIMCAR - Área de Abrangência', marginLeft, yPos);
    yPos += 25;

    const coordsSimcar = [
      ['Inferior Esquerda - Longitude', getVal('f-inf-lon') || 'Não informado'],
      ['Inferior Esquerda - Latitude', getVal('f-inf-lat') || 'Não informado'],
      ['Superior Direita - Longitude', getVal('f-sup-lon') || 'Não informado'],
      ['Superior Direita - Latitude', getVal('f-sup-lat') || 'Não informado']
    ];
    this.addKeyValuePairs(doc, coordsSimcar, marginLeft, yPos, contentWidth);
    yPos += (coordsSimcar.length * 18) + 20;

    // --- 6. VALIDAÇÃO GEOMÉTRICA (COMPARATIVO) ---
    if (yPos > pageHeight - 150) { doc.addPage(); yPos = 50; }
    const valTitle = S.validacaoAceita ? '6. Validação Geométrica CAR Digital - Declarado x Calculado' : '6. Validação Geométrica';
    this.addSectionTitle(doc, valTitle, marginLeft, yPos);
    yPos += 25;
    
    if (S.validacaoGeometrica) {
      const validacao = S.validacaoGeometrica;
      const dadosValidacao = [
        ['Status', validacao.valido ? '✅ Válido' : '❌ Inválido'],
        ['Número de Vértices', validacao.vertices],
        ['Perímetro Declarado', (getVal('f-perimetro') || '0') + ' m'],
        ['Perímetro Calculado', validacao.perimetro + ' m'],
        ['Área Declarada', (getVal('f-area') || '0') + ' ha'],
        ['Área Calculada', validacao.area.areaCalculada + ' ha'],
        ['Diferença de Área', validacao.area.percentual + '%'],
        ['Fechamento Automático', validacao.fechamento.fechadoAutomaticamente ? 'Sim' : 'Não']
      ];
      this.addKeyValuePairs(doc, dadosValidacao, marginLeft, yPos, contentWidth);
      yPos += (dadosValidacao.length * 18) + 20;
    }

    // --- 7. PASSIVO AMBIENTAL ---
    if (S.passivoAmbiental) {
      if (yPos > pageHeight - 200) { doc.addPage(); yPos = 50; }
      this.addSectionTitle(doc, '7. Passivo Ambiental', marginLeft, yPos);
      yPos += 25;
      const passivo = S.passivoAmbiental;
      const dadosPassivo = [
        ['Bioma', passivo.biomaNome],
        ['Área Total', passivo.areaTotalHa.toFixed(4) + ' ha'],
        ['RL Mínima', passivo.rl.percentualMinimo.toFixed(0) + '% (' + passivo.rl.minimaHa.toFixed(4) + ' ha)'],
        ['Vegetação Existente', passivo.vegetacaoExistenteHa.toFixed(4) + ' ha'],
        ['Déficit de RL', passivo.rl.deficitHa.toFixed(4) + ' ha (' + passivo.rl.deficitPercentual.toFixed(2) + '%)'],
        ['APP 30m', passivo.app.ha30.toFixed(4) + ' ha'],
        ['APP 50m', passivo.app.ha50.toFixed(4) + ' ha'],
        ['APP 100m', passivo.app.ha100.toFixed(4) + ' ha'],
        ['Déficit Total', passivo.deficitTotalHa.toFixed(4) + ' ha'],
        ['Custo Estimado de Recuperação', 'R$ ' + passivo.custoRecuperacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })]
      ];
      this.addKeyValuePairs(doc, dadosPassivo, marginLeft, yPos, contentWidth);
      yPos += (dadosPassivo.length * 18) + 20;
    }

    // --- 8. VÉRTICES UTM ---
    if (S.vertices && S.vertices.length > 0) {
      // Primeiro, calcular Lat/Lng para cada vértice
      const datumValue = getVal('f-datum');
      let zona = 21;
      if (datumValue.includes('20')) zona = 20;
      if (datumValue.includes('22')) zona = 22;
      
      const verticesComCoords = S.vertices.map(v => {
        const latLng = utmToLatLon(v.E, v.N, zona);
        return { ...v, lat: latLng.lat, lng: latLng.lon };
      });

      doc.addPage();
      yPos = 50;
      this.addSectionTitle(doc, '8. Lista de Vértices UTM', marginLeft, yPos);
      yPos += 25;

      // Cabeçalho da tabela
      doc.setFillColor(27, 58, 45);
      doc.setTextColor(255, 255, 255);
      doc.rect(marginLeft, yPos, contentWidth, 20, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Nº', marginLeft + 10, yPos + 13);
      doc.text('Nome', marginLeft + 50, yPos + 13);
      doc.text('UTM E', marginLeft + 130, yPos + 13);
      doc.text('UTM N', marginLeft + 230, yPos + 13);
      doc.text('Latitude', marginLeft + 330, yPos + 13);
      doc.text('Longitude', marginLeft + 450, yPos + 13);

      yPos += 22;
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');

      verticesComCoords.forEach((v, i) => {
        if (yPos > pageHeight - 50) {
          doc.addPage();
          yPos = 50;
        }
        doc.text(String(i + 1), marginLeft + 10, yPos + 10);
        doc.text(v.nome || `V${i+1}`, marginLeft + 50, yPos + 10);
        doc.text(v.E.toFixed(2), marginLeft + 130, yPos + 10);
        doc.text(v.N.toFixed(2), marginLeft + 230, yPos + 10);
        doc.text(v.lat.toFixed(8), marginLeft + 330, yPos + 10);
        doc.text(v.lng.toFixed(8), marginLeft + 450, yPos + 10);
        yPos += 18;
      });
    }

    // --- RODAPÉ ---
    const dataAtual = new Date().toLocaleString('pt-BR');
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(128, 128, 128);
      doc.text(`Relatório gerado em: ${dataAtual} | Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 20, { align: 'center' });
    }

    // --- SALVAR PDF ---
    const nomeArquivo = (getVal('f-nome') || 'relatorio-car-mt').replace(/\s+/g, '_').toLowerCase() + '.pdf';
    doc.save(nomeArquivo);
    toast('Relatório PDF baixado com sucesso!', 'ok');
  },
  addSectionTitle: function(doc, title, x, y) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(27, 58, 45);
    doc.text(title, x, y);
  },
  addKeyValuePairs: function(doc, pairs, x, y, width) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let currentY = y;
    pairs.forEach(([key, value]) => {
      doc.setTextColor(85, 85, 85);
      doc.setFont('helvetica', 'bold');
      doc.text(key + ':', x, currentY);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.text(String(value), x + 200, currentY);
      currentY += 18;
    });
  },
  getTipoDominioText: function(value) {
    const tipos = {
      'rural_privado': 'Rural Privado',
      'assentamento': 'Assentamento',
      'quilombola': 'Quilombola',
      'indigena': 'Indígena'
    };
    return tipos[value] || 'Não informado';
  },
  getFinalidadeCarText: function(value) {
    const finalidades = {
      'usucapiao': 'Usucapião',
      'registro': 'Registro / Matrícula',
      'regularizacao': 'Regularização Fundiária',
      'car_novo': 'CAR Novo'
    };
    return finalidades[value] || 'Não informado';
  },
  gerarRelatorioSimcar: function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 50;
    const marginLeft = 60;
    const marginRight = 60;
    const contentWidth = pageWidth - marginLeft - marginRight;

    // Cabeçalho
    doc.setFillColor(27, 58, 45);
    doc.rect(0, 0, pageWidth, 80, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(BRANDING.nome, pageWidth / 2, 40, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('RELATÓRIO PASSO A PASSO PARA PREENCHIMENTO NO SIMCAR-MT', pageWidth / 2, 60, { align: 'center' });
    yPos = 100;

    const camposObrigatorios = [
      { id: 'f-nome', label: 'Nome do Imóvel Rural', passo: 1 },
      { id: 'f-municipio', label: 'Município / UF', passo: 1 },
      { id: 'f-area', label: 'Área Declarada (ha)', passo: 1 },
      { id: 'f-perimetro', label: 'Perímetro Declarado (m)', passo: 1 },
      { id: 'f-matricula', label: 'Matrícula / Registro de Imóvel', passo: 2 },
      { id: 'f-ccir', label: 'CCIR', passo: 2 },
      { id: 'f-cns', label: 'CNS / INCRA', passo: 2 },
      { id: 'f-datum', label: 'Datum / Fuso UTM', passo: 3 },
      { id: 'f-prop-nome', label: 'Nome do Proprietário', passo: 4 },
      { id: 'f-prop-cpf', label: 'CPF do Proprietário', passo: 4 },
      { id: 'f-eng-nome', label: 'Nome do Engenheiro Responsável', passo: 5 },
      { id: 'f-eng-crea', label: 'CREA do Engenheiro', passo: 5 },
      { id: 'f-eng-art', label: 'ART do Engenheiro', passo: 5 },
      { id: 'f-inf-lon', label: 'Longitude Inferior Esquerda', passo: 6 },
      { id: 'f-inf-lat', label: 'Latitude Inferior Esquerda', passo: 6 },
      { id: 'f-sup-lon', label: 'Longitude Superior Direita', passo: 6 },
      { id: 'f-sup-lat', label: 'Latitude Superior Direita', passo: 6 },
      { id: 'f-resp-nome', label: 'Nome do Responsável Técnico pelo CAR', passo: 7 },
    ];

    const passos = [
      { num: 1, titulo: 'PASSO 1 - DADOS BÁSICOS DO IMÓVEL RURAL', campos: camposObrigatorios.filter(c => c.passo === 1) },
      { num: 2, titulo: 'PASSO 2 - DOCUMENTOS DO IMÓVEL', campos: camposObrigatorios.filter(c => c.passo === 2) },
      { num: 3, titulo: 'PASSO 3 - DADOS DE REFERÊNCIA GEODÉSICA', campos: camposObrigatorios.filter(c => c.passo === 3) },
      { num: 4, titulo: 'PASSO 4 - DADOS DO PROPRIETÁRIO', campos: camposObrigatorios.filter(c => c.passo === 4) },
      { num: 5, titulo: 'PASSO 5 - DADOS DO ENGENHEIRO', campos: camposObrigatorios.filter(c => c.passo === 5) },
      { num: 6, titulo: 'PASSO 6 - COORDENADAS PARA SIMCAR', campos: camposObrigatorios.filter(c => c.passo === 6) },
      { num: 7, titulo: 'PASSO 7 - DADOS DO RESPONSÁVEL TÉCNICO', campos: camposObrigatorios.filter(c => c.passo === 7) },
    ];

    passos.forEach(passo => {
      if (yPos > pageHeight - 100) { doc.addPage(); yPos = 50; }
      this.addSectionTitle(doc, passo.titulo, marginLeft, yPos);
      yPos += 25;
      passo.campos.forEach(campo => {
        const valor = getVal(campo.id);
        const falta = !valor || valor === '';
        if (yPos > pageHeight - 50) { doc.addPage(); yPos = 50; }
        if (falta) {
          doc.setFillColor(255, 200, 200);
          doc.rect(marginLeft, yPos - 12, contentWidth, 20, 'F');
        }
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(campo.label + ':', marginLeft, yPos);
        doc.setFont('helvetica', 'normal');
        if (falta) {
          doc.setTextColor(150, 0, 0);
          doc.text('⚠️ FALTA PREENCHER', marginLeft + 200, yPos);
        } else {
          doc.text(valor, marginLeft + 200, yPos);
        }
        yPos += 22;
      });
      yPos += 15;
    });

    if (S.vertices && S.vertices.length > 0) {
      if (yPos > pageHeight - 150) { doc.addPage(); yPos = 50; }
      this.addSectionTitle(doc, 'PASSO 8 - VÉRTICES DO POLÍGONO (PARA LANÇAMENTO NO SIMCAR', marginLeft, yPos);
      yPos += 25;
      const datumValue = getVal('f-datum');
      let zona = 21;
      if (datumValue.includes('20')) zona = 20;
      if (datumValue.includes('22')) zona = 22;

      S.vertices.forEach((v, i) => {
        if (yPos > pageHeight - 50) { doc.addPage(); yPos = 50; }
        const latLng = utmToLatLon(v.E, v.N, zona);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(`Vértice ${i + 1} (${v.nome || ''})`, marginLeft, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(`UTM E: ${v.E.toFixed(2)}  UTM N: ${v.N.toFixed(2)}  Lat: ${latLng.lat.toFixed(8)}  Lon: ${latLng.lon.toFixed(8)}`, marginLeft, yPos + 12);
        yPos += 30;
      });
    }

    const dataAtual = new Date().toLocaleString('pt-BR');
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(128, 128, 128);
      doc.text(`Relatório passo a passo gerado em: ${dataAtual} | Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 20, { align: 'center' });
    }

    const nomeArquivo = (getVal('f-nome') || 'relatorio-simcar').replace(/\s+/g, '_').toLowerCase() + '.pdf';
    doc.save(nomeArquivo);
    toast('Relatório passo a passo para o SIMCAR baixado com sucesso!', 'ok');
  }
};

// ── ESTADO ──
const S = { kml: '', shapeData: null, nomeImovel: '', vertices: [], validacaoGeometrica: null, passivoAmbiental: null, validacaoAceita: false };

// ── UTILIDADES ──
function $(id) { return document.getElementById(id); }
function setVal(id, v) { const el = $(id); if (el && v != null && v !== '') { el.value = v; el.classList.add('auto-filled'); } }
function getVal(id) { return ($(id)?.value || '').trim(); }

function detectUTMZoneFromMetadata(dados = {}) {
  if (dados.meridiano_central?.includes('63') || dados.fuso?.includes('20')) return 20;
  if (dados.meridiano_central?.includes('51') || dados.fuso?.includes('22')) return 22;
  return 21;
}

function getDatumDescription(datum) {
  if ((datum || '').includes('20')) return '20S (MC 63°W)';
  if ((datum || '').includes('22')) return '22S (MC 51°W)';
  return '21S (MC 57°W)';
}

function toast(msg, type='erro') {
  const el = $('toast');
  el.textContent = msg;
  el.style.background = type === 'ok' ? 'var(--c-ok)' : type === 'warn' ? 'var(--c-warn)' : 'var(--c-err)';
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 4500);
}

function setStep(n) {
  [1,2,3].forEach(i => {
    const el = $(`st-${i}`);
    el.className = 'step-item' + (i < n ? ' done' : i === n ? ' active' : '');
  });
}

function showPanel(id) {
  ['panel-upload','panel-form','panel-result'].forEach(p => {
    $(p).classList.remove('visible');
  });
  $(id).classList.add('visible');
}

// ── NAVEGAÇÃO ──
function goToUpload() {
  showPanel('panel-upload');
  $('proc-upload').classList.remove('visible');
  $('drop-zone').style.display = '';
  setStep(1);
}

function goToForm() {
  showPanel('panel-form');
  setStep(2);
}

// ── DRAG & DROP ──
const dz = $('drop-zone');
const fi = $('file-input');

dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
dz.addEventListener('drop', e => {
  e.preventDefault(); dz.classList.remove('drag-over');
  if (e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files);
});
fi.addEventListener('change', () => { if (fi.files.length > 0) processFiles(fi.files); });

// ── PROCESSAR ARQUIVOS ──
async function processFiles(files) {
  dz.style.display = 'none';
  const proc = $('proc-upload');
  proc.classList.add('visible');
  proc.style.display = 'block';

  const steps = [0,1,2,3,4,5].map(i => $(`ps-${i}`));
  let currentStep = -1;

  async function nextStep(delay = 500) {
    await pause(delay);
    if (currentStep >= 0) steps[currentStep].className = 'proc-step done';
    currentStep++;
    if (currentStep < steps.length) steps[currentStep].className = 'proc-step running';
  }

  function pause(ms) { return new Promise(r => setTimeout(r, ms)); }

  try {
    await nextStep(100);

    // Verificar se temos arquivos de shapefile
    const shpFiles = Array.from(files).filter(f => ['shp','dbf','shx','prj'].includes(f.name.split('.').pop().toLowerCase()));
    const zipFiles = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.zip'));
    const docFiles = Array.from(files).filter(f => ['pdf','docx','doc','txt'].includes(f.name.split('.').pop().toLowerCase()));

    if (shpFiles.length > 0 || zipFiles.length > 0) {
      // Processar shapefile
      await nextStep(200);
      await processShapefile(shpFiles, zipFiles, nextStep);
      return;
    }

    // Processar documentos (PDF, DOCX, TXT) como antes
    let textoCombinado = '';
    const nomesArquivos = [];

    for (let i = 0; i < docFiles.length; i++) {
      const file = docFiles[i];
      const ext = file.name.split('.').pop().toLowerCase();
      nomesArquivos.push(file.name);
      
      let textoArquivo = '';
      if (ext === 'txt') {
        textoArquivo = await file.text();
      } else if (ext === 'pdf') {
        await nextStep(200);
        textoArquivo = await extractPDF(file);
      } else {
        await nextStep(200);
        textoArquivo = await extractDOCX(file);
      }
      
      textoCombinado += `\n===== INÍCIO DO ARQUIVO: ${file.name} =====\n` + textoArquivo + `\n===== FIM DO ARQUIVO: ${file.name} =====\n`;
    }

    if (textoCombinado.length < 50) throw new Error('Não foi possível extrair texto suficiente dos arquivos. Verifique se os PDFs não são escaneados sem OCR.');

    await nextStep(400);
    const dados = await extrairComIA(textoCombinado, nextStep);

    await nextStep(300);
    preencherForm(dados, textoCombinado, nomesArquivos.join(' + '));

    proc.classList.remove('visible');
    proc.style.display = 'none';
    showPanel('panel-form');
    setStep(2);

  } catch(err) {
    proc.classList.remove('visible');
    proc.style.display = 'none';
    dz.style.display = '';
    fi.value = '';
    toast(err.message || 'Erro ao processar os arquivos.');
  }
}

// ── PROCESSAR SHAPEFILE ──
async function processShapefile(shpFiles, zipFiles, nextStep) {
  // Carregar biblioteca de shapefile
  await loadScript('https://unpkg.com/shapefile@0.6.6/dist/shp.js', () => window.shp);
  
  await nextStep(200);
  
  let source;
  if (zipFiles.length > 0) {
    // Processar ZIP
    const zipBuffer = await zipFiles[0].arrayBuffer();
    source = await window.shp(zipBuffer);
  } else {
    // Processar arquivos individuais
    const shpFile = shpFiles.find(f => f.name.toLowerCase().endsWith('.shp'));
    if (!shpFile) throw new Error('Arquivo .shp não encontrado.');
    const shpBuffer = await shpFile.arrayBuffer();
    
    // Procurar arquivos complementares (.shx, .dbf, .prj)
    const shxFile = shpFiles.find(f => f.name.toLowerCase().endsWith('.shx'));
    const dbfFile = shpFiles.find(f => f.name.toLowerCase().endsWith('.dbf'));
    const prjFile = shpFiles.find(f => f.name.toLowerCase().endsWith('.prj'));
    
    const shxBuffer = shxFile ? await shxFile.arrayBuffer() : null;
    const dbfBuffer = dbfFile ? await dbfFile.arrayBuffer() : null;
    const prjText = prjFile ? await prjFile.text() : null;
    
    source = await window.shp(shpBuffer, shxBuffer, dbfBuffer);
  }

  await nextStep(200);
  
  // Extrair feições
  const features = [];
  let bbox = [Infinity, Infinity, -Infinity, -Infinity];
  let coordsList = [];
  
  for await (const feature of source) {
    features.push(feature);
    
    // Extrair coordenadas e calcular bbox
    if (feature.geometry && feature.geometry.coordinates) {
      const flatCoords = flattenCoords(feature.geometry.coordinates);
      coordsList = coordsList.concat(flatCoords);
      flatCoords.forEach(([lon, lat]) => {
        bbox[0] = Math.min(bbox[0], lon);
        bbox[1] = Math.min(bbox[1], lat);
        bbox[2] = Math.max(bbox[2], lon);
        bbox[3] = Math.max(bbox[3], lat);
      });
    }
  }

  await nextStep(200);
  
  if (coordsList.length === 0) throw new Error('Nenhuma coordenada encontrada no shapefile.');
  
  // Detectar fuso UTM
  let zonaDetectada = detectUTMZoneFromCoords(coordsList[0]);
  
  // Atualizar formulário
  setVal('f-inf-lon', bbox[0].toFixed(8));
  setVal('f-inf-lat', bbox[1].toFixed(8));
  setVal('f-sup-lon', bbox[2].toFixed(8));
  setVal('f-sup-lat', bbox[3].toFixed(8));
  
  const datumSel = $('f-datum');
  if (zonaDetectada === 20) datumSel.value = 'SIRGAS2000_20S';
  else if (zonaDetectada === 22) datumSel.value = 'SIRGAS2000_22S';
  else datumSel.value = 'SIRGAS2000_21S';
  
  // Criar vértices a partir das coordenadas
  S.vertices = coordsList.map((coord, i) => {
    const utm = latLonToUTM(coord[1], coord[0], zonaDetectada);
    return { nome: `V${i+1}`, E: utm.easting, N: utm.northing };
  });
  
  S.nomeImovel = features[0]?.properties?.NOME || features[0]?.properties?.IDENTIFIC || 'Imóvel Importado';
  
  // Gerar KML usando as mesmas coordenadas
  const coordsGeo = coordsList.map(([lon, lat]) => ({ lon, lat }));
  S.kml = buildKML(S.vertices, coordsGeo, S.nomeImovel, 0, '');
  
  // Gerar Shapefile usando as mesmas coordenadas
  const areaNum = 0;
  const biomaVal = getVal('f-bioma');
  const biomaNome = biomaVal === 'amz' ? 'Amazônia' : 'Cerrado';
  
  S.shapeData = buildShapeFeatureCollection(S.vertices, coordsGeo, {
    nome_imovel: S.nomeImovel,
    area: '0',
    perimetro: '0',
    municipio: '',
    uf: 'MT',
    matricula: '',
    ccir: '',
    cns: '',
    prop_nome: '',
    prop_cpf: '',
    datum: getVal('f-datum'),
    fuso: `${zonaDetectada}S`,
    meridiano: zonaDetectada === 20 ? '-63' : zonaDetectada === 22 ? '-51' : '-57',
    verts_totais: S.vertices.length,
    gerado_por: 'CAR-MT Analisador',
    gerado_em: new Date().toISOString(),
    atp: areaNum,
    air: areaNum,
    bioma: biomaNome,
    vegetacao_existente: 0
  }, zonaDetectada);

  await nextStep(200);
  await nextStep(100);

  // Atualizar badge
  const fileName = zipFiles[0]?.name || shpFiles.find(f => f.name.toLowerCase().endsWith('.shp'))?.name || 'Shapefile';
  $('file-badge').innerHTML = `
    <div class="file-badge">
      <div class="fb-icon">🗺️</div>
      <div>
        <div class="fb-name">${fileName}</div>
        <div class="fb-meta">${coordsList.length} coordenadas · Fuso ${zonaDetectada}S · KML e Shapefile gerados</div>
      </div>
    </div>`;

  const proc = $('proc-upload');
  proc.classList.remove('visible');
  proc.style.display = 'none';
  showPanel('panel-result');
  setStep(3);
  
  // Renderizar resultado diretamente
  renderResult({
    score: 100,
    classificacao: 'Shapefile Importado',
    resumo: 'Coordenadas do shapefile importadas com sucesso.',
    campos: {},
    checklist: [{ item: 'Shapefile importado', status: 'ok' }, { item: 'KML gerado', status: 'ok' }, { item: 'Coordenadas sincronizadas', status: 'ok' }],
    alertas: [{ tipo: 'ok', msg: 'KML e Shapefile usam as mesmas coordenadas.' }],
    orientacoes: ['Verifique as coordenadas e preencha os dados restantes do imóvel.']
  });
}

// ── AUXILIARES PARA SHAPEFILE ──
function flattenCoords(coords) {
  const flat = [];
  function walk(arr) {
    if (Array.isArray(arr)) {
      if (arr.length === 2 && typeof arr[0] === 'number' && typeof arr[1] === 'number') {
        flat.push(arr);
      } else {
        arr.forEach(walk);
      }
    }
  }
  walk(coords);
  return flat;
}

function detectUTMZoneFromCoords([lon, lat]) {
  const zone = Math.floor((lon + 180) / 6) + 1;
  return zone;
}

// Função inversa de utmToLatLon: converte Lat/Lon para UTM
function latLonToUTM(lat, lon, zone) {
  const a = 6378137;
  const f = 1 / 298.257223563;
  const k0 = 0.9996;
  const e = Math.sqrt(2*f - f*f);
  const e2 = e*e;
  const e4 = e2*e2;
  const e6 = e4*e2;
  
  const latRad = lat * Math.PI / 180;
  const lonRad = lon * Math.PI / 180;
  const lonOrigin = (zone - 1) * 6 - 177;
  const lonOriginRad = lonOrigin * Math.PI / 180;
  
  const N = a / Math.sqrt(1 - e2 * Math.sin(latRad)**2);
  const T = Math.tan(latRad)**2;
  const C = e2 / (1 - e2) * Math.cos(latRad)**2;
  const A = Math.cos(latRad) * (lonRad - lonOriginRad);
  
  const M = a * (
    (1 - e2/4 - 3*e4/64 - 5*e6/256) * latRad
    - (3*e2/8 + 3*e4/32 + 45*e6/1024) * Math.sin(2*latRad)
    + (15*e4/256 + 45*e6/1024) * Math.sin(4*latRad)
    - (35*e6/3072) * Math.sin(6*latRad)
  );
  
  const easting = k0 * N * (A + (1-T+C)*A**3/6 + (5-18*T+T*T+72*C-58*e2)*A**5/120) + 500000;
  let northing = k0 * (M + N * Math.tan(latRad) * (A**2/2 + (5-T+9*C+4*C*C)*A**4/24 + (61-58*T+T*T+600*C-330*e2)*A**6/720));
  
  if (lat < 0) northing += 10000000;
  
  return { easting, northing, zone };
}

// ── EXTRAIR PDF ──
async function extractPDF(file) {
  // Configurar worker do PDF.js
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', () => window.pdfjsLib);
  
  // Configurar worker
  if (typeof window !== 'undefined' && window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const loadingTask = window.pdfjsLib.getDocument({ data: reader.result });
        const pdf = await loadingTask.promise;
        let texto = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          texto += textContent.items.map(item => item.str).join(' ') + '\n';
        }
        
        resolve(texto);
      } catch(e) { 
        reject(new Error(`Falha ao extrair texto do PDF. Verifique se não é um PDF escaneado: ${e.message}`)); 
      }
    };
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo PDF.'));
    reader.readAsArrayBuffer(file);
  });
}

// ── EXTRAIR DOCX ──
async function extractDOCX(file) {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js', () => window.mammoth);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const result = await window.mammoth.extractRawText({ arrayBuffer: reader.result });
        resolve(result.value);
      } catch(e) { reject(new Error('Falha ao extrair texto do DOCX.')); }
    };
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo DOCX.'));
    reader.readAsArrayBuffer(file);
  });
}

function loadScript(src, check) {
  return new Promise((resolve, reject) => {
    if (check()) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Falha ao carregar dependência.'));
    document.head.appendChild(s);
  });
}

// ── CHAMAR API GROQ ──
async function callAPI({ messages, maxTokens = 1000, retries = 2 }) {
  // Você precisa colocar sua API key do Groq aqui
  // Para produção, use um backend para ocultar a key
  const API_KEY = GROQ_API_KEY; // Substituir com sua API key do Groq
  
  if (!API_KEY) {
    throw new Error('API key do Groq não configurada.\n\n1. Acesse https://console.groq.com/keys para obter sua API key gratuita\n2. Abra este arquivo HTML em um editor de texto\n3. Substitua a linha "const GROQ_API_KEY = \'\';" com sua key: "const GROQ_API_KEY = \'sua_key_aqui\';"');
  }
  
  let attempt = 0;
  while (attempt <= retries) {
    try {
      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({ 
          model: 'llama-3.3-70b-versatile',
          max_tokens: maxTokens, 
          messages 
        })
      });
      
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        
        if (resp.status === 429 && attempt < retries) {
          attempt++;
          // Wait longer for each retry (exponential backoff): 2s, 4s, 8s...
          const delay = Math.pow(2, attempt) * 1000;
          console.warn(`Groq API Rate Limit (429). Tentando novamente em ${delay/1000}s... (Tentativa ${attempt}/${retries})`);
          toast(`Limite da API alcançado. Aguardando ${delay/1000}s para tentar novamente...`, 'warn');
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        
        if (resp.status === 429) {
           throw new Error('Limite de uso da API (429) excedido. Por favor, aguarde 1 minuto e tente novamente.');
        }
        
        throw new Error(err?.error?.message || `Erro na API Groq (${resp.status})`);
      }
      
      const data = await resp.json();
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      if (attempt >= retries || error.message.includes('não configurada')) {
        throw error;
      }
      attempt++;
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

function parseJSON(raw) {
  // Remover markdown
  let clean = raw.replace(/```json\s*/g,'').replace(/```\s*/g,'').trim();
  
  try { 
    return JSON.parse(clean); 
  } catch(e) {
    // Tentar extrair apenas o objeto JSON
    const m = clean.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch(e2) {
        // Tentar corrigir JSONs malformados comuns
        let fixed = m[0]
          .replace(/,(\s*[}\]])/g, '$1')  // Remove vírgulas antes de } ou ]
          .replace(/([}\]])(\s*)([{"\[])/g, '$1,$2$3')  // Adiciona vírgulas entre elementos
          .replace(/,(\s*{)/g, ',$1')  // Corrige vírgulas antes de objetos
          .replace(/},(\s*{)/g, '},$1')  // Garante vírgulas entre objetos
          .replace(/",(\s*{)/g, '",$1')  // Corrige vírgulas após strings
          .replace(/\n/g, ' ')  // Remove quebras de linha
          .replace(/\s+/g, ' ')  // Normaliza espaços
          .replace(/,(\s*[}\]])/g, '$1');  // Remove vírgulas finais novamente
        
        try {
          return JSON.parse(fixed);
        } catch(e3) {
          console.error('JSON original:', raw);
          console.error('JSON limpo:', clean);
          console.error('JSON tentativa correção:', fixed);
          console.error('Erro:', e3);
          
          // Fallback: Criar objeto básico válido
          return {
            score: 50,
            classificacao: "ERRO DE ANÁLISE",
            resumo: "Erro ao processar resposta da IA. Tente novamente.",
            campos: {},
            checklist: [],
            alertas: [{"tipo":"erro","msg":"Erro de processamento. Revalide os dados."}],
            orientacoes: ["Tente gerar o relatório novamente"]
          };
        }
      }
    }
    throw new Error('Resposta da IA não contém JSON válido.');
  }
}

// ── VALIDADOR GEOMÉTRICO ──
class ValidadorGeometrico {
  constructor() {
    this.tolerancia = 0.01; // 1cm de tolerância para fechamento
  }

  // Garante que o polígono esteja fechado
  garantirFechamento(vertices) {
    if (vertices.length < 3) return vertices;
    const primeiro = vertices[0];
    const ultimo = vertices[vertices.length - 1];
    const distancia = Math.sqrt(
      Math.pow(ultimo.E - primeiro.E, 2) + Math.pow(ultimo.N - primeiro.N, 2)
    );
    if (distancia > this.tolerancia) {
      // Adiciona o primeiro vértice no final para fechar o polígono
      return [...vertices, { ...primeiro }];
    }
    return vertices;
  }

  // Valida se o polígono fecha geometricamente
  validarFechamento(vertices) {
    if (vertices.length < 3) return { valido: false, erro: 'Mínimo 3 vértices necessários' };
    
    const primeiro = vertices[0];
    const ultimo = vertices[vertices.length - 1];
    
    const distancia = Math.sqrt(
      Math.pow(ultimo.E - primeiro.E, 2) + Math.pow(ultimo.N - primeiro.N, 2)
    );
    
    return {
      valido: distancia <= this.tolerancia,
      erro: distancia > this.tolerancia ? `Polígono não fecha. Distância: ${distancia.toFixed(3)}m. O sistema fechou o polígono automaticamente.` : null,
      distanciaFechamento: distancia,
      fechadoAutomaticamente: distancia > this.tolerancia
    };
  }

  // Calcula área pelos vértices (fórmula de Shoelace)
  calcularAreaVertices(vertices) {
    const verticesFechados = this.garantirFechamento(vertices);
    if (verticesFechados.length < 3) return 0;
    
    let area = 0;
    const n = verticesFechados.length;
    
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += verticesFechados[i].E * verticesFechados[j].N;
      area -= verticesFechados[j].E * verticesFechados[i].N;
    }
    
    return Math.abs(area) / 2 / 10000; // Converter m² para hectares
  }

  // Valida se área declarada bate com área calculada
  validarArea(areaDeclarada, vertices) {
    const areaCalculada = this.calcularAreaVertices(vertices);
    const diferenca = Math.abs(areaDeclarada - areaCalculada);
    const percentualDiferenca = areaDeclarada > 0 ? (diferenca / areaDeclarada) * 100 : 0;
    
    return {
      valido: percentualDiferenca <= 2, // Tolerância de 2%
      areaCalculada: areaCalculada.toFixed(4),
      areaDeclarada: areaDeclarada,
      diferenca: diferenca.toFixed(4),
      percentual: percentualDiferenca.toFixed(2),
      erro: percentualDiferenca > 2 ? `Área diverge ${percentualDiferenca.toFixed(2)}% (máx 2%)` : null
    };
  }

  // Detecta auto-interseções (polígono que se cruza)
  detectarAutoIntersecao(vertices) {
    const verticesFechados = this.garantirFechamento(vertices);
    const intersecoes = [];
    
    for (let i = 0; i < verticesFechados.length - 1; i++) {
      for (let j = i + 2; j < verticesFechados.length - 1; j++) {
        if (i === 0 && j === verticesFechados.length - 2) continue; // Pular última conexão
        
        const seg1 = { p1: verticesFechados[i], p2: verticesFechados[i + 1] };
        const seg2 = { p1: verticesFechados[j], p2: verticesFechados[j + 1] };
        
        if (this.segmentosSeIntersectam(seg1, seg2)) {
          intersecoes.push({
            segmento1: `${verticesFechados[i].nome} - ${verticesFechados[i + 1].nome}`,
            segmento2: `${verticesFechados[j].nome} - ${verticesFechados[j + 1].nome}`
          });
        }
      }
    }
    
    return {
      valido: intersecoes.length === 0,
      intersecoes,
      erro: intersecoes.length > 0 ? `${intersecoes.length} auto-interseção(ões) detectada(s)` : null
    };
  }

  // Verifica se dois segmentos se intersectam
  segmentosSeIntersectam(seg1, seg2) {
    const d1 = this.orientacao(seg2.p1, seg2.p2, seg1.p1);
    const d2 = this.orientacao(seg2.p1, seg2.p2, seg1.p2);
    const d3 = this.orientacao(seg1.p1, seg1.p2, seg2.p1);
    const d4 = this.orientacao(seg1.p1, seg1.p2, seg2.p2);
    
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && 
           ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
  }

  // Calcula orientação de três pontos
  orientacao(p, q, r) {
    return (q.N - p.N) * (r.E - q.E) - (q.E - p.E) * (r.N - q.N);
  }

  // Validação completa do polígono
  validarCompleto(vertices, areaDeclarada) {
    // Fecha o polígono automaticamente para validação e cálculos
    const verticesFechados = this.garantirFechamento(vertices);
    const resultados = {
      fechamento: this.validarFechamento(vertices),
      area: this.validarArea(areaDeclarada, verticesFechados),
      intersecoes: this.detectarAutoIntersecao(verticesFechados),
      vertices: verticesFechados.length,
      perimetro: this.calcularPerimetro(verticesFechados),
      verticesFechados: verticesFechados // Armazena para uso posterior
    };

    const erros = [];
    if (!resultados.fechamento.valido) erros.push(resultados.fechamento.erro);
    if (!resultados.area.valido) erros.push(resultados.area.erro);
    if (!resultados.intersecoes.valido) erros.push(resultados.intersecoes.erro);

    resultados.valido = erros.length === 0;
    resultados.erros = erros;
    resultados.resumo = erros.length === 0 ? 
      'Polígono válido geometricamente' : 
      `${erros.length} erro(s) encontrado(s)`;

    return resultados;
  }

  // Calcula perímetro do polígono
  calcularPerimetro(vertices) {
    const verticesFechados = this.garantirFechamento(vertices);
    let perimetro = 0;
    for (let i = 0; i < verticesFechados.length; i++) {
      const j = (i + 1) % verticesFechados.length;
      const dist = Math.sqrt(
        Math.pow(verticesFechados[j].E - verticesFechados[i].E, 2) + 
        Math.pow(verticesFechados[j].N - verticesFechados[i].N, 2)
      );
      perimetro += dist;
    }
    return perimetro.toFixed(2);
  }
}

// Instância global do validador
const geometrico = new ValidadorGeometrico();
async function extrairComIA(texto, nextStep) {
  const prompt = `Você é especialista em georreferenciamento rural e CAR no Brasil.
Analise estes documentos (memorial descritivo e/ou ART) e extraia TODOS os dados possíveis com atenção máxima.

DOCUMENTOS:
${texto.substring(0, 15000)}

INSTRUÇÕES IMPORTANTISSIMAS:
1. Extraia TODOS os vértices em ordem, incluindo o vértice final que fecha o polígono (mesmo que seja o mesmo que o inicial)
2. Para cada vértice, extraia o nome, coordenada E (Este) e coordenada N (Norte) em UTM
3. Retorne APENAS um objeto JSON válido, sem texto antes ou depois, sem markdown
4. Use "" para campos que não encontrar
5. Não adicione vírgulas após o último item de cada array ou objeto
6. Preencha TODOS os campos que encontrar nos documentos, não deixe nada de fora
7. Para bioma: use "cerrado" ou "amz"
8. Para tipo_dominio: use "rural_privado", "assentamento", "quilombola" ou "indigena"
9. Para finalidade_car: use "usucapiao", "registro", "regularizacao" ou "car_novo"

Formato esperado:
{"nome_imovel":"","municipio":"","uf":"MT","area":"","perimetro":"","matricula":"","ccir":"","cns":"","datum":"","meridiano_central":"","fuso":"","finalidade_car":"","prop_nome":"","prop_cpf":"","prop_email":"","prop_tel":"","eng_nome":"","eng_crea":"","eng_incra":"","eng_art":"","data_levantamento":"","local_levantamento":"","confrontantes":"","ponto_inicial":"","ponto_final":"","total_vertices":0,"vertices":[{"nome":"EFDA-M-0207","E":299850.79,"N":8543511.77}],"observacoes":"","bioma":"","vegetacao_existente":"","modulo_fiscal":"75","tipo_dominio":"","resp_nome":"","resp_cpf":"","resp_conselho":""}

Use formato YYYY-MM-DD para datas.`;

  const raw = await callAPI({ messages: [{ role: 'user', content: prompt }], maxTokens: 2000 });
  await nextStep(300);

  const dados = parseJSON(raw);

  // Calcular coords SIMCAR e KML a partir dos vértices
  if (dados.vertices && dados.vertices.length >= 3) {
    // Determinar zona baseado no memorial (meridiano_central ou fuso)
    const zona = detectUTMZoneFromMetadata(dados);
    
    S.vertices = dados.vertices;
    
    // Auto-atualizar dropdown de datum baseado no fuso
    const datumSel = $('f-datum');
    if (zona === 20) {
      datumSel.value = 'SIRGAS2000_20S';
    } else if (zona === 22) {
      datumSel.value = 'SIRGAS2000_22S';
    } else {
      datumSel.value = 'SIRGAS2000_21S';
    }
    
    // NOVA VALIDAÇÃO GEOMÉTRICA
    const areaDeclarada = parseFloat((dados.area || '0').replace(',', '.')) || 0;
    const validacao = geometrico.validarCompleto(dados.vertices, areaDeclarada);
    S.validacaoGeometrica = validacao;
    
    // Usar os vértices fechados para geração de KML e Shapefile
    const verticesParaUso = validacao.verticesFechados || dados.vertices;
    S.vertices = verticesParaUso;
    
    // Atualizar área com a calculada se válida
    if (validacao.valido && areaDeclarada === 0) {
      dados.area = validacao.area.areaCalculada;
    }
    
    // Verificar se há vértices
    if (!verticesParaUso || verticesParaUso.length < 3) {
      toast('❌ Vértices insuficientes (encontrados: ' + (verticesParaUso?.length || 0) + ').\n\nTentativas:\n1. Verifique se o PDF tem formato válido\n2. Copie e cole manualmente os vértices do memorial\n3. Desenhe o polígono no mapa', 'warn');
      S.nomeImovel = dados.nome_imovel || 'Fazenda';
      return dados;
    }
    
    const coords = verticesParaUso.map(v => utmToLatLon(v.E, v.N, zona));
    const lats = coords.map(c => c.lat);
    const lons = coords.map(c => c.lon);
    dados.simcar = {
      inf_lat: Math.min(...lats).toFixed(6),
      inf_lon: Math.min(...lons).toFixed(6),
      sup_lat: Math.max(...lats).toFixed(6),
      sup_lon: Math.max(...lons).toFixed(6),
    };
    
    // Gerar múltiplos formatos
    S.kml = buildKML(verticesParaUso, coords, dados.nome_imovel || 'Fazenda', dados.area, dados.prop_nome);
    const areaNum = parseFloat((dados.area || '0').replace(',', '.')) || 0;
    const biomaVal = getVal('f-bioma');
    const biomaNome = biomaVal === 'amz' ? 'Amazônia' : 'Cerrado';
    const shapeDados = {
      nome_imovel: dados.nome_imovel,
      area: dados.area,
      perimetro: dados.perimetro,
      municipio: dados.municipio,
      uf: dados.uf,
      matricula: dados.matricula,
      ccir: dados.ccir,
      cns: dados.cns,
      prop_nome: dados.prop_nome,
      prop_cpf: dados.prop_cpf,
      datum: dados.datum,
      fuso: dados.fuso,
      meridiano: dados.meridiano,
      verts_tot: dados.verts_tot,
      gerado_por: dados.gerado_por,
      gerado_em: dados.gerado_em,
      atp: areaNum,
      air: areaNum,
      bioma: biomaNome,
      vegetacao_existente: parseFloat((getVal('f-vegetacao-existente') || '0').replace(',', '.')) || 0
    };
    S.shapeData = buildShapeFeatureCollection(verticesParaUso, coords, shapeDados, zona);
  }

  S.nomeImovel = dados.nome_imovel || 'Fazenda';
  return dados;
}

// ── UTM → LAT/LON (WGS84 / SIRGAS2000) ──
function utmToLatLon(E, N, zona) {
  const k0 = 0.9996, a = 6378137.0, f = 1/298.257223563;
  const b = a*(1-f), e2 = 1-(b/a)**2, ep2 = e2/(1-e2);
  
  // Meridiano Central por fuso:
  // Fuso 20S: MC -63°W (Oeste extremo de MT)
  // Fuso 21S: MC -57°W (Centro de MT)
  // Fuso 22S: MC -51°W (Leste de MT)
  const mc = zona === 20 ? -63 : (zona === 22 ? -51 : -57);

  const x = E - 500000;
  const y = N - 10000000; // hemisfério sul

  const M = y / k0;
  const mu = M / (a*(1 - e2/4 - 3*e2**2/64 - 5*e2**3/256));
  const e1 = (1 - Math.sqrt(1-e2)) / (1 + Math.sqrt(1-e2));

  const phi1 = mu
    + (3*e1/2 - 27*e1**3/32)*Math.sin(2*mu)
    + (21*e1**2/16 - 55*e1**4/32)*Math.sin(4*mu)
    + (151*e1**3/96)*Math.sin(6*mu)
    + (1097*e1**4/512)*Math.sin(8*mu);

  const sp1 = Math.sin(phi1), cp1 = Math.cos(phi1);
  const N1 = a / Math.sqrt(1 - e2*sp1**2);
  const T1 = Math.tan(phi1)**2;
  const C1 = ep2*cp1**2;
  const R1 = a*(1-e2) / Math.pow(1-e2*sp1**2, 1.5);
  const D  = x / (N1*k0);

  const lat = phi1 - (N1*Math.tan(phi1)/R1)*(
    D**2/2
    - (5+3*T1+10*C1-4*C1**2-9*ep2)*D**4/24
    + (61+90*T1+298*C1+45*T1**2-252*ep2-3*C1**2)*D**6/720
  );

  const lon0 = mc * Math.PI / 180;
  const lon  = lon0 + (
    D
    - (1+2*T1+C1)*D**3/6
    + (5-2*C1+28*T1-3*C1**2+8*ep2+24*T1**2)*D**5/120
  ) / cp1;

  return { lat: lat*180/Math.PI, lon: lon*180/Math.PI };
}

function buildKML(vertices, coords, nome, area, proprietario) {
  const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const coordStr = coords.map(c => `          ${c.lon.toFixed(8)},${c.lat.toFixed(8)},0`).join('\n');
  const closeCoord = `          ${coords[0].lon.toFixed(8)},${coords[0].lat.toFixed(8)},0`;

  let placemarks = vertices.map((v,i) =>
    `    <Placemark><name>${esc(v.nome)}</name>` +
    `<Point><coordinates>${coords[i].lon.toFixed(8)},${coords[i].lat.toFixed(8)},0</coordinates></Point></Placemark>`
  ).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${esc(nome)}</name>
    <description>Área: ${esc(area)} ha | Proprietário: ${esc(proprietario)} | Gerado: CAR-MT Analisador</description>
    <Style id="atp">
      <LineStyle><color>ff00aa44</color><width>2</width></LineStyle>
      <PolyStyle><color>3300aa44</color></PolyStyle>
    </Style>
    <Style id="air">
      <LineStyle><color>ff00ffff</color><width>2</width></LineStyle>
      <PolyStyle><color>3300ffff</color></PolyStyle>
    </Style>
    <Style id="vertice">
      <IconStyle><color>ff00aa44</color><scale>.7</scale></IconStyle>
      <LabelStyle><scale>.6</scale></LabelStyle>
    </Style>
    <Placemark>
      <name>${esc(nome)} — ATP (Área Total do Imóvel)</name>
      <styleUrl>#atp</styleUrl>
      <Polygon>
        <outerBoundaryIs><LinearRing><coordinates>
${coordStr}
${closeCoord}
        </coordinates></LinearRing></outerBoundaryIs>
      </Polygon>
    </Placemark>
    <Placemark>
      <name>${esc(nome)} — AIR (Área de Interesse Rural)</name>
      <styleUrl>#air</styleUrl>
      <Polygon>
        <outerBoundaryIs><LinearRing><coordinates>
${coordStr}
${closeCoord}
        </coordinates></LinearRing></outerBoundaryIs>
      </Polygon>
    </Placemark>
${placemarks}
  </Document>
</kml>`;
}

// ── GERAR COLEÇÃO ESPACIAL PARA SHAPEFILE ──
function buildShapeFeatureCollection(vertices, coords, dados, zona) {
  const areaNum = parseFloat((dados.area || '0').replace(',', '.')) || 0;
  
  // Criar o polígono e limpar pontos repetidos
  let ring = coords.map(c => [parseFloat(c.lon.toFixed(8)), parseFloat(c.lat.toFixed(8))])
    .concat([[parseFloat(coords[0].lon.toFixed(8)), parseFloat(coords[0].lat.toFixed(8))]]);
  ring = removeDuplicatePoints(ring);
  
  const featureCollection = {
    type: "FeatureCollection",
    crs: {
      type: "name",
      properties: { name: "urn:ogc:def:crs:EPSG::4674" } // SIRGAS2000
    },
    features: [
      {
        type: "Feature",
        properties: {
          ID: 1,
          TIPO: 'Imóvel Rural',
          IDENTIFIC: dados.nome_imovel || 'Imóvel Rural',
          nome: dados.nome_imovel || 'Imóvel Rural',
          area_ha: areaNum,
          perim_m: parseFloat((dados.perimetro || '0').replace(',', '.')) || 0,
          municipio: dados.municipio || '',
          uf: dados.uf || 'MT',
          matricula: dados.matricula || '',
          ccir: dados.ccir || '',
          cns: dados.cns || '',
          prop_nome: dados.prop_nome || '',
          prop_cpf: dados.prop_cpf || '',
          datum: 'SIRGAS2000',
          fuso: `${zona}S`,
          meridiano: zona === 20 ? '-63' : zona === 22 ? '-51' : '-57',
          verts_tot: vertices.length,
          gerado_por: 'CAR-MT Analisador',
          gerado_em: new Date().toISOString(),
          ATP: dados.atp || areaNum,
          AIR: dados.air || areaNum,
          BIOMA: dados.bioma || 'Cerrado',
          vegetacao_existente: dados.vegetacao_existente || 0
        },
        geometry: {
          type: "Polygon",
          coordinates: [ring]
        }
      }
    ]
  };
  
  // Adicionar pontos dos vértices
  vertices.forEach((v, i) => {
    featureCollection.features.push({
      type: "Feature",
      properties: {
        vertice: v.nome || `V${i+1}`,
        coord_e: Number(v.E) || 0,
        coord_n: Number(v.N) || 0,
        lat: parseFloat(coords[i].lat.toFixed(8)),
        lon: parseFloat(coords[i].lon.toFixed(8)),
        ordem: i + 1
      },
      geometry: {
        type: "Point",
        coordinates: [parseFloat(coords[i].lon.toFixed(8)), parseFloat(coords[i].lat.toFixed(8))]
      }
    });
  });
  
  return featureCollection;
}

// ── PREENCHER FORMULÁRIO ──
function preencherForm(d, texto, fileName) {
  setVal('f-memorial', texto);
  setVal('f-nome', d.nome_imovel);
  setVal('f-municipio', d.municipio && d.uf ? `${d.municipio}/${d.uf}` : d.municipio);
  setVal('f-area', d.area);
  setVal('f-perimetro', d.perimetro);
  setVal('f-matricula', d.matricula);
  setVal('f-ccir', d.ccir);
  setVal('f-cns', d.cns);
  setVal('f-confrontantes', d.confrontantes);
  setVal('f-prop-nome', d.prop_nome);
  setVal('f-prop-cpf', d.prop_cpf);
  setVal('f-prop-email', d.prop_email);
  setVal('f-prop-tel', d.prop_tel);
  setVal('f-eng-nome', d.eng_nome);
  setVal('f-eng-crea', d.eng_crea);
  setVal('f-eng-incra', d.eng_incra);
  setVal('f-eng-art', d.eng_art);
  setVal('f-eng-data', d.data_levantamento);
  setVal('f-eng-local', d.local_levantamento || d.municipio);
  setVal('f-resp-nome', d.resp_nome);
  setVal('f-resp-cpf', d.resp_cpf);
  setVal('f-resp-conselho', d.resp_conselho);
  setVal('f-vegetacao-existente', d.vegetacao_existente);
  setVal('f-modulo', d.modulo_fiscal);

  // Datum - Auto-detectar fuso baseado no memorial
  const datumSel = $('f-datum');
  const zona = detectUTMZoneFromMetadata(d);
  if (zona === 20) {
    datumSel.value = 'SIRGAS2000_20S';
  } else if (zona === 22) {
    datumSel.value = 'SIRGAS2000_22S';
  } else {
    datumSel.value = 'SIRGAS2000_21S'; // Default para centro de MT (MC 57°W)
  }

  // Bioma
  if (d.bioma) {
    const biomaSel = $('f-bioma');
    if (d.bioma.toLowerCase().includes('amz') || d.bioma.toLowerCase().includes('amazônia')) {
      biomaSel.value = 'amz';
    } else {
      biomaSel.value = 'cerr';
    }
  }

  // Tipo de domínio
  if (d.tipo_dominio) {
    const tipoSel = $('f-tipo');
    if (d.tipo_dominio === 'assentamento') tipoSel.value = 'assentamento';
    else if (d.tipo_dominio === 'quilombola') tipoSel.value = 'quilombola';
    else if (d.tipo_dominio === 'indigena') tipoSel.value = 'indigena';
    else tipoSel.value = 'rural_privado';
  }

  // Finalidade
  const fin = (d.finalidade_car || '').toLowerCase();
  if (fin.includes('usucap')) $('f-finalidade').value = 'usucapiao';
  else if (fin.includes('reg')) $('f-finalidade').value = 'regularizacao';
  else if (fin.includes('matr') || fin.includes('reg')) $('f-finalidade').value = 'registro';
  else if (fin.includes('car') || fin.includes('novo')) $('f-finalidade').value = 'car_novo';

  // Coords SIMCAR
  if (d.simcar) {
    setVal('f-inf-lon', d.simcar.inf_lon);
    setVal('f-inf-lat', d.simcar.inf_lat);
    setVal('f-sup-lon', d.simcar.sup_lon);
    setVal('f-sup-lat', d.simcar.sup_lat);
  }

  // Badge do arquivo
  const vtxCount = d.total_vertices || d.vertices?.length || 0;
  $('file-badge').innerHTML = `
    <div class="file-badge">
      <div class="fb-icon">${fileName.endsWith('.pdf') ? '📄' : fileName.endsWith('.txt') ? '📋' : '📝'}</div>
      <div>
        <div class="fb-name">${fileName}</div>
        <div class="fb-meta">
          ${vtxCount} vértices detectados · 
          ${S.kml ? '✅ KML gerado automaticamente' : '⚠️ KML não gerado (vértices insuficientes)'} · 
          Dados preenchidos automaticamente
        </div>
      </div>
    </div>`;

  // Mostrar validação geométrica se houver vértices
  if (S.validacaoGeometrica && vtxCount >= 3) {
    mostrarValidacaoGeometrica(S.validacaoGeometrica);
  }
}

// ── MOSTRAR VALIDAÇÃO GEOMÉTRICA ──
function mostrarValidacaoGeometrica(validacao) {
  const card = $('validacao-geometrica');
  const content = $('validacao-content');
  
  const statusClass = validacao.valido ? 'ok' : 'erro';
  const statusIcon = validacao.valido ? '✅' : '❌';
  const statusTexto = validacao.valido ? 'Geometria Válida' : 'Problemas Detectados';
  
  let errosHtml = '';
  if (validacao.erros.length > 0) {
    errosHtml = `
      <ul class="erro-list">
        ${validacao.erros.map(erro => `<li>${erro}</li>`).join('')}
      </ul>`;
  }

  content.innerHTML = `
    <div class="validacao-status ${statusClass}">
      <span style="font-size:1.2rem">${statusIcon}</span>
      <div>
        <div>${statusTexto}</div>
        <div style="font-size:.75rem;font-weight:400;opacity:.8">${validacao.resumo}</div>
      </div>
    </div>
    
    ${errosHtml}
    
    <div class="validacao-grid">
      <div class="validacao-item ${validacao.fechamento.valido ? 'ok' : 'erro'}">
        <div class="validacao-label">Fechamento</div>
        <div class="validacao-valor">${validacao.fechamento.valido ? 'OK' : 'Erro'}</div>
        <div class="validacao-obs">${validacao.fechamento.distanciaFechamento?.toFixed(3) || '0'}m</div>
      </div>
      
      <div class="validacao-item ${validacao.area.valido ? 'ok' : 'erro'}">
        <div class="validacao-label">Área Calculada</div>
        <div class="validacao-valor">${validacao.area.areaCalculada} ha</div>
        <div class="validacao-obs">Diferença: ${validacao.area.percentual}%</div>
      </div>
      
      <div class="validacao-item ${validacao.intersecoes.valido ? 'ok' : 'erro'}">
        <div class="validacao-label">Auto-interseções</div>
        <div class="validacao-valor">${validacao.intersecoes.intersecoes?.length || 0}</div>
        <div class="validacao-obs">${validacao.intersecoes.valido ? 'Nenhuma' : 'Detectadas'}</div>
      </div>
      
      <div class="validacao-item ok">
        <div class="validacao-label">Vértices</div>
        <div class="validacao-valor">${validacao.vertices}</div>
        <div class="validacao-obs">Perímetro: ${validacao.perimetro}m</div>
      </div>
    </div>
    
    <button class="btn-revalidar" onclick="revalidarGeometria()">
      <span>🔄</span> Revalidar após Correções
    </button>
  `;
  
  card.style.display = 'block';
}

// ── REVALIDAR GEOMETRIA ──
function revalidarGeometria() {
  if (!S.vertices || S.vertices.length < 3) {
    toast('Nenhum vértice disponível para validação', 'warn');
    return;
  }
  
  const areaDeclarada = parseFloat((getVal('f-area') || '0').replace(',', '.')) || 0;
  const validacao = geometrico.validarCompleto(S.vertices, areaDeclarada);
  S.validacaoGeometrica = validacao;
  
  // Usar os vértices fechados para gerar KML e Shapefile
  const verticesParaUso = validacao.verticesFechados || S.vertices;
  S.vertices = verticesParaUso;
  
  // Reconstruir KML e Shapefile
  const zona = detectUTMZoneFromMetadata({}); // Podemos detectar pelo datum selecionado
  const datumVal = getVal('f-datum');
  let zonaDetectada = 21;
  if (datumVal.includes('20')) zonaDetectada = 20;
  if (datumVal.includes('22')) zonaDetectada = 22;
  const coords = verticesParaUso.map(v => utmToLatLon(v.E, v.N, zonaDetectada));
  S.kml = buildKML(verticesParaUso, coords, S.nomeImovel || 'Fazenda', getVal('f-area'), '');
  const areaNum = parseFloat((getVal('f-area') || '0').replace(',', '.')) || 0;
  const biomaVal = getVal('f-bioma');
  const biomaNome = biomaVal === 'amz' ? 'Amazônia' : 'Cerrado';
  
  S.shapeData = buildShapeFeatureCollection(verticesParaUso, coords, {
    nome_imovel: S.nomeImovel,
    area: getVal('f-area'),
    perimetro: getVal('f-perimetro'),
    municipio: getVal('f-municipio'),
    uf: 'MT',
    matricula: getVal('f-matricula'),
    ccir: getVal('f-ccir'),
    cns: getVal('f-cns'),
    prop_nome: getVal('f-prop-nome'),
    prop_cpf: getVal('f-prop-cpf'),
    datum: getVal('f-datum'),
    fuso: `${zonaDetectada}S`,
    meridiano: zonaDetectada === 20 ? '-63' : zonaDetectada === 22 ? '-51' : '-57',
    verts_tot: verticesParaUso.length,
    gerado_por: 'CAR-MT Analisador',
    gerado_em: new Date().toISOString(),
    atp: areaNum,
    air: areaNum,
    bioma: biomaNome,
    vegetacao_existente: parseFloat((getVal('f-vegetacao-existente') || '0').replace(',', '.')) || 0
  }, zonaDetectada);
  
  mostrarValidacaoGeometrica(validacao);
  
  if (validacao.valido) {
    toast('Geometria validada com sucesso! KML e Shapefile atualizados.', 'ok');
  } else {
    toast(`${validacao.erros.length} erro(s) encontrado(s)`, 'erro');
  }
}

// ── ANALISAR ──
async function analisar() {
  const btn = $('btn-analisar');
  btn.disabled = true;
  $('proc-analise').style.display = 'block';
  $('proc-analise').classList.add('visible');

  const mf  = parseFloat(getVal('f-modulo')) || 75;
  const areaN = parseFloat((getVal('f-area') || '0').replace(',','.')) || 0;
  const perimN = parseFloat((getVal('f-perimetro') || '0').replace(',','.')) || 0;
  const vegetN = parseFloat((getVal('f-vegetacao-existente') || '0').replace(',','.')) || 0;
  const bioma = getVal('f-bioma') || 'cerr';
  const mods = areaN > 0 ? (areaN/mf).toFixed(2) : '—';
  
  // Calcular Passivo Ambiental
  S.passivoAmbiental = PassivoAmbiental.calcular(areaN, perimN, vegetN, bioma);

  const prompt = `Você é especialista em CAR e SIMCAR-MT (Mato Grosso). Valide estes dados.

DADOS:
Imóvel: ${getVal('f-nome')} | Município: ${getVal('f-municipio')} | Área: ${getVal('f-area')} ha | Perímetro: ${getVal('f-perimetro')} m
Matrícula: ${getVal('f-matricula')} | CCIR: ${getVal('f-ccir')} | CNS: ${getVal('f-cns')} | Datum: ${getVal('f-datum')}
Confrontantes: ${getVal('f-confrontantes')}
Proprietário: ${getVal('f-prop-nome')} | CPF: ${getVal('f-prop-cpf')} | Tipo: ${getVal('f-tipo')} | Finalidade: ${getVal('f-finalidade')}
Módulos Fiscais: ${mods} (MF=${mf} ha)
Engenheiro: ${getVal('f-eng-nome')} | CREA: ${getVal('f-eng-crea')} | INCRA: ${getVal('f-eng-incra')} | ART: ${getVal('f-eng-art')} | Data: ${getVal('f-eng-data')}
Resp. CAR: ${getVal('f-resp-nome')} | CPF: ${getVal('f-resp-cpf')} | Conselho: ${getVal('f-resp-conselho')}
SIMCAR Inf.Esq: Lon ${getVal('f-inf-lon')} / Lat ${getVal('f-inf-lat')}
SIMCAR Sup.Dir: Lon ${getVal('f-sup-lon')} / Lat ${getVal('f-sup-lat')}
KML gerado: ${S.kml ? 'SIM (' + (S.kml.match(/<Placemark>/g)||[]).length + ' pontos)' : 'NÃO'}

IMPORTANTE: Retorne APENAS JSON válido. Certifique-se de que todas as chaves e valores estão entre aspas. NÃO adicione vírgulas após o último item.

{"score":85,"classificacao":"COMPLETO","resumo":"Análise completa dos dados","campos":{"nome":{"status":"ok","obs":""},"municipio":{"status":"ok","obs":""},"area":{"status":"ok","obs":""},"perimetro":{"status":"ok","obs":""},"matricula":{"status":"ok","obs":""},"ccir":{"status":"ok","obs":""},"cns":{"status":"ok","obs":""},"datum":{"status":"ok","obs":""},"modulos_fiscais":{"valor":"${mods}","status":"ok","obs":""},"porte_imovel":{"valor":"","status":"ok","obs":""},"prop_nome":{"status":"ok","obs":""},"prop_cpf":{"status":"ok","obs":""},"eng_crea":{"status":"ok","obs":""},"eng_incra":{"status":"ok","obs":""},"eng_art":{"status":"ok","obs":""},"coords_simcar":{"status":"ok","obs":""},"kml":{"status":"ok","obs":""}},"checklist":[{"item":"Dados básicos preenchidos","status":"ok"}],"alertas":[{"tipo":"ok","msg":"Dados validados com sucesso"}],"orientacoes":["Prosseguir com o cadastro no SIMCAR"]}`;

  try {
    const raw = await callAPI({ messages: [{ role:'user', content: prompt }], maxTokens: 2000 });
    const r = parseJSON(raw);
    $('proc-analise').style.display = 'none';
    $('proc-analise').classList.remove('visible');
    btn.disabled = false;
    renderResult(r);
  } catch(err) {
    $('proc-analise').style.display = 'none';
    $('proc-analise').classList.remove('visible');
    btn.disabled = false;
    toast(err.message || 'Erro ao gerar relatório.');
  }
}

// ── RENDER RESULTADO ──
function renderResult(r) {
  const score = Math.min(100, Math.max(0, r.score || 0));
  const scoreColor = score >= 80 ? 'var(--c-ok)' : score >= 50 ? 'var(--c-gold)' : 'var(--c-err)';
  const now = new Date().toLocaleString('pt-BR');
  const c = r.campos || {};

  function fc(key, label, fallback='') {
    const f = c[key] || {}; const st = f.status || 'ok';
    const val = f.valor || fallback || '—';
    return `<div class="field-card ${st}">
      <div class="fl">${label}</div>
      <div class="fv">${val}</div>
      ${f.obs ? `<div class="fo">${f.obs}</div>` : ''}
    </div>`;
  }

  const kmlHtml = S.kml
    ? `<div class="kml-success">
        <div class="kml-info">
          <div class="ki-title">✅ Arquivos Geoespaciais Gerados</div>
          <div class="ki-sub">${(S.kml.match(/<Placemark>/g)||[]).length} pontos · KML e Shapefile · Prontos para SIG</div>
        </div>
        <div style="display: flex; gap: .5rem; flex-wrap: wrap; margin-top: .75rem;">
          <button class="btn-dl" onclick="dlKML()">⬇️ KML (Google Earth)</button>
          <button class="btn-dl" onclick="dlShapefile()">⬇️ Shapefile (QGIS/ArcGIS)</button>
        </div>
      </div>
      <div class="kml-preview"><pre>${escHtml(S.kml.substring(0,480))}...</pre></div>`
    : `<div class="alerta warn"><span class="ai">⚠️</span><span>Arquivos geoespaciais não gerados — importe o memorial com os vértices UTM ou use o arquivo gerado anteriormente.</span></div>`;

  const html = `
  <div class="result-header">
    <h2>📄 Relatório CAR-MT — ${escHtml(getVal('f-nome') || 'Imóvel Rural')}</h2>
    <div class="result-ts">Gerado em ${now}</div>
  </div>
  <div class="result-body">

    <div class="score-strip">
      <div class="score-ring" style="background:${scoreColor}">${score}%</div>
      <div class="score-label">
        <h3>${escHtml(r.classificacao || 'Análise Concluída')}</h3>
        <p>${escHtml(r.resumo || '')}</p>
      </div>
    </div>

    <div class="r-section">
      <div class="r-section-title">🏡 Dados do Imóvel</div>
      <div class="field-grid">
        ${fc('nome','Nome do Imóvel', getVal('f-nome'))}
        ${fc('municipio','Município/UF', getVal('f-municipio'))}
        ${fc('area','Área (ha)', getVal('f-area'))}
        ${fc('perimetro','Perímetro (m)', getVal('f-perimetro'))}
        ${fc('matricula','Matrícula', getVal('f-matricula'))}
        ${fc('ccir','CCIR', getVal('f-ccir'))}
        ${fc('cns','CNS/INCRA', getVal('f-cns'))}
        ${fc('datum','Datum', getVal('f-datum'))}
        ${fc('modulos_fiscais','Módulos Fiscais','')}
        ${fc('porte_imovel','Porte do Imóvel','')}
      </div>
    </div>

    <div class="r-section">
      <div class="r-section-title">👤 Proprietário / Interessado</div>
      <div class="field-grid">
        ${fc('prop_nome','Nome', getVal('f-prop-nome'))}
        ${fc('prop_cpf','CPF', getVal('f-prop-cpf'))}
        <div class="field-card ok"><div class="fl">Tipo de Domínio</div><div class="fv">${getVal('f-tipo')}</div></div>
        <div class="field-card ok"><div class="fl">Finalidade CAR</div><div class="fv">${getVal('f-finalidade')}</div></div>
      </div>
    </div>

    <div class="r-section">
      <div class="r-section-title">📐 Engenheiro Responsável</div>
      <div class="field-grid">
        ${fc('eng_nome','Nome', getVal('f-eng-nome'))}
        ${fc('eng_crea','CREA', getVal('f-eng-crea'))}
        ${fc('eng_incra','Código INCRA', getVal('f-eng-incra'))}
        ${fc('eng_art','ART Nº', getVal('f-eng-art'))}
        ${fc('eng_data','Data Levantamento', getVal('f-eng-data'))}
      </div>
    </div>

    <div class="r-section">
      <div class="r-section-title">📝 Responsável Técnico pelo CAR</div>
      <div class="field-grid">
        <div class="field-card ${getVal('f-resp-nome')?'ok':'warn'}">
          <div class="fl">Nome</div><div class="fv">${getVal('f-resp-nome')||'—'}</div>
        </div>
        <div class="field-card ${getVal('f-resp-cpf')?'ok':'warn'}">
          <div class="fl">CPF</div><div class="fv">${getVal('f-resp-cpf')||'—'}</div>
        </div>
        <div class="field-card ${getVal('f-resp-conselho')?'ok':'warn'}">
          <div class="fl">Conselho</div><div class="fv">${getVal('f-resp-conselho')||'—'}</div>
        </div>
      </div>
    </div>

    <div class="r-section">
      <div class="r-section-title">🗺️ Coordenadas para o SIMCAR</div>
      <div class="simcar-box">
        <div class="simcar-title">📌 Área de Abrangência — copie estes valores no SIMCAR/MT</div>
        <div class="simcar-grid">
          <div class="simcar-item"><label>INFERIOR ESQUERDA · Longitude</label><div class="simcar-val">${getVal('f-inf-lon')||'—'}</div></div>
          <div class="simcar-item"><label>INFERIOR ESQUERDA · Latitude</label><div class="simcar-val">${getVal('f-inf-lat')||'—'}</div></div>
          <div class="simcar-item"><label>SUPERIOR DIREITA · Longitude</label><div class="simcar-val">${getVal('f-sup-lon')||'—'}</div></div>
          <div class="simcar-item"><label>SUPERIOR DIREITA · Latitude</label><div class="simcar-val">${getVal('f-sup-lat')||'—'}</div></div>
        </div>
        <div class="simcar-note">Datum SIRGAS2000 · Graus decimais · Negativo = Sul/Oeste · Fuso UTM ${getDatumDescription(getVal('f-datum'))}</div>
      </div>
    </div>

    ${S.validacaoGeometrica ? `
    <div class="r-section">
      <div class="r-section-title">🚀 CAR Digital — Validação Automática</div>
      <div class="card" style="margin-bottom:1rem">
        <div class="card-body">
          <p style="margin-bottom:1rem; color:var(--c-dim)">
            Comparativo entre os dados declarados e os calculados geometricamente. 
            Aceite para emitir o relatório com a versão "CAR Digital" validada.
          </p>
          <div class="validacao-grid">
            <div class="validacao-item" style="border-left:3px solid var(--c-gold)">
              <div class="fl">Área Declarada</div>
              <div class="fv">${(getVal('f-area') || '0')} ha</div>
            </div>
            <div class="validacao-item" style="border-left:3px solid var(--c-ok)">
              <div class="fl">Área Calculada</div>
              <div class="fv">${S.validacaoGeometrica.area.areaCalculada} ha</div>
            </div>
            <div class="validacao-item" style="border-left:3px solid var(--c-gold)">
              <div class="fl">Perímetro Declarado</div>
              <div class="fv">${(getVal('f-perimetro') || '0')} m</div>
            </div>
            <div class="validacao-item" style="border-left:3px solid var(--c-ok)">
              <div class="fl">Perímetro Calculado</div>
              <div class="fv">${S.validacaoGeometrica.perimetro} m</div>
            </div>
            <div class="validacao-item" style="border-left:3px solid var(--c-${S.validacaoGeometrica.area.percentual < 5 ? 'ok' : 'warn'})">
              <div class="fl">Diferença de Área</div>
              <div class="fv">${S.validacaoGeometrica.area.percentual}%</div>
            </div>
          </div>
          <div id="car-digital-actions" style="display:flex; gap:.5rem; margin-top:1rem; flex-wrap:wrap">
            <button 
              class="btn-dl" 
              style="background:var(--c-ok); color:white"
              onclick="aceitarValidacao()"
            >
              ✅ Aceitar Validação
            </button>
            <button 
              class="btn-secondary"
              onclick="recusarValidacao()"
            >
              ❌ Recusar / Editar
            </button>
          </div>
        </div>
      </div>
    </div>` : ''}

    <div class="r-section">
      <div class="r-section-title">📁 Arquivos Geoespaciais</div>
      ${kmlHtml}
    </div>

    ${(() => {
      try {
        const dadosMemorial = {
          area: getVal('f-area'),
          bioma: getVal('f-bioma'),
          vegetacao_existente: getVal('f-vegetacao-existente')
        };
        const analise = AnalisadorLayers.analisar(dadosMemorial);
        return AnalisadorLayers.renderizarHTML(analise);
      } catch (e) {
        console.error('Erro na análise de layers:', e);
        return '';
      }
    })()}

    <div class="r-section">
      <div class="r-section-title">✅ Checklist SIMCAR/MT</div>
      <div class="checklist-grid">
        ${(r.checklist||[]).map(ci=>{
          const ico = ci.status==='ok'?'✅':ci.status==='warn'?'⚠️':'❌';
          return `<div class="cl-item ${ci.status}"><span class="cl-icon">${ico}</span>${escHtml(ci.item)}</div>`;
        }).join('')}
      </div>
    </div>
    
    ${S.passivoAmbiental ? `
    <div class="r-section">
      <div class="r-section-title">🌳 Passivo Ambiental</div>
      <div class="field-grid">
        <div class="field-card ok">
          <div class="fl">Bioma</div>
          <div class="fv">${S.passivoAmbiental.biomaNome}</div>
        </div>
        <div class="field-card ok">
          <div class="fl">Área Total</div>
          <div class="fv">${S.passivoAmbiental.areaTotalHa.toFixed(4)} ha</div>
        </div>
        <div class="field-card ok">
          <div class="fl">RL Mínima</div>
          <div class="fv">${S.passivoAmbiental.rl.percentualMinimo.toFixed(0)}% (${S.passivoAmbiental.rl.minimaHa.toFixed(4)} ha)</div>
        </div>
        <div class="field-card ${S.passivoAmbiental.vegetacaoExistenteHa >= S.passivoAmbiental.rl.minimaHa ? 'ok' : 'erro'}">
          <div class="fl">Vegetação Existente</div>
          <div class="fv">${S.passivoAmbiental.vegetacaoExistenteHa.toFixed(4)} ha</div>
        </div>
        <div class="field-card ${S.passivoAmbiental.rl.deficitHa > 0 ? 'erro' : 'ok'}">
          <div class="fl">Déficit RL</div>
          <div class="fv">${S.passivoAmbiental.rl.deficitHa.toFixed(4)} ha (${S.passivoAmbiental.rl.deficitPercentual.toFixed(2)}%)</div>
        </div>
        <div class="field-card ok">
          <div class="fl">APP (30m)</div>
          <div class="fv">${S.passivoAmbiental.app.ha30.toFixed(4)} ha</div>
        </div>
        <div class="field-card ok">
          <div class="fl">APP (50m)</div>
          <div class="fv">${S.passivoAmbiental.app.ha50.toFixed(4)} ha</div>
        </div>
        <div class="field-card ok">
          <div class="fl">APP (100m)</div>
          <div class="fv">${S.passivoAmbiental.app.ha100.toFixed(4)} ha</div>
        </div>
        <div class="field-card ${S.passivoAmbiental.deficitTotalHa > 0 ? 'erro' : 'ok'}">
          <div class="fl">Déficit Total (RL + APP 30m)</div>
          <div class="fv">${S.passivoAmbiental.deficitTotalHa.toFixed(4)} ha</div>
        </div>
        <div class="field-card ok">
          <div class="fl">Estimativa de Custo de Recuperação</div>
          <div class="fv">R$ ${S.passivoAmbiental.custoRecuperacao.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
      </div>
    </div>` : ''}

    <div class="r-section">
      <div class="r-section-title">⚠️ Alertas e Observações</div>
      <ul class="alertas">
        ${(r.alertas||[]).map(a=>{
          const ico = a.tipo==='ok'?'✅':a.tipo==='warn'?'⚠️':'❌';
          return `<li class="alerta ${a.tipo}"><span class="ai">${ico}</span><span>${escHtml(a.msg||a.mensagem||'')}</span></li>`;
        }).join('')}
      </ul>
    </div>

    <div class="r-section orientacoes">
      <div class="r-section-title">📋 Passo a Passo — Preenchimento no SIMCAR/MT</div>
      <ol>${(r.orientacoes||[]).map(o=>`<li>${escHtml(o)}</li>`).join('')}</ol>
    </div>

    <div class="result-actions">
      <div style="display: flex; gap: .5rem; flex-wrap: wrap;">
        ${S.kml ? `<button class="btn-dl" onclick="dlKML()">⬇️ KML</button>` : ''}
        ${S.shapeData ? `<button class="btn-dl" onclick="dlShapefile()">⬇️ Shapefile</button>` : ''}
        <button class="btn-dl" onclick="GeradorPDF.gerar()">📄 Relatório PDF</button>
      </div>
      <div style="display: flex; gap: .5rem; flex-wrap: wrap; margin-top: .5rem;">
        <button class="btn-print-r" onclick="GeradorPDF.gerarRelatorioSimcar()">🖨️ Relatório SIMCAR Passo a Passo</button>
        <button class="btn-secondary" onclick="goToForm()">← Editar</button>
        <button class="btn-restart" onclick="restart()">🔄 Nova Análise</button>
      </div>
    </div>

  </div>`;

  const el = $('panel-result');
  el.innerHTML = html;
  showPanel('panel-result');
  setStep(3);
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── DOWNLOAD ARQUIVOS GEOESPACIAIS ──
function dlKML() {
  if (!S.kml) { toast('KML não disponível.'); return; }
  downloadFile(S.kml, 'application/vnd.google-earth.kml+xml', '.kml');
}

// ── CAR DIGITAL — ACEITAR/RECUSAR VALIDAÇÃO ──
function aceitarValidacao() {
  S.validacaoAceita = true;
  // Atualizar a interface
  const actions = $('car-digital-actions');
  if (actions) {
    actions.innerHTML = `
      <div style="display:flex; align-items:center; gap:.5rem; background:var(--c-ok-bg); border:1px solid var(--c-ok); border-radius:var(--r); padding:.5rem 1rem; flex:1">
        <span style="font-size:1.5rem">✅</span>
        <span style="color:var(--c-ok); font-weight:700">Validação Aceita! Relatório CAR Digital ativado.</span>
      </div>
      <button class="btn-dl" onclick="GeradorPDF.gerar()">📄 Gerar Relatório CAR Digital</button>
    `;
  }
  toast('Validação CAR Digital aceita!', 'ok');
}

function recusarValidacao() {
  S.validacaoAceita = false;
  goToForm();
  toast('Edite os dados e revalide.', 'warn');
}

// ── Função auxiliar para remover pontos repetidos ──
function removeDuplicatePoints(points) {
  if (points.length < 2) return points;
  
  // Primeiro, remover o último ponto se for o mesmo que o primeiro (para limpar)
  let tempPoints = [...points];
  const first = tempPoints[0];
  const last = tempPoints[tempPoints.length - 1];
  if (Math.abs(first[0] - last[0]) < 1e-8 && Math.abs(first[1] - last[1]) < 1e-8) {
    tempPoints.pop();
  }
  
  // Agora remover TODOS os pontos duplicados (não só consecutivos)
  const cleaned = [];
  const seen = new Set();
  
  for (const point of tempPoints) {
    // Criar uma chave única para o ponto com 8 casas decimais
    const key = `${point[0].toFixed(8)}|${point[1].toFixed(8)}`;
    if (!seen.has(key)) {
      seen.add(key);
      cleaned.push([parseFloat(point[0].toFixed(8)), parseFloat(point[1].toFixed(8))]);
    }
  }
  
  // Garantir que o polígono tenha pelo menos 3 pontos
  if (cleaned.length < 3) {
    return points;
  }
  
  // Fechar o polígono (adicionar o primeiro ponto no final, se necessário)
  const lastClean = cleaned[cleaned.length - 1];
  if (Math.abs(cleaned[0][0] - lastClean[0]) > 1e-8 || Math.abs(cleaned[0][1] - lastClean[1]) > 1e-8) {
    cleaned.push([cleaned[0][0], cleaned[0][1]]);
  }
  
  return cleaned;
}

// ── DOWNLOAD SHAPEFILE (ZIP com .shp, .shx, .dbf, .prj) ──
async function dlShapefile() {
  if (!S.vertices || S.vertices.length < 3) {
    toast('Vértices não disponíveis para gerar Shapefile.', 'warn');
    return;
  }

  try {
    await loadScript('./vendor/shpwrite.js', () => window.shpwrite);

    const nomeArquivo = (S.nomeImovel.replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_\-]/g,'') || 'Fazenda');

    // Obter o polígono fechado (mesmas coordenadas do KML)
    let ringGeo = null;
    if (S.shapeData && S.shapeData.features && S.shapeData.features.length > 0) {
      const polygonFeature = S.shapeData.features.find(f => f.geometry && f.geometry.type === 'Polygon');
      if (polygonFeature) {
        ringGeo = polygonFeature.geometry.coordinates[0];
      }
    }
    
    // Se não tiver shapeData, gerar as coordenadas do zero (mesma forma que o KML)
    if (!ringGeo) {
      const datumVal = getVal('f-datum');
      let zonaDetectada = 21;
      if (datumVal.includes('20')) zonaDetectada = 20;
      if (datumVal.includes('22')) zonaDetectada = 22;

      const coordsGeo = S.vertices.map(v => {
        const latLon = utmToLatLon(v.E, v.N, zonaDetectada);
        return [latLon.lon, latLon.lat]; // GeoJSON: [lon, lat]
      });
      ringGeo = coordsGeo.concat([coordsGeo[0]]); // Fechar polígono
    }

    // Remover pontos repetidos consecutivos
    ringGeo = removeDuplicatePoints(ringGeo);

    const JSZip = window.shpwrite.JSZip;
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
      { name: 'AREA_DECLIVIDADE', features: [{ type: 'Feature', properties: { ID: 1, INCLINACAO: '' }, geometry: { type: 'Polygon', coordinates: [ringGeo] } }] },
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

    // Ajustar geometria: Apenas ATP e AIR tem geometria, as outras são vazias
    for (const shp of shapefiles) {
      if (shp.name !== 'ATP' && shp.name !== 'AIR') {
        // Para camadas não-ATP/AIR, definimos geometria null e ajustamos atributos para indicar edição manual
        shp.features = shp.features.map(f => ({
          ...f,
          properties: {
            ...f.properties,
            OBS: 'EDITAR_MANUAL'
          },
          geometry: null
        }));
      }
    }

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
      finalZip.file(`${shp.name}.prj`, getSIRGAS2000GeoPRJ());
    }

    const finalBlob = await finalZip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    const url = URL.createObjectURL(finalBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nomeArquivo}_shapefile.zip`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Shapefile (.zip) com todos os 28 arquivos exportado com sucesso! Coordenadas iguais ao KML.', 'ok');
  } catch(e) {
    toast('Erro ao gerar Shapefile: ' + e.message, 'erro');
    console.error(e);
  }
}

function getSIRGAS2000GeoPRJ() {
  // PRJ geográfico SIRGAS 2000 — compatível com coordenadas Lat/Lon geradas pelo shpwrite
  return 'GEOGCS["GCS_SIRGAS_2000",DATUM["D_SIRGAS_2000",SPHEROID["GRS_1980",6378137.0,298.257222101]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433],AUTHORITY["EPSG","4674"]]';
}

function getSIRGAS2000UtmPRJ(zona) {
  if (zona == 20) {
    return 'PROJCS["SIRGAS_2000_UTM_Zone_20S",GEOGCS["GCS_SIRGAS_2000",DATUM["D_SIRGAS_2000",SPHEROID["GRS_1980",6378137.0,298.257222101]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",500000.0],PARAMETER["False_Northing",10000000.0],PARAMETER["Central_Meridian",-63.0],PARAMETER["Scale_Factor",0.9996],PARAMETER["Latitude_Of_Origin",0.0],UNIT["Meter",1.0]]';
  } else if (zona == 22) {
    return 'PROJCS["SIRGAS_2000_UTM_Zone_22S",GEOGCS["GCS_SIRGAS_2000",DATUM["D_SIRGAS_2000",SPHEROID["GRS_1980",6378137.0,298.257222101]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",500000.0],PARAMETER["False_Northing",10000000.0],PARAMETER["Central_Meridian",-51.0],PARAMETER["Scale_Factor",0.9996],PARAMETER["Latitude_Of_Origin",0.0],UNIT["Meter",1.0]]';
  } else {
    // Default 21S
    return 'PROJCS["SIRGAS_2000_UTM_Zone_21S",GEOGCS["GCS_SIRGAS_2000",DATUM["D_SIRGAS_2000",SPHEROID["GRS_1980",6378137.0,298.257222101]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",500000.0],PARAMETER["False_Northing",10000000.0],PARAMETER["Central_Meridian",-57.0],PARAMETER["Scale_Factor",0.9996],PARAMETER["Latitude_Of_Origin",0.0],UNIT["Meter",1.0]]';
  }
}

function downloadFile(content, mimeType, extension) {
  const blob = new Blob([content], { type: mimeType });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const fileName = (S.nomeImovel.replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_\-]/g,'') || 'Fazenda') + extension;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
  toast(`Arquivo ${fileName} baixado com sucesso!`, 'ok');
}

// ── RESTART ──
function restart() {
  S.kml = ''; S.shapeData = null;
  S.nomeImovel = ''; S.vertices = []; S.validacaoGeometrica = null;
  $('panel-result').innerHTML = '';
  $('file-badge').innerHTML = '';
  $('validacao-geometrica').style.display = 'none';
  $('drop-zone').style.display = '';
  $('file-input').value = '';
  // Limpar campos auto-filled
  document.querySelectorAll('.auto-filled').forEach(el => {
    el.value = ''; el.classList.remove('auto-filled');
  });
  goToUpload();
}

function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── CONFIGURAÇÃO DO BRANDING E API KEY ──
const BRANDING = {
  nome: 'CAR-MT Analisador',
  logo: null,
  
  load() {
    const saved = localStorage.getItem('branding');
    if (saved) {
      const data = JSON.parse(saved);
      this.nome = data.nome || 'CAR-MT Analisador';
      this.logo = data.logo || null;
    }
    this.apply();
  },
  
  save() {
    localStorage.setItem('branding', JSON.stringify({
      nome: this.nome,
      logo: this.logo
    }));
  },
  
  apply() {
    const headerTitle = document.querySelector('.logo-name');
    if (headerTitle) headerTitle.textContent = this.nome;
    document.title = `${this.nome} · Analisador de Memorial Descritivo`;
  }
};

function showConfigTab(tab) {
  // Desativar todas as abas
  document.querySelectorAll('.config-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.config-tab-content').forEach(c => c.style.display = 'none');
  
  // Ativar a aba selecionada
  document.querySelector(`.config-tab[onclick="showConfigTab('${tab}')"]`).classList.add('active');
  document.getElementById(`config-tab-${tab}`).style.display = 'block';
}

function saveConfig() {
  // Salvar API Key
  const key = $('api-key-input').value.trim();
  if (key && key.startsWith('gsk_')) {
    GROQ_API_KEY = key;
    localStorage.setItem('groq_api_key', key);
  }
  
  // Salvar Branding
  BRANDING.nome = $('branding-nome-input').value.trim() || 'CAR-MT Analisador';
  BRANDING.logo = $('branding-logo-input').value.trim() || null;
  BRANDING.save();
  BRANDING.apply();
  
  $('config-overlay').style.display = 'none';
  toast('Configurações salvas com sucesso!', 'ok');
}

function skipConfig() {
  $('config-overlay').style.display = 'none';
  toast('Modo offline ativado. Funcionalidades de IA desabilitadas.', 'warn');
}

function reconfigureAPI() {
  $('config-overlay').style.display = 'flex';
  $('api-key-input').value = GROQ_API_KEY;
  $('branding-nome-input').value = BRANDING.nome;
  $('branding-logo-input').value = BRANDING.logo || '';
  $('api-key-input').focus();
}

// ── SERVICE WORKER PARA PWA ──
function registerServiceWorker() {
  // Skip registration when running via file:// protocol to avoid CORS errors
  if (window.location.protocol === 'file:') {
    console.warn('ServiceWorker registration skipped (file protocol).');
    return;
  }
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(registration => {
          console.log('ServiceWorker registrado com sucesso:', registration.scope);
        })
        .catch(error => {
          console.log('Erro ao registrar ServiceWorker:', error);
        });
    });
  }
}

// Verificar se há configurações salvas
window.addEventListener('DOMContentLoaded', () => {
  // Carregar branding
  BRANDING.load();
  
  // Carregar API Key
  const savedKey = localStorage.getItem('groq_api_key');
  if (savedKey && savedKey.startsWith('gsk_')) {
    GROQ_API_KEY = savedKey;
    $('config-overlay').style.display = 'none';
  }
  
  // Registrar Service Worker
  registerServiceWorker();
});