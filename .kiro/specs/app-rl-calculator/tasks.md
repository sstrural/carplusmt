# Implementation Plan: Calculadora APP/RL

## Overview

Implementação incremental da Calculadora APP/RL para o CAR-MT Analisador, utilizando HTML5/CSS3/JavaScript vanilla sem frameworks. Stack offline com dados pré-carregados (IBGE 1:50k), cálculos em Web Workers, armazenamento em IndexedDB, exportação para PDF/JSON/CSV.

Fases: (1) Setup & Data Infrastructure, (2) Core Algorithms, (3) UI Components, (4) Integration & Exports, (5) Testing & Performance, (6) Deployment.

## Tasks

- [x] 1. Setup e Infraestrutura de Dados

  - [x] 1.1 Configurar estrutura de projeto e dependências
    - Criar diretórios: `/src/{modules,workers,utils,data}`, `/public/{assets,data}`, `/tests`
    - Setup package.json com build scripts (webpack/esbuild), test runner (Jest/Vitest), linter (ESLint)
    - Configurar GitHub Actions para CI/CD básico
    - _Requirements: Não-funcional (Performance, Offline)_

  - [x] 1.2 Implementar sistema de armazenamento de dados (IndexedDB)
    - Criar módulo `storageManager.js` com API CRUD para IndexedDB
    - Implementar schema para: hidrografia, DEM tiles, histórico de cálculos, config de usuário
    - Adicionar métodos: `loadHydrography()`, `cacheRasterTile()`, `saveCalculation()`, `getCachedData()`
    - Testar inicialização e persistência de dados
    - _Requirements: 8.1, 8.4, 8.7, Não-funcional (Offline, Data Persistence)_

  - [x] 1.3 Carregar hidrografia base de MT pré-bundled (IBGE 1:50k)
    - Converter shapefile hidrografia IBGE para GeoJSON comprimido (~50MB)
    - Integrar arquivo comprimido no bundle (ou servir comprimido)
    - Implementar descompressão on-first-load para IndexedDB
    - Validar que rios/córregos/nascentes são identificáveis
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 1.4 Implementar spatial index para queries rápidas de hidrografia
    - Integrar RBush (R-tree library) para indexação espacial eficiente
    - Criar método `queryWatercourses(bbox)` para retornar rios/córregos que intersectam bbox
    - Testar performance com imóvel grande (5000+ ha)
    - _Requirements: 8.6, Não-funcional (Performance)_

  - [x] 1.5 Preparar suporte a DEM (Digital Elevation Model) remoto com cache
    - Implementar carregador de tiles DEM 256x256 (GEBCO, USGS, ou similar)
    - Adicionar cache em IndexedDB para tiles já baixados
    - Implementar fallback gracioso se DEM indisponível
    - _Requirements: 3.1, 3.4, 3.5_

- [x] 2. Algoritmos Principais: Detector de APP por Cursos d'Água

  - [x] 2.1 Implementar núcleo de detecção de APP por hidrografia
    - Criar módulo `appDetector.js` com função `detectAPPWaterways(imovelPolygon, hidrographyFeatures)`
    - Implementar classificação de largura de rio (< 10m = 30m buffer, 10-50m = 50m buffer, > 50m = 100m buffer)
    - Usar Turf.js para operações geométricas (buffer, intersection, area)
    - Retornar array de APP_Waterway objects com {name, bufferDistance, area, intersectionLength}
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x]* 2.2 Escrever property-based test para buffers de hidrografia
    - **Property 1: APP Buffer Distance by Watercourse**
    - **Valida: Requirements 1.2, 1.3, 1.4**
    - Gerar rivercourse widths aleatórios (5m-100m+) → Verificar que buffers = [30, 50, 100]m conforme
    - Gerar polygons aleatórios → Verificar que APP_area ≤ imovel_area sempre
    - Min 100 exemplos, max 1000
    - _Requirements: 1.2-1.4_

  - [x] 2.3 Implementar validação de projeção e reprojeção SIRGAS2000
    - Detectar e reprojetar para SIRGAS2000 se necessário
    - Validar que coordenadas estão em zona UTM correta (21S para MT)
    - _Requirements: 1.7, 7.1 (Validação de Entrada)_

  - [x] 2.4 Testar accuracy de detecção e clipping com imóvel complexo
    - Usar imóvel real de teste (ex: Sapezal, 600 ha, 3 rios)
    - Validar que todas as interseções são detectadas
    - Validar que buffers fora do imóvel são clipped
    - Precisão: APP total ±0.05 ha vs referência manual
    - _Requirements: 1.1, 1.5, 1.6_

- [x] 3. Algoritmos Principais: Detector de APP por Nascentes

  - [x] 3.1 Implementar detecção de APP por nascentes
    - Criar função `detectAPPNascentes(imovelPolygon, nascentePoints, bufferRadius=50)`
    - Criar buffers circulares de 50m ao redor de cada nascente
    - Intersectar com polígono imóvel, clicar buffer ao perímetro
    - Retornar array de APP_Nascente objects {id, coordinates, bufferArea, status}
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.2 Implementar merge de buffers sobrepostos de nascentes
    - Usar union geometries (Turf.unions) para combinar buffers que se sobrepõem
    - Evitar double-counting: verificar soma pré-union vs pós-union
    - _Requirements: 2.2, 2.3_

  - [x]* 3.3 Escrever property-based test para buffers de nascentes
    - **Property 3: Nascente Buffers Merge**
    - **Valida: Requirements 2.2**
    - Gerar sets aleatórios de nascentes {0, 1, 2, 5, 10 pontos} em grid aleatório
    - Calcular área com merge vs sem merge → Verificar que area_merged ≤ area_unmerged (monotonicidade)
    - Gerar nascentes com overlap patterns variados
    - Min 50 exemplos, max 500
    - _Requirements: 2.2_

  - [x] 3.4 Implementar flagging de nascentes em limites
    - Detecção de nascentes próximas (< 5m) ao boundary do imóvel
    - Marcar para revisão manual em UI
    - _Requirements: 2.5_



- [x] 4. Algoritmos Principais: Detector de APP por Encostas

  - [x] 4.1 Implementar análise de declividade a partir de DEM
    - Criar função `detectAPPSlopes(imovelPolygon, demRasterData)`
    - Para cada pixel: calcular slope_degrees = atan(dz/dx) * 180/π
    - Classificar: SE slope > 45° → APP_ENCOSTA, SE local_maximum → APP_TOPO
    - Retornar map de pixels com classificação + area agregada
    - Validar resolução mínima (warning se > 30m pixel)
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6_

  - [x]* 4.2 Escrever property-based test para classificação de encostas
    - **Property 7: Slope Classification Boundary**
    - **Valida: Requirements 3.2**
    - Gerar DEMs sintéticos com slopes variados [0°, 20°, 44.9°, 45°, 45.1°, 60°, 90°]
    - Verificar classificação: 45° exatamente deve estar em APP_ENCOSTA (inclusive)
    - Gerar DEMs com ruído aleatório
    - Min 100 exemplos
    - _Requirements: 3.2_

  - [x] 4.3 Implementar detecção de topos de morro (local maxima)
    - Usar sliding window 3x3 para encontrar máximos locais
    - Criar circular buffer de 100m ao redor de cada summit
    - Validar que não há overlap duplo com encostas (union)
    - _Requirements: 3.3, 3.6_

  - [x] 4.4 Testar avisos sobre qualidade de dados DEM
    - Validar resolução, range de valores, presença de gaps
    - Gerar warning se DEM ausente ou resolução inadequada
    - _Requirements: 3.5_



- [x] 5. Algoritmos Principais: Calculador de Reserva Legal

  - [x] 5.1 Implementar classificação de bioma por coordenadas
    - Criar função `classifyBioma(municipio, coordinates)`
    - Query base de dados municipal IBGE (pré-carregada)
    - Retornar {bioma: "Amazonia_Legal" | "Cerrado", confidence: "high" | "medium"}
    - Para municípios em limite: aplicar 80% (mais restritivo)
    - _Requirements: 4.1, 4.4, 4.5_

  - [x]* 5.2 Escrever property-based test para classificação de bioma
    - **Property 5: Bioma Classification**
    - **Valida: Requirements 4.2, 4.3**
    - Gerar coordenadas aleatórias em MT (bbox válido)
    - Verificar que bioma ∈ {"Amazônia Legal", "Cerrado"} sempre
    - Verificar que municípios em limite recebem 80% RL
    - Min 200 exemplos
    - _Requirements: 4.2-4.3_

  - [x] 5.3 Implementar cálculo de RL mínima obrigatória
    - Função `calculateRLMinima(totalArea, bioma)`
    - RL_minima = totalArea * (80% se Amazônia | 35% se Cerrado)
    - Retornar {rlMinima, rlPercentage, biomaUsed}
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 5.4 Escrever unit tests para cálculo de RL (casos específicos)
    - Test: 1000 ha Amazônia → RL = 800 ha
    - Test: 1000 ha Cerrado → RL = 350 ha
    - Test: 500 ha em município misto → RL aplicado corretamente
    - Test: 1 ha → Rounding correto
    - _Requirements: 4.1-4.4_



- [x] 6. Algoritmos Principais: Integração de Cobertura Nativa

  - [x] 6.1 Implementar carregador de dados de cobertura nativa (MapBiomas/PRODES)
    - Criar função `loadNativeCoverage(imovelBbox, dataSource)`
    - Suportar sources: MapBiomas (preferida), PRODES, manual input
    - Retornar Promise com raster data ou fallback para manual input
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 6.2 Implementar intersecção de raster de cobertura com imóvel
    - Função `calculateNativeCoverage(imovelPolygon, rasterData)`
    - Para cada pixel em overlap: SE valor ∈ [floresta_nativa, cerrado_nativo, ...] → accumulate area
    - Classificar por tipo de vegetação (Floresta, Cerrado, etc.)
    - Retornar {totalCoverageHa, coveragePercentage, byType: {...}}
    - _Requirements: 5.2, 5.4, 5.5_

  - [x]* 6.3 Escrever property-based test para cálculo de cobertura
    - **Property 6: Coverage Area ≤ Imovel**
    - **Valida: Requirements 5.2**
    - Gerar rasters aleatórios + polygons aleatórios
    - Verificar que coverage_area ≤ imovel_area sempre
    - Verificar que soma de tipos = total (consitência)
    - Min 100 exemplos
    - _Requirements: 5.2_

  - [x] 6.4 Implementar warnings sobre antigüidade de dados
    - Se coverage data > 2 anos: display warning
    - Permitir override manual de percentual
    - _Requirements: 5.3, 5.6_

  - [x] 6.5 Implementar cálculo de RL Deficit
    - Função `calculateRLDeficit(rlMinima, currentCoverage)`
    - RLDeficit = MAX(0, rlMinima - currentCoverage)
    - Retornar {deficitHa, deficitPercentage}
    - _Requirements: 5.5, 5.6_

  - [ ]* 6.6 Escrever property-based test para RL Deficit
    - **Property 4: RL Deficit Non-Negative**
    - **Valida: Requirements 4.6, 5.5**
    - Gerar RL_minima e coverage aleatórios (0-100% de property area)
    - Verificar que RL_deficit ≥ 0 sempre (monotonicidade)
    - Verificar que RL_deficit ≤ RL_minima
    - Min 500 exemplos
    - _Requirements: 4.6, 5.5_



- [x] 7. Algoritmo Principal: Consolidador de Passivo Ambiental

  - [ ] 7.1 Implementar consolidação de APP total
    - Função `consolidateAPP(appWaterways, appNascentes, appSlopes)`
    - Somar componentes respeitando que podem se sobrepor (usar union se necessário)
    - Retornar {appTotalHa, components: {waterways, nascentes, slopes}}
    - _Requirements: 6.1 (conceitual)_

  - [ ] 7.2 Implementar consolidação de Passivo Ambiental
    - Função `consolidatePassivo(appTotal, rlMinima, currentCoverage, rlDeficit)`
    - Determinar status: "CONFORME" SE rlDeficit ≤ 0 AND appDeficit ≤ 0, SENÃO "PASSIVO"
    - Calcular total_regularization_area = appDeficit + rlDeficit
    - Estimar custo usando taxa INCRA/CNA (R$/ha)
    - Priorizar por zona (RL primeira, depois APP)
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 7.3 Escrever unit tests para priorização de recuperação
    - **Property 8: Prioritization Rank**
    - **Valida: Requirements 6.3**
    - Test: RL_deficit=100 ha, APP_deficit=50 ha → Rank: RL primeiro
    - Test: Múltiplas APP components → Ranked by area
    - Min 20 casos
    - _Requirements: 6.3_

  - [ ] 7.4 Implementar checklist de próximos passos
    - Gerar list de ações recomendadas (vistoria, drone survey, etc.)
    - Fornecer links para Pronaf/Pronamp
    - Retornar em formato legível para PDF
    - _Requirements: 6.3, 6.6_

  - [ ] 7.5 Implementar cálculo de custo de regularização
    - Integrar taxa INCRA/CNA (configurável, default R$ 8.500/ha)
    - Função `estimateCost(areaToRecover, ratePerHa)`
    - Retornar {costPerHa, totalCost}
    - _Requirements: 6.3_

  - [ ]* 7.6 Escrever property-based test para cálculo de custo
    - **Property 10: Cost Calculation Linear**
    - **Valida: Requirements 6.3**
    - Gerar areas aleatórias (0-10000 ha) e rates aleatórios (1000-50000 R$/ha)
    - Verificar: cost = area * rate (linearidade)
    - Verificar: cost_1 + cost_2 = cost_total (aditividade)
    - Min 100 exemplos
    - _Requirements: 6.3_



- [x] 8. Algoritmo Principal: Detector de APP por Nascentes (Propriedade Específica)

  - [ ]* 8.1 Escrever property-based test para proximidade de nascentes
    - **Property 9: Nascente Proximity**
    - **Valida: Requirements 2.4, 2.5**
    - Gerar nascentes com distâncias aleatórias ao boundary (0-200m)
    - Verificar: SE distância ≤ 100m → Include no APP calc, SE ≤ 5m → Flag para review
    - Gerar boundary complexas (convex, concave)
    - Min 50 exemplos
    - _Requirements: 2.4-2.5_

- [ ] 9. Checkpoint 1 - Validar Algoritmos Core

  - [ ] 9.1 Integrar todos algoritmos (APP, RL, Cobertura, Passivo) em módulo unificado
    - Criar `appRlCalculator.js` que orquestra fluxo completo
    - Testar fluxo: imovel → APP detect → RL calc → Coverage → Passivo
    - Validar que resultados são consistentes internamente
    - Ensure all tests pass, ask the user if questions arise.
    - _Requirements: 1-6 (integração)_



- [ ] 10. Componentes UI: Painel de Entrada de Imóvel

  - [ ] 10.1 Implementar painel de input para dados do imóvel
    - Criar form HTML com campos: Nome, Município, Área (ha), Coordenadas (lat/lon ou UTM)
    - Implementar validação de input (área > 0.1 ha, coord em MT, etc.)
    - Exibir preview de bbox calculado
    - _Requirements: 7.1, Não-funcional (Accessibility, Mobile Responsive)_

  - [ ] 10.2 Implementar opções de input: Upload GeoJSON, Desenho no mapa, Import do CAR
    - 3 botões/tabs: "Upload File", "Draw on Map", "Import from CAR"
    - Validar formato e reprojetar para SIRGAS2000 se necessário
    - _Requirements: 8.5, 10.1_

  - [ ] 10.3 Implementar desenho de polígono no mapa (Leaflet.Draw ou similar)
    - Permitir usuário desenhar perímetro do imóvel
    - Permitir edição de vértices
    - Calcular área dinamicamente
    - Armazenar em GeoJSON
    - _Requirements: 7.1_

  - [ ] 10.4 Testar validação de entrada com coordenadas inválidas
    - Test invalid: coords fora de MT, área < 0.1 ha, polígono não-fechado
    - Exibir mensagens de erro claras
    - _Requirements: 7 (Tratamento de erros)_



- [ ] 11. Componentes UI: Mapa Interativo

  - [ ] 11.1 Implementar viewport de mapa com Mapbox GL ou Leaflet
    - Carregar basemap (OSM ou Mapbox style)
    - Renderizar polígono imóvel (boundary preta)
    - Suportar zoom 1:100,000 até 1:5,000
    - Zoom automático ao imóvel na inicialização
    - _Requirements: 7.1, 7.2, 7.5, 7.6_

  - [ ] 11.2 Implementar layers dinâmicas para APP (hidrografia, nascentes, encostas)
    - Layer 1: APP_Waterways (blue buffers, toggle)
    - Layer 2: APP_Nascentes (light blue circles, toggle)
    - Layer 3: APP_Encostas (purple overlay, toggle if DEM available)
    - Layer 4: Native_Coverage (dark green, toggle)
    - Layer 5: RL_Required_Zone (green 80%/35%, toggle)
    - Layer 6: RL_Deficit_Zone (yellow, toggle)
    - Usar cores conforme design (azul/roxo/verde/amarelo)
    - _Requirements: 7.1, 7.4_

  - [ ] 11.3 Implementar hover tooltips e click handlers
    - Hover: exibir area (ha), percentual, nome de feature
    - Click: exibir detalhes (zona de APP, reason for classification)
    - Implementar em JavaScript vanilla
    - _Requirements: 7.2, 7.3_

  - [ ] 11.4 Implementar layer toggle buttons
    - 6 checkboxes para mostrar/ocultar cada layer
    - Estado salvo em sessionStorage
    - Performance: map não re-render se layer já visível
    - _Requirements: 7.4_

  - [ ] 11.5 Testar performance com imóvel grande (5000+ ha)
    - Renderizar mapa com geometry complexa
    - Validar que zoom/pan remain smooth
    - Profiling: < 200ms para render, < 50ms para hover
    - _Requirements: Não-funcional (Performance)_

  - [ ] 11.6 Implementar export de mapa como imagem PNG/PDF
    - Botão "Export Map as Image"
    - Usar Canvas ou html2canvas
    - Incluir legend, scale, título
    - _Requirements: 7.8_



- [ ] 12. Componentes UI: Painéis de Resultados (APP, RL, Passivo)

  - [ ] 12.1 Implementar painel de resultados APP (hidrografia, nascentes, encostas)
    - Exibir: APP_Total (ha), % do imóvel
    - Breakdown por componente (hidrografia, nascentes, slopes)
    - Para cada rio/nascente: nome, área, status
    - Mostrar warnings (DEM unavailable, baixa confiança)
    - _Requirements: 1.1-1.6, 2.1-2.5, 3.1-3.6_

  - [ ] 12.2 Implementar painel de resultados RL
    - Exibir: Bioma, RL%, RL_Minima (ha), Cobertura_Atual (ha), RL_Deficit
    - Breakdown de cobertura por tipo (Floresta, Cerrado, etc.)
    - Source de dados (MapBiomas version, data de atualização)
    - _Requirements: 4.1-4.7, 5.1-5.7_

  - [ ] 12.3 Implementar painel consolidado de Passivo Ambiental
    - Status badge (CONFORME / PASSIVO)
    - Resumo: APP_total, RL_minima, Coverage_atual, Deficit total
    - Priorização de zonas (RL primeiro, depois APP)
    - Estimativa de custo (R$), taxa por ha
    - Confidence level (Alta/Média/Baixa com justificativa)
    - _Requirements: 6.1-6.6_

  - [ ] 12.4 Implementar checklist de próximos passos
    - Lista dinâmica baseada em situação (APP deficit, RL deficit, etc.)
    - Links para programas (Pronaf, Pronamp)
    - _Requirements: 6.4_

  - [ ] 12.5 Testar responsividade dos painéis em tablet (iPad, Android tablet)
    - Layouts em landscape e portrait
    - Touchable elements (min 44x44px)
    - _Requirements: Não-funcional (Mobile Responsive)_



- [ ] 13. Checkpoint 2 - UI e Visualização

  - [ ] 13.1 Integrar componentes UI com cálculos core
    - Fluxo: Input Panel → Map Viewport → Results Panels
    - Executar cálculos quando imóvel é confirmado
    - Atualizar layers do mapa conforme resultados
    - Exibir painéis com dados calculados
    - Ensure all tests pass, ask the user if questions arise.
    - _Requirements: 7.1-7.8, 10.1_



- [ ] 14. Geração de Relatórios e Exports

  - [ ] 14.1 Implementar gerador de relatório PDF
    - Usar library como PDFKit ou jsPDF
    - Estrutura: Header, Executive Summary, APP breakdown, RL breakdown, Mapa, Custos, Próximos passos
    - Incluir: nome imóvel, município, data, tecnician branding (name, CREA, email)
    - Formatação A4 portrait, margens 2.5cm
    - _Requirements: 9.1-9.6_

  - [ ] 14.2 Implementar export em JSON
    - Estrutura conforme design.md (app_detection_result, rl_calculation, environmental_liability)
    - Incluir metadata (timestamp, source versions, confidence)
    - _Requirements: 6.1, 10.1_

  - [ ] 14.3 Implementar export em CSV
    - Formato: linha por componente (rio, nascente, slope, RL, cobertura, custo)
    - Columns: type, name, area_ha, percentage, status
    - _Requirements: 6.5_

  - [ ] 14.4 Implementar auto-naming de arquivos exportados
    - Padrão: `{PropertyName}_APP_RL_{YYYY-MM-DD}.{pdf|json|csv}`
    - Download automático ao clicar botão
    - _Requirements: 9.6, 6.1_

  - [ ] 14.5 Testar geração de PDF com dados complexos
    - Propriedade real grande (5000+ ha, 20+ features)
    - Validar que mapa é legível, cores corretas
    - Size < 5MB
    - Printing: A4 portrait
    - _Requirements: 9.1-9.6, Não-funcional (Printing)_



- [ ] 15. Integração com SIMCAR e CAR-MT Existente

  - [ ] 15.1 Implementar API de sincronização com formulário SIMCAR
    - Criar método `syncToSIMCAR()` que passa: app_total_ha, rl_percentage, rl_deficit_ha
    - Auto-popular campos relevantes no form CAR-MT
    - Preservar dados na sessão para referência
    - _Requirements: 10.1, 10.2_

  - [ ] 15.2 Implementar bidirectional data sync
    - Se usuário edita valores APP/RL no SIMCAR → refletir no Calculator
    - Se app/RL é recalculado → atualizar SIMCAR automaticamente
    - Alert se inconsistências detectadas
    - _Requirements: 10.3, 10.4_

  - [ ] 15.3 Integrar APP/RL data com exportação final CAR
    - Incluir APP/RL results em KML export
    - Incluir em JSON export
    - Validar que exported files têm dados completos
    - _Requirements: 10.6_

  - [ ] 15.4 Testar fluxo de integração end-to-end
    - Draw imovel no CAR → Switch to APP/RL calculator
    - Calculate APP/RL → Auto-populate SIMCAR fields
    - Export CAR completo → Validar que APP/RL data included
    - _Requirements: 10.1-10.6_



- [ ] 16. Performance, Web Workers e Otimizações

  - [ ] 16.1 Implementar Web Worker para cálculos pesados
    - Offload: APP buffer calculations, DEM analysis, raster intersection
    - Main thread: UI updates, map rendering, form interactions
    - Post results via `self.postMessage()` e update UI
    - _Requirements: Não-funcional (Performance)_

  - [ ] 16.2 Implementar spatial indexing para queries rápidas
    - RBush para hidrografia (já feito em 1.4, integrar aqui)
    - Cache de tiles DEM (lazy loading)
    - LRU cache para últimos 3 cálculos
    - _Requirements: Não-funcional (Performance, Scalability)_

  - [ ] 16.3 Testar performance com propriedades grandes (5000+ ha)
    - Benchmark: < 10 segundos para APP/RL completo
    - Mapa interativo durante cálculo (não bloqueia)
    - Memory usage < 500MB
    - _Requirements: Não-funcional (Performance)_

  - [ ] 16.4 Implementar progress indicator para operações longas
    - Exibir barra de progresso durante detecção APP
    - Exibir mensagem "Calculando RL..." etc.
    - Permitir cancelamento de operação
    - _Requirements: 7 (UX)_



- [ ] 17. Testes de Integração e Validação End-to-End

  - [ ] 17.1 Implementar suite de testes de integração
    - Test fluxo completo: imovel import → APP calc → RL calc → Coverage → Passivo → Export
    - Usar imóveis reais de teste (Sapezal, Sorriso, etc.)
    - Validar resultados contra referência manual (±5% tolerância)
    - _Requirements: 1-10 (integração)_

  - [ ] 17.2 Testar fluxos offline
    - Desligar internet, verificar que funciona com dados pré-carregados
    - Verificar que avisos são exibidos para dados remotos indisponíveis
    - Validar que dados persistem entre sessões (IndexedDB)
    - _Requirements: 8.1-8.7, Não-funcional (Offline)_

  - [ ] 17.3 Testar acessibilidade (WCAG 2.1 AA)
    - Verificar contraste de cores (todos layers legíveis)
    - Verificar navegação por teclado (tab, enter, arrows)
    - Testar com screen reader (NVDA ou similar)
    - _Requirements: Não-funcional (Accessibility)_

  - [ ] 17.4 Testar dados de entrada inválidos/edge cases
    - Imóvel com zero hidrografia → Retorna 0 APP corretamente
    - Imóvel 100% APP → Handled corretamente
    - Imóvel em limites de bioma → RL aplicado corretamente
    - Coordenadas inválidas → Error message clara
    - _Requirements: 7 (Error Handling)_



- [ ] 18. Checkpoint 3 - Testes e Qualidade

  - [ ] 18.1 Executar suite completa de testes
    - Unit tests: 100% de algoritmos core (coverage > 90%)
    - Property-based tests: 10 correctness properties (todos passam)
    - Integration tests: 5+ fluxos end-to-end (todos passam)
    - Performance tests: Todos benchmarks atingem targets
    - Ensure all tests pass, ask the user if questions arise.
    - _Requirements: 1-10 (overall quality)_



- [ ] 19. Deployment e Documentação

  - [ ] 19.1 Preparar build e deployment para Vercel
    - Configurar `vercel.json` com environment variables (MAP_TOKEN, etc.)
    - Build script: webpack/esbuild, minificação, sourcemaps
    - Otimizar bundle size (< 2MB gzipped para JS core)
    - _Requirements: Não-funcional (Deployment)_

  - [ ] 19.2 Fazer deploy preview no Vercel
    - Deploy branch de desenvolvimento
    - Testar em ambiente staging (live)
    - Validar que offline funciona (service worker, IndexedDB)
    - _Requirements: Não-funcional (Deployment)_

  - [ ] 19.3 Documentar API e componentes
    - JSDoc comments em todas funções principais
    - README com instruções de setup, build, test
    - Diagrama de arquitetura (módulos, fluxo de dados)
    - _Requirements: Não-funcional (Documentation)_

  - [ ] 19.4 Criar guia de uso para técnicos (em português)
    - Screenshots de cada painel
    - Passo-a-passo: carregar imóvel → calcular APP/RL → exportar PDF
    - Explicação de cada campo e resultado
    - Troubleshooting (dados offline, DEM indisponível, etc.)
    - _Requirements: Não-funcional (User Documentation)_

  - [ ] 19.5 Preparar dados para field testing com technicians MT
    - Compilar dataset de 5-10 imóveis reais em MT (Sapezal, Sorriso, etc.)
    - Validar resultados contra cálculos manuais/referência
    - Criar form de feedback para technicians (usability, accuracy, suggestions)
    - _Requirements: Não-funcional (Field Validation)_



- [ ] 20. Final Checkpoint - Production Ready

  - [ ] 20.1 Revisão final e deploy para produção
    - Executar smoke tests em produção (staging + live)
    - Validar que offline funciona
    - Confirmar que todos property-based tests passam
    - Performance: < 10 segundos para imóvel típico
    - Zero console errors ou warnings
    - Ensure all tests pass, ask the user if questions arise.
    - _Requirements: 1-10 (overall compliance)_

  - [ ] 20.2 Fazer rollout iterativo para technicians MT
    - Deploy beta para grupo piloto (2-3 technicians)
    - Coletar feedback em campo (1-2 semanas)
    - Iterar conforme feedback
    - Deploy para todos technicians (full rollout)
    - _Requirements: Não-funcional (Field Validation, Iterative Deployment)_

---

## Notes

### Correctness Properties Mapping

A seguir, mapeamento das 10 correctness properties do design para tasks de teste:

| # | Property | Design Ref | Task |
|---|----------|-----------|------|
| 1 | APP Buffer Distance by Watercourse | Design §6.1 | 2.2 |
| 2 | APP Area Never Exceeds Imovel | Design §6.1 | 2.2 |
| 3 | Nascente Buffers Merge | Design §6.2 | 3.3 |
| 4 | RL Deficit Non-Negative | Design §6.5 | 6.6 |
| 5 | Bioma Classification | Design §6.4 | 5.2 |
| 6 | Coverage Area ≤ Imovel | Design §6.5 | 6.3 |
| 7 | Slope Classification Boundary | Design §6.3 | 4.2 |
| 8 | Prioritization Rank | Design §6.6 | 7.3 |
| 9 | Nascente Proximity | Design §6.2 | 8.1 |
| 10 | Cost Calculation Linear | Design §6.6 | 7.6 |

### Estratégia de Paralelização

Tasks que podem rodar em paralelo (após conclusão de suas dependências):
- Wave 0: 1.1-1.5 (Setup & Data) - execução sequencial, setup base
- Wave 1: 2.1, 3.1, 4.1, 5.1, 6.1 (Algorithm cores) - podem rodar em paralelo, não compartilham código
- Wave 2: 2.2-2.4, 3.2-3.4, 4.2-4.4, 5.2-5.4, 6.2-6.6, 7.1-7.6, 8.1 (Tests + complementos) - paralelo após cores
- Wave 3: 9.1, 10.1-10.4, 11.1-11.6, 12.1-12.5 (UI components) - paralelo após algoritmos
- Wave 4: 13.1 (Integração UI + Core)
- Wave 5: 14.1-14.5 (Exports) - sequencial, depende de 13.1
- Wave 6: 15.1-15.4 (SIMCAR integration) - paralelo após 14
- Wave 7: 16.1-16.4 (Performance) - paralelo após 15
- Wave 8: 17.1-17.4 (Integration tests) - sequencial, após 16
- Wave 9: 18.1 (Checkpoint 3)
- Wave 10: 19.1-19.5, 20.1-20.2 (Deployment) - sequencial

### Tecnologias Esperadas

- **Frontend**: HTML5, CSS3, JavaScript vanilla (ES6+)
- **Mapas**: Leaflet.js ou Mapbox GL JS
- **Geometria**: Turf.js, ol/geometry, ou similar
- **Rasters**: GeoRaster, Geotiff.js, ou canvas-based
- **Spatial Index**: RBush
- **Storage**: IndexedDB (native browser)
- **Workers**: Web Workers (native browser)
- **PDF**: jsPDF ou PDFKit
- **Build**: Webpack ou esbuild
- **Test**: Jest, Vitest, ou fast-check (para PBT)
- **Deploy**: Vercel (já configurado)

### Critérios de Sucesso por Checkpoint

**Checkpoint 1 (Task 9)**: Todos 6 algoritmos funcionam, 10 property tests passam com > 100 exemplos cada

**Checkpoint 2 (Task 13)**: UI renderiza corretamente, fluxo completo (input → calc → results) funciona, mapa interativo

**Checkpoint 3 (Task 18)**: Suite de testes passa, performance atingida, offline funciona

**Checkpoint Final (Task 20)**: Deploy em produção, field testing com technicians, zero issues críticos



## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1.1", "1.2", "1.3"]
    },
    {
      "id": 1,
      "tasks": ["1.4", "1.5"]
    },
    {
      "id": 2,
      "tasks": ["2.1", "3.1", "4.1", "5.1", "6.1"]
    },
    {
      "id": 3,
      "tasks": ["2.2", "2.3", "2.4", "3.2", "3.3", "3.4"]
    },
    {
      "id": 4,
      "tasks": ["4.2", "4.3", "4.4", "5.2", "5.3"]
    },
    {
      "id": 5,
      "tasks": ["5.4", "6.2", "6.3", "6.4", "6.5"]
    },
    {
      "id": 6,
      "tasks": ["6.6", "7.1", "7.2"]
    },
    {
      "id": 7,
      "tasks": ["7.3", "7.4", "7.5", "7.6", "8.1"]
    },
    {
      "id": 8,
      "tasks": ["10.1", "10.2", "10.3", "10.4", "11.1", "11.2"]
    },
    {
      "id": 9,
      "tasks": ["11.3", "11.4", "11.5", "11.6", "12.1", "12.2"]
    },
    {
      "id": 10,
      "tasks": ["12.3", "12.4", "12.5"]
    },
    {
      "id": 11,
      "tasks": ["14.1", "14.2", "14.3", "14.4", "14.5"]
    },
    {
      "id": 12,
      "tasks": ["15.1", "15.2", "15.3", "15.4"]
    },
    {
      "id": 13,
      "tasks": ["16.1", "16.2", "16.3", "16.4"]
    },
    {
      "id": 14,
      "tasks": ["17.1", "17.2", "17.3", "17.4"]
    },
    {
      "id": 15,
      "tasks": ["19.1", "19.2", "19.3", "19.4", "19.5"]
    }
  ]
}
```

### Explicação do DAG

- **Wave 0-1**: Setup de infraestrutura (IndexedDB, hidrografia, spatial index, DEM)
- **Wave 2**: Inicialização de 5 algoritmos core em paralelo (APP hidrografia, APP nascentes, APP encostas, RL calc, Coverage integration)
- **Wave 3-7**: Testes property-based e complementos dos algoritmos (rodam em paralelo, testam cada componente)
- **Wave 8-10**: Componentes UI em paralelo (input panel, mapa, painéis de resultado)
- **Wave 11-13**: Integração, exports, SIMCAR sync, performance otimizations em paralelo
- **Wave 14**: Integration tests (sequencial após otimizações)
- **Wave 15**: Deployment e documentação (sequencial no final)

**Nota**: Checkpoints (9.1, 13.1, 18.1, 20.1) não aparecem no DAG pois não são tarefas de codificação; são marcos de validação.

---

## Próximos Passos

Após aprovação deste tasks.md:

1. **Abrir tasks.md** na IDE
2. **Clicar "Start task"** para a primeira task (1.1)
3. **Executar sequencialmente** dentro de cada wave
4. **Paralelizar entre waves** quando fizer sentido
5. **Validar em cada checkpoint** antes de prosseguir
6. **Iterar com feedback** de field testing em MT

**Timeline estimada**: 8-12 semanas para MVP com field testing iterativo

