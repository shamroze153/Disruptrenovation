# 08_viewer_v2

- `src/viewer_app.js` — the complete v2 viewer app (source of truth).
- `src/*.js` — module drafts (walk, realism, nav, furniture) as first written; already merged into viewer_app.js.
- `data/` — `clean_geom.json` (straightened geometry), `walkdata.json` (walk grids, rooms, stairs, tour), `furniture.json`.
- `walk_pipeline/` — scripts that generate the data. Run order is in `../HANDOFF_v2.md`.
- `build_viewer.py` — builds `04_model/viewer_standalone.html` from the above.
