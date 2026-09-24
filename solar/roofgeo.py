"""Roof geometry for the solar study: +35'-3" deck, parapets, voids, obstructions, RCC columns (all in model feet,
+X east, +Y north as the viewer assumes). Shared by layout.py and the report."""
import json
from shapely.geometry import box, Polygon, MultiPolygon, Point
from shapely.ops import unary_union

D = '/home/claude/work/v4v/data/'
G = json.load(open(D + 'clean_geom.json'))
A = json.load(open(D + 'arch_data.json'))
FT = 0.3048
M = 1 / FT                     # feet per metre

def U(key, zmin=None):
    return unary_union([box(b[0], b[1], b[3], b[4]) for b in G[key] if zmin is None or b[5] >= zmin])

ROOF_Z = 35.25                  # top of the +35'-3" slab
PARAPET_TOP = 39.25
slab35 = U('Roof_Level_35-3_Slab')
parapet = U('Roof_Level_35-3_Parapet')
deck35 = slab35.difference(parapet)              # the walkable roof surface inside the parapets
# the corrugated (asbestos cement) sheet over the east zone, as modelled (boundary not drawn on the set)
sheet = unary_union([box(95.0, 24.0, 96.5, 25.5), box(95.5, 23.5, 104.5, 24.0), box(96.5, 24.0, 105.5, 28.0), box(96.0, 28.0, 125.5, 34.0),
                     box(95.0, 30.0, 96.0, 34.0), box(95.0, 34.0, 97.5, 50.5), box(97.5, 34.0, 131.5, 95.0), box(131.5, 42.5, 138.0, 80.0),
                     box(131.5, 41.5, 135.5, 42.5), box(95.0, 80.0, 97.5, 95.0), box(131.5, 80.0, 135.5, 95.0), box(112.5, 27.5, 124.5, 28.0)])
courtyard = box(74.74, 50.72, 97.55, 79.32)      # open to the sky from the ground floor up
roof125 = U('Roof_Level_12-5_Slab'); roof2310 = U('Roof_Level_23-10_Slab')

# main stair reaches the roof (SF_Stairs top at +35'-3"): a stair headroom ("mumty") is needed; it is not on the
# drawings, so it is assumed over the stair footprint with 4.5" walls, 9'-0" high, door on the south face (the top
# flight arrives at the south end of the east half, x 89.3-94.6)
STAIR = (84.04, 92.871, 94.645, 108.226)
mumty = box(STAIR[0] - 0.4, STAIR[1] - 0.4, STAIR[2] + 0.4, STAIR[3] + 0.4)
MUMTY_H = 9.0
door = box(89.2, STAIR[1] - 0.4 - 6.0, 95.4, STAIR[1] - 0.4)          # 6'-0" clear landing in front of the roof door
# skylight 11'-7" x 5'-2" beside the main stair (A-113), measured on the registered sheet
skylight = box(95.7, 101.1, 95.7 + 11.583, 101.1 + 5.167)
# small light well in the west block roof (ring parapet on the model)
lightwell = box(30.0, 90.0, 41.0, 94.0)

# RCC columns: the solid (existing / proposed) columns drawn on A-111/112/113, stacked through the floors.
# Columns under 0.6 ft are drawing marks, not structure.
def cols(k):
    return [(c[0], c[1], c[2], c[3]) for c in A['cols'][k] if max(c[2], c[3]) >= 0.6]
SF_COLS = cols('SF')
GF_COLS = cols('GF')
