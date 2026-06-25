# Requirements Document: Calculadora APP/RL

## Introduction

A **Calculadora APP/RL** é um módulo core do CAR-MT Analisador que automatiza a detecção de Áreas de Preservação Permanente (APP) e o cálculo de Reserva Legal (RL) para imóveis rurais em Mato Grosso. 

**APP (Área de Preservação Permanente)**: Buffers obrigatórios definidos pelo Código Florestal que protegem cursos d'água, nascentes, encostas e topo de morros. Variam conforme largura e declividade.

**RL (Reserva Legal)**: Percentual mínimo de cobertura florestal nativa que o proprietário é obrigado a manter:
- **80% em Amazônia Legal** (norte do MT, maioria dos municípios)
- **35% em Cerrado** (região central)

Esta calculadora resolve o problema crítico: nenhuma ferramenta faz isso offline de forma simples e intuitiva. Técnicos de campo precisam orientar produtores sobre conformidade ambiental, e este módulo elimina a rejeição de CAR por falta de cálculo de APP/RL.

## Glossary

- **APP**: Área de Preservação Permanente, buffer obrigatório conforme Código Florestal
- **RL**: Reserva Legal, percentual mínimo de cobertura florestal nativa obrigatória por lei
- **Código_Florestal**: Lei Federal 12.651/2012 que regulamenta APP e RL no Brasil
- **Amazônia_Legal**: Bioma definido legalmente em MT (norte da linha Cuiabá-Santarém)
- **Cerrado**: Bioma nativo do centro-oeste brasileiro
- **Hidrografia**: Rede de cursos d'água (rios, córregos, nascentes) de um imóvel
- **Polígono_Imóvel**: Geometria do perímetro do imóvel definida pelos vértices do memorial
- **Buffer**: Zona de proteção criada por distância fixa perpendicular a um elemento linear
- **SIRGAS2000**: Sistema de referência de coordenadas oficial do Brasil
- **UTM**: Universal Transverse Mercator, projeção de coordenadas usada em memoriais descritivos
- **Bioma_Classificação**: Determinação de Amazônia Legal ou Cerrado conforme localização do município
- **Passivo_Ambiental**: Diferença entre APP/RL exigida e a cobertura real do imóvel
- **Cobertura_Nativa**: Revestimento florestal nativo conforme imagens de satélite
- **INCRA**: Instituto Nacional de Colonização e Reforma Agrária
- **CNA**: Confederação da Agricultura e Pecuária do Brasil
- **Município_MT**: Localidade em Mato Grosso que determina o módulo fiscal e classificação de bioma
- **Vértice**: Ponto de coordenada UTM que marca extremo do perímetro do imóvel

---

## Requirements

### Requirement 1: Detector de APP por Cursos d'Água

**User Story:** Como técnico de CAR, quero que o sistema detecte automaticamente as Áreas de Preservação Permanente em torno de cursos d'água, para orientar o produtor sobre zonas de proteção obrigatória e calcular o passivo ambiental.

#### Acceptance Criteria

1. WHEN the APP Calculator receives an imovel polygon and a hidrography layer THEN THE APP_Detector SHALL identify all rivers and streams that intersect or are adjacent to the imovel boundary

2. WHEN a river or stream of width < 10 meters is intersected THEN THE APP_Detector SHALL create a buffer of 30 meters on each side of the watercourse centerline according to Codigo_Florestal Article 4

3. WHEN a river or stream of width 10-50 meters is intersected THEN THE APP_Detector SHALL create a buffer of 50 meters on each side according to Codigo_Florestal Article 4

4. WHEN a river or stream of width > 50 meters is intersected THEN THE APP_Detector SHALL create a buffer of 100 meters on each side according to Codigo_Florestal Article 4

5. WHEN the Polígono_Imóvel overlaps with calculated APP buffers THEN THE APP_Detector SHALL calculate the total area of APP within the imovel in hectares with 0.01 ha precision

6. WHEN APP buffers extend beyond the Polígono_Imóvel boundary THEN THE APP_Detector SHALL exclude external areas and only count APP area within the imovel perimeter

7. THE APP_Detector SHALL validate that hidrography data is in SIRGAS2000 projection and automatically convert if necessary

#### Testing Guidance

- **APP Detection Accuracy**: Property with 3 watercourses of varying widths → System detects all 3, calculates correct buffer distances
- **Boundary Clipping**: APP buffer that extends 50m beyond property boundary → System correctly excludes external area
- **Precision**: 10,000 ha property with APP → Result consistent to ±0.05 ha
- **Edge Case - Zero Hidrography**: Property with no rivers/streams → System returns 0 APP area and communicates this clearly
- **Edge Case - Entire Property is APP**: Narrow strip along river → System handles when entire property is APP buffer

---

### Requirement 2: Detector de APP por Nascentes

**User Story:** Como técnico de campo, quero que o sistema detecte nascentes de água no imóvel para garantir conformidade com o buffer obrigatório de 50 metros estabelecido pelo Código Florestal.

#### Acceptance Criteria

1. WHEN the APP Calculator receives nascentes (spring points) within or near the imovel boundary THEN THE APP_Detector SHALL create circular APP buffers with radius of 50 meters around each nascente according to Codigo_Florestal Article 4, §2

2. WHEN multiple nascentes buffers overlap THEN THE APP_Detector SHALL merge overlapping areas into a single unified buffer zone without double-counting

3. THE APP_Detector SHALL distinguish between detected nascentes (from hidrografia layer) and declared nascentes (from farmer interview/documents)

4. WHEN a nascente is located within 100 meters of the imovel boundary THEN THE APP_Detector SHALL include it in the APP calculation even if the nascente itself is outside the property

5. THE APP_Detector SHALL flag nascentes located on the imovel boundary or very close (< 5 meters) for manual verification by the technician

#### Testing Guidance

- **Single Nascente**: Property with 1 spring at coordinates → Buffer calculated at exactly 50m radius
- **Overlapping Nascentes**: 2 springs 80m apart (buffers overlap) → Merged area calculated without duplication
- **Nascente Near Boundary**: Spring 30m outside property → Included in APP calc, flagged for review
- **Zero Nascentes**: Property with no known springs → Returns 0 APP from nascentes
- **Multiple Overlapping**: 5 springs with complex overlap patterns → All merged correctly

---

### Requirement 3: Detector de APP por Encostas e Topos

**User Story:** Como técnico, quero que o sistema detecte automaticamente áreas de encosta com declividade > 45° e topos de morro para calcular APP conforme o Código Florestal, evitando irregular erros na interpretação visual.

#### Acceptance Criteria

1. WHEN the APP Calculator has access to a Digital Elevation Model (DEM) covering the imovel area THEN THE APP_Detector SHALL analyze slope for all pixels within the Polígono_Imóvel

2. WHEN slope analysis identifies areas with declivity > 45 degrees THEN THE APP_Detector SHALL classify these areas as APP_Encosta (slope-based APP)

3. WHEN slope analysis identifies local topographic high points THEN THE APP_Detector SHALL classify areas within 100 meters of the summit as APP_Topo (hilltop APP)

4. THE APP_Detector SHALL calculate total APP_Encosta and APP_Topo area separately from river/stream APP

5. WHEN slope data is unavailable or low resolution (> 30m pixels) THEN THE APP_Detector SHALL return a warning message and recommend manual verification by terrain inspection

6. THE APP_Detector SHALL provide a visual heatmap overlay showing declivity levels (0-10°, 10-30°, 30-45°, >45°) for technician review

#### Testing Guidance

- **High Slope Detection**: DEM with 30m resolution covering steep hillside → APP areas > 45° correctly identified
- **Hilltop Detection**: DEM showing clear peak → 100m radius around summit classified as APP_Topo
- **Mixed Terrain**: Property with flat area + slope + hilltop → Each zone calculated separately
- **No Slope Data**: DEM unavailable → System returns clear warning, disables feature
- **Boundary Cases**: Slope gradient exactly at 45° → System includes in APP (inclusive rule)

---

### Requirement 4: Calculador de Reserva Legal Obrigatória

**User Story:** Como técnico, quero que o sistema calcule automaticamente a RL mínima exigida para o imóvel conforme o bioma (Amazônia 80% ou Cerrado 35%), para gerar relatórios de conformidade e passivo ambiental.

#### Acceptance Criteria

1. WHEN the Calculador_RL receives the imovel total area (hectares) AND a bioma_classificação (Amazonia_Legal or Cerrado) THEN THE Calculador_RL SHALL calculate RL_Minima as a percentage of total area

2. WHEN bioma_classificação is Amazonia_Legal THEN THE Calculador_RL SHALL set RL_Minima to 80% of imovel area according to Lei 12.651/2012 Article 12

3. WHEN bioma_classificação is Cerrado THEN THE Calculador_RL SHALL set RL_Minima to 35% of imovel area according to Lei 12.651/2012 Article 12

4. WHEN the imovel is located in a municipality where Amazonia_Legal boundary passes through THEN THE Calculador_RL SHALL apply 80% (more restrictive standard) to the entire imovel OR calculate proportionally if municipality contains both biomas

5. THE Calculador_RL SHALL validate the bioma_classificação using imovel municipality and geographic coordinates against IBGE official bioma boundaries

6. WHEN RL_Minima is calculated THEN THE Calculador_RL SHALL also calculate RL_Deficit as MAX(0, RL_Minima - Cobertura_Nativa_Atual)

7. THE Calculador_RL SHALL output RL calculations as a structured object containing: RL_Minima (ha), RL_Percentage, Bioma_Used, RL_Deficit (ha), Confidence_Level

#### Testing Guidance

- **Amazônia Property**: 1000 ha in Sapezal (northern MT) → RL_Minima = 800 ha
- **Cerrado Property**: 1000 ha in city south of line (Cerrado area) → RL_Minima = 350 ha
- **Mixed Bioma**: 500 ha in municipality spanning both → System applies 80% or proportional calculation
- **Very Small Property**: 1 ha → Rounded correctly (system does not require minimum property size)
- **Boundary Validation**: Invalid coordinates → System returns error with guidance

---

### Requirement 5: Integração com Dados de Cobertura Nativa

**User Story:** Como técnico, quero que o sistema integre dados de cobertura florestal nativa atualizada para calcular automaticamente o RL atual do imóvel, comparar com a obrigação legal e estimar o passivo ambiental.

#### Acceptance Criteria

1. WHEN the APP/RL Calculator is initialized for an imovel location THEN THE Sistema SHALL load available raster data of native forest coverage (MapBiomas, PRODES, local surveys)

2. WHEN raster coverage data is available at 30m resolution or better THEN THE Sistema SHALL intersect the Polígono_Imóvel with the coverage data and calculate Cobertura_Nativa_Atual in hectares

3. WHEN coverage data is unavailable or outdated (> 2 years) THEN THE Sistema SHALL display a warning and allow technician to manually input estimated native coverage percentage

4. THE Sistema SHALL distinguish between vegetation types: Floresta_Nativa, Cerrado_Nativo, Caatinga, other bioma-specific vegetation that qualifies as RL

5. WHEN Cobertura_Nativa_Atual is calculated THEN THE Sistema SHALL compute RL_Deficit = MAX(0, RL_Minima - Cobertura_Nativa_Atual)

6. WHEN RL_Deficit > 0 THEN THE Sistema SHALL classify the imovel as RL_Deficit requiring recovery, and calculate recovery area in hectares and estimated cost using INCRA/CNA market rates

7. THE Sistema SHALL provide a visual overlay showing: Native coverage areas (green), APP zones (blue), RL deficit areas needing recovery (yellow)

#### Testing Guidance

- **Coverage Data Available**: Property in mapped region with recent MapBiomas → Cobertura_Nativa accurately calculated
- **Coverage Data Unavailable**: Property in unmapped region or > 2 years old → Warning displayed, manual entry allowed
- **Multiple Coverage Types**: Property with mix of Floresta + Cerrado + degraded area → Each type calculated
- **Zero Coverage**: Completely deforested property → Cobertura_Nativa = 0, RL_Deficit = 100% of RL_Minima
- **100% Coverage**: Property completely forested → RL_Deficit = 0, system confirms compliance

---

### Requirement 6: Cálculo de Passivo Ambiental Integrado

**User Story:** Como técnico ou produtor, quero um resumo consolidado de todas as obrigações ambientais (APP + RL) e o que falta para conformidade, para tomar decisões de regularização e acesso a crédito rural.

#### Acceptance Criteria

1. WHEN all APP and RL calculations are complete THEN THE Sistema SHALL generate a Passivo_Ambiental_Report containing:
   - APP_Total (ha) = sum of all APP zones
   - RL_Minima (ha) and percentage
   - Cobertura_Nativa_Atual (ha) and percentage
   - RL_Deficit (ha) and percentage
   - Total_Regularizacao_Area = APP not yet protected + RL deficit area
   - Estimated_Recovery_Cost_BRL

2. WHEN the imovel is in compliance (Cobertura_Nativa >= RL_Minima AND APP is protected) THEN THE Report SHALL display a compliance badge and explain the status in clear language for the farmer

3. WHEN the imovel has a deficit THEN THE Report SHALL:
   - Clearly state the area that needs recovery or protection
   - Estimate recovery cost using INCRA/CNA benchmark rates (R$/ha for native restoration)
   - Provide prioritization guidance: which APP/RL areas to recover first

4. THE Report SHALL include a confidence assessment for each calculation (e.g., "High confidence" if DEM resolution is good, "Manual verification recommended" if data is sparse)

5. WHEN the Passivo_Ambiental_Report is finalized THEN THE Sistema SHALL export it in multiple formats:
   - PDF with visual maps and charts (for farmer presentation)
   - JSON (for system integration)
   - CSV summary (for spreadsheet analysis)

6. THE Report SHALL include a checklist of next steps for the technician:
   - Verify APP zones on field visit
   - Obtain satellite imagery or drone survey for coverage validation
   - Plan recovery strategy
   - Estimate timelines and costs

#### Testing Guidance

- **Compliant Property**: APP protected, 85% native coverage (RL 80%) → Report shows "Compliant", clear status
- **APP Deficit**: 50 ha APP missing protection → Report shows area, suggests priority recovery
- **RL Deficit**: 80 ha RL deficit → Report estimates cost at R$ 80 × market rate
- **Full Deficit**: Both APP and RL gaps → Report consolidates both, prioritizes
- **Report Export**: All formats generated successfully and contain consistent data

---

### Requirement 7: Visualização Cartográfica Integrada

**User Story:** Como técnico em campo, quero visualizar APP, RL zones e cobertura nativa no mapa junto com o perímetro do imóvel, para validar dados e comunicar conformidade/déficit visualmente ao produtor.

#### Acceptance Criteria

1. WHEN the APP/RL calculations are complete THEN THE Visualização SHALL display an interactive map showing:
   - Polígono_Imóvel (black boundary)
   - APP_Cursos_Água (blue buffer zones)
   - APP_Nascentes (light blue circular buffers)
   - APP_Encostas (purple overlay if slope data available)
   - RL_Required_Zone (green shaded, 80% or 35% of property)
   - Cobertura_Nativa_Atual (dark green where vegetation exists)
   - RL_Deficit_Zone (yellow where recovery needed)

2. WHEN the user hovers over any layer THEN THE Visualização SHALL display the layer name, area in hectares, and percentage of total

3. WHEN the user clicks on an APP or RL deficit area THEN THE Visualização SHALL show details:
   - Exact area (ha)
   - Reason for classification (river buffer, nascente, slope, etc.)
   - Suggested recovery action

4. THE Visualização SHALL provide layer toggle buttons to show/hide individual APP components, RL zones, and native coverage

5. THE Visualização SHALL automatically zoom to the imovel boundary when initialized

6. THE Visualização SHALL support zoom levels from 1:100,000 (whole region) to 1:5,000 (field detail)

7. WHEN the imovel boundary is very large (> 5000 ha) THEN THE Visualização MAY use GeoJSON or MapBox tiles for performance, ensuring smooth interaction even with complex geometries

8. THE Visualização SHALL provide an export button to generate a static map image (PNG/PDF) for reports or field documentation

#### Testing Guidance

- **Layer Display**: All layers render without errors, are visually distinct
- **Hover Interaction**: Hovering shows correct area values for each layer
- **Toggle Buttons**: Each layer can be independently shown/hidden
- **Large Property**: 5000+ ha property → Map remains responsive
- **Zoom Levels**: Seamless zoom from regional to field-detail scale
- **Export**: Map image exports match on-screen display

---

### Requirement 8: Dados de Hidrografia Local para MT

**User Story:** Como técnico offline em fazenda no interior de MT, quero que o sistema tenha dados de rios e nascentes pré-carregados localmente, para calcular APP mesmo sem conexão com internet.

#### Acceptance Criteria

1. WHEN the APP/RL Calculator is first opened THEN THE Sistema SHALL include a pre-loaded local database of Mato Grosso hidrography (rivers, streams, nascentes) at 1:50,000 scale (IBGE standard)

2. THE local hidrography database SHALL include:
   - Rio Verde de Mato Grosso and all tributaries
   - Rio Cuiabá and all tributaries
   - Rio Araguaia and all tributaries
   - Rio Teles Pires and all tributaries
   - Smaller regional streams and creek networks
   - Documented nascentes locations

3. WHEN the Polígono_Imóvel is drawn or imported THEN THE Sistema SHALL automatically query the local hidrography database and identify intersecting watercourses

4. THE local database SHALL be updateable: the user can download fresh hidrography data (e.g., from IBGE or INPE) and reload it without restarting the application

5. WHEN hidrography data is outdated or incomplete THEN THE Técnico SHALL be able to manually add rivers/nascentes by drawing on the map or importing from local shapefile/KML files

6. THE database SHALL support both pre-calculated static queries (for common regions) and dynamic spatial queries (for arbitrary polygons)

7. WHEN using local data, the Sistema SHALL store no user data in external servers (privacy compliance)

#### Testing Guidance

- **Database Load**: Local hidrography loads on startup in < 2 seconds
- **Common Region**: Property in Sapezal area → System finds all local rivers without delay
- **Intersection Detection**: Property boundary crosses 2 rivers → Both detected correctly
- **Manual Addition**: User draws river on map → System uses it for APP calculation
- **Database Update**: User downloads new IBGE data → System loads it successfully
- **Offline Mode**: All functions work with local data, no internet required

---

### Requirement 9: Relatório em PDF com Recomendações de Regularização

**User Story:** Como técnico, quero gerar um relatório em PDF profissional com cálculos de APP/RL, mapas, passivo ambiental e recomendações de ação para o produtor rural.

#### Acceptance Criteria

1. WHEN the Passivo_Ambiental_Report is finalized THEN THE Sistema SHALL generate a professional PDF containing:
   - Header with property name, municipality, date
   - Executive summary: compliance status, total APP, RL percentage, deficit
   - Detailed APP calculation breakdown (rivers, nascentes, slopes if available)
   - RL calculation: bioma, percentage required, current coverage, deficit
   - Full-page map showing all APP/RL zones and coverage
   - Cost estimate for regularization based on market rates
   - Checklist of next steps for farmer/technician

2. THE PDF SHALL be formatted for printing on A4 paper (portrait, margins 2.5cm)

3. THE PDF SHALL include sections in Portuguese (Brazilian Portuguese terminology):
   - "Resumo Executivo" with compliance badge (CONFORME / PASSIVO)
   - "Análise de Área de Preservação Permanente" with table of APP components
   - "Análise de Reserva Legal" with RL percentage calculation
   - "Mapa de Situação Ambiental" with color-coded zones
   - "Estimativa de Custo de Regularização" with market rates used
   - "Próximos Passos Recomendados" with actionable guidance

4. WHEN APP or RL deficit exists THEN THE PDF SHALL include:
   - Priority recovery actions with estimated timeline
   - Cost estimates for native forest restoration (R$/ha)
   - Eligibility guidance for government programs (Pronaf, Pronamp)

5. THE PDF SHALL allow embedding of the technician's logo/branding (name, CREA number, email)

6. THE PDF SHALL be exportable from the application with a single button click and automatically named with property name and date (e.g., "Fazenda_XYZ_APP_RL_2024-01-15.pdf")

#### Testing Guidance

- **PDF Generation**: Report generates without errors for property with full APP/RL data
- **Map Quality**: Embedded map is legible, colors match on-screen display
- **Printing**: PDF prints correctly on A4 paper in portrait mode
- **Compliance Badge**: Badge correctly shows CONFORME or PASSIVO based on data
- **Branding**: Technician logo/name appears in header when configured
- **Large Report**: Property with complex data → PDF remains < 5MB

---

### Requirement 10: Integração com Sistema CAR-MT Existente

**User Story:** Como usuário do CAR-MT Analisador, quero que os cálculos de APP/RL preencham automaticamente os campos relevantes do formulário SIMCAR, evitando reentry manual de dados.

#### Acceptance Criteria

1. WHEN APP/RL calculations are finalized THEN THE Sistema SHALL make all results available to the main CAR-MT form:
   - APP_Total area in hectares
   - RL_Minima percentage based on bioma
   - RL_Deficit if applicable
   - List of watercourses identified
   - List of nascentes identified

2. WHEN the user navigates from APP/RL Calculator to the SIMCAR form THEN THE Sistema SHALL:
   - Auto-populate the "APP area" field
   - Auto-populate the "RL percentage required" field
   - Auto-populate any notes about deficit
   - Preserve all APP/RL data in session for reference

3. THE Sistema SHALL allow the user to review and edit APP/RL results before submitting to SIMCAR

4. WHEN APP or RL data is changed in one module THEN THE OTHER MODULE SHALL reflect the change automatically if possible, or alert the user of inconsistency

5. THE APP/RL module SHALL NOT interfere with existing CAR-MT form flow; it SHALL be optional but recommended

6. ALL APP/RL calculation results SHALL be included when the user exports the final CAR data (KML, PDF, JSON)

#### Testing Guidance

- **Data Passing**: Complete APP/RL data passes to SIMCAR form without loss
- **Auto-Population**: Form fields pre-fill with APP/RL results correctly
- **User Edits**: User can modify auto-populated values if needed
- **Export Integration**: Exported CAR file includes APP/RL calculations
- **Form Flow**: Existing form validation and submission still work with APP/RL data

---

## Special Notes for Implementors

### Data Sources and Accuracy

1. **Hidrografia (Rivers/Streams)**:
   - Primary: IBGE 1:50,000 scale hydrographic network (free, pre-loaded)
   - Backup: INPE/PRODES updated annually
   - Manual override: Users can add custom rivers from field surveys

2. **Bioma Classification**:
   - Use IBGE official bioma boundaries
   - Amazônia Legal boundary passes through MT; apply 80% RL to entire northern regions
   - Cerrado areas south of the line use 35%

3. **Cobertura Nativa (Native Coverage)**:
   - Preferred: MapBiomas annual maps (free, 30m resolution)
   - Fallback: INPE PRODES deforestation data (2-year recency)
   - Manual input: Technician can estimate if automated data unavailable

4. **Cost Estimates**:
   - Use INCRA/CNA published R$/ha rates for native forest restoration
   - Update annually or allow technician override

### Performance and Scalability

- APP/RL calculations must complete within 5-10 seconds for typical 1000 ha property
- Support properties up to 10,000 ha without performance degradation
- UI must remain responsive during calculation (use web workers if needed)

### User Experience

- All technical terminology (APP, RL, buffer, deficit) must be explained in-app with tooltips
- Reports must be comprehensible to farmers with basic literacy (clear language, visual aids)
- Visualizations should use intuitive color schemes (blue=water/APP, green=forest/RL, yellow=deficit)

### Compliance and Legal

- All calculations must reference specific articles of Lei 12.651/2012
- Results must include confidence/uncertainty levels
- System must include disclaimers that technical field verification is always recommended

---

## Non-Functional Requirements

1. **Offline Capability**: All core calculations work offline with pre-loaded data; internet not required
2. **Browser Compatibility**: Chrome, Firefox, Safari (modern versions)
3. **Accessibility**: WCAG 2.1 AA compliance for color contrast and keyboard navigation
4. **Security**: No sensitive user data transmitted externally; all processing local
5. **Data Persistence**: Session data retained during calculator use; optional local storage for history
6. **Mobile Responsive**: Calculator usable on tablets (iPad, Android tablets) for field use
7. **Printing**: All reports must print legibly on standard A4 paper
