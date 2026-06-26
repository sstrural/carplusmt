# Design Document: Calculadora APP/RL

## Overview

A **Calculadora APP/RL** é um módulo core offline que detecta automaticamente Áreas de Preservação Permanente (APP) e calcula a Reserva Legal (RL) obrigatória para imóveis rurais em Mato Grosso. O sistema funciona integralmente no browser, sem dependência de servidor, usando dados pre-carregados de hidrografia MT e análise de cobertura nativa.

### Papel na Arquitetura

- **Complemento ao CAR-MT Analisador**: Estende o formulário SIMCAR com cálculos automatizados
- **Offline-first**: Funciona sem internet; dados locais pre-carregados
- **Integração de dados**: Combina hidrografia (IBGE), DEM (30m), cobertura nativa (MapBiomas/PRODES)
- **Geração de saída**: Relatórios PDF, exportação JSON/CSV, sync com SIMCAR

### Arquitetura em Camadas

```
┌─────────────────────────────────────────────────────────────┐
│                    UI LAYER (HTML/CSS)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Input Panel  │  │ Map Viewport │  │ Report View  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
├─────────────────────────────────────────────────────────────┤
│               CALCULATION LAYER (Workers)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐        │
│  │ APP Detector│  │ RL Calculator│  │ Integration  │        │
│  └─────────────┘  └─────────────┘  └──────────────┘        │
├─────────────────────────────────────────────────────────────┤
│              DATA LAYER (IndexedDB + Memory)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Hidrografia  │  │ DEM/Coverage │  │ Session Data │      │
│  │ (Local/Pre)  │  │ (On-demand)  │  │ (Temp)       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Modelos de Dados

### 1. Estrutura do Polígono Imóvel (GeoJSON FeatureCollection)

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "Fazenda Novo Sobradinho",
        "area_ha": 596.2034,
        "perimeter_m": 11240.39,
        "municipality": "Sapezal",
        "state": "MT",
        "datum": "SIRGAS2000",
        "utm_zone": "21S",
        "vertices_count": 18,
        "source": "memorial_descritivo"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [-58.848416, -13.192708],
            [-58.840591, -13.192851],
            ...
            [-58.848416, -13.192708]
          ]
        ]
      }
    }
  ]
}
```

### 2. Estrutura de Detecção de APP

```json
{
  "app_detection_result": {
    "imovel_id": "uuid",
    "timestamp": "2024-01-15T10:30:00Z",
    "app_total_ha": 127.45,
    "app_components": {
      "waterways": {
        "detected_count": 3,
        "total_area_ha": 85.23,
        "details": [
          {
            "name": "Rio Sapezal",
            "width_category": "10-50m",
            "buffer_distance_m": 50,
            "buffer_area_ha": 45.67,
            "intersection_length_m": 1234.5
          }
        ]
      },
      "nascentes": {
        "detected_count": 4,
        "total_area_ha": 31.42,
        "declared": false,
        "details": [
          {
            "id": "nascente_001",
            "coordinates": [-58.823451, -13.175892],
            "buffer_radius_m": 50,
            "area_ha": 0.785,
            "status": "inside_property",
            "manual_flag": false
          }
        ]
      },
      "slopes": {
        "available": true,
        "dem_resolution_m": 30,
        "total_area_ha": 10.80,
        "details": [
          {
            "zone_id": "slope_001",
            "declivity_degrees": 52.3,
            "area_ha": 5.40,
            "type": "encosta"
          },
          {
            "zone_id": "hilltop_001",
            "area_ha": 5.40,
            "type": "topo_morro",
            "summit_coords": [-58.830123, -13.181234]
          }
        ]
      }
    },
    "quality_metrics": {
      "hidrography_coverage": 0.95,
      "dem_coverage": 1.0,
      "dem_resolution_adequate": true,
      "confidence_level": "high"
    }
  }
}
```

### 3. Estrutura de Cálculo de RL

```json
{
  "rl_calculation": {
    "imovel_id": "uuid",
    "total_area_ha": 596.2034,
    "bioma_classification": "amazonia_legal",
    "municipality": "Sapezal",
    "coordinates": [-58.829383, -13.180580],
    "rl_percentage_required": 80,
    "rl_minima_ha": 476.96,
    "cobertura_nativa_atual_ha": 412.35,
    "cobertura_nativa_percentage": 69.1,
    "rl_deficit_ha": 64.61,
    "rl_deficit_percentage": 10.8,
    "bioma_boundary_status": "fully_amazonia",
    "data_sources": {
      "coverage": {
        "source": "mapbiomas_2023",
        "resolution_m": 30,
        "last_update": "2023-11-15",
        "coverage_types": [
          {
            "name": "Floresta Nativa",
            "area_ha": 350.25,
            "percentage": 58.7
          },
          {
            "name": "Cerrado Nativo",
            "area_ha": 62.10,
            "percentage": 10.4
          }
        ]
      }
    },
    "confidence": "high",
    "manual_override_applied": false
  }
}
```

### 4. Estrutura de Passivo Ambiental Consolidado

```json
{
  "environmental_liability": {
    "imovel_id": "uuid",
    "status": "deficit",
    "status_label": "Passivo Ambiental Detectado",
    "total_area_ha": 596.2034,
    "app_summary": {
      "total_area_ha": 127.45,
      "percentage_of_property": 21.4,
      "protected_area_ha": 95.23,
      "deficit_area_ha": 32.22,
      "deficit_percentage": 5.4
    },
    "rl_summary": {
      "required_ha": 476.96,
      "percentage_required": 80,
      "current_coverage_ha": 412.35,
      "deficit_ha": 64.61,
      "deficit_percentage": 10.8
    },
    "regularization_required": {
      "total_area_to_recover_ha": 96.83,
      "priority_zones": [
        {
          "priority": 1,
          "type": "rl_deficit",
          "area_ha": 64.61,
          "estimated_cost_brl": 580000
        },
        {
          "priority": 2,
          "type": "app_deficit",
          "area_ha": 32.22,
          "estimated_cost_brl": 289000
        }
      ],
      "total_estimated_cost_brl": 869000,
      "cost_per_ha_brl": 8979
    },
    "next_steps": [
      "Verificar zonas de APP em vistoria de campo",
      "Validar cobertura nativa com sobrevoo de drone",
      "Planejar estratégia de recuperação florestal",
      "Consultar programas de financiamento (Pronaf/Pronamp)"
    ]
  }
}
```

## Algoritmos Principais

### Algoritmo 1: Detector de APP por Cursos d'Água

**Entrada**: Polígono imóvel (Feature), Layer de hidrografia (FeatureCollection com LineStrings)

**Processos**:

1. **Identificação de Interseções**
   - Para cada rio/córrego na hidrografia:
     - Calcular intersecção com polígono imóvel
     - Se intersecção vazia: próximo
     - Se intersecção válida: classificar por largura

2. **Classificação de Largura** (baseado em Código Florestal Art. 4)
   ```
   SE largura < 10m:
     buffer_distance = 30m
   SENÃO SE largura 10-50m:
     buffer_distance = 50m
   SENÃO (largura > 50m):
     buffer_distance = 100m
   ```

3. **Criação de Buffer**
   - Usar algorithm Turf.js ou Custom:
     - Calcular centerline do watercourse
     - Expandir perpendicular em ambos lados
     - Gerar Polygon de buffer

4. **Clipping ao Imóvel**
   - Intersectar buffer com polígono imóvel
   - Excluir áreas externas
   - Calcular área em hectares

5. **Validação de Projeção**
   - Se não SIRGAS2000: reprojetar
   - Validar zonas UTM

**Saída**: Array de APP_Waterway objects com áreas clipped

### Algoritmo 2: Detector de APP por Nascentes

**Entrada**: Pontos de nascentes (Feature Points), Polígono imóvel

**Processos**:

1. **Identificação de Nascentes**
   - Filter nascentes dentro ou próximas (< 100m) ao imóvel
   - Diferenciar: detectadas (hidrografia) vs declaradas (campo)

2. **Criação de Buffers Circulares**
   ```
   PARA cada nascente:
     buffer_radius = 50m (Lei 12.651/2012 Art. 4, §2)
     circular_buffer = criarBufferCircular(ponto, 50m)
   ```

3. **Merge de Buffers Sobrepostos**
   - Usar union geometries
   - Evitar double-counting

4. **Clipping e Cálculo de Área**
   - Intersectar com imóvel
   - Calcular área final

5. **Flagging de Nascentes em Limites**
   - Se distância ao boundary < 5m: marcar para revisão manual

**Saída**: Array de APP_Nascente objects + flags de revisão

### Algoritmo 3: Detector de APP por Encostas e Topos

**Entrada**: Digital Elevation Model (GeoTIFF 30m), Polígono imóvel

**Processos**:

1. **Análise de Declividade**
   ```
   PARA cada pixel dentro do imóvel:
     dz_x = (DEM[x+1,y] - DEM[x-1,y]) / (2 * pixel_size)
     dz_y = (DEM[x,y+1] - DEM[x,y-1]) / (2 * pixel_size)
     slope_rad = atan2(sqrt(dz_x² + dz_y²), 1)
     slope_degrees = slope_rad * (180 / π)
     
     SE slope_degrees > 45:
       classificar como APP_ENCOSTA
   ```

2. **Detecção de Topos**
   - Local maximum search usando moving window
   - Para cada máximo local:
     - Centro = summit
     - Raio 100m = APP_TOPO

3. **Agregação de Zonas**
   - Group pixels contígguos de mesma classificação
   - Calcular área por zona

4. **Validação de Resolução**
   - Se DEM > 30m pixel: gerar warning
   - Se sem dados: retornar erro

**Saída**: Array de APP_Slope + APP_Hilltop objects

### Algoritmo 4: Calculador de RL Obrigatória

**Entrada**: Área total (ha), Município, Coordenadas imóvel

**Processos**:

1. **Classificação de Bioma**
   ```
   coords = obter_centróide(polígono_imóvel)
   
   SE coords dentro de AMAZONIA_LEGAL_BOUNDARY:
     bioma = "Amazônia Legal"
     rl_percentage = 80
   SENÃO SE coords em zona_cerrado:
     bioma = "Cerrado"
     rl_percentage = 35
   SENÃO:
     erro: "Município fora de MT"
   ```

2. **Cálculo de RL Mínima**
   ```
   rl_minima_ha = total_area_ha * (rl_percentage / 100)
   ```

3. **Validação com Boundary IBGE**
   - Query base de dados municipal
   - Confirmar classificação

4. **Output Estruturado**
   ```
   {
     rl_minima_ha,
     rl_percentage,
     bioma_used,
     confidence_level: "high" | "medium" | "low"
   }
   ```

**Saída**: RL_Calculation object

### Algoritmo 5: Integrador de Cobertura Nativa

**Entrada**: Polígono imóvel, Location, Data sources config

**Processos**:

1. **Descoberta de Dados Disponíveis**
   ```
   PARA cada source [mapbiomas, prodes, custom]:
     SE source_available_at(location, date):
       registrar source como candidata
   ```

2. **Priorização de Fonte**
   - Preferência: MapBiomas anual > PRODES 2yr > Manual input
   - Validar resolução (≥30m preferido)

3. **Intersecção com Imóvel**
   ```
   raster_data = carregar_raster(escolhida_source)
   coverage_within = raster_data ∩ polígono_imóvel
   
   PARA cada pixel em coverage_within:
     SE valor_pixel em [floresta_nativa, cerrado_nativo, ...]:
       area_accumulated += pixel_size_ha
   ```

4. **Classificação de Tipo de Cobertura**
   - Mapear valores de raster para tipos de bioma
   - Acumular por tipo

5. **Cálculo de Deficitário**
   ```
   rl_deficit_ha = MAX(0, rl_minima_ha - cobertura_nativa_ha)
   ```

6. **Avisos sobre Confiabilidade**
   - Se dados > 2 anos: avisar
   - Se resolução baixa: avisar
   - Permitir override manual

**Saída**: Coverage_Integration object com detalhes por tipo de vegetação

### Algoritmo 6: Consolidador de Passivo Ambiental

**Entrada**: APP_Detection, RL_Calculation, Coverage_Integration

**Processos**:

1. **Consolidação de Áreas**
   ```
   app_total = soma(app_waterways, app_nascentes, app_slopes)
   rl_deficit = rl_minima - cobertura_nativa
   
   regularization_total = app_deficit + rl_deficit
   ```

2. **Determinação de Status**
   ```
   SE rl_deficit > 0 OU app_deficit > 0:
     status = "PASSIVO"
   SENÃO:
     status = "CONFORME"
   ```

3. **Priorização de Recuperação**
   - Rank 1: RL deficit (maior área + valor)
   - Rank 2: APP deficit
   - Estimativa de custo por taxa INCRA/CNA

4. **Geração de Checklist**
   - Passos técnicos recomendados
   - Links para programas de financiamento
   - Timeline estimada

5. **Compilação de Relatório**
   - Consolidar dados de todas as fontes
   - Incluir métricas de confiança
   - Preparar para PDF export

**Saída**: Environmental_Liability consolidated object



## Componentes UI

### 1. Painel de Entrada de Imóvel

**Responsabilidade**: Capturar dados do polígono imóvel (manual ou via importação)

```
┌─────────────────────────────────────────┐
│ INPUT PANEL                             │
├─────────────────────────────────────────┤
│ □ Upload GeoJSON / KML                  │
│ □ Desenhar Polígono no Mapa            │
│ □ Importar do CAR-MT (auto-fill)       │
│                                         │
│ Propriedades do Imóvel                 │
│ ┌─────────────────────────────────────┐│
│ │ Nome: ________________               ││
│ │ Município: ________________          ││
│ │ Área: ____________ ha               ││
│ │ Fuso UTM: [dropdown]                ││
│ │ Coordenadas Extremas (auto)         ││
│ │  NW: ________  NE: ________         ││
│ │  SW: ________  SE: ________         ││
│ └─────────────────────────────────────┘│
│                                         │
│ [← Voltar] [Próximo →] [Limpar]        │
└─────────────────────────────────────────┘
```

**Estrutura HTML**:
- Form com inputs para nome, município, área
- Canvas para desenho de polígono (opcionalmente)
- Visualização inline de bbox calculado
- Validação de coordenadas (SIRGAS2000)

### 2. Componente de Mapa Interativo

**Responsabilidade**: Visualizar APP, RL, cobertura nativa com controles de camada

```
┌─────────────────────────────────────────────────────┐
│ MAP VIEWPORT                                        │
├─────────────────────────────────────────────────────┤
│ [Home] [Zoom+] [Zoom-] [Reset]                     │
│                                                     │
│ ┌──────────────────────────────────────────────────┐│
│ │                                                  ││
│ │   [Imóvel - BLACK]                              ││
│ │   ┏━━━━┳━━━━━━━┳━━━━┓                          ││
│ │   ┃    ┃ 🌊APP ┃    ┃  [Hidrografia - BLUE]   ││
│ │   ┃ 🌳RL┃ DEM  ┃ 🟡 ┃  [Nascentes - LT.BLUE] ││
│ │   ┃    ┃ 📊   ┃    ┃  [Encostas - PURPLE]    ││
│ │   ┗━━━━┻━━━━━━━┻━━━━┛  [Cobertura - DK.GREEN]  ││
│ │                        [RL Required - GREEN]   ││
│ │  Hover: Area = 125.45 ha (21.0%)               ││
│ │                                                  ││
│ └──────────────────────────────────────────────────┘│
│                                                     │
│ Layer Controls:                                    │
│ ☑ Hidrografia  ☑ APP Nascentes  ☑ Cobertura      │
│ ☑ APP Encostas ☑ DEM (heatmap)  ☑ Limites RL    │
│                                                     │
│ [Export Map as PNG]                               │
└─────────────────────────────────────────────────────┘
```

**Implementação**:
- Usar Mapbox GL JS ou Leaflet
- Camadas GeoJSON renderizadas dinamicamente
- Controles de zoom/pan responsivos
- Hover tooltips com área + % calculado
- Toggle buttons para mostrar/ocultar camadas
- Color-coded: hidrografia (azul), APP nascentes (azul claro), encostas (roxo), cobertura (verde escuro), RL required (verde), deficit (amarelo)

### 3. Painel de Resultados de APP

**Responsabilidade**: Exibir breakdown de APP por componente

```
┌─────────────────────────────────────────┐
│ RESULTADOS: ÁREA DE PRESERVAÇÃO         │
├─────────────────────────────────────────┤
│ APP TOTAL: 127.45 ha (21.4% do imóvel) │
│                                         │
│ ┌─ Hidrografia ─────────────────────┐ │
│ │ Rio Sapezal (30m buffer)          │ │
│ │  └─ 45.67 ha, 1.234 km            │ │
│ │ Córrego do Meio (50m buffer)      │ │
│ │  └─ 32.56 ha, 0.823 km            │ │
│ │ Arroio Norte (50m buffer)         │ │
│ │  └─ 7.00 ha, 0.312 km             │ │
│ │ Subtotal Hidrografia: 85.23 ha   │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─ Nascentes ────────────────────────┐ │
│ │ Detected: 4 nascentes              │ │
│ │ Merged buffers: 31.42 ha           │ │
│ │ Status: Todas dentro do imóvel     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─ Encostas & Topos ─────────────────┐ │
│ │ Encostas (decliv. > 45°): 5.40 ha │ │
│ │ Topo de Morro (1 pico): 5.40 ha   │ │
│ │ DEM Resolução: 30m ✓              │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ⚠️ APP Desprotegida: 32.22 ha (5.4%)   │
│ [Planejar Proteção]                    │
└─────────────────────────────────────────┘
```

### 4. Painel de Resultados de RL

**Responsabilidade**: Exibir cálculo de RL e deficit

```
┌─────────────────────────────────────────────┐
│ RESULTADOS: RESERVA LEGAL                   │
├─────────────────────────────────────────────┤
│ Bioma: Amazônia Legal                       │
│ RL Obrigatória: 80% = 476.96 ha            │
│                                             │
│ Cobertura Nativa Atual: 412.35 ha (69.1%)  │
│  ├─ Floresta Nativa: 350.25 ha (58.7%)    │
│  ├─ Cerrado Nativo: 62.10 ha (10.4%)      │
│  └─ Fonte: MapBiomas 2023 (30m)           │
│                                             │
│ ❌ RL DEFICIT: 64.61 ha (10.8%)            │
│                                             │
│ Estimativa de Regularização:               │
│  └─ Custo: R$ 580.000 (R$ 8.979/ha)      │
│  └─ Timeline: 2-3 anos                     │
│                                             │
│ [Ver Programas de Financiamento]           │
│ [Exportar Dados de Cobertura]              │
└─────────────────────────────────────────────┘
```

### 5. Painel de Passivo Ambiental Consolidado

**Responsabilidade**: Resumir situação compliance total

```
┌────────────────────────────────────────────────┐
│ PASSIVO AMBIENTAL CONSOLIDADO                  │
├────────────────────────────────────────────────┤
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │ STATUS: ❌ PASSIVO AMBIENTAL DETECTADO │ │
│  │ Regularização Necessária: 96.83 ha     │ │
│  │ Custo Total Estimado: R$ 869.000       │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│ ┌─────────────────────────────────────────┐  │
│ │ PRIORI ZONA           ÁREA    CUSTO      │  │
│ │ ─────────────────────────────────────── │  │
│ │ 1️⃣    RL Deficit      64.61  R$ 580k   │  │
│ │ 2️⃣    APP Deficit     32.22  R$ 289k   │  │
│ └─────────────────────────────────────────┘  │
│                                                │
│ Próximos Passos:                              │
│ ☐ Verificar APP em campo (vistoria)          │
│ ☐ Validar cobertura (drone survey)           │
│ ☐ Planejar recuperação florestal             │
│ ☐ Consultar Pronaf/Pronamp                   │
│                                                │
│ Confiança dos Dados: 🟢 Alta                 │
│  └─ Hidrografia: 95% cobertura              │
│  └─ DEM: 30m resolução ✓                    │
│  └─ Cobertura: MapBiomas recente ✓          │
│                                                │
│ [Gerar PDF Relatório] [Exportar JSON]        │
└────────────────────────────────────────────────┘
```

## Arquitetura de Dados e Armazenamento

### 1. Local Storage Strategy

**IndexedDB (Persistent)**:
- Hidrografia MT (GeoJSON): ~50MB (comprimido)
- DEM tiles (WebP): ~200MB (on-demand, cached)
- Histórico de cálculos (3 últimas análises)
- Configurações de usuário (logo, taxa de mercado)

**Session Storage (Temporary)**:
- Polígono imóvel atual
- Resultados de APP/RL cálculo
- Cache de mapa viewport
- Estado da UI (painel ativo, zoom)

**Memory (Runtime)**:
- Buffers geométricos temporários
- Features sendo processadas
- Cache de tiles em uso

### 2. Estratégia de Data Loading

```javascript
// Sequência de inicialização
INIT: 
  1. Load hidrografia básica MT (pre-bundled) → IndexedDB
  2. Check for DEM tiles @ location (remote) → cache if available
  3. Check for latest coverage data (remote) → use if < 2yr old
  4. If offline: use cached data + show warning

CALC:
  1. Load imóvel polígono (from user input)
  2. Query hidrografia index (spatial)
  3. Load relevant DEM tile (if available)
  4. Load coverage raster (if available)
  5. Run calculations in worker
  6. Return results
```

### 3. Sincronização com Sistema CAR

**Data Bridge**:
```json
{
  "app_rl_results": {
    "app_total_ha": 127.45,
    "rl_minima_ha": 476.96,
    "rl_deficit_ha": 64.61,
    "watercourses_detected": ["Rio Sapezal", "Córrego Meio"],
    "nascentes_count": 4,
    "confidence_level": "high",
    "export_timestamp": "2024-01-15T10:30:00Z"
  }
}
```

**Auto-Population Fields no SIMCAR**:
- `field_app_area` ← `app_total_ha`
- `field_rl_percentage` ← bioma classification
- `field_rl_deficit` ← `rl_deficit_ha`
- `field_notes` ← summary de detecções

## Performance e Otimizações

### Web Workers para Cálculos Pesados

**Offload para Worker**:
```javascript
// main.js
const workerCalc = new Worker('calc-worker.js');
workerCalc.postMessage({
  cmd: 'detectAPP',
  imovel: polygonGeoJSON,
  hidrografia: hydroGeoJSON,
  dem: demData
});
workerCalc.onmessage = (e) => updateUIWithResults(e.data);

// calc-worker.js
self.onmessage = (e) => {
  const { cmd, imovel, hidrografia, dem } = e.data;
  if (cmd === 'detectAPP') {
    const results = runAPPDetection(imovel, hidrografia, dem);
    self.postMessage(results);
  }
};
```

**Operações em Worker**:
- Buffer geometry calculations
- Raster intersection
- Area calculations
- GeoJSON transformations

**UI Thread**:
- Map rendering
- Form interactions
- Result display
- PDF generation

### Otimizações Geométricas

1. **Spatial Indexing**: RBush para query rápida de hidrografia
2. **GeoJSON Simplification**: Simplificar polígonos grandes > 10MB
3. **Tile-based Rendering**: DEM em tiles 256x256 para lazy loading
4. **Raster Downsampling**: Se DEM > 90MB: downscale para 60m antes de processing

### Caching

```javascript
const cache = {
  hidrography: null,        // loaded once
  demTiles: {},            // { z-x-y: tileData }
  coverageRasters: {},     // { location: rasterData }
  calculations: []         // LRU cache, 3 items max
};
```

## Tratamento de Erros e Validações

### Validações de Entrada

```javascript
validateImovel(polygon):
  - Verify GeoJSON format
  - Check coordinate projection (SIRGAS2000)
  - Validate polygon closure
  - Check area > 0.1 ha
  - Check within MT bounds
  
validateHidrography(features):
  - Check geometry types (LineString)
  - Verify coordinate count
  - Check for self-intersections
  
validateDEM(rasterData):
  - Verify resolution (< 90m)
  - Check for missing data
  - Validate value ranges (0-3000m elevation)
```

### Tratamento de Falhas

```javascript
ERROR SCENARIOS:

1. DEM Unavailable:
   - User action: Skip slope detection
   - UI feedback: "Dados de encosta não disponíveis"
   - Fallback: Use APP apenas hidrografia + nascentes
   
2. Coverage Data Outdated:
   - Warning: "Cobertura de 2022, pode estar desatualizada"
   - Option: Manual input percentage
   
3. Hidrography Missing:
   - Critical error: Cannot proceed without rivers
   - UI: "Carregue dados de hidrografia localmente"
   
4. Invalid Coordinates:
   - Error message with field highlight
   - Suggest coordinate format
   
5. Geometry Error (self-intersect, holes):
   - Attempt auto-repair with user confirmation
   - If fails: Error with geometry validation tool link
```

### Mensagens para Usuário

**Tone**: Português claro, técnico porém acessível, actionable

```javascript
SUCCESS:
  ✓ "APP/RL calculados com sucesso. Deficitário detectado."
  
WARNING:
  ⚠️ "Cobertura de satélite desatualizada (2022). Considere drone survey."
  
ERROR:
  ❌ "Coordenadas UTM inválidas. Use SIRGAS2000 Fuso 21S."
  
INFO:
  ℹ️ "Vistoria de campo recomendada para validar APP em limites."
```

## Estratégia de Teste

### Unit Tests (Algoritmos Puros)

- **detectAPPBuffer**: Diversas larguras de rio → buffers corretos
- **classifyBioma**: Coordenadas MT → classificação Amazônia/Cerrado
- **mergeBuffers**: Nascentes sobrepostas → merge sem duplicação
- **calculateArea**: Polígonos complexos → área correta ±0.01 ha

### Integration Tests

- **Fluxo completo**: Imóvel upload → APP detection → RL calc → Passivo report
- **Export Formats**: JSON, CSV, PDF todos geram corretamente
- **SIMCAR Sync**: Dados passam corretamente para formulário CAR

### Property-Based Tests (Quando Aplicável)

Dado que este módulo envolve principalmente Infrastructure (dados offline, raster processing), integração de APIs de dados, e IaC patterns (geração de PDFs, exports), Property-Based Testing não é apropriado aqui.

Os testes devem ser orientados a:
- **Example-based**: Casos específicos de imóveis reais (Sapezal, Sorriso, etc.)
- **Integration**: Fluxos completos end-to-end
- **Snapshot**: PDFs gerados, estruturas JSON exportadas
- **Mock-based**: Comportamento offline com dados mockados

## Integração com Sistema CAR-MT Existente

### Pontos de Conexão

1. **Input**: Polígono imóvel já desenhado/validado no CAR-MT
   - Obtém: GeoJSON do imóvel (coordinadas SIRGAS2000 UTC 21S)
   - Envia para APP/RL Calculator

2. **Output**: Resultados retornam ao formulário SIMCAR
   - Preenche: campos APP area, RL percentage, RL deficit
   - Preserva: sessão de dados para referência

3. **Export**: Relatório integrado com dados CAR
   - PDF: inclui memo descritivo + APP/RL analysis
   - JSON: estrutura compatível com SIMCAR data exchange
   - KML: geometrias APP/RL podem ser visualizadas em sistemas SIG

### API de Integração (Pseudocódigo)

```javascript
class AppRlCalculator {
  
  // Inicializa com dados do imóvel
  init(imovelGeometry: GeoJSON, municipio: string): void
  
  // Executa detecção de APP
  detectAPP(): Promise<AppDetectionResult>
  
  // Calcula RL obrigatória
  calculateRL(): Promise<RLCalculation>
  
  // Integra cobertura nativa
  integrateNativeCoverage(): Promise<CoverageIntegration>
  
  // Consolida passivo
  generateLiability(): Promise<EnvironmentalLiability>
  
  // Exporta resultados em múltiplos formatos
  exportPDF(template?: string): Blob
  exportJSON(): string
  exportCSV(): string
  
  // Sincroniza com SIMCAR
  syncToSIMCAR(): void
}
```

### State Management

O módulo mantém estado local durante sessão:
```javascript
AppRLSession = {
  imovel: GeoJSON,
  app_result: AppDetectionResult,
  rl_result: RLCalculation,
  coverage_result: CoverageIntegration,
  liability: EnvironmentalLiability,
  exportHistory: []
}
```

## Diagrama de Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────┐
│ USER INPUT: Imóvel Geometry (GeoJSON, SIRGAS2000)           │
└────────┬────────────────────────────────────────────────────┘
         │
         ├──────────────────────────┬──────────────────────────┐
         │                          │                          │
    ┌────▼─────┐            ┌──────▼──────┐           ┌───────▼───┐
    │  Hidr.   │            │ Classify    │           │ Load DEM  │
    │ Query    │            │ Bioma       │           │ (if avail)│
    │ (Local)  │            │             │           │           │
    └────┬─────┘            └──────┬──────┘           └───────┬───┘
         │                         │                          │
         └──────────────────────────┼──────────────────────────┘
                                    │
    ┌───────────────────────────────▼────────────────────────────┐
    │         WEB WORKER: Geometric Calculations                │
    │  ┌────────────┐  ┌────────────┐  ┌───────────────┐        │
    │  │ APP Buffer │  │ RL Calc    │  │ Slope Analysis│        │
    │  │ (Hidr.)    │  │ (Bioma%)   │  │ (DEM)        │        │
    │  └────┬───────┘  └────┬───────┘  └───────┬───────┘        │
    │       │               │                  │                │
    │       ├─── APP_Total ─┼─── RL_Minima ───┼─ Slope_APP ───┐│
    │       │               │                  │                ││
    │       └───────────────┴──────────────────┴────────────────┤│
    └───────────────────────────────────┬──────────────────────┘
                                        │
    ┌───────────────────────────────────▼────────────────────────┐
    │    Load Coverage Raster (MapBiomas/PRODES)                 │
    │    Intersect with Imóvel → Cobertura_Nativa               │
    └───────────────────────────────────┬────────────────────────┘
                                        │
    ┌───────────────────────────────────▼────────────────────────┐
    │        Consolidate Results                                 │
    │  APP_Total + RL_Minima + Cobertura + RL_Deficit           │
    │        → EnvironmentalLiability                            │
    └───────────────────────────────────┬────────────────────────┘
                                        │
            ┌───────────────────────────┼───────────────────────┐
            │                           │                       │
       ┌────▼────┐              ┌──────▼──────┐         ┌──────▼──────┐
       │ Display │              │   Export    │         │   Sync to   │
       │  on Map │              │  PDF/JSON   │         │   SIMCAR    │
       │ (Update │              │   /CSV      │         │   (optional)│
       │  UI)    │              │             │         │             │
       └─────────┘              └─────────────┘         └─────────────┘
```

---

**Status do Design**: ✅ Completo - Pronto para prework de propriedades de correção



## Correctness Properties

*A property é uma característica ou comportamento que deve ser verdadeiro em todas as execuções válidas de um sistema - essencialmente uma declaração formal sobre o que o sistema deve fazer. Properties servem como ponte entre especificações legíveis e garantias de correção verificáveis por máquina.*

### Property 1: APP Buffer Distance Obeys Watercourse Classification

*For any* watercourse of known width and intersecting an imovel, the APP buffer radius SHALL be exactly 30m (width < 10m), 50m (10-50m), or 100m (> 50m) according to Código Florestal Article 4.

**Validates: Requirements 1.2, 1.3, 1.4**

### Property 2: APP Area Never Exceeds Imovel Area

*For any* set of APP buffers (hidrografia, nascentes, slopes) and an imovel polygon, the total APP area clipped to the imovel boundary SHALL never exceed the imovel total area.

```
app_total_ha(clipped) ≤ imovel_area_ha
```

**Validates: Requirements 1.5, 1.6, 2.1, 2.2**

### Property 3: Nascente Buffers Merge Without Double-Counting

*For any* set of N nascentes with potentially overlapping 50m circular buffers, the merged buffer area SHALL be less than or equal to the sum of individual buffer areas (no double-counting).

```
union_area(buffers) ≤ sum(individual_areas)
```

**Validates: Requirement 2.2**

### Property 4: RL Deficit is Non-Negative

*For any* RL calculation with RL_Minima and Cobertura_Nativa_Atual, the RL_Deficit SHALL always be non-negative: `MAX(0, RL_Minima - Cobertura_Nativa)`.

```
rl_deficit ≥ 0
rl_deficit ≤ rl_minima
```

**Validates: Requirements 4.6, 5.5**

### Property 5: Bioma Classification Determines RL Percentage Correctly

*For any* imovel municipality in MT, if classified as Amazônia Legal, RL percentage SHALL be 80%; if Cerrado, SHALL be 35%.

```
IF bioma == "amazonia_legal":
  rl_percentage == 80
ELSE IF bioma == "cerrado":
  rl_percentage == 35
```

**Validates: Requirements 4.2, 4.3**

### Property 6: Coverage Raster Intersection Area ≤ Imovel Area

*For any* native coverage raster intersected with an imovel polygon, the calculated coverage area SHALL not exceed imovel total area.

```
coverage_area_within_imovel ≤ imovel_area_ha
```

**Validates: Requirement 5.2**

### Property 7: Slope Classification Boundary Includes Threshold

*For any* DEM pixel with declivity X degrees, if X ≥ 45, it SHALL be classified as APP_Encosta. If X < 45, it SHALL NOT.

```
IF slope_degrees ≥ 45:
  classification == "encosta"
ELSE:
  classification ≠ "encosta"
```

**Validates: Requirement 3.2**

### Property 8: Prioritization Rank Reflects Impact

*For any* consolidated passivo report with APP deficit and RL deficit, the RL_Deficit SHALL be ranked priority 1 (higher impact) when RL_Deficit_ha > APP_Deficit_ha.

```
priority_1 := MAX(rl_deficit, app_deficit)
priority_2 := MIN(rl_deficit, app_deficit)
```

**Validates: Requirement 6.3**

### Property 9: Nascente Proximity Includes Nearby Sources

*For any* nascente located within 100m of imovel boundary (but outside), it SHALL be included in APP calculation; if within 5m (boundary case), it SHALL be flagged for manual review.

```
FOR nascente IN boundary_region:
  IF distance ≤ 100m:
    include_in_app = true
  IF distance < 5m:
    require_manual_review = true
```

**Validates: Requirements 2.4, 2.5**

### Property 10: Cost Calculation Linear with Area

*For any* recovery area and market rate (R$/ha), the estimated total cost SHALL equal area_ha × rate_r_per_ha.

```
total_cost_brl = area_ha × cost_per_ha_r
```

**Validates: Requirement 6.3**

---

## Testing Strategy

Given the nature of this feature—heavy on geometric calculations, raster processing, data integration, and offline functionality—the testing approach combines multiple strategies:

### Property-Based Testing (Selected Algorithms)

Use fast-check or Hypothesis-equivalent to verify universal properties across 100+ generated inputs:

- **Watercourse Buffer Classification** (Property 1): Generate rivers with random widths, verify buffer distances
- **Area Invariants** (Property 2, 6): Generate complex polygons and buffer configurations, verify areas never exceed bounds
- **Slope Classification** (Property 7): Generate random DEM pixels with varying slopes, verify boundary conditions
- **Deficit Calculations** (Properties 4, 10): Generate RL/coverage combinations, verify arithmetic properties

**Minimum iterations per property**: 100
**Tag format**: `Feature: app-rl-calculator, Property N: <description>`

### Example-Based Unit Tests (Infrastructure & Integrations)

Real-world scenarios with known data:

- **Sapezal property**: 596.20 ha, Amazônia Legal → RL_Minima = 476.96 ha ✓
- **Rio Sapezal waterway**: 30m width → 50m buffer ✓
- **DEM coverage integration**: MapBiomas 30m raster + imovel → coverage area calculated
- **PDF export**: All required sections present, formatting valid
- **SIMCAR sync**: Data transferred without loss

### Integration Tests

End-to-end workflows:

1. **Complete APP/RL Calculation**: Imovel upload → detections → RL calc → consolidation → export
2. **Offline Mode**: All functions work with pre-loaded hidrography, no internet required
3. **CAR-MT Integration**: Results auto-populate form fields correctly

### Validation & Edge Cases

Manual verification of boundary conditions:

- **Zero hidrografia**: Property with no rivers → APP = 0 (no error)
- **Entire property is APP**: Narrow strip → correctly handled
- **DEM unavailable**: Graceful warning, continue with hidrography + nascentes
- **Mixed bioma municipality**: Correct classification applied

### Performance Benchmarks

- **Typical 1000 ha property**: Calculation < 10 seconds
- **Large 5000 ha property**: Smooth rendering, responsive UI
- **Offline load**: Hidrografia database loads in < 2 seconds

---

## Summary

O módulo **Calculadora APP/RL** integra lógica pura (geometry, cálculos) com dados offline (hidrografia MT, DEM, cobertura) para oferecer automated compliance analysis para imóveis rurais em Mato Grosso. A arquitetura offline-first, com workers para processamento pesado e caching inteligente, garante responsividade mesmo em campo sem internet.

A detecção de APP por múltiplos componentes (rios, nascentes, encostas) combinada com cálculo de RL por bioma e integração de cobertura nativa resulta em relatório consolidado de passivo ambiental. Exportação em PDF, JSON e CSV com sincronização opcional com SIMCAR completa o fluxo.

Os testes abrangem propriedades universais (geometric invariants, aritmética), exemplos do mundo real (Sapezal, Sorriso), e fluxos completos de integração, garantindo correção e resiliência do sistema.

