import numpy as np, json, cv2
d=np.load('grids.npz'); It=json.load(open('furniture.json')); S=4; H,W=260,303
col={'desk':(60,120,200),'chair':(40,40,40),'psit':(0,0,220),'pst':(0,0,220),'psofa':(0,0,220),'tbl':(40,140,60),'rtbl':(40,140,60),'sofa':(150,80,150),'ctbl':(40,140,60),'rack':(20,20,20),'rug':(40,160,200),'tread':(90,90,90),'ltbl':(40,140,60),'kchair':(40,40,40),'counter':(0,120,200),'pp':(0,150,0),'bed':(200,200,0),'mon':(20,20,20)}
imgs=[]
for k in ('GF','FF','SF'):
    wf=np.load(f'walkF_{k}.npy'); w0=d[k+'_walk']
    img=np.full((H,W,3),255,np.uint8); img[d[k+'_plate']]=(232,232,232); img[d[k+'_walls']]=(20,20,20)
    img[w0&~wf]=(200,215,235)
    img=np.flipud(img); img=cv2.resize(img,(W*S,H*S),interpolation=cv2.INTER_NEAREST)
    for t,x,y,z,yaw,sx,sy,sz,c in It[k]:
        p=(int(x/0.5*S),int((H-y/0.5)*S))
        if t in('psit','pst','psofa'): cv2.circle(img,p,5,col[t],-1)
        elif t=='chair' or t=='kchair': cv2.circle(img,p,3,col[t],1)
    cv2.putText(img,k,(10,30),cv2.FONT_HERSHEY_SIMPLEX,1,(0,0,0),2)
    imgs.append(img)
out=np.concatenate(imgs[:2],1); cv2.imwrite('furn_a.png',cv2.resize(out,(out.shape[1]//2,out.shape[0]//2)))
cv2.imwrite('furn_b.png',cv2.resize(imgs[2],(imgs[2].shape[1]//2,imgs[2].shape[0]//2)))
