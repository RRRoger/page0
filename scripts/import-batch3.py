import json,math,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]
records=json.loads((root/'data/batch3-source.json').read_text())['records'];candidates=json.loads((root/'data/batch3-geocode-candidates.json').read_text())
# Baidu Mercator -> BD09 (Shanghai latitude band), BD09 -> GCJ02 -> WGS84.
def convert(geo):
 x,y=map(float,re.search(r'\|([\d.]+),([\d.]+)',geo).groups())
 c=[-0.0003441963504368392,0.000008983055097726239,0.30071316287616,59.74293618442277,7.357984074871,-25.38371002664745,13.45380521110908,-3.29883767235584,0.32710905363475,6856817.37]
 t=y/c[9];lng=c[0]+c[1]*x;lat=sum(c[i+2]*t**i for i in range(7))
 x=lng-.0065;y=lat-.006;z=math.sqrt(x*x+y*y)-.00002*math.sin(y*math.pi*3000/180);theta=math.atan2(y,x)-.000003*math.cos(x*math.pi*3000/180);lng=z*math.cos(theta);lat=z*math.sin(theta)
 def delta(a,b):
  x=a-105;y=b-35;p=math.pi
  la=-100+2*x+3*y+.2*y*y+.1*x*y+.2*math.sqrt(abs(x));lo=300+x+2*y+.1*x*x+.1*x*y+.1*math.sqrt(abs(x))
  w=(20*math.sin(6*x*p)+20*math.sin(2*x*p))*2/3;la+=w;lo+=w
  la+=(20*math.sin(y*p)+40*math.sin(y*p/3))*2/3+(160*math.sin(y*p/12)+320*math.sin(y*p/30))*2/3
  lo+=(20*math.sin(x*p)+40*math.sin(x*p/3))*2/3+(150*math.sin(x*p/12)+300*math.sin(x*p/30))*2/3
  rad=b*p/180;m=1-.00669342162296594323*math.sin(rad)**2
  return lo*180/(6378245/math.sqrt(m)*math.cos(rad)*p),la*180/(6378245*(1-.00669342162296594323)/(m*math.sqrt(m))*p)
 a,b=lng,lat
 for _ in range(5):
  dx,dy=delta(a,b);a=lng-dx;b=lat-dy
 return [round(b,7),round(a,7)]
choices={5:1,17:1,19:1}
extra=json.loads((root/'data/batch3-address13.json').read_text())
for r in records:
 n=r['n'];p=extra['content'][3] if n==13 else candidates[str(n)]['results'][choices.get(n,0)]
 r['coord']=convert(p['geo']);r['coordSource']='https://map.baidu.com/poi/?uid='+p['uid'];r['mapName']=p['name'];r['mapAddress']=p['addr']
 r['门的方位']=next((v for v in ['东门','北门','南门'] if v in r['楼盘名称']), '景祥路地库' if n==19 else '原表未注明，请现场核对')
 r['positionNote']='公开地图楼盘/出入口参考位置，已由百度坐标转换为WGS84；非道闸实测位置'
 if n in [13,15,17,18]:r['positionNote']+='；地图名称或门牌与原表有差异，请结合原表核对：'+p['name']+'，'+p['addr']
(root/'assets/locations.js').write_text('const DATA='+json.dumps(records,ensure_ascii=False)+';\n')
(root/'data/batch3-selected.json').write_text(json.dumps(records,ensure_ascii=False,indent=2))
print('Imported',len(records),'points; bounds',min(r['coord'][0] for r in records),max(r['coord'][0] for r in records))
