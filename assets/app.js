// All coordinates and local street geometry are embedded. No map key or network request is required.
const $=s=>document.querySelector(s);
const escapeHTML=s=>String(s??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let markerGroup,leaderLayer,onlineTiles;
const CHECKIN_KEY='ningbo-map-checkins-v1';
let checkins={};
try{const saved=JSON.parse(localStorage.getItem(CHECKIN_KEY)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))checkins=saved}catch{}
function isChecked(n){return !!checkins[DATA.find(d=>d.n===n)['编号']]}
function toggleCheckin(n){
 const id=DATA.find(d=>d.n===n)['编号'];const next={...checkins};
 if(next[id])delete next[id];else next[id]=new Date().toISOString();
 try{localStorage.setItem(CHECKIN_KEY,JSON.stringify(next))}catch{toast('签到未保存，请允许浏览器存储后重试');return}
 checkins=next;render();showDetail(n);document.dispatchEvent(new Event('checkinschange'));toast(isChecked(n)?'签到成功，该点位已标记为蓝色':'已取消签到');
}

let region='全部',selected=null,map=null,markers=new Map(),toastTimer,labelLayer,expanded=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function filtered(){const q=$('#search').value.trim().toLowerCase();return DATA.filter(d=>(region==='全部'||d['区域']===region)&&['楼盘名称','编号','地址','商圈','形式','门的方位'].some(k=>String(d[k]).toLowerCase().includes(q)))}
function toast(text){$('#toast').textContent=text;$('#toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').style.display='none',3000)}
function renderFilters(){document.querySelector('.filters').innerHTML=['全部','虹口','杨浦','静安'].map(r=>`<button class="filter ${region===r?'active':''}" aria-pressed="${region===r}" data-region="${r}">${r}<small>${r==='全部'?20:DATA.filter(d=>d['区域']===r).length}</small></button>`).join('')}
function render(){const rows=filtered();$('#clearSearch').hidden=!$('#search').value;$('#list').innerHTML=rows.map(d=>`<button class="row" data-id="${d.n}" aria-label="查看${escapeHTML(d['楼盘名称'])}"><span class="number ${isChecked(d.n)?'checked':''}">${String(d.n).padStart(2,'0')}</span><span class="row-main"><strong>${escapeHTML(d['楼盘名称'])}</strong><p>${escapeHTML(d['地址'])}</p><span class="row-meta">${d['区域']} · ${escapeHTML(d['形式'])}${isChecked(d.n)?' · 已签到':''}</span></span><span class="row-end">${(d['距离（米）']/1000).toFixed(2)} km<br><span style="font-size:10px">距定位点</span></span></button>`).join('')||'<p class="empty">没有找到匹配的点位<br>试试其他名称，或切换到全部区域。</p>';if(selected===null)$('#sheetTitle').innerHTML=`点位列表 <span>${rows.length}</span>`;markers.forEach((m,n)=>{const visible=rows.some(d=>d.n===n);if(visible&&!markerGroup.hasLayer(m))markerGroup.addLayer(m);else if(!visible&&markerGroup.hasLayer(m))markerGroup.removeLayer(m)});$('#status').textContent=`${rows.length} 个点位 · 楼盘参考位置`;renderFilters();if(map)updatePins()}
function layout(){document.body.classList.toggle('viewing-detail',selected!==null);const full=document.body.classList.contains('map-fullscreen');document.body.classList.toggle('fullscreen-detail',full&&selected!==null);const mobile=innerWidth<760;document.documentElement.style.setProperty('--header-height',document.querySelector('header').offsetHeight+'px');document.documentElement.style.setProperty('--panel-height',expanded?'94%':selected===null?'34%':'48%');$('#sheet').classList.toggle('expanded',expanded);$('#handle').setAttribute('aria-expanded',String(expanded));$('#handle').setAttribute('aria-label',expanded?'收起点位面板':'展开点位面板');if(selected===null)$('#sheetAction').textContent=expanded?'收起列表':'展开列表';else $('#sheetAction').textContent=full?'收起详情':'返回列表';if(map){map.invalidateSize({pan:false});if(selected!==null&&!expanded)map.panTo(DATA.find(d=>d.n===selected).coord,{animate:!reduced});}$('#detailExpand').hidden=selected===null;$('#detailExpand').textContent=expanded?'收起详情':'展开详情'}
function expand(value){expanded=value;layout();if(!expanded&&selected===null)fit()}
function listView(){selected=null;$('#list').style.display='block';$('#detail').style.display='none';render();updatePins();layout()}
function icon(n,active){return L.divIcon({className:'point-marker',html:`<span class="pin ${active?'selected':''} ${isChecked(n)?'checked':''}"><span>${n}</span></span>`,iconSize:[44,44],iconAnchor:[22,35]})}
function updatePins(){spreadPins();markers.forEach((m,n)=>{m.setIcon(icon(n,n===selected));m.setZIndexOffset(n===selected?1000:0);const el=m.getElement();if(el)el.setAttribute('aria-label',`查看点位${n}：${DATA[n-1]['楼盘名称']}${isChecked(n)?'，已签到':''}`)})}
function showDetail(n,fromMap=false){selected=n;const d=DATA.find(x=>x.n===n);$('#list').style.display='none';$('#detail').style.display='block';$('#sheetTitle').textContent=`点位 ${String(n).padStart(2,'0')} / 20`;const fields=['编号','商圈','楼盘性质','交房时间','收盘售价','户数','车位数','环线描述','定位点','距离（米）'];const query=encodeURIComponent('上海市'+d['区域']+'区'+d['地址']+' '+d['楼盘名称']);$('#detail').innerHTML=`<div class="detail-head"><div class="id">${d['区域']}区 · ${d['商圈']}</div><div class="detail-title"><h3>${escapeHTML(d['楼盘名称'])}</h3><div class="title-actions"><button class="secondary" id="openNavigation">打开地图</button><button id="checkin" class="checkin-button ${isChecked(n)?'is-checked':''}" aria-pressed="${isChecked(n)}">${isChecked(n)?'取消签到':'签到'}</button></div></div><p class="checkin-status">${isChecked(n)?'已签到 · '+escapeHTML(new Date(checkins[d['编号']]).toLocaleString('zh-CN')):'未签到'}</p><p class="address">上海市${d['区域']}区 · ${escapeHTML(d['地址'])}</p><div class="tags"><span class="tag">${d['形式']}</span><span class="tag">${d['环线描述']}</span></div></div><div class="key-info"><div><small>道闸位置</small><strong>${escapeHTML(d['道闸位置'])}</strong></div><div><small>门的方位</small><strong>${escapeHTML(d['门的方位'])}</strong></div></div><div class="detail-actions"><button class="secondary" id="copyAddress">复制地址</button></div><p class="note">${escapeHTML(d.positionNote)}。请以原表门位描述及现场为准。<a href="${d.coordSource}" target="_blank" rel="noopener noreferrer">位置来源</a></p><dl>${fields.map(k=>`<dt>${k==='距离（米）'?'距定位点':k}</dt><dd>${escapeHTML(typeof d[k]==='number'&&k!=='交房时间'?d[k].toLocaleString('zh-CN'):d[k])}${k==='距离（米）'?' 米':k==='户数'?' 户':k==='车位数'?' 个':''}</dd>`).join('')}</dl><p class="note">来源：宁波银行上刊点位明细.xlsx · 道闸<br>距离沿用原表，非当前位置距离；收盘售价单位原表未注明。</p>`;$('#scroll').scrollTop=0;expanded=false;layout();updatePins();map.setView(d.coord,Math.max(map.getZoom(),16),{animate:false});updatePins();$('#checkin').onclick=()=>toggleCheckin(n);$('#openNavigation').onclick=()=>openNavigation(d);$('#copyAddress').onclick=async()=>{const address='上海市'+d['区域']+'区'+d['地址'];try{await navigator.clipboard.writeText(address);toast('地址已复制')}catch{const ta=document.createElement('textarea');ta.value=address;ta.style.cssText='position:fixed;top:0;left:-9999px';document.body.appendChild(ta);ta.select();const ok=document.execCommand('copy');ta.remove();toast(ok?'地址已复制':'无法自动复制，请长按详情中的地址复制')}}}
function fit(){if(!map)return;const rows=filtered();if(rows.length===0)return;map.fitBounds(L.latLngBounds(rows.map(d=>d.coord)),{paddingTopLeft:[42,65],paddingBottomRight:[48,38],maxZoom:16,animate:!reduced})}
function renderLabels(){if(!map||!labelLayer)return;labelLayer.clearLayers();if(onlineTiles)return;const z=map.getZoom(),used=[];const candidates=GEO.labels.filter(v=>map.getBounds().contains(v[1])).sort((a,b)=>{const rank=v=>v[2]==='park'?0:['primary','secondary'].includes(v[3])?1:v[3]==='tertiary'?2:3;return rank(a)-rank(b)});for(const [name,p,kind,road] of candidates){if(z<15&&kind==='road'&&!['primary','secondary','tertiary'].includes(road))continue;const pixel=map.latLngToContainerPoint(p);if(pixel.x<30||pixel.x>map.getSize().x-35||pixel.y<45||pixel.y>map.getSize().y-20)continue;const width=Math.max(55,name.length*11);if(used.some(q=>Math.abs(q.x-pixel.x)<(q.w+width)/2+14&&Math.abs(q.y-pixel.y)<32))continue;used.push({x:pixel.x,y:pixel.y,w:width});L.marker(p,{interactive:false,keyboard:false,pane:'labels',icon:L.divIcon({className:'street-name '+(kind==='park'?'park-name':''),html:escapeHTML(name),iconSize:[width,20],iconAnchor:[width/2,10]})}).addTo(labelLayer);if(used.length>65)break}}
function initMap(){map=L.map('map',{zoomControl:false,attributionControl:true,preferCanvas:true,minZoom:8,maxZoom:18,zoomSnap:.25});map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');map.attributionControl.addAttribution('© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>');map.createPane('labels');map.getPane('labels').style.zIndex=450;map.getPane('labels').style.pointerEvents='none';labelLayer=L.layerGroup().addTo(map);markerGroup=L.layerGroup().addTo(map);leaderLayer=L.layerGroup().addTo(map);map.setView([31.264,121.502],14);initOnlineBasemap();
const layers={water:L.layerGroup().addTo(map),park:L.layerGroup().addTo(map),block:L.layerGroup().addTo(map),rail:L.layerGroup().addTo(map),river:L.layerGroup().addTo(map),road:L.layerGroup().addTo(map)};
for(const [kind,road,ps,closed] of GEO.features){let style={interactive:false,smoothFactor:1,pane:'localGeometry'};if(kind==='water')Object.assign(style,{color:'#b6d4d9',fillColor:'#b6d4d9',weight:1,fillOpacity:1});if(kind==='park')Object.assign(style,{color:'#d1dfc3',fillColor:'#d1dfc3',weight:1,fillOpacity:1});if(kind==='block')Object.assign(style,{color:'#e1e4d9',fillColor:'#e1e4d9',weight:.5,fillOpacity:.68});if(kind==='river')Object.assign(style,{color:'#b6d4d9',weight:9});if(kind==='rail')Object.assign(style,{color:'#babfb6',weight:1.5,dashArray:'4 5'});if(kind==='road'){const large=['motorway','trunk','primary'].includes(road),medium=['secondary','tertiary'].includes(road);Object.assign(style,{color:large?'#e9d4a4':medium?'#ffffff':'#fffdf6',weight:large?5:medium?4:2.3,opacity:1,lineCap:'round'})}(closed&&['water','park','block'].includes(kind)?L.polygon(ps,style):L.polyline(ps,style)).addTo(layers[kind])}
for(const d of DATA){const m=L.marker(d.coord,{icon:icon(d.n,false),title:d['楼盘名称'],alt:`查看点位${d.n}：${d['楼盘名称']}`,keyboard:true,riseOnHover:true}).addTo(markerGroup);m.on('click',()=>showDetail(d.n,true));markers.set(d.n,m)}map.on('moveend zoomend resize',()=>{renderLabels();updatePins()});L.control.scale({position:'bottomleft',imperial:false,maxWidth:80}).addTo(map);$('#fallback').style.display='none';$('#mapTools').style.display='flex';$('#status').style.display='block';render();layout();fit();updatePins();renderLabels()}
$('#settings').onclick=()=>$('#about').showModal();$('#closeAbout').onclick=()=>$('#about').close();$('#connect').onclick=()=>location.reload();
document.querySelector('.filters').onclick=e=>{const b=e.target.closest('[data-region]');if(!b)return;region=b.dataset.region;expanded=false;listView();fit()};$('#search').oninput=()=>{expanded=false;listView();fit()};$('#clearSearch').onclick=()=>{$('#search').value='';listView();$('#search').focus();fit()};$('#list').onclick=e=>{const b=e.target.closest('[data-id]');if(b)showDetail(Number(b.dataset.id))};$('#sheetAction').onclick=()=>{if(selected!==null){expanded=false;listView();fit()}else expand(!expanded)};$('#handle').onclick=()=>expand(!expanded);$('#detailExpand').onclick=()=>expand(!expanded);$('#fit').onclick=()=>{expanded=false;listView();fit()};$('#zoomIn').onclick=()=>map.zoomIn();$('#zoomOut').onclick=()=>map.zoomOut();document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#about').open){expanded=false;listView();fit()}});let resizeTimer;addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{layout();if(selected===null&&!expanded)fit()},120)});
let touchY;$('#handle').addEventListener('pointerdown',e=>{touchY=e.clientY;$('#handle').setPointerCapture(e.pointerId)});$('#handle').addEventListener('pointerup',e=>{if(touchY!==undefined&&Math.abs(e.clientY-touchY)>25)expand(e.clientY<touchY);touchY=undefined});
try{initMap()}catch(e){$('#fallbackTitle').textContent='地图加载遇到问题';$('#fallbackText').textContent='请刷新页面重试，点位资料仍可查看。';$('#connect').textContent='刷新页面';render();console.error(e)}
// CSS fullscreen also works on mobile browsers without the Fullscreen API.
let fullscreenMode=false,requestedNative=false;
function applyFullscreen(value){fullscreenMode=value;document.body.classList.toggle('map-fullscreen',value);document.body.classList.toggle('fullscreen-detail',value&&selected!==null);$('#fullscreen').setAttribute('aria-pressed',String(value));$('#fullscreen').setAttribute('aria-label',value?'退出全屏地图':'全屏显示地图');$('#exitFullscreen').hidden=!value;expanded=false;layout();if(selected===null)fit()}
async function enterFullscreen(){if(fullscreenMode)return exitFullscreen();selected=null;$('#list').style.display='block';$('#detail').style.display='none';applyFullscreen(true);if(document.documentElement.requestFullscreen){try{requestedNative=true;await document.documentElement.requestFullscreen()}catch{requestedNative=false}}layout();fit()}
async function exitFullscreen(){applyFullscreen(false);if(document.fullscreenElement&&requestedNative){try{await document.exitFullscreen()}catch{}}requestedNative=false;listView();fit()}
document.addEventListener('fullscreenchange',()=>{if(requestedNative&&!document.fullscreenElement){requestedNative=false;applyFullscreen(false);listView();fit()}});
$('#fullscreen').onclick=enterFullscreen;$('#exitFullscreen').onclick=exitFullscreen;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&fullscreenMode&&!document.fullscreenElement)exitFullscreen()});

// Keep every record visible independently; leader lines retain the source position.
function spreadPins(){
 if(!map||!leaderLayer)return;
 leaderLayer.clearLayers();
 const used=[];
 for(const d of filtered()){
  const marker=markers.get(d.n);if(!marker)continue;
  const origin=map.latLngToLayerPoint(d.coord);let point=origin;
  const overlaps=p=>used.some(q=>Math.abs(q.x-p.x)<46&&Math.abs(q.y-p.y)<46);
  if(overlaps(point)){
   search:for(let radius=48;radius<=480;radius+=24){
    for(let step=0;step<24;step++){
     const angle=step*Math.PI/12;
     const candidate=L.point(origin.x+Math.cos(angle)*radius,origin.y+Math.sin(angle)*radius);
     if(!overlaps(candidate)){point=candidate;break search;}
    }
   }
  }
  used.push(point);const position=map.layerPointToLatLng(point);marker.setLatLng(position);
  if(point.distanceTo(origin)>1){
   L.polyline([d.coord,position],{color:'#17634e',weight:1,opacity:.55,interactive:false}).addTo(leaderLayer);
   L.circleMarker(d.coord,{radius:2,color:'#17634e',weight:1,fillOpacity:1,interactive:false}).addTo(leaderLayer);
  }
 }
}

// On-demand location; coordinates are not stored. Online tiles reflect the viewed area.
let userMarker=null,userAccuracy=null,locating=false;
const coverageBoxes=[[31.25,121.485,31.275,121.525],[31.25,121.465,31.28,121.485],[31.25,121.525,31.285,121.545],[31.275,121.485,31.292,121.525]];
function locateMe(){
 if(locating)return;
 const status=$('#locationStatus');status.hidden=false;
 if(!window.isSecureContext){status.textContent='请使用 HTTPS 线上页面开启定位';return}
 if(!navigator.geolocation){status.textContent='当前浏览器不支持定位，请使用手机浏览器打开';return}
 locating=true;$('#locate').setAttribute('aria-busy','true');status.textContent='正在定位，请允许浏览器访问位置…';
 const done=()=>{locating=false;$('#locate').setAttribute('aria-busy','false')};
 navigator.geolocation.getCurrentPosition(position=>{
  done();const {latitude,longitude,accuracy}=position.coords;
  if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||!Number.isFinite(accuracy)){status.textContent='未能获取有效位置，请重试';return}
  const coord=[latitude,longitude];
  if(userMarker)map.removeLayer(userMarker);if(userAccuracy)map.removeLayer(userAccuracy);
  userAccuracy=L.circle(coord,{radius:accuracy,color:'#7850bc',weight:1,fillColor:'#7850bc',fillOpacity:.12,interactive:false}).addTo(map);
  userMarker=L.marker(coord,{zIndexOffset:2000,icon:L.divIcon({className:'user-location',iconSize:[20,20],iconAnchor:[10,10]}),title:'我的位置'}).addTo(map).bindTooltip('我的位置',{permanent:true,direction:'top',className:'user-location-label',offset:[0,-12]});
  const covered=coverageBoxes.some(([s,w,n,e])=>latitude>=s&&latitude<=n&&longitude>=w&&longitude<=e);
  selected=null;expanded=false;listView();map.setMaxBounds(null);map.setView(coord,16,{animate:false});
  status.textContent=`我的位置 · 精度约 ${Math.round(accuracy)} 米 · ${new Date(position.timestamp).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}。再次点定位可刷新`;
 },error=>{
  done();if(userMarker){map.removeLayer(userMarker);userMarker=null}if(userAccuracy){map.removeLayer(userAccuracy);userAccuracy=null}
  status.textContent=error.code===1?'定位权限未开启，请在浏览器的网站设置中允许位置访问':error.code===3?'定位超时，请检查手机定位服务后重试':'暂时无法获取位置，请检查定位服务和网络后重试';
 },{enableHighAccuracy:true,timeout:15000,maximumAge:0});
}
$('#locate').onclick=locateMe;

function navigationLinks(d,ua=navigator.userAgent){
 const ios=/iPhone|iPad|iPod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const mobile=ios||/Android|HarmonyOS/i.test(ua);
 const title=d['楼盘名称'],address='上海市'+d['区域']+'区'+d['地址'];
 const baiduParams=new URLSearchParams({location:d.coord.join(','),title,content:address,coord_type:'wgs84',src:(ios?'ios':'andr')+'.ningbo.pointmap'});
 const amapParams=new URLSearchParams({sourceApplication:'上刊点位地图',poiname:title,lat:String(d.coord[0]),lon:String(d.coord[1]),dev:'1'});
 return {mobile,baidu:'baidumap://map/marker?'+baiduParams,amap:(ios?'iosamap':'androidamap')+'://viewMap?'+amapParams,baiduWeb:'https://api.map.baidu.com/marker?'+baiduParams+'&output=html',amapWeb:'https://uri.amap.com/search?'+new URLSearchParams({keyword:address+' '+title,city:'上海',src:'ningbo_pointmap',callnative:'0'})};
}
function openNavigation(d){
 const links=navigationLinks(d);const modal=$('#navigationDialog');
 $('#navigationName').textContent=d['楼盘名称'];
 $('#baiduApp').href=links.baidu;$('#amapApp').href=links.amap;
 $('#baiduWeb').href=links.baiduWeb;$('#amapWeb').href=links.amapWeb;
 $('#navigationHint').textContent=links.mobile?'选择已安装的地图 App。若未能打开，请在 Safari 或手机系统浏览器中重试，也可使用下方网页版。':'电脑上建议使用下方网页版；手机可选择已安装的地图 App。';
 modal.showModal();
}
$('#closeNavigation').onclick=()=>$('#navigationDialog').close();

function initOnlineBasemap(){
 map.createPane('localGeometry');map.getPane('localGeometry').style.zIndex=210;map.createPane('onlineBasemap');map.getPane('onlineBasemap').style.zIndex=250;map.getPane('onlineBasemap').style.pointerEvents='none';
 onlineTiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{pane:'onlineBasemap',maxZoom:19,updateWhenIdle:true,keepBuffer:1,referrerPolicy:'strict-origin-when-cross-origin'});
 let failures=0;
 onlineTiles.on('loading',()=>{failures=0;$('#basemapNotice').hidden=true});
 onlineTiles.on('tileerror',()=>{failures++;$('#basemapNotice').hidden=false});
 onlineTiles.on('load',()=>{$('#basemapNotice').hidden=failures===0});
 onlineTiles.addTo(map);
}
$('#shanghai').onclick=()=>{selected=null;expanded=false;listView();map.fitBounds([[30.65,120.85],[31.9,122.05]],{padding:[20,30],animate:!reduced})};
$('#basemapNotice').onclick=()=>{onlineTiles.redraw()};

$('#refreshPage').onclick=()=>{const url=new URL(location.href);url.searchParams.set('_refresh',Date.now().toString());location.replace(url.href)};
