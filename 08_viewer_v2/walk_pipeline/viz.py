import numpy as np, json, cv2, sys
from scipy import ndimage as ndi
d=np.load('grids.npz'); words=json.load(open('words.json'))
S=5
for k in ('GF','FF','SF'):
    walk=d[f'{k}_walk']; walls=d[f'{k}_walls']; plate=d[f'{k}_plate']
    H,W=walk.shape
    img=np.full((H,W,3),255,np.uint8)
    img[plate]=(225,225,225)
    lab,n=ndi.label(walk)
    sizes=ndi.sum(walk,lab,range(1,n+1))
    big=np.argmax(sizes)+1
    img[walk&(lab!=big)]=(180,180,255)
    img[walls]=(40,40,40)
    img=np.flipud(img)
    img=cv2.resize(img,(W*S,H*S),interpolation=cv2.INTER_NEAREST)
    for x in range(0,152,10): cv2.line(img,(int(x/0.5*S),0),(int(x/0.5*S),H*S),(255,0,255) if x%50 else (0,0,255),1)
    for y in range(0,131,10): cv2.line(img,(0,int((H-y/0.5)*S)),(W*S,int((H-y/0.5)*S)),(0,160,0),1)
    for w in words[k]:
        px=int(w['x']/0.5*S); py=int((H-w['y']/0.5)*S)
        cv2.putText(img,w['t'][:12],(px-20,py),cv2.FONT_HERSHEY_SIMPLEX,0.45,(200,0,0),1)
    cv2.imwrite(f'viz_{k}.png',img)
    print(k,'components',n,'main size ft2',sizes.max()*0.25, 'others', sorted((sizes*0.25).round(0))[-6:])
