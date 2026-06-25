# Requirements Document: Calculadora APP/RL para CAR-MT Analisador

## Introduction

A Calculadora APP/RL é o coração regulatório do CAR-MT Analisador. Implementa a detecção de Áreas de Preservação Permanente (APP) e o cálculo de Reserva Legal (RL) mínima conforme legislação ambiental brasileira, com foco em imóveis rurais do Mato Grosso. 

A feature integra-se ao fluxo existente após validação geométrica do perímetro, utilizando o polígono já validado (coordenadas SIRGAS2000) para sobrepor camadas de hidrografia local e bioma. Técnicos de campo e engenheiros ambientais podem: 
- Detectar automaticamente APP obrigatória (cursos d'água, nascentes, encostas)
- Calcular RL mínima por bioma (80% Amazônia, 35% Cerrado em MT)
- Gerar mapa visual com overlays
- Exportar relatório ambiental com passivo detectado
- Estimar custos de recuperação para compliance

**Por que é crítico:** Nenhuma ferramenta comercial faz isso offline e simples. Elimina análise manual em Excel e cálculos errados em campo.

---

## Glossary

- **APP (Área de Preservação Permanente)**: Faixa de terra obrigatória ao redor de cursos d'água, nascentes e encostas, protegida por lei. Toda APP é de responsabilidade do proprietário.
- **RL (Reserva Legal)**: Percentual mínimo de vegetação nativa que deve ser preservada no imóvel, conforme bioma e legislação. Em MT: 80% em Amazônia Legal, 35% em Cerrado.
- **Amazônia Legal**: Região norte de MT (bioma Amazônico), com requisitos de RL de 80%.
- **Cerrado**: Região sul/centro de MT (bioma Cerrado), com requisitos de RL de 35%.
- **Buffer**: Zona de proteção contígua a um elemento (rio, nascente) medida em metros.
- **Hidrografia**: Base de dados geoespacial com cursos d'água, nascentes, reservatórios. Fonte em MT: IBGE 1:250k.
- **Polígono**: Perímetro do imóvel rural definido pelos vértices (coordenadas UTM) extratos do memorial descritivo.
- **Sobreposição**: Interseção geométrica entre polígono e camada de APP ou RL.
- **Passivo Ambiental**: Déficit de APP ou RL em relação ao requisito legal. Impede financiamento agrícola.
- **Compliance**: Situação onde APP e RL estão em conformidade com lei. Imóvel elegível para programas e crédito.
- **IBGE Hidrografia 1:250k**: Base oficial brasileira de cursos d'água em escala 1:250.000, administrada pelo IBGE.
- **Sistema de Coordenadas**: SIRGAS2000, projeção UTM, Fusos 21S ou 22S para MT.
- **MapBiomas**: Plataforma colaborativa que disponibiliza mapas de cobertura e uso da terra.
- **Declividade**: Inclinação do terreno em percentual (%). Encostas > 45% recebem proteção especial (APP).
- **Hectare (ha)**: Unidade de área = 10.000 m² (100m × 100m).
- **Estimativa de Custo**: Valor mercado regional MT para recuperação de área degradada. Intervalo: R$ 3.000 a R$ 8.000 por hectare.

---

## Requirements

### Requirement 1: Detector de APP – Cursos d'Água Permanentes

**User Story:**  
Como engenheiro agrônomo, quero detectar automaticamente APP de cursos d'água permanentes no imóvel, para cumprir legislação ambiental e identificar áreas de responsabilidade legal.

#### Acceptance Criteria

1. WHEN THE Calculadora_APP_RL receives a valid Polígono e a hidrografia base (IBGE 1:250k), THE System SHALL identify all cursos d'água permanentes that intersect or are within 100m of Polígono boundary.
2. WHEN a curso d'água has width ≥ 10 meters (conforme IBGE classification), THE System SHALL apply 50-meter Buffer.
3. WHEN a curso d'água has width < 10 meters, THE System SHALL apply 30-meter Buffer.
4. THE System SHALL calculate Sobreposição area (in hectares) between each Buffer and Polígono interior.
5. THE System SHALL sum all Sobreposição areas to determine total APP_Agua.

---

### Requirement 2: Detector de APP – Nascentes e Olhos d'Água

**User Story:**  
Como técnico rural, quero que o sistema localize nascentes dentro e perto da propriedade, para garantir proteção conforme regulamentação ambiental.

#### Acceptance Criteria

1. WHEN THE Calculadora_APP_RL receives a valid Polígono e hidrografia base, THE System SHALL identify all nascentes (spring points) from IBGE Hidrografia that fall within 500m radius of Polígono boundary.
2. FOR EACH nascente, THE System SHALL apply 50-meter Buffer (fixed radius, regardless of terrain).
3. THE System SHALL calculate Sobreposição area between each 50m radius Buffer and Polígono interior.
4. THE System SHALL flag nascentes that locate within Polígono interior as "Nascentes Internas – Proteção Obrigatória".

---

### Requirement 3: Detector de APP – Encostas com Declividade > 45%

**User Story:**  
Como analista ambiental, quero identificar encostas íngremes que requerem proteção especial, para orientar o proprietário sobre restrições de uso.

#### Acceptance Criteria

1. WHEN a declividade model is available (e.g., SRTM 90m from USGS), THE System SHALL compute slope at each pixel.
2. FOR EACH pixel with slope > 45%, THE System SHALL classify as APP_Encosta.
3. THE System SHALL calculate Sobreposição area between APP_Encosta pixels and Polígono interior.
4. IF declividade data is unavailable offline, THE System SHALL display alert "Dados de declividade não carregados – APP de encostas não será calculada" and offer to skip or load data.

---

### Requirement 4: Consolidação de APP Total

**User Story:**  
Como engenheiro, quero uma visão consolidada de toda APP obrigatória dentro da propriedade, para entender carga regulatória total.

#### Acceptance Criteria

1. THE System SHALL consolidate APP_Agua, APP_Nascentes, APP_Encosta into unified APP_Total (sum of non-overlapping areas).
2. IF areas overlap (e.g., Buffer de rio + Buffer de nascente), THE System SHALL merge geometries and count each pixel only once.
3. THE System SHALL calculate APP_Total_Percentual = (APP_Total / Área_Total_Imóvel) × 100, in percentage.
4. THE System SHALL display APP_Total in hectares with 2 decimal precision.

---

### Requirement 5: Calculadora de RL – Determinação de Bioma

**User Story:**  
Como produtor, quero que o sistema determine automaticamente qual percentual de RL é exigido, baseado na localização do meu imóvel.

#### Acceptance Criteria

1. WHEN THE Calculadora_APP_RL receives a Polígono, THE System SHALL determine Bioma based on municipality centroid and bioma boundary layer.
2. IF Polígono centroid falls within Amazônia Legal boundary, THE System SHALL assign RL_Minima_Percentual = 80%.
3. IF Polígono centroid falls within Cerrado boundary, THE System SHALL assign RL_Minima_Percentual = 35%.
4. IF ambiguity exists (Polígono spanning two biomes), THE System SHALL calculate weighted RL_Minima based on area percentage in each bioma and display uncertainty warning.
5. THE System SHALL display selected Bioma visually on map with color coding.

---

### Requirement 6: Calculadora de RL – Cálculo de Requisito Mínimo

**User Story:**  
Como engenheiro, quero saber exatamente quantos hectares de RL precisam ser preservados no imóvel.

#### Acceptance Criteria

1. WHEN THE Calculadora_APP_RL has Área_Total_Imóvel (in hectares) and RL_Minima_Percentual, THE System SHALL calculate RL_Minima_Hectares = (Área_Total_Imóvel / 100) × RL_Minima_Percentual.
2. THE System SHALL display RL_Minima_Hectares with 2 decimal precision.
3. THE System SHALL display RL_Minima_Percentual clearly (e.g., "Reserva Legal Mínima: 80% | 476,96 ha").

---

### Requirement 7: Análise de Cobertura – APP cobrindo RL

**User Story:**  
Como técnico, quero saber se a APP já presente no imóvel cobre o requisito de RL, para evitar documentação redundante.

#### Acceptance Criteria

1. WHEN THE System has calculated APP_Total_Hectares and RL_Minima_Hectares, THE System SHALL compare areas.
2. IF APP_Total_Hectares ≥ RL_Minima_Hectares, THE System SHALL flag "APP cobre RL: SIM ✓" and note "Proprietário pode usar APP como crédito de RL".
3. IF APP_Total_Hectares < RL_Minima_Hectares, THE System SHALL calculate RL_Deficit_Hectares = RL_Minima_Hectares − APP_Total_Hectares.
4. THE System SHALL display status visually (green check for compliant, orange warning for deficit).

---

### Requirement 8: Estimativa de Passivo Ambiental

**User Story:**  
Como produtor, quero saber quanto de área precisaria recuperar para estar em conformidade ambiental, para planejar investimento.

#### Acceptance Criteria

1. IF RL_Deficit_Hectares > 0 (calculated in Requirement 7), THE System SHALL flag "Passivo Ambiental Detectado: {RL_Deficit_Hectares} ha".
2. THE System SHALL offer visual indicator (red badge with hectares needed).
3. IF Polígono has areas with recent deforestation or non-native land cover (inferred from MapBiomas historical data if available), THE System SHALL suggest "Recomendação: Priorizar recuperação em áreas previamente nativas".
4. THE System SHALL NOT calculate recovery cost (reserved for Requirement 12).

---

### Requirement 9: Validação de Conformidade – Checklist de Passivo

**User Story:**  
Como técnico de campo, quero um checklist claro indicando se a propriedade tem passivo ambiental ou está em compliance.

#### Acceptance Criteria

1. THE System SHALL generate Checklist com status binários:
   - APP obrigatória detectada? [SIM/NÃO]
   - Nascentes internas no imóvel? [SIM/NÃO]
   - APP cobre requisito de RL? [SIM/NÃO]
   - Passivo ambiental detectado? [SIM/NÃO]
   - Imóvel elegível para compliance? [SIM/NÃO]
2. FOR EACH item, THE System SHALL provide Brief explanation (max 1 line) and Ação recomendada.
3. THE System SHALL color-code: ✓ verde (OK), ⚠️ laranja (atenção), ✗ vermelho (passivo).

---

### Requirement 10: Mapa Visual – Overlay de APP e RL

**User Story:**  
Como engenheiro, quero visualizar no mapa onde estão APP e RL obrigatória, para comunicar ao proprietário visualmente.

#### Acceptance Criteria

1. WHEN THE Calculadora_APP_RL generates results, THE System SHALL render interactive map (using existing mapping library, e.g., Leaflet) showing:
   - Polígono (imóvel) em cor azul com borda destacada
   - APP_Agua Buffer em vermelho translúcido (50%)
   - APP_Nascentes Buffer em rosa translúcido (50%)
   - APP_Encosta em laranja translúcido (50%)
2. WHEN user hovers over each layer, THE System SHALL display tooltip with area in hectares.
3. THE System SHALL include map legend with color coding e botões de toggle para ativar/desativar cada camada.
4. THE System SHALL maintain dark-theme visual (consistent with current CAR system design).

---

### Requirement 11: Exportação de Relatório Ambiental (PDF)

**User Story:**  
Como engenheiro, quero exportar um relatório profissional em PDF descrevendo APP, RL e passivo, para apresentar ao cliente.

#### Acceptance Criteria

1. THE System SHALL generate PDF report (using library like jsPDF or similar) containing:
   - Header com logo/branding CAR-MT e data de geração
   - Seção: Identificação do Imóvel (nome, município, área, matrícula)
   - Seção: Resumo Executivo (APP_Total, RL_Minima, Status de Compliance)
   - Seção: Detalhamento de APP (Agua, Nascentes, Encosta com áreas individuais)
   - Seção: Análise de RL (percentual por bioma, requisito mínimo, cobertura por APP)
   - Seção: Checklist de Passivo Ambiental (status e recomendações)
   - Seção: Mapa visual (screenshot de map + simbologia)
   - Seção: Observações Técnicas (limitações de dados, precisão)
   - Footer com timestamp e indicação "Gerado por CAR-MT Analisador"
2. PDF SHALL be exportable via button "📥 Exportar Relatório" with filename format: "CAR_Relatorio_AppRL_{imóvel_nome}_{YYYYMMDD}.pdf"
3. THE System SHALL include nota de rodapé: "Análise realizada com dados IBGE 1:250k e MapBiomas. Consulte órgãos ambientais locais (SEMA-MT) para validação oficial."

---

### Requirement 12: Estimativa de Custo de Recuperação

**User Story:**  
Como produtor rural, quero estimar o custo de recuperação da área em déficit para planejar financiamento (Pronaf, Pronamp).

#### Acceptance Criteria

1. IF RL_Deficit_Hectares > 0 (from Requirement 7), THE System SHALL apply Custo_Unitário default = R$ 5.000/ha (regional MT average).
2. THE System SHALL allow user to adjust Custo_Unitário within range R$ 3.000 – R$ 8.000/ha via slider or input field.
3. THE System SHALL calculate Custo_Total_Recuperacao = RL_Deficit_Hectares × Custo_Unitário.
4. THE System SHALL display Custo_Total in clear format: "Estimativa de Investimento: R$ {valor} ({RL_Deficit_Hectares} ha × R$ {Custo_Unitário}/ha)"
5. THE System SHALL include disclaimer: "Estimativa apenas orientativa. Custo real depende de método, espécies, mão-de-obra local. Consulte fornecedores especializados."

---

### Requirement 13: Integração com Fluxo Existente

**User Story:**  
Como usuário do CAR-MT Analisador, quero que a Calculadora APP/RL apareça automaticamente após validação geométrica, sem interrupção de fluxo.

#### Acceptance Criteria

1. WHEN user completes Etapa 2 (Revisar dados) and confirms Polígono is geometrically valid, THE System SHALL present new button or section: "📊 Analisar APP/RL" within result panel.
2. WHEN user clicks "Analisar APP/RL", THE System SHALL load hidrografia base (IBGE 1:250k) asynchronously and display loading spinner.
3. THE System SHALL NOT block user from downloading KML or CSV during analysis (async operation).
4. WHEN analysis completes, THE System SHALL inject APP/RL results into Etapa 3 (Relatório) as new section "Análise Ambiental: APP/RL".
5. THE System SHALL maintain existing export formats (KML, GeoJSON, Shapefile, CSV) and append APP/RL layers to each export.

---

### Requirement 14: Dados de Hidrografia Offline – Carregamento Inicial

**User Story:**  
Como técnico em campo com conectividade limitada, quero ter dados de hidrografia pré-carregados no navegador, sem precisar baixar durante análise.

#### Acceptance Criteria

1. THE System SHALL include pre-bundled IBGE Hidrografia 1:250k dataset (clipped to MT boundaries) as GeoJSON or compact binary format within application bundle.
2. Dataset SHALL include: cursos d'água (polylines), nascentes (points), lagos/reservatórios (polygons).
3. THE System SHALL load hidrografia data into memory (IndexedDB or equivalent) on first app launch.
4. THE System SHALL display load progress: "Carregando base de hidrografia... 45% ✓"
5. IF hidrografia load fails, THE System SHALL display alert "Dados de hidrografia indisponíveis. Funcionalidade APP/RL desabilitada temporariamente." and offer manual retry button.

---

### Requirement 15: Suporte para Ambos os Fusos UTM de MT

**User Story:**  
Como engenheiro, quero que a Calculadora funcione para imóveis em ambos os fusos (21S e 22S), sem limitações.

#### Acceptance Criteria

1. WHEN THE Calculadora_APP_RL receives Polígono in Fuso 21S (MC 57°W), THE System SHALL recognize datum and NOT reproject internally (maintain SIRGAS2000/21S).
2. WHEN THE Calculadora_APP_RL receives Polígono in Fuso 22S (MC 51°W), THE System SHALL recognize datum and NOT reproject internally (maintain SIRGAS2000/22S).
3. WHEN displaying map, THE System SHALL automatically configure map projection to match Polígono fuso.
4. THE System SHALL NOT convert between fusos internally (avoid precision loss).

---

### Requirement 16: Integração com Classificação de Imóvel (Pequena, Média, Grande Propriedade)

**User Story:**  
Como técnico, quero que o sistema considere o tipo de propriedade (pequena, média, grande) para gerar orientações customizadas de compliance.

#### Acceptance Criteria

1. WHEN THE System classifies Polígono by Porte (based on Área_Total / Módulo_Fiscal of municipality), THE Calculadora_APP_RL SHALL record Porte_Imóvel ∈ {pequena, média, grande}.
2. IF Porte_Imóvel = "pequena" (< 4 MF), THE System SHALL highlight "Propriedade enquadrada como Pequena Propriedade – Acesso a programas especiais (Pronaf Verde)".
3. IF Porte_Imóvel = "grande" (> 15 MF), THE System SHALL flag "Propriedade Consolidada – Passivo ambiental afeta elegibilidade para crédito federal".
4. THE System SHALL append Porte-specific recommendations to Checklist (Requirement 9).

---

### Requirement 17: Documentação Técnica em Português para Campo

**User Story:**  
Como técnico rural de MT, quero ter ajuda em português claro e acessível, sem jargão ambiental excessivo.

#### Acceptance Criteria

1. EVERY input field, card title, e result label SHALL use linguagem simples (not technical jargon).
2. THE System SHALL provide inline help text (ℹ️ icon) for terms like "APP", "RL", "Buffer", "Compliance" with definições one-line in português.
3. EVERY alert or warning message SHALL explain what went wrong e como proceder em next step.
4. THE System SHALL include footer "Glossário: [link] Termos ambientais" linking to Glossary section.
5. WHEN generating PDF report, THE System SHALL include Glossário as appendix com 5-10 termos mais importantes.

---

## Non-Requirements (Out of Scope)

The following are explicitly OUT OF SCOPE for this feature and may be addressed in future iterations:

- **Real-time satellite data ingestion**: Feature uses offline IBGE 1:250k data; live MapBiomas or satellite feeds are future enhancements.
- **Integration with SIGEF or SIMCAR databases**: Feature operates on standalone Polígono; no live registration system sync planned.
- **Advanced modeling (LiDAR, drone orthomosaic)**: Initial release assumes coarse raster/vector data.
- **Multi-imóvel batch processing**: Feature processes one imóvel at a time per user session.
- **Mobile app native implementation**: Feature remains web-based in browser (PWA later if needed).
- **Machine learning classification of land cover**: Uses MapBiomas static classification (no model training in-app).

---

## Assumptions

1. User has already uploaded memorial and validated Polígono geometry in Etapa 1-2.
2. IBGE Hidrografia 1:250k is sufficiently accurate for this analysis (±250m precision accepted).
3. Bioma classification is based on municipality centroid; ambiguous cases (Polígono spanning biomes) will receive warning but not block processing.
4. Declividade data (SRTM 90m) is optional for MVP; encosta calculation may be deferred if unavailable.
5. Cost estimation (Requirement 12) is advisory only; real costs require specialized quotes.
6. Offline functionality assumes device has sufficient storage (< 50 MB for full hidrografia dataset).

