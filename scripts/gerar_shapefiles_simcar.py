#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gerador local de shapefiles para o SIMCAR/MT.

Regras principais:
1. ATP e AIR usam a mesma geometria do KML.
2. Camadas tematicas que exigem delimitacao propria nascem sem geometria tematica.
3. Sempre que o modelo permitir, uma identificacao de edicao manual e preenchida.
4. Informacoes locais como municipio, bioma e RL minima sao inferidas sem depender de servicos pagos.
"""

import json
import os
import sys
import time
import unicodedata
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

import geopandas as gpd
import pyogrio
from pyproj import Geod
from shapely.geometry import Polygon
from shapely.ops import unary_union

sys.stdout.reconfigure(encoding="utf-8")

CONFIG_IMOVEL = {
    "nome": "FAZENDA NOVO SOBRADINHO",
    "proprietario": "NOLSIR JOSE FERNANDES",
    "finalidade": "Usucapiao",
    "municipio_declarado": "Sapezal",
    "uf": "MT",
}

BASE_DIR = Path(__file__).parent
KML_PATH = BASE_DIR / "perimetro.kml"
MODEL_DIR = BASE_DIR / "modelo-shape"
OUTPUT_DIR = BASE_DIR / "SIMCAR_Fazenda_Novo_Sobradinho"
MUNICIPIOS_PATH = BASE_DIR / "mt-municipios-processed.json"
CHECK_INTERVAL_SECONDS = 10
COORDINATE_PRECISION = 8
GEOD = Geod(ellps="GRS80")
KML_GEOMETRY_LAYERS = {"ATP", "AIR"}
MANUAL_EDIT_TOKEN = "EDITAR_MANUAL"
OUTPUT_DIR.mkdir(exist_ok=True)


def log(msg, tipo="INFO"):
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] [{tipo}] {msg}")


def _geometry_column_name(gdf):
    return gdf.geometry.name if hasattr(gdf, "geometry") else "geometry"


def _normalize_text(value):
    normalized = unicodedata.normalize("NFKD", str(value)).encode("ASCII", "ignore").decode("ASCII")
    return " ".join(normalized.upper().strip().split())


def _truncate(value, limit=120):
    text = "" if value is None else str(value)
    return text[:limit]


def _normalize_ring(raw_coordinates):
    coordinates = []
    for lon, lat in raw_coordinates:
        coord = (round(float(lon), COORDINATE_PRECISION), round(float(lat), COORDINATE_PRECISION))
        if not coordinates or coordinates[-1] != coord:
            coordinates.append(coord)

    if len(coordinates) > 1 and coordinates[0] == coordinates[-1]:
        coordinates.pop()

    unique_coordinates = []
    seen = set()
    for coord in coordinates:
        if coord in seen:
            continue
        unique_coordinates.append(coord)
        seen.add(coord)

    if len(unique_coordinates) < 3:
        raise ValueError("O poligono do KML possui menos de 3 vertices unicos apos limpeza.")

    unique_coordinates.append(unique_coordinates[0])
    return unique_coordinates


def _extract_namespace(root):
    if root.tag.startswith("{") and "}" in root.tag:
        return {"kml": root.tag[1:].split("}")[0]}
    return {}


def carregar_poligonos_do_kml(caminho_kml):
    log(f"Lendo arquivo KML: {caminho_kml}")
    tree = ET.parse(caminho_kml)
    root = tree.getroot()
    ns = _extract_namespace(root)

    polygon_path = ".//kml:Polygon" if ns else ".//Polygon"
    coord_path = ".//kml:outerBoundaryIs/kml:LinearRing/kml:coordinates" if ns else ".//outerBoundaryIs/LinearRing/coordinates"
    polygon_nodes = root.findall(polygon_path, ns)

    geometrias = []
    for polygon_node in polygon_nodes:
        coordinates_nodes = polygon_node.findall(coord_path, ns)
        for coordinates_node in coordinates_nodes:
            if not coordinates_node.text:
                continue

            pares = []
            for token in coordinates_node.text.split():
                parts = token.split(",")
                if len(parts) < 2:
                    continue
                pares.append((parts[0], parts[1]))

            if not pares:
                continue

            ring = _normalize_ring(pares)
            geometry = Polygon(ring)
            if not geometry.is_valid:
                geometry = geometry.buffer(0)

            if geometry.is_empty:
                continue

            if geometry.geom_type == "Polygon":
                geometrias.append(geometry)
            elif geometry.geom_type == "MultiPolygon":
                geometrias.extend([geom for geom in geometry.geoms if not geom.is_empty])

    if not geometrias:
        raise ValueError("Nenhum poligono valido foi encontrado no arquivo KML.")

    log(f"  {len(geometrias)} poligono(s) carregado(s) do KML.")
    return geometrias


def carregar_modelo(caminho_modelo):
    gdf_modelo = gpd.read_file(caminho_modelo)
    geometry_column = _geometry_column_name(gdf_modelo)
    columns = [col for col in gdf_modelo.columns if col != geometry_column]
    info = pyogrio.read_info(caminho_modelo)

    return {
        "nome": caminho_modelo.stem,
        "crs": gdf_modelo.crs or "EPSG:4674",
        "geometry_type": info.get("geometry_type"),
        "columns": columns,
        "dtypes": dict(zip(info.get("fields", []), info.get("dtypes", []))),
    }


def carregar_municipios():
    with open(MUNICIPIOS_PATH, "r", encoding="utf-8") as fp:
        data = json.load(fp)

    municipios = []
    for key, value in data.items():
        item = dict(value)
        item["key"] = key
        item["name_norm"] = _normalize_text(item.get("name", key))
        municipios.append(item)
    return municipios


def calcular_metadados(geometrias):
    geometry = unary_union(geometrias)
    representative_point = geometry.representative_point()
    centroid_lon = round(representative_point.x, COORDINATE_PRECISION)
    centroid_lat = round(representative_point.y, COORDINATE_PRECISION)
    area_m2, perimeter_m = GEOD.geometry_area_perimeter(geometry)
    area_ha = abs(area_m2) / 10000

    municipios = carregar_municipios()
    municipio = identificar_municipio((centroid_lon, centroid_lat), municipios)
    bioma_info = classificar_bioma(municipio)
    rl_minima_ha = area_ha * (bioma_info["rl_percentual"] / 100.0)

    return {
        "geometry": geometry,
        "centroid_lon": centroid_lon,
        "centroid_lat": centroid_lat,
        "area_ha": round(area_ha, 4),
        "perimeter_m": round(abs(perimeter_m), 2),
        "municipio": municipio["name"],
        "municipio_ibge": municipio.get("ibge_id"),
        "uf": CONFIG_IMOVEL["uf"],
        "bioma": bioma_info["bioma"],
        "bioma_label": bioma_info["bioma_label"],
        "rl_percentual": bioma_info["rl_percentual"],
        "rl_minima_ha": round(rl_minima_ha, 2),
    }


def identificar_municipio(coordinates, municipios):
    lon, lat = coordinates
    declarado = _normalize_text(CONFIG_IMOVEL.get("municipio_declarado", ""))

    if declarado:
        for municipio in municipios:
            if municipio["name_norm"] == declarado:
                return municipio

    best = None
    best_distance = None
    for municipio in municipios:
        dist = (lon - float(municipio["longitude"])) ** 2 + (lat - float(municipio["latitude"])) ** 2
        if best is None or dist < best_distance:
            best = municipio
            best_distance = dist
    return best


def classificar_bioma(municipio):
    primary = municipio.get("primary_bioma") or "amazonia_legal"
    bioma = "amazonia_legal" if primary == "amazonia_legal" else "cerrado"
    return {
        "bioma": bioma,
        "bioma_label": "AMAZONIA_LEGAL" if bioma == "amazonia_legal" else "CERRADO",
        "rl_percentual": 80 if bioma == "amazonia_legal" else 35,
    }


def limpar_saida_existente(nome_camada):
    for extensao in (".shp", ".shx", ".dbf", ".prj", ".cpg"):
        caminho = OUTPUT_DIR / f"{nome_camada}{extensao}"
        if caminho.exists():
            caminho.unlink()


def construir_defaults(metadata):
    resumo_imovel = f"{CONFIG_IMOVEL['nome']} - {metadata['municipio']}/{metadata['uf']}"
    rl_resumo = f"RL MIN {metadata['rl_percentual']}% ({metadata['rl_minima_ha']:.2f} HA)"

    return {
        "ATP": {},
        "AIR": {
            "TIPO": "P",
            "IDENTIFIC": _truncate(f"POSSE {CONFIG_IMOVEL['finalidade'].upper()} - {resumo_imovel}"),
        },
        "AREA_DECLIVIDADE": {
            "INCLINACAO": ">45G - EDITAR",
        },
        "AREA_USO_RESTRITO": {
            "TIPO": MANUAL_EDIT_TOKEN,
        },
        "ARL": {
            "IDENTIFIC": _truncate(f"{MANUAL_EDIT_TOKEN} - {rl_resumo}"),
            "AVERBACAO": "NA",
            "SITUACAO": MANUAL_EDIT_TOKEN,
        },
        "AUAS": {
            "ABERTURA": None,
        },
        "AURD": {
            "ORIGEM": MANUAL_EDIT_TOKEN,
            "SOBREPOE": "VERIFICAR",
        },
        "AVN": {
            "SITUACAO": MANUAL_EDIT_TOKEN,
        },
        "INTERESSE_SOCIAL": {
            "FINALIDADE": MANUAL_EDIT_TOKEN,
            "DETALHES": "PREENCHER",
        },
        "LAGOA_NATURAL": {
            "ZONA": MANUAL_EDIT_TOKEN,
            "NOME": "IDENTIFICAR",
        },
        "RESERVATORIO_ARTIFICIAL": {
            "ZONA": MANUAL_EDIT_TOKEN,
            "BARRAMENTO": MANUAL_EDIT_TOKEN,
            "OBJETIVO": MANUAL_EDIT_TOKEN,
            "SITUACAO": MANUAL_EDIT_TOKEN,
            "FAIXA_APP": None,
            "NOME": "IDENTIFICAR",
        },
        "RIO_10_A_50": {"NOME": "IDENTIFICAR"},
        "RIO_50_A_200": {"NOME": "IDENTIFICAR"},
        "RIO_200_A_600": {"NOME": "IDENTIFICAR"},
        "RIO_ACIMA_600": {"NOME": "IDENTIFICAR"},
        "RIO_ATE_10": {"NOME": "IDENTIFICAR"},
        "TIPOLOGIA_VEGETAL": {
            "TIPO": metadata["bioma_label"],
        },
        "UTILIDADE_PUBLICA": {
            "FINALIDADE": MANUAL_EDIT_TOKEN,
            "DETALHES": "PREENCHER",
        },
        # Adicionando identificadores para as outras camadas que têm atributos
        "AREA_CONSOLIDADA": {},
        "AREA_ALTITUDE_1800": {},
        "AREA_TOPO_MORRO": {},
        "AREA_UMIDA": {},
        "ARLREM": {},
        "BORDA_CHAPADA": {},
        "MANGUEZAL": {},
        "NASCENTE": {},
        "RESTINGA": {},
        "VEREDA": {},
    }


def valor_padrao_campo(nome_camada, nome_campo, dtype, indice, defaults):
    if nome_campo.upper() == "ID":
        return indice + 1

    layer_defaults = defaults.get(nome_camada, {})
    if nome_campo in layer_defaults:
        return layer_defaults[nome_campo]

    if dtype and "datetime64" in dtype:
        return None
    if dtype in {"float64", "float32", "int64", "int32"}:
        return None
    return ""


def criar_gdf_kml(modelo, geometrias, defaults):
    data = {}
    for nome_campo in modelo["columns"]:
        dtype = modelo["dtypes"].get(nome_campo)
        data[nome_campo] = [
            valor_padrao_campo(modelo["nome"], nome_campo, dtype, indice, defaults)
            for indice in range(len(geometrias))
        ]
    return gpd.GeoDataFrame(data, geometry=geometrias, crs=modelo["crs"])


def criar_gdf_placeholder(modelo, defaults):
    data = {}
    for nome_campo in modelo["columns"]:
        dtype = modelo["dtypes"].get(nome_campo)
        data[nome_campo] = [valor_padrao_campo(modelo["nome"], nome_campo, dtype, 0, defaults)]
    return gpd.GeoDataFrame(data, geometry=[None], crs=modelo["crs"])


def exportar_camada_por_modelo(caminho_modelo, geometrias_kml, defaults):
    modelo = carregar_modelo(caminho_modelo)
    nome_camada = modelo["nome"]
    tipo_geometria = modelo["geometry_type"]
    caminho_saida = OUTPUT_DIR / f"{nome_camada}.shp"

    if nome_camada in KML_GEOMETRY_LAYERS:
        gdf = criar_gdf_kml(modelo, geometrias_kml, defaults)
        status = "GEOMETRIA_KML"
    else:
        gdf = criar_gdf_placeholder(modelo, defaults)
        status = "EDICAO_MANUAL"

    limpar_saida_existente(nome_camada)
    pyogrio.write_dataframe(
        gdf,
        caminho_saida,
        driver="ESRI Shapefile",
        geometry_type=tipo_geometria,
        encoding="utf-8",
    )
    log(f"  Camada gerada: {nome_camada}.shp ({tipo_geometria} / {status})")
    return nome_camada


def gerar_zip_simcar(camadas):
    nome_zip = OUTPUT_DIR / "SIMCAR_Fazenda_Novo_Sobradinho.zip"
    extensoes = (".shp", ".shx", ".dbf", ".prj", ".cpg")

    if nome_zip.exists():
        nome_zip.unlink()

    with zipfile.ZipFile(nome_zip, "w", zipfile.ZIP_DEFLATED) as zipf:
        for camada in camadas:
            for extensao in extensoes:
                arquivo = OUTPUT_DIR / f"{camada}{extensao}"
                if arquivo.exists():
                    zipf.write(arquivo, f"{camada}{extensao}")

    log(f"Pacote ZIP atualizado: {nome_zip}")
    return nome_zip


def log_metadados(metadata):
    log(f"Municipio: {metadata['municipio']}/{metadata['uf']} (IBGE: {metadata['municipio_ibge']})")
    log(f"Bioma: {metadata['bioma_label']} / RL minima: {metadata['rl_percentual']}% ({metadata['rl_minima_ha']:.2f} ha)")
    log(f"Area estimada: {metadata['area_ha']:.4f} ha")
    log(f"Perimetro geodesico: {metadata['perimeter_m']:.2f} m")
    log(f"Centroide: ({metadata['centroid_lon']}, {metadata['centroid_lat']})")


def processar_kml_e_gerar_shapefiles(caminho_kml):
    log("-" * 70)
    log("Processando KML e regenerando shapefiles locais")
    log("-" * 70)

    if not MODEL_DIR.exists():
        raise FileNotFoundError(f"Diretorio de modelos nao encontrado: {MODEL_DIR}")

    geometrias_kml = carregar_poligonos_do_kml(caminho_kml)
    metadata = calcular_metadados(geometrias_kml)
    defaults = construir_defaults(metadata)
    log_metadados(metadata)

    modelos = sorted(MODEL_DIR.glob("*.shp"))
    camadas_geradas = [exportar_camada_por_modelo(modelo, geometrias_kml, defaults) for modelo in modelos]
    gerar_zip_simcar(camadas_geradas)

    log("=" * 70)
    log("PROCESSO CONCLUIDO")
    log(f"Camadas geradas: {len(camadas_geradas)}")
    log("ATP e AIR usam a geometria do KML.")
    log("Camadas tematicas foram geradas sem geometria tematica e com identificacao de edicao quando o modelo permite.")
    log("=" * 70)


def main():
    log("=" * 70)
    log("INICIANDO GERADOR LOCAL DE SHAPEFILES SIMCAR/MT")
    log(f"Imovel: {CONFIG_IMOVEL['nome']}")
    log(f"Arquivo KML: {KML_PATH}")
    log("=" * 70)

    if "--once" in sys.argv:
        processar_kml_e_gerar_shapefiles(KML_PATH)
        return

    last_kml_mtime = None
    log("Monitorando arquivo KML para alteracoes...")
    log("Pressione Ctrl+C para parar.")

    while True:
        try:
            current_kml_mtime = os.path.getmtime(KML_PATH)
            if current_kml_mtime != last_kml_mtime:
                log("Alteracao detectada no arquivo KML. Regenerando shapefiles...")
                processar_kml_e_gerar_shapefiles(KML_PATH)
                last_kml_mtime = current_kml_mtime
            time.sleep(CHECK_INTERVAL_SECONDS)
        except FileNotFoundError:
            log(f"Arquivo KML nao encontrado em: {KML_PATH}", "ERROR")
            last_kml_mtime = None
            time.sleep(CHECK_INTERVAL_SECONDS)
        except Exception as exc:
            log(f"Erro durante o monitoramento: {exc}", "ERROR")
            time.sleep(CHECK_INTERVAL_SECONDS)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log("Processo interrompido pelo usuario", "WARNING")
    except Exception as exc:
        log(f"Erro fatal: {exc}", "ERROR")
        raise
