let visitRouteLine=null,visitRouteArrows=null;
function formatDistance(meters){return meters<1000?`${Math.round(meters)} 米`:`${(meters/1000).toFixed(1)} 千米`}
function legAdvice(meters){return meters===0?'同楼盘步行 · 核对不同门位':meters<=600?'建议步行':'建议共享单车'}
function renderVisitRoute(){
 const checked=ROUTE.order.filter(isChecked).length;
 const upcoming=ROUTE.order.find(n=>!isChecked(n));
 $('#routeSummary').textContent=`已完成 ${checked} 站 · 剩余 ${20-checked} 站`;
 $('#routeProgress').value=checked;
 $('#routeStops').innerHTML=ROUTE.order.map((n,i)=>{
  const d=DATA.find(d=>d.n===n),leg=ROUTE.legs[i-1];
  const segment=leg?(leg.meters===0?legAdvice(0):`直线约 ${formatDistance(leg.meters)} · ${legAdvice(leg.meters)}`):'起点 · 请先到达这里';
  return `<li class="${isChecked(n)?'stop-done':n===upcoming?'stop-next':'stop-pending'}" ${n===upcoming?'aria-current="step"':''}><p class="route-leg">${segment}</p><div class="route-stop"><span class="route-sequence">${isChecked(n)?'✓':i+1}</span><div>${n===upcoming?'<span class="next-badge">下一站</span>':''}<strong>${n} 号 · ${escapeHTML(d['楼盘名称'])}</strong><p>${escapeHTML(d['地址'])}</p><small>${isChecked(n)?'已打卡':'待前往'} · ${escapeHTML(d['门的方位'])}</small></div><button class="text-button" data-route-stop="${n}">查看</button></div></li>`;
 }).join('');
 const next=ROUTE.order.find(n=>!isChecked(n));$('#routeNext').disabled=next===undefined;$('#routeNext').textContent=next===undefined?'20 个点位已全部签到':`查看下一未签到点 · ${next} 号`;
}
function openVisitRoute(){renderVisitRoute();$('#visitRoute').showModal()}
function fitRouteOverview(){if(!map)return;map.fitBounds(L.latLngBounds(ROUTE.order.map(n=>DATA.find(d=>d.n===n).coord)),{paddingTopLeft:[45,80],paddingBottomRight:[45,$('#mapJourney').offsetHeight+35],maxZoom:14,animate:false})}
function updateRouteStartBanner(){
 const {completed,latest,next}=journeyState(),d=DATA.find(p=>p.n===next),last=DATA.find(p=>p.n===latest);
 $('#routeStartBanner').hidden=true;
 $('#mapProgress').textContent=`已完成 ${completed.length} / 20`;
 $('#mapRecent').textContent=last?`最近打卡：${latest}号 · ${last['楼盘名称']}`:'尚未开始，先前往起点';
 $('#mapDestination').textContent=d?`${completed.length?'下一站':'第一站'}：${next}号 · ${d['楼盘名称']}`:'20 站，全线拿下。今天的你，真牛。';
 $('#mapAddress').textContent=d?`${d['地址']} · ${d['门的方位']}`:'20 站全部完成，记录已保存在当前浏览器。';
 $('#mapAdvice').textContent=d&&last?`直线约 ${formatDistance(map.distance(last.coord,d.coord))} · ${legAdvice(Math.round(map.distance(last.coord,d.coord)))}`:d?'到达后点击打卡，自动切换下一站':'';
 $('#mapNavigate').hidden=!d;$('#mapCheckin').hidden=!d;$('#mapUndo').hidden=!last;
}
function focusMapLeg(){
 $('#mapOverview').textContent='查看全程';
 const {latest,next}=journeyState();if(next===undefined){fitRouteOverview();return}
 const points=[DATA.find(d=>d.n===next).coord];if(latest!==undefined)points.push(DATA.find(d=>d.n===latest).coord);
 map.fitBounds(points,{paddingTopLeft:[55,80],paddingBottomRight:[55,$('#mapJourney').offsetHeight+35],maxZoom:16,animate:false});
}
function drawRouteOverlay(){
 document.body.classList.add('route-overview');updateRouteStartBanner();
 if(!map.getPane('routeArrows'))map.createPane('routeArrows');
 map.getPane('routeArrows').style.zIndex=750;map.getPane('routeArrows').style.pointerEvents='none';
 if(visitRouteLine)map.removeLayer(visitRouteLine);if(visitRouteArrows)map.removeLayer(visitRouteArrows);
 const {latest,next}=journeyState();
 visitRouteLine=L.layerGroup().addTo(map);visitRouteArrows=L.layerGroup().addTo(map);
 ROUTE.order.forEach((n,i)=>{
  const d=DATA.find(x=>x.n===n),done=isChecked(n),active=n===next;
  if(i){const prev=DATA.find(x=>x.n===ROUTE.order[i-1]);L.polyline([prev.coord,d.coord],{color:done&&isChecked(prev.n)?'#aab3bf':'#8c9eb7',weight:3,opacity:.65,interactive:false}).addTo(visitRouteLine)}
  const size=active?44:32;
  L.marker(d.coord,{interactive:false,keyboard:false,pane:'routeArrows',icon:L.divIcon({className:'route-node-marker '+(active?'node-next':done?'node-done':'node-pending'),html:`<span class="route-node">${n}${done?'<svg class="node-check" viewBox="0 0 16 16" aria-label="已打卡"><path d="m3 8 3 3 7-7"/></svg>':''}</span>`,iconSize:[size,size],iconAnchor:[size/2,size/2]})}).addTo(visitRouteArrows);
 });
 if(latest!==undefined&&next!==undefined)L.polyline([DATA.find(d=>d.n===latest).coord,DATA.find(d=>d.n===next).coord],{color:'#2563eb',weight:6,opacity:1,interactive:false}).addTo(visitRouteLine);
 $('#routeMapNote').hidden=true;
}
function showVisitRouteMap(){
 $('#visitRoute').close();openFullMap();
}
$('#routePlan').onclick=openVisitRoute;$('#closeVisitRoute').onclick=()=>$('#visitRoute').close();
$('#routeStops').onclick=e=>{const button=e.target.closest('[data-route-stop]');if(button){$('#visitRoute').close();showDetail(Number(button.dataset.routeStop))}};
$('#routeNext').onclick=()=>{const n=ROUTE.order.find(n=>!isChecked(n));if(n!==undefined){$('#visitRoute').close();showDetail(n)}};
$('#routeOnMap').onclick=showVisitRouteMap;$('#routeMapNote').onclick=()=>{if(visitRouteLine)map.removeLayer(visitRouteLine);if(visitRouteArrows)map.removeLayer(visitRouteArrows);visitRouteLine=null;visitRouteArrows=null;$('#routeMapNote').hidden=true};


function journeyState(){
 const completed=ROUTE.order.filter(isChecked);
 const latest=completed.slice().sort((a,b)=>Date.parse(checkins[DATA.find(d=>d.n===b)['编号']])-Date.parse(checkins[DATA.find(d=>d.n===a)['编号']]))[0];
 return {completed,latest,next:ROUTE.order.find(n=>!isChecked(n))};
}
function renderJourney(){
 const {completed,latest,next}=journeyState();
 const destination=DATA.find(d=>d.n===next),last=DATA.find(d=>d.n===latest);
 $('#completionMedal').hidden=completed.length!==20;
 document.body.classList.toggle('journey-complete',completed.length===20);
 $('#stampCircles').innerHTML=ROUTE.order.map(n=>`<span role="listitem" class="stamp-circle ${isChecked(n)?'stamped':n===next?'stamp-next':''}" aria-label="${n}号，${isChecked(n)?'已打卡':n===next?'下一站':'未打卡'}" title="${n}号 · ${escapeHTML(DATA.find(d=>d.n===n)['楼盘名称'])}">${isChecked(n)?'✓':n}</span>`).join('');
 $('#journeyProgress').textContent=`${completed.length} / 20 已打卡`;
 $('#journeyCurrent').textContent=last?`最近打卡：${latest} 号 · ${last['楼盘名称']}`:'尚未开始 · 先前往第 20 号点位';
 $('#journeyNextLabel').textContent=destination?(completed.length?'下一站':'第一站'):'全部完成';
 $('#journeyNextName').textContent=destination?`${next} 号 · ${destination['楼盘名称']}`:'20 站，全线拿下。今天的你，真牛。';
 $('#nextAddress').textContent=destination?`${destination['地址']} · ${destination['门的方位']}`:'这一程，辛苦了。打卡记录已保存。';
 $('#journeyHint').textContent=destination?(last?'直线约 '+formatDistance(map.distance(last.coord,destination.coord))+' · '+legAdvice(Math.round(map.distance(last.coord,destination.coord))):'先前往起点 · 地图内选择交通方式'):'';
 $('#homeNavigate').hidden=!destination;$('#homeCheckin').hidden=!destination;$('#undoLast').hidden=!last;
 layout();
 if(document.body.classList.contains('route-overview'))updateRouteStartBanner();
}
$('#homeNavigate').onclick=()=>{const {next}=journeyState();if(next!==undefined)openNavigation(DATA.find(d=>d.n===next))};
$('#homeCheckin').onclick=()=>{const {next}=journeyState();if(next!==undefined){toggleCheckin(next);listView();renderJourney();focusJourney()}};
$('#undoLast').onclick=()=>{const {latest}=journeyState();if(latest!==undefined){toggleCheckin(latest);listView();renderJourney();focusJourney()}};
function focusJourney(){const {latest,next}=journeyState();if(next===undefined){fit();return}const points=[DATA.find(d=>d.n===next).coord];if(latest!==undefined)points.push(DATA.find(d=>d.n===latest).coord);map.fitBounds(points,{padding:[55,55],maxZoom:16,animate:false})}
$('#pointSearch').ontoggle=()=>{layout();if(selected===null)fit()};
document.addEventListener('checkinschange',()=>{renderJourney();if(document.body.classList.contains('route-overview'))drawRouteOverlay()});
window.addEventListener('pageshow',()=>{try{const saved=JSON.parse(localStorage.getItem(CHECKIN_KEY)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))checkins=saved}catch{}render();renderJourney();if(document.body.classList.contains('route-overview'))drawRouteOverlay()});
renderJourney();focusJourney();

function setMapPreview(visible){
 document.body.classList.toggle('map-preview-visible',visible);
 $('#previewMap').textContent=visible?'收起地图':'地图预览';
 if(visible&&onlineTiles&&!map.hasLayer(onlineTiles))onlineTiles.addTo(map);
 layout();if(visible&&!document.body.classList.contains('location-mode'))focusJourney();
}
function openFullMap(locate=false){
 selected=null;expanded=false;listView();
 document.body.classList.add('location-mode');document.body.classList.toggle('route-overview',!locate);$('#returnJourney').hidden=false;
 setMapPreview(true);map.invalidateSize({pan:false});
 $('#locationStatus').hidden=!locate;
 if(locate)locateMe();else {drawRouteOverlay();focusMapLeg();setTimeout(()=>{if(document.body.classList.contains('route-overview'))focusMapLeg()},600);}
}
$('#previewMap').onclick=()=>{location.hash='map';openFullMap()};
$('#locateFromHome').onclick=()=>openFullMap(true);
function returnToJourney(){
 if(visitRouteLine)map.removeLayer(visitRouteLine);if(visitRouteArrows)map.removeLayer(visitRouteArrows);visitRouteLine=null;visitRouteArrows=null;$('#routeMapNote').hidden=true;$('#routeStartBanner').hidden=true;
 document.body.classList.remove('location-mode','route-overview');$('#returnJourney').hidden=true;
 selected=null;expanded=false;listView();setMapPreview(false);renderJourney();window.scrollTo(0,0);
}
$('#returnJourney').onclick=returnToJourney;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('location-mode'))returnToJourney()});

let joyTimer;
document.addEventListener('checkinschange',event=>{
 clearTimeout(joyTimer);$('#checkinJoy').hidden=true;
 if(!event.detail?.checked)return;
 const d=DATA.find(d=>d.n===event.detail.n),count=journeyState().completed.length;
 $('#joyTitle').textContent=count===20?'20 站，全线拿下。今天的你，真牛。':'这一站完成啦！';
 $('#joyText').textContent=`${d.n} 号 · ${d['楼盘名称']} · ${count}/20`;
 $('#checkinJoy').hidden=false;$('#toast').style.display='none';
 // toggleCheckin's existing toast runs after the event handler.
 queueMicrotask(()=>{$('#toast').style.display='none'});
 joyTimer=setTimeout(()=>{$('#checkinJoy').hidden=true},2600);
});

$('#restartJourney').onclick=()=>$('#restartDialog').showModal();
$('#cancelRestart').onclick=()=>$('#restartDialog').close();
$('#confirmRestart').onclick=()=>{
 try{localStorage.removeItem(CHECKIN_KEY)}catch{toast('未能清空记录，请检查浏览器存储权限后重试');return}
 checkins={};clearTimeout(joyTimer);$('#checkinJoy').hidden=true;
 if(visitRouteLine){map.removeLayer(visitRouteLine);visitRouteLine=null}$('#routeMapNote').hidden=true;
 region='全部';$('#search').value='';$('#restartDialog').close();returnToJourney();renderVisitRoute();focusJourney();toast('已重新开始，从 20 号出发');
};
document.addEventListener('checkinschange',event=>{
 if(event.detail?.checked&&journeyState().completed.length===20){
  clearTimeout(joyTimer);joyTimer=setTimeout(()=>{$('#checkinJoy').hidden=true},4800);
 }
});

if(new URLSearchParams(location.search).get('preview')==='1'){setTimeout(()=>openFullMap(),80)}

$('#mapNavigate').onclick=()=>{const {next}=journeyState();if(next!==undefined)openNavigation(DATA.find(d=>d.n===next))};
$('#mapCheckin').onclick=()=>{const {next}=journeyState();if(next!==undefined){toggleCheckin(next);focusMapLeg()}};
$('#mapUndo').onclick=()=>{const {latest}=journeyState();if(latest!==undefined){toggleCheckin(latest);focusMapLeg()}};
$('#mapOverview').onclick=()=>{const button=$('#mapOverview'),all=button.textContent==='查看全程';if(all)fitRouteOverview();else focusMapLeg();button.textContent=all?'聚焦下一站':'查看全程'};

let finishReturnFocus=null;
function showFinishCelebration(){
 const dialog=$('#finishCelebration');if(dialog.open)return;
 finishReturnFocus=document.activeElement;
 clearTimeout(joyTimer);$('#checkinJoy').hidden=true;
 dialog.showModal();$('#closeFinish').focus();
}
$('#closeFinish').onclick=()=>$('#finishCelebration').close();
$('#finishCelebration').addEventListener('close',()=>{if(finishReturnFocus?.isConnected&&!finishReturnFocus.hidden)finishReturnFocus.focus()});
document.addEventListener('checkinschange',event=>{if(event.detail?.checked&&journeyState().completed.length===20)showFinishCelebration()});
if(new URLSearchParams(location.search).get('celebration')==='preview'){
 const cleanUrl=new URL(location.href);cleanUrl.searchParams.delete('celebration');
 history.replaceState(history.state,'',cleanUrl.pathname+cleanUrl.search+cleanUrl.hash);
 showFinishCelebration();
}
