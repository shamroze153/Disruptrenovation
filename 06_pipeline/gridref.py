import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont
Image.MAX_IMAGE_PIXELS=None
SCR="/tmp/claude-0/-home-claude/34446d55-ff8c-562b-9051-9c5992b25ba3/scratchpad/"
X0,X1,Y0,Y1=400,6700,205,5625
PXPF=41.70
SH={"GF":"a111-06.png","FF":"ff-07.png","SF":"ff-08.png"}
for nm,f in SH.items():
    im=Image.open(SCR+f).convert("RGB").crop((X0,Y0,X1,Y1))
    d=ImageDraw.Draw(im); W,H=im.size
    for ft in range(0,160,10):
        x=ft*PXPF
        if x<W:
            d.line([(x,0),(x,H)],fill=(255,0,255),width=3)
            d.text((x+5,5),str(ft),fill=(255,0,255))
    for ft in range(0,140,10):
        y=H-ft*PXPF
        if 0<=y<H:
            d.line([(0,y),(W,y)],fill=(0,140,0),width=3)
            d.text((5,y-28),str(ft),fill=(0,140,0))
    im.resize((1900,int(1900*H/W))).save(f"grid_{nm}.png")
print("ok")
