import geopandas as gpd
import os

model_dir = "modelo-shape"
output = []

# List all shapefiles in model directory
shapefiles = [f for f in os.listdir(model_dir) if f.endswith(".shp")]

for shp_name in shapefiles:
    shp_path = os.path.join(model_dir, shp_name)
    try:
        gdf = gpd.read_file(shp_path)
        info = {
            "name": shp_name.replace(".shp", ""),
            "crs": str(gdf.crs),
            "geometry_type": gdf.geom_type.unique().tolist(),
            "columns": list(gdf.columns),
            "num_features": len(gdf),
            "sample": gdf.head(1).to_dict('records') if len(gdf) > 0 else []
        }
        output.append(info)
        print(f"✓ Analyzed: {shp_name}")
    except Exception as e:
        print(f"✗ Error analyzing {shp_name}: {e}")

# Write analysis to a file
with open("modelo-shape-analysis.json", "w", encoding="utf-8") as f:
    import json
    json.dump(output, f, indent=2, ensure_ascii=False)

print("\n📊 Analysis saved to modelo-shape-analysis.json!")
for item in output:
    print(f"\n--- {item['name']} ---")
    print(f"  CRS: {item['crs']}")
    print(f"  Geometry Type: {item['geometry_type']}")
    print(f"  Columns: {item['columns']}")
    print(f"  Features: {item['num_features']}")