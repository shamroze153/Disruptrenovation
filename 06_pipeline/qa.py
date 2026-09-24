import json, numpy as np, trimesh
log = json.load(open("model_log.json")); elev = json.load(open("elev.json"))
sc = trimesh.load("Disrupt_141C.glb")
rows = []
for name, g in sc.geometry.items():
    b = g.bounds
    rows.append(dict(part=name, tris=int(len(g.faces)),
                     z_min=round(float(b[0][2]), 2), z_max=round(float(b[1][2]), 2)))
qa = dict(
  levels={"Road": 0.0, "Ground FFL": 1.0, "West ground FFL": 2.0, "First FFL": 12+5/12,
          "West first FFL": [13+11/12, 16+11/12], "Second FFL": 23+10/12,
          "West second FFL": 25+9/12, "Roof slab": 35+3/12, "Parapet": 39+3/12},
  floor_to_floor_ft=[round((12+5/12)-1.0, 4), round((23+10/12)-(12+5/12), 4), round((35+3/12)-(23+10/12), 4)],
  openings_detected={k: len(v["openings"]) for k, v in elev.items()},
  openings_placed=log["openings_placed"],
  elevation_scales_px_per_ft={k: v["pxpf"] for k, v in elev.items()},
  elevation_drawn_extent_ft={k: v["extent_ft"] for k, v in elev.items()},
  plate_area_sqft=log["plate_area_sqft"],
  model_bbox_ft=log["bbox_ft"],
  building_extent_ft=log["building_extent_ft"],
  total_triangles=int(sum(len(g.faces) for g in sc.geometry.values())),
  parts=sorted(rows, key=lambda r: r["z_min"]))
json.dump(qa, open("qa.json", "w"), indent=1)
print("floor to floor:", qa["floor_to_floor_ft"])
print("openings detected:", qa["openings_detected"], "placed:", qa["openings_placed"])
print("total triangles:", qa["total_triangles"])
print("plate areas:", qa["plate_area_sqft"])
print("gross internal area (3 floors):", round(sum(qa["plate_area_sqft"].values()), 0), "sq ft")
