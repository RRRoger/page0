// Exact shortest open visit order by great-circle distance, fixed start #20.
// This optimizes reference coordinates, not road or transit travel time.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');const points=vm.runInNewContext(fs.readFileSync(path.join(root,'assets/locations.js'),'utf8')+';DATA');
const start=points.find(p=>p.n===20),rest=points.filter(p=>p.n!==20),n=rest.length,size=1<<n;
function distance(a,b){const r=Math.PI/180,p=a.coord,q=b.coord;const h=Math.sin((q[0]-p[0])*r/2)**2+Math.cos(p[0]*r)*Math.cos(q[0]*r)*Math.sin((q[1]-p[1])*r/2)**2;return 6371000*2*Math.asin(Math.sqrt(h))}
const dp=new Float64Array(size*n);dp.fill(Infinity);const parent=new Int8Array(size*n);parent.fill(-1);const dist=rest.map(a=>rest.map(b=>distance(a,b)));
for(let j=0;j<n;j++)dp[(1<<j)*n+j]=distance(start,rest[j]);
for(let mask=1;mask<size;mask++)for(let bits=mask;bits;bits&=bits-1){const j=31-Math.clz32(bits&-bits),prev=mask^(1<<j);if(!prev)continue;let best=Infinity,kbest=-1;for(let candidates=prev;candidates;candidates&=candidates-1){const k=31-Math.clz32(candidates&-candidates),v=dp[prev*n+k]+dist[k][j];if(v<best){best=v;kbest=k}}dp[mask*n+j]=best;parent[mask*n+j]=kbest;}
let mask=size-1,last=0;for(let j=1;j<n;j++)if(dp[mask*n+j]<dp[mask*n+last])last=j;const meters=dp[mask*n+last],order=[];while(mask){order.push(rest[last].n);const prev=parent[mask*n+last];mask^=1<<last;last=prev}order.push(20);order.reverse();
const legs=order.slice(1).map((id,i)=>({from:order[i],to:id,meters:Math.round(distance(points.find(p=>p.n===order[i]),points.find(p=>p.n===id)))}));
const result={start:20,returnToStart:false,metric:'great-circle reference-coordinate distance; not road distance or transit time',method:'Held-Karp exact dynamic programming',order,meters:Math.round(meters),legs};fs.writeFileSync(path.join(root,'assets/route-data.js'),'const ROUTE='+JSON.stringify(result)+';\n');console.log(JSON.stringify(result,null,2));
