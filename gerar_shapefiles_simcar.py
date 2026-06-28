#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
GERADOR AUTOMÁTICO DE SHAPEFILES PARA SIMCAR/MT
Fazenda Novo Sobradinho - Sapezal/MT
Proprietário: Nolsir José Fernandes
Eng. Responsável: Markus Vinícius Ramos de Matos (ART: 1220260114235)
=============================================================================
Este script:
1. Extrai coordenadas do Memorial Descritivo
2. Converte UTM -> SIRGAS 2000 Geográfico (EPSG:4674)
3. Busca dados do MapBiomas (2008 e 2024) via Google Earth Engine
4. Busca hidrografia (HydroSHEDS) e elevação (SRTM)
5. Classifica camadas conforme regras do SIMCAR/MT
6. Vetoriza e exporta shapefiles
7. Gera pacote .zip pronto para upload
=============================================================================
"""

import ee
import geopandas as gpd
from shapely.geometry import Polygon, Point, LineString, box
from shapely.ops import unary_union
import pyproj
import zipfile
import os
import sys
import time
from pathlib import Path

# =============================================================================
# CONFIGURAÇÕES GERAIS
# =============================================================================

# Configurações do imóvel (extraídas do Memorial Descritivo)
CONFIG_IMOVEL = {
    'nome': 'FAZENDA NOVO SOBRADINHO',
    'proprietario': 'NOLSIR JOSE FERNANDES',
    'cpf': '78028302149',
    'municipio': 'SAPEZAL',
    'uf': 'MT',
    'bioma': 'AMAZONIA',  # Sapezal/MT = Bioma Amazônia (80% RL)
    'percentual_rl': 0.80,  # 80% para Amazônia em MT
    'area_ha': 596.2034,
    'perimetro_m': 11240.39,
    'finalidade': 'USUCAPIAO',  # Posse para fins de usucapião
}

# Coordenadas UTM do Memorial Descritivo (SIRGAS 2000, MC 57°W, Fuso 21S)
# Formato: (Este, Norte) - Ordem (X, Y)
COORDENADAS_UTM = [
    (299850.79, 8543511.77),   # EFDA-M-0207 (Início - Estrada SZL-03 / Fazenda Fartura)
    (303635.35, 8542365.01),   # EFDA-M-0194 (Fazenda Fartura / Rio Saué-uiná)
    (303605.19, 8542233.83),   # EFDA-V-1000
    (303625.83, 8542211.61),   # EFDA-V-1001
    (303627.41, 8542171.94),   # EFDA-V-1002
    (303684.77, 8542093.86),   # EFDA-V-1003
    (303678.69, 8542056.01),   # EFDA-V-1004
    (303685.62, 8542042.38),   # EFDA-V-1005
    (303680.10, 8542035.52),   # EFDA-V-1006
    (303642.82, 8542035.44),   # EFDA-V-1007
    (303634.79, 8542029.02),   # EFDA-V-1008
    (303585.92, 8542033.24),   # EFDA-V-1009
    (303565.82, 8542025.54),   # EFDA-M-0210
    (303574.67, 8541992.56),   # EFDA-V-1010
    (303574.12, 8541932.07),   # EFDA-V-1011
    (303555.90, 8541876.84),   # EFDA-V-1012
    (303537.28, 8541858.08),   # EFDA-V-1013
    (303473.18, 8541872.09),   # EFDA-V-1014
    (303442.28, 8541859.33),   # EFDA-V-1015
    (303420.87, 8541834.28),   # EFDA-V-1016
    (303424.60, 8541773.23),   # EFDA-V-1017
    (303419.19, 8541708.22),   # EFDA-V-1018
    (303370.32, 8541707.29),   # EFDA-V-1019
    (303350.86, 8541696.05),   # EFDA-V-1020
    (303349.25, 8541655.56),   # EFDA-V-1021
    (303334.98, 8541634.93),   # EFDA-V-1022
    (303339.54, 8541611.97),   # EFDA-V-1023
    (303308.08, 8541581.13),   # EFDA-V-1024
    (303316.34, 8541542.84),   # EFDA-V-1025
    (303331.11, 8541533.02),   # EFDA-V-1026
    (303373.38, 8541451.54),   # EFDA-V-1027
    (303393.01, 8541442.74),   # EFDA-V-1028
    (303422.63, 8541453.21),   # EFDA-V-1029
    (303440.60, 8541470.99),   # EFDA-V-1030
    (303457.20, 8541474.06),   # EFDA-V-1031
    (303462.73, 8541467.64),   # EFDA-V-1032
    (303426.77, 8541439.26),   # EFDA-V-1033
    (303377.10, 8541386.59),   # EFDA-V-1034
    (303338.15, 8541312.61),   # EFDA-V-1035
    (303308.49, 8541207.62),   # EFDA-V-1036
    (303259.44, 8541103.85),   # EFDA-V-1037
    (303158.46, 8541007.53),   # EFDA-V-1038
    (303150.60, 8540962.63),   # EFDA-V-1039
    (303139.02, 8540923.61),   # EFDA-V-1040
    (303142.51, 8540890.07),   # EFDA-V-1041
    (303118.51, 8540840.69),   # GGEO-P-6466 (Rio Saué-uiná / Fazenda Cacoré)
    (303110.75, 8540843.53),   # GGEO-M-0967
    (299671.13, 8541985.23),   # GGEO-M-1269 (Fazenda Cacoré / Estrada SZL-03)
    (299832.95, 8543357.78),   # EFDA-M-0206
    (299850.79, 8543511.77),   # EFDA-M-0207 (Fechamento)
]

# Classes do MapBiomas Coleção 9
CLASSES_MAPBIOMAS = {
    'vegetacao_nativa': [1, 2, 3, 4, 5, 9, 11, 12, 29, 32, 48, 49, 50, 62],
    'floresta': [1, 2, 3, 4, 9, 48, 49, 50, 62],
    'cerrado': [5, 11, 12, 29, 32],
    'uso_consolidado': [15, 18, 19, 20, 21, 35, 36, 39, 40, 41, 46, 47, 63],
    'pastagem': [15, 41],
    'agricultura': [18, 19, 20, 21, 36, 39, 40],
    'agua': [33],
    'infraestrutura': [47],
}

# IDs dos assets do Google Earth Engine
GEE_ASSETS = {
    'mapbiomas_2024': 'projects/mapbiomas-workspace/public/collection9/mapbiomas_collection90_integration_v1',
    'mapbiomas_2008': 'projects/mapbiomas-workspace/public/collection9/mapbiomas_collection90_integration_v1',
    'hydrosheds': 'WWF/HydroSHEDS/v1/RivGeometries',
    'srtm': 'USGS/SRTMGL1_003',
}

# Diretório de saída
OUTPUT_DIR = Path('SIMCAR_Fazenda_Novo_Sobradinho')
OUTPUT_DIR.mkdir(exist_ok=True)


# =============================================================================
# FUNÇÕES AUXILIARES
# =============================================================================

def log(msg, tipo='INFO'):
    """Função de log formatada"""
    timestamp = time.strftime('%Y-%m-%d %H:%M:%S')
    print(f"[{timestamp}] [{tipo}] {msg}")


def converter_utm_para_geografico(coordenadas_utm):
    """
    Converte coordenadas UTM (EPSG:31981 - SIRGAS 2000 Fuso 21S)
    para Geográfico (EPSG:4674 - SIRGAS 2000)
    """
    log("Convertendo coordenadas UTM -> Geográfico (SIRGAS 2000)...")
    
    # Definir transformador de projeção
    transformer = pyproj.Transformer.from_crs(
        "EPSG:31981",  # UTM SIRGAS 2000 Fuso 21S
        "EPSG:4674",   # Geográfico SIRGAS 2000
        always_xy=True
    )
    
    coordenadas_geo = []
    for este, norte in coordenadas_utm:
        lon, lat = transformer.transform(este, norte)
        coordenadas_geo.append((lon, lat))
    
    log(f"  Conversão concluída: {len(coordenadas_geo)} vértices")
    return coordenadas_geo


def criar_poligono_perimetro(coordenadas_geo):
    """Cria um polígono Shapely a partir das coordenadas geográficas"""
    log("Criando polígono do perímetro...")
    poligono = Polygon(coordenadas_geo)
    
    if not poligono.is_valid:
        log("  ⚠️ Polígono inválido! Aplicando correção...", 'WARNING')
        poligono = poligono.buffer(0)
    
    area_ha = poligono.area * 10000  # Converter de graus² para hectares (aproximado)
    log(f"  Área calculada: ~{area_ha:.4f} ha (referência: {CONFIG_IMOVEL['area_ha']} ha)")
    
    return poligono


# =============================================================================
# AUTENTICAÇÃO E INICIALIZAÇÃO DO GOOGLE EARTH ENGINE
# =============================================================================

def inicializar_gee(project_id=None):
    """
    Inicializa a conexão com o Google Earth Engine.
    Requer autenticação prévia via 'gcloud auth application-default login'
    ou 'earthengine authenticate'.
    """
    log("Inicializando Google Earth Engine...")
    
    try:
        # Verificar se já está autenticado
        ee.Initialize(project=project_id)
        log("  ✅ Earth Engine inicializado com sucesso!")
        return True
    except ee.EEException as e:
        log(f"  ❌ Erro ao inicializar Earth Engine: {e}", 'ERROR')
        log("  Execute: earthengine authenticate", 'WARNING')
        return False


# =============================================================================
# PROCESSAMENTO DE DADOS AMBIENTAIS (GEE)
# =============================================================================

def carregar_mapbiomas(perimetro_ee, ano=2024):
    """Carrega e recorta a imagem do MapBiomas para o ano especificado"""
    log(f"Carregando MapBiomas Coleção 9 (Ano {ano})...")
    
    try:
        # Carregar a coleção completa
        collection = ee.Image(GEE_ASSETS[f'mapbiomas_{ano}'])
        
        # Selecionar a banda do ano específico
        # A banda é nomeada como "classification_{ano}"
        banda = collection.select(f'classification_{ano}')
        
        # Recortar no perímetro
        recorte = banda.clip(perimetro_ee)
        
        log(f"  ✅ MapBiomas {ano} carregado e recortado")
        return recorte
        
    except Exception as e:
        log(f"  ❌ Erro ao carregar MapBiomas {ano}: {e}", 'ERROR')
        return None


def classificar_vegetacao_nativa(mapbiomas_img):
    """
    Classifica pixels de Vegetação Nativa (AVN)
    Classes: 1, 2, 3, 4, 5, 9, 11, 12, 29, 32, 48, 49, 50, 62
    """
    log("Classificando Vegetação Nativa (AVN)...")
    
    classes = CLASSES_MAPBIOMAS['vegetacao_nativa']
    valores_saida = [1] * len(classes)
    
    # Remapear: classes de vegetação nativa -> 1, resto -> 0
    avn = mapbiomas_img.remap(classes, valores_saida, 0).selfMask()
    
    log("  ✅ Classificação AVN concluída")
    return avn


def classificar_uso_consolidado(mapbiomas_2008, mapbiomas_2024):
    """
    Classifica Área Consolidada (desmatada antes de 22/07/2008)
    Regra: Era uso antrópico em 2008 E continua sendo uso antrópico em 2024
    """
    log("Classificando Área Consolidada (2008)...")
    
    classes_anthropicas = CLASSES_MAPBIOMAS['uso_consolidado']
    valores_saida = [1] * len(classes_anthropicas)
    
    # Uso antrópico em 2008
    uso_2008 = mapbiomas_2008.remap(classes_anthropicas, valores_saida, 0).selfMask()
    
    # Uso antrópico em 2024
    uso_2024 = mapbiomas_2024.remap(classes_anthropicas, valores_saida, 0).selfMask()
    
    # Interseção: era uso em 2008 E é uso em 2024
    area_consolidada = uso_2008.And(uso_2024).selfMask()
    
    log("  ✅ Classificação Área Consolidada concluída")
    return area_consolidada


def classificar_auas(mapbiomas_2008, mapbiomas_2024):
    """
    Classifica AUAS - Área de Uso Antropizado do Solo (desmatamento pós-2008)
    Regra: Era vegetação nativa em 2008 E é uso antrópico em 2024
    """
    log("Classificando AUAS (desmatamento pós-2008)...")
    
    classes_vegetacao = CLASSES_MAPBIOMAS['vegetacao_nativa']
    classes_anthropicas = CLASSES_MAPBIOMAS['uso_consolidado']
    valores_saida = [1] * len(classes_vegetacao)
    valores_saida_ant = [1] * len(classes_anthropicas)
    
    # Vegetação em 2008
    veg_2008 = mapbiomas_2008.remap(classes_vegetacao, valores_saida, 0).selfMask()
    
    # Uso antrópico em 2024
    uso_2024 = mapbiomas_2024.remap(classes_anthropicas, valores_saida_ant, 0).selfMask()
    
    # Interseção: era vegetação em 2008 E é uso em 2024
    auas = veg_2008.And(uso_2024).selfMask()
    
    log("  ✅ Classificação AUAS concluída")
    return auas


def classificar_tipologia(mapbiomas_2024):
    """
    Classifica Tipologia Vegetal (Floresta vs Cerrado)
    Usado para cálculo do percentual de Reserva Legal
    """
    log("Classificando Tipologia Vegetal...")
    
    classes_floresta = CLASSES_MAPBIOMAS['floresta']
    classes_cerrado = CLASSES_MAPBIOMAS['cerrado']
    
    floresta = mapbiomas_2024.remap(classes_floresta, [1]*len(classes_floresta), 0).selfMask()
    cerrado = mapbiomas_2024.remap(classes_cerrado, [1]*len(classes_cerrado), 0).selfMask()
    
    log("  ✅ Classificação Tipologia concluída")
    return floresta, cerrado


def carregar_hidrografia(perimetro_ee):
    """Carrega dados de hidrografia do HydroSHEDS"""
    log("Carregando hidrografia (HydroSHEDS)...")
    
    try:
        rios = ee.FeatureCollection(GEE_ASSETS['hydrosheds'])
        rios_recorte = rios.filterBounds(perimetro_ee)
        
        log("  ✅ Hidrografia carregada")
        return rios_recorte
        
    except Exception as e:
        log(f"  ❌ Erro ao carregar hidrografia: {e}", 'ERROR')
        return None


def calcular_declividade(perimetro_ee):
    """Calcula áreas com declividade > 45° usando SRTM"""
    log("Calculando declividade (SRTM)...")
    
    try:
        srtm = ee.Image(GEE_ASSETS['srtm'])
        declividade = ee.Terrain.slope(srtm).clip(perimetro_ee)
        
        # Áreas com declividade > 45°
        area_declividade = declividade.gt(45).selfMask()
        
        log("  ✅ Cálculo de declividade concluído")
        return area_declividade
        
    except Exception as e:
        log(f"  ❌ Erro ao calcular declividade: {e}", 'ERROR')
        return None


# =============================================================================
# VETORIZAÇÃO E EXPORTAÇÃO
# =============================================================================

def vetorizar_imagem(imagem_ee, perimetro_ee, nome_camada, scale=30):
    """
    Vetoriza uma imagem do Earth Engine para FeatureCollection
    """
    log(f"Vetorizando camada: {nome_camada}...")
    
    try:
        vetores = imagem_ee.reduceToVectors(
            reducer=ee.Reducer.first(),
            geometry=perimetro_ee,
            scale=scale,
            eightConnected=True,
            maxPixels=1e13,
            bestEffort=False
        )
        
        log(f"  ✅ Vetorização de {nome_camada} concluída")
        return vetores
        
    except Exception as e:
        log(f"  ❌ Erro ao vetorizar {nome_camada}: {e}", 'ERROR')
        return None


def exportar_para_drive(collection, nome_camada, folder='SIMCAR_Fazenda_Novo_Sobradinho'):
    """
    Exporta uma FeatureCollection para o Google Drive como Shapefile
    """
    log(f"Exportando {nome_camada} para Google Drive...")
    
    try:
        task = ee.batch.Export.table.toDrive(
            collection=collection,
            description=nome_camada[:100],  # Limite de caracteres do GEE
            folder=folder,
            fileFormat='SHP',
            selectors=None  # Exporta todos os campos
        )
        task.start()
        log(f"  ✅ Tarefa de exportação '{nome_camada}' iniciada (ID: {task.id})")
        return task
        
    except Exception as e:
        log(f"  ❌ Erro ao exportar {nome_camada}: {e}", 'ERROR')
        return None


def exportar_perimetro_local(poligono_geo, nome_camada, atributos=None):
    """
    Exporta o perímetro localmente como Shapefile
    """
    log(f"Exportando {nome_camada} localmente...")
    
    try:
        gdf = gpd.GeoDataFrame(
            atributos if atributos else {},
            geometry=[poligono_geo],
            crs="EPSG:4674"
        )
        
        caminho = OUTPUT_DIR / f"{nome_camada}.shp"
        gdf.to_file(caminho, encoding='utf-8', driver='ESRI Shapefile')
        
        log(f"  ✅ {nome_camada} exportado: {caminho}")
        return caminho
        
    except Exception as e:
        log(f"  ❌ Erro ao exportar {nome_camada}: {e}", 'ERROR')
        return None


# =============================================================================
# GERAÇÃO DO PACOTE ZIP
# =============================================================================

def gerar_zip_simcar(camadas):
    """
    Gera o pacote .zip com todos os shapefiles para upload no SIMCAR/MT
    """
    log("Gerando pacote ZIP para SIMCAR/MT...")
    
    nome_zip = OUTPUT_DIR / 'SIMCAR_Fazenda_Novo_Sobradinho.zip'
    extensoes = ['.shp', '.shx', '.dbf', '.prj', '.cpg']
    
    with zipfile.ZipFile(nome_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for camada in camadas:
            for ext in extensoes:
                arquivo = OUTPUT_DIR / f"{camada}{ext}"
                if arquivo.exists():
                    zipf.write(arquivo, f"{camada}{ext}")
                    log(f"  Adicionado: {camada}{ext}")
    
    log(f"  ✅ Pacote ZIP gerado: {nome_zip}")
    return nome_zip


# =============================================================================
# FUNÇÃO PRINCIPAL
# =============================================================================

def main():
    """
    Função principal que orquestra todo o processo de geração dos shapefiles
    """
    log("=" * 70)
    log("INICIANDO GERADOR AUTOMÁTICO DE SHAPEFILES SIMCAR/MT")
    log(f"Imóvel: {CONFIG_IMOVEL['nome']}")
    log(f"Proprietário: {CONFIG_IMOVEL['proprietario']}")
    log("=" * 70)
    
    # =========================================================================
    # PASSO 1: PROCESSAR PERÍMETRO DO MEMORIAL
    # =========================================================================
    log("\n📍 PASSO 1: Processando perímetro do Memorial Descritivo")
    log("-" * 70)
    
    # Converter coordenadas UTM -> Geográfico
    coordenadas_geo = converter_utm_para_geografico(COORDENADAS_UTM)
    
    # Criar polígono do perímetro
    perimetro_poligono = criar_poligono_perimetro(coordenadas_geo)
    
    # Criar GeoDataFrame do perímetro
    gdf_perimetro = gpd.GeoDataFrame(
        {'geometry': [perimetro_poligono]},
        crs="EPSG:4674"
    )
    
    # Exportar ATP (Área Total da Propriedade)
    exportar_perimetro_local(perimetro_poligono, 'ATP')
    
    # Exportar AIR (Área do Imóvel Rural) - Posse para Usucapião
    atributos_air = {
        'TIPO': ['P'],  # P = Posse
        'IDENTIFIC': ['Posse para fins de Usucapião - Fazenda Novo Sobradinho'],
    }
    exportar_perimetro_local(perimetro_poligono, 'AIR', atributos_air)
    
    # =========================================================================
    # PASSO 2: INICIALIZAR GOOGLE EARTH ENGINE
    # =========================================================================
    log("\n🌍 PASSO 2: Inicializando Google Earth Engine")
    log("-" * 70)
    
    # Substitua pelo ID do seu projeto Google Cloud
    project_id = 'seu-projeto-gcp-aqui'
    
    if not inicializar_gee(project_id):
        log("❌ Não foi possível inicializar o Earth Engine. Encerrando.", 'ERROR')
        log("  Execute: earthengine authenticate", 'WARNING')
        return
    
    # Converter polígono para Earth Engine Geometry
    coords_list = list(perimetro_poligono.exterior.coords)
    perimetro_ee = ee.Geometry.Polygon([coords_list])
    
    # =========================================================================
    # PASSO 3: CARREGAR DADOS AMBIENTAIS
    # =========================================================================
    log("\n🛰️ PASSO 3: Carregando dados ambientais via GEE")
    log("-" * 70)
    
    # Carregar MapBiomas 2008 e 2024
    mapbiomas_2008 = carregar_mapbiomas(perimetro_ee, ano=2008)
    mapbiomas_2024 = carregar_mapbiomas(perimetro_ee, ano=2024)
    
    if not mapbiomas_2008 or not mapbiomas_2024:
        log("❌ Erro ao carregar dados do MapBiomas. Encerrando.", 'ERROR')
        return
    
    # Carregar hidrografia
    hidrografia = carregar_hidrografia(perimetro_ee)
    
    # Calcular declividade
    area_declividade = calcular_declividade(perimetro_ee)
    
    # =========================================================================
    # PASSO 4: CLASSIFICAR CAMADAS AMBIENTAIS
    # =========================================================================
    log("\n🏷️ PASSO 4: Classificando camadas ambientais")
    log("-" * 70)
    
    # AVN - Área de Vegetação Nativa (2024)
    avn_2024 = classificar_vegetacao_nativa(mapbiomas_2024)
    
    # AREA_CONSOLIDADA - Uso antrópico antes de 22/07/2008
    area_consolidada = classificar_uso_consolidado(mapbiomas_2008, mapbiomas_2024)
    
    # AUAS - Desmatamento pós-2008
    auas = classificar_auas(mapbiomas_2008, mapbiomas_2024)
    
    # TIPOLOGIA_VEGETAL - Floresta vs Cerrado
    floresta, cerrado = classificar_tipologia(mapbiomas_2024)
    
    # =========================================================================
    # PASSO 5: VETORIZAR E EXPORTAR CAMADAS
    # =========================================================================
    log("\n⚙️ PASSO 5: Vetorizando e exportando camadas")
    log("-" * 70)
    
    tarefas_exportacao = []
    
    # Vetorizar e exportar AVN
    avn_vetores = vetorizar_imagem(avn_2024, perimetro_ee, 'AVN')
    if avn_vetores:
        task = exportar_para_drive(avn_vetores, 'AVN')
        if task:
            tarefas_exportacao.append(task)
    
    # Vetorizar e exportar AREA_CONSOLIDADA
    cons_vetores = vetorizar_imagem(area_consolidada, perimetro_ee, 'AREA_CONSOLIDADA')
    if cons_vetores:
        task = exportar_para_drive(cons_vetores, 'AREA_CONSOLIDADA')
        if task:
            tarefas_exportacao.append(task)
    
    # Vetorizar e exportar AUAS
    auas_vetores = vetorizar_imagem(auas, perimetro_ee, 'AUAS')
    if auas_vetores:
        task = exportar_para_drive(auas_vetores, 'AUAS')
        if task:
            tarefas_exportacao.append(task)
    
    # Vetorizar e exportar TIPOLOGIA_FLORESTA
    floresta_vetores = vetorizar_imagem(floresta, perimetro_ee, 'TIPOLOGIA_FLORESTA')
    if floresta_vetores:
        task = exportar_para_drive(floresta_vetores, 'TIPOLOGIA_FLORESTA')
        if task:
            tarefas_exportacao.append(task)
    
    # Vetorizar e exportar TIPOLOGIA_CERRADO
    cerrado_vetores = vetorizar_imagem(cerrado, perimetro_ee, 'TIPOLOGIA_CERRADO')
    if cerrado_vetores:
        task = exportar_para_drive(cerrado_vetores, 'TIPOLOGIA_CERRADO')
        if task:
            tarefas_exportacao.append(task)
    
    # Vetorizar e exportar AREA_DECLIVIDADE
    if area_declividade:
        declividade_vetores = vetorizar_imagem(area_declividade, perimetro_ee, 'AREA_DECLIVIDADE')
        if declividade_vetores:
            task = exportar_para_drive(declividade_vetores, 'AREA_DECLIVIDA')
            if task:
                tarefas_exportacao.append(task)
    
    # Exportar hidrografia (rios)
    if hidrografia:
        task = exportar_para_drive(hidrografia, 'RIO_POLIGONO')
        if task:
            tarefas_exportacao.append(task)
    
    # =========================================================================
    # PASSO 6: AGUARDAR EXPORTAÇÕES E GERAR ZIP
    # =========================================================================
    log("\n⏳ PASSO 6: Aguardando exportações concluírem...")
    log("-" * 70)
    
    log("Acesse o Google Earth Engine Code Editor para monitorar as tarefas:")
    log("  https://code.earthengine.google.com/?tasks=1")
    log("\nApós todas as tarefas concluírem:")
    log("1. Baixe os shapefiles do Google Drive (pasta: SIMCAR_Fazenda_Novo_Sobradinho)")
    log("2. Coloque-os no diretório: ./SIMCAR_Fazenda_Novo_Sobradinho/")
    log("3. Execute a função gerar_zip_simcar() para criar o pacote final")
    
    # =========================================================================
    # PASSO 7: INSTRUÇÕES PARA ARL (RESERVA LEGAL)
    # =========================================================================
    log("\n⚠️ PASSO 7: Reserva Legal (ARL) - Ação Manual Necessária")
    log("-" * 70)
    
    area_rl_necessaria = CONFIG_IMOVEL['area_ha'] * CONFIG_IMOVEL['percentual_rl']
    
    log(f"Bioma: {CONFIG_IMOVEL['bioma']}")
    log(f"Percentual de RL exigido: {CONFIG_IMOVEL['percentual_rl']*100:.0f}%")
    log(f"Área de RL necessária: {area_rl_necessaria:.2f} hectares")
    log("\nA delimitação da ARL deve ser feita manualmente no QGIS:")
    log("1. Abra o shapefile AVN.shp no QGIS")
    log("2. Crie uma nova camada 'ARL.shp'")
    log("3. Desenhe um polígono contínuo de mata nativa com pelo menos")
    log(f"   {area_rl_necessaria:.2f} ha dentro da AVN")
    log("4. Preencha os atributos:")
    log("   - IDENTIFIC: 'Reserva Legal Fazenda Novo Sobradinho'")
    log("   - AVERBAÇÃO: 'NA' (Não Averbada)")
    log("   - SITUAÇÃO: 'P' (Preservada)")
    
    # =========================================================================
    # PASSO 8: INSTRUÇÕES PARA NASCENTES
    # =========================================================================
    log("\n💧 PASSO 8: Nascentes - Ação Manual Necessária")
    log("-" * 70)
    
    log("O MapBiomas não mapeia nascentes exatas. Você deve:")
    log("1. Identificar visualmente as nascentes no Google Earth/QGIS")
    log("2. Criar um shapefile de pontos 'NASCENTE.shp'")
    log("3. Marcar cada nascente com um ponto")
    log("4. O SIMCAR calculará automaticamente o buffer de 50m")
    
    # =========================================================================
    # RESUMO FINAL
    # =========================================================================
    log("\n" + "=" * 70)
    log("✅ PROCESSO CONCLUÍDO!")
    log("=" * 70)
    
    log("\n📁 Shapefiles gerados automaticamente:")
    log("  ✅ ATP.shp (Área Total da Propriedade)")
    log("  ✅ AIR.shp (Área do Imóvel Rural - Posse)")
    log("  ⏳ AVN.shp (Vegetação Nativa) - Aguardando download do GEE")
    log("  ⏳ AREA_CONSOLIDADA.shp - Aguardando download do GEE")
    log("  ⏳ AUAS.shp - Aguardando download do GEE")
    log("  ⏳ TIPOLOGIA_FLORESTA.shp - Aguardando download do GEE")
    log("  ⏳ TIPOLOGIA_CERRADO.shp - Aguardando download do GEE")
    log("  ⏳ AREA_DECLIVIDADE.shp - Aguardando download do GEE")
    log("  ⏳ RIO_POLIGONO.shp - Aguardando download do GEE")
    
    log("\n📝 Shapefiles que exigem ação manual:")
    log("  ⚠️ ARL.shp (Reserva Legal) - Delimitar no QGIS")
    log("  ⚠️ NASCENTE.shp - Identificar nascentes")
    
    log("\n🎯 Próximos passos:")
    log("  1. Aguarde as exportações do Google Earth Engine (5-15 min)")
    log("  2. Baixe os shapefiles do Google Drive")
    log("  3. Delimite a ARL e nascentes no QGIS")
    log("  4. Valide as geometrias (ferramenta 'Corrigir Geometrias')")
    log("  5. Compacte todos os shapefiles em um único .zip")
    log("  6. Faça upload no SIMCAR/MT")
    
    log("\n" + "=" * 70)


# =============================================================================
# EXECUÇÃO DO SCRIPT
# =============================================================================

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        log("\n⚠️ Processo interrompido pelo usuário", 'WARNING')
    except Exception as e:
        log(f"\n❌ Erro fatal: {e}", 'ERROR')
        import traceback
        traceback.print_exc()
        sys.exit(1)
