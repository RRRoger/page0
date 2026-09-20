let visitRouteLine=null;
function legAdvice(meters){return meters===0?'同楼盘步行 · 核对不同门位':meters<=600?'建议步行':'建议共享单车'}
function renderVisitRoute(){
 const checked=ROUTE.order.filter(isChecked).length;
 $('#routeSummary').textContent=`已签到 ${checked}/20 · 从 20 号出发，19 号结束，不返回起点`;
 $('#routeStops').innerHTML=ROUTE.order.map((n,i)=>{
  const d=DATA.find(d=>d.n===n),leg=ROUTE.legs[i-1];
  const segment=leg?(leg.meters===0?legAdvice(0):`上站 → 此站 · 直线 ${(leg.meters/1000).toFixed(2)} km · ${legAdvice(leg.meters)}`):'起点 · 请先到达这里';
  return `<li><p class="route-leg">${segment}</p><div class="route-stop"><span class="route-sequence">${i+1}</span><div><strong>${n} 号 · ${escapeHTML(d['楼盘名称'])}</strong><p>${escapeHTML(d['地址'])}</p><small>${isChecked(n)?'已签到':'待前往'} · ${escapeHTML(d['门的方位'])}</small></div><button class="text-button" data-route-stop="${n}">查看</button></div></li>`;
 }).join('');
 const next=ROUTE.order.find(n=>!isChecked(n));$('#routeNext').disabled=next===undefined;$('#routeNext').textContent=next===undefined?'20 个点位已全部签到':`查看下一未签到点 · ${next} 号`;
}
function openVisitRoute(){renderVisitRoute();$('#visitRoute').showModal()}
function showVisitRouteMap(){
 $('#visitRoute').close();setMapPreview(true);selected=null;expanded=false;region='全部';$('#search').value='';listView();
 if(visitRouteLine)map.removeLayer(visitRouteLine);
 visitRouteLine=L.polyline(ROUTE.order.map(n=>DATA.find(d=>d.n===n).coord),{color:'#ac5225',weight:3,dashArray:'7 8',opacity:.9,interactive:false}).addTo(map);
 $('#routeMapNote').hidden=false;fit();
}
$('#routePlan').onclick=openVisitRoute;$('#closeVisitRoute').onclick=()=>$('#visitRoute').close();
$('#routeStops').onclick=e=>{const button=e.target.closest('[data-route-stop]');if(button){$('#visitRoute').close();showDetail(Number(button.dataset.routeStop))}};
$('#routeNext').onclick=()=>{const n=ROUTE.order.find(n=>!isChecked(n));if(n!==undefined){$('#visitRoute').close();showDetail(n)}};
$('#routeOnMap').onclick=showVisitRouteMap;$('#routeMapNote').onclick=()=>{if(visitRouteLine)map.removeLayer(visitRouteLine);visitRouteLine=null;$('#routeMapNote').hidden=true};


function journeyState(){
 const completed=ROUTE.order.filter(isChecked);
 const latest=completed.slice().sort((a,b)=>Date.parse(checkins[DATA.find(d=>d.n===b)['编号']])-Date.parse(checkins[DATA.find(d=>d.n===a)['编号']]))[0];
 return {completed,latest,next:ROUTE.order.find(n=>!isChecked(n))};
}
function renderJourney(){
 const {completed,latest,next}=journeyState();
 const destination=DATA.find(d=>d.n===next),last=DATA.find(d=>d.n===latest);
 $('#journeyProgress').textContent=`${completed.length} / 20 已打卡`;
 $('#journeyCurrent').textContent=last?`最近打卡：${latest} 号 · ${last['楼盘名称']}`:'尚未开始 · 先前往第 20 号点位';
 $('#journeyNextLabel').textContent=destination?(completed.length?'下一站':'第一站'):'全部完成';
 $('#journeyNextName').textContent=destination?`${next} 号 · ${destination['楼盘名称']}`:'20 站全部打卡完成';
 $('#nextAddress').textContent=destination?`${destination['地址']} · ${destination['门的方位']}`:'辛苦了！打卡记录已保存在当前浏览器。';
 $('#journeyHint').textContent=destination?(last?legAdvice(Math.round(map.distance(last.coord,destination.coord)))+' · 从最近打卡点出发':'先到起点 · 在地图 App 选择步行、骑行或公交'):'';
 $('#homeNavigate').hidden=!destination;$('#homeCheckin').hidden=!destination;$('#undoLast').hidden=!last;
 layout();
}
$('#homeNavigate').onclick=()=>{const {next}=journeyState();if(next!==undefined)openNavigation(DATA.find(d=>d.n===next))};
$('#homeCheckin').onclick=()=>{const {next}=journeyState();if(next!==undefined){toggleCheckin(next);listView();renderJourney();focusJourney()}};
$('#undoLast').onclick=()=>{const {latest}=journeyState();if(latest!==undefined){toggleCheckin(latest);listView();renderJourney();focusJourney()}};
function focusJourney(){const {latest,next}=journeyState();if(next===undefined){fit();return}const points=[DATA.find(d=>d.n===next).coord];if(latest!==undefined)points.push(DATA.find(d=>d.n===latest).coord);map.fitBounds(points,{padding:[55,55],maxZoom:16,animate:false})}
$('#pointSearch').ontoggle=()=>{layout();if(selected===null)fit()};
document.addEventListener('checkinschange',renderJourney);
window.addEventListener('pageshow',()=>{try{const saved=JSON.parse(localStorage.getItem(CHECKIN_KEY)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))checkins=saved}catch{}render();renderJourney()});
renderJourney();focusJourney();

function setMapPreview(visible){
 document.body.classList.toggle('map-preview-visible',visible);
 $('#previewMap').textContent=visible?'收起地图':'地图预览';
 if(visible&&onlineTiles&&!map.hasLayer(onlineTiles))onlineTiles.addTo(map);
 layout();if(visible)focusJourney();
}
$('#previewMap').onclick=()=>setMapPreview(!document.body.classList.contains('map-preview-visible'));
$('#locateFromHome').onclick=()=>{
 selected=null;expanded=false;listView();
 document.body.classList.add('location-mode');$('#returnJourney').hidden=false;
 setMapPreview(true);map.invalidateSize({pan:false});locateMe();
};
function returnToJourney(){
 document.body.classList.remove('location-mode');$('#returnJourney').hidden=true;
 selected=null;expanded=false;listView();setMapPreview(false);renderJourney();window.scrollTo(0,0);
}
$('#returnJourney').onclick=returnToJourney;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('location-mode'))returnToJourney()});

let joyTimer;
document.addEventListener('checkinschange',event=>{
 clearTimeout(joyTimer);$('#checkinJoy').hidden=true;
 if(!event.detail?.checked)return;
 const d=DATA.find(d=>d.n===event.detail.n),count=journeyState().completed.length;
 $('#joyTitle').textContent=count===20?'20 站，全部完成啦！':'这一站完成啦！';
 $('#joyText').textContent=`${d.n} 号 · ${d['楼盘名称']} · ${count}/20`;
 $('#checkinJoy').hidden=false;$('#toast').style.display='none';
 // toggleCheckin's existing toast runs after the event handler.
 queueMicrotask(()=>{$('#toast').style.display='none'});
 joyTimer=setTimeout(()=>{$('#checkinJoy').hidden=true},2600);
});
