#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import geopandas as gpd
from pathlib import Path

OUTPUT_DIR = Path(__file__).parent / "SIMCAR_Fazenda_Novo_Sobradinho"

print("=" * 80)
print("INSPEÇÃO DAS CAMADAS GERADAS")
print("=" * 80)

# Verificar ATP e AIR
for camada in ["ATP", "AIR"]:
    print(f"\n--- {camada} ---")
    gdf = gpd.read_file(OUTPUT_DIR / f"{camada}.shp")
    print(f"  Número de feições: {len(gdf)}")
    print(f"  Geometria válida? {gdf.geometry.is_valid.all()}")
    print(f"  Área: {gdf.geometry.area.sum():.2f} m²")
    print(f"  Atributos: {list(gdf.columns)}")
    if len(gdf) > 0:
        print(f"  Primeira feição: {gdf.iloc[0].to_dict()}")

# Verificar algumas camadas temáticas
camadas_tematicas = ["ARL", "AVN", "AREA_DECLIVIDADE", "NASCENTE"]
for camada in camadas_tematicas:
    print(f"\n--- {camada} ---")
    gdf = gpd.read_file(OUTPUT_DIR / f"{camada}.shp")
    print(f"  Número de feições: {len(gdf)}")
    print(f"  Geometria vazia? {gdf.geometry.is_empty.all()}")
    print(f"  Atributos: {list(gdf.columns)}")
    if len(gdf) > 0:
        print(f"  Primeira feição: {gdf.iloc[0].to_dict()}")

print("\n" + "=" * 80)
print("TODAS AS 28 CAMADAS:")
print("=" * 80)
for shp in sorted(OUTPUT_DIR.glob("*.shp")):
    print(f"  ✓ {shp.name}")
