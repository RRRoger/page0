let visitRouteLine=null;
function legAdvice(meters){return meters===0?'同楼盘步行 · 核对不同门位':meters<=600?'建议步行':'建议共享单车'}
function renderVisitRoute(){
 const checked=ROUTE.order.filter(isChecked).length;
 const stay=Math.max(0,Math.min(120,Number($('#visitMinutes').value)||0));
 // Planning assumptions only: street distance 1.3–1.6 × straight line,
 // walk 4 km/h, cycle 12 km/h plus 4 min per bike leg to find/park a bike.
 let low=0,high=0;
 for(const leg of ROUTE.legs){if(leg.meters===0){low+=3;high+=8}else{const bike=leg.meters>600,speed=bike?200:66.67;low+=leg.meters*1.3/speed+(bike?4:0);high+=leg.meters*1.6/speed+(bike?7:0)}}
 const hours=m=>(m/60).toFixed(1);
 $('#routeSummary').textContent=`已签到 ${checked}/20 · 从 20 号出发，19 号结束，不返回起点`;
 $('#routeBudget').textContent=`全天粗估 ${hours(low+20*stay+60)}–${hours(high+20*stay+60)} 小时（含每点 ${stay} 分钟、休息 60 分钟）。交通约 ${Math.ceil(low)}–${Math.ceil(high)} 分钟；不含前往起点及结束后的返程。`;
 $('#routeStops').innerHTML=ROUTE.order.map((n,i)=>{
  const d=DATA.find(d=>d.n===n),leg=ROUTE.legs[i-1];
  const segment=leg?(leg.meters===0?legAdvice(0):`上站 → 此站 · 直线 ${(leg.meters/1000).toFixed(2)} km · ${legAdvice(leg.meters)}`):'起点 · 请先到达这里';
  return `<li><p class="route-leg">${segment}</p><div class="route-stop"><span class="route-sequence">${i+1}</span><div><strong>${n} 号 · ${escapeHTML(d['楼盘名称'])}</strong><p>${escapeHTML(d['地址'])}</p><small>${isChecked(n)?'已签到':'待前往'} · ${escapeHTML(d['门的方位'])}</small></div><button class="text-button" data-route-stop="${n}">查看</button></div></li>`;
 }).join('');
 const next=ROUTE.order.find(n=>!isChecked(n));$('#routeNext').disabled=next===undefined;$('#routeNext').textContent=next===undefined?'20 个点位已全部签到':`查看下一未签到点 · ${next} 号`;
}
function openVisitRoute(){renderVisitRoute();$('#visitRoute').showModal()}
function showVisitRouteMap(){
 $('#visitRoute').close();selected=null;expanded=false;region='全部';$('#search').value='';listView();
 if(visitRouteLine)map.removeLayer(visitRouteLine);
 visitRouteLine=L.polyline(ROUTE.order.map(n=>DATA.find(d=>d.n===n).coord),{color:'#ac5225',weight:3,dashArray:'7 8',opacity:.9,interactive:false}).addTo(map);
 $('#routeMapNote').hidden=false;fit();
}
$('#routePlan').onclick=openVisitRoute;$('#closeVisitRoute').onclick=()=>$('#visitRoute').close();$('#visitMinutes').oninput=renderVisitRoute;
$('#routeStops').onclick=e=>{const button=e.target.closest('[data-route-stop]');if(button){$('#visitRoute').close();showDetail(Number(button.dataset.routeStop))}};
$('#routeNext').onclick=()=>{const n=ROUTE.order.find(n=>!isChecked(n));if(n!==undefined){$('#visitRoute').close();showDetail(n)}};
$('#routeOnMap').onclick=showVisitRouteMap;$('#routeMapNote').onclick=()=>{if(visitRouteLine)map.removeLayer(visitRouteLine);visitRouteLine=null;$('#routeMapNote').hidden=true};
