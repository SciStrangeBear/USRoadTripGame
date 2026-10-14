export function createHeightSampler(data){
 const {positions:p,indices:ids,grid:g}=data,cell=16,buckets=new Map();
 if(!p?.length||!ids?.length||p.some(v=>!Number.isFinite(v)))throw Error('Invalid terrain');
 for(let i=0;i<ids.length;i+=3){const a=ids[i]*3,b=ids[i+1]*3,c=ids[i+2]*3;const x0=Math.floor(Math.min(p[a],p[b],p[c])/cell),x1=Math.floor(Math.max(p[a],p[b],p[c])/cell),z0=Math.floor(Math.min(p[a+2],p[b+2],p[c+2])/cell),z1=Math.floor(Math.max(p[a+2],p[b+2],p[c+2])/cell);for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){const key=x+','+z;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(i);}}
 function metersAt(lon,lat){const u=Math.max(0,Math.min(g.cols-1,(lon-g.west)/g.step)),v=Math.max(0,Math.min(g.rows-1,(g.north-lat)/g.step)),i=Math.min(g.cols-2,Math.floor(u)),j=Math.min(g.rows-2,Math.floor(v)),a=u-i,b=v-j;const at=(dx,dy)=>g.meters[(j+dy)*g.cols+i+dx];return (at(0,0)*(1-a)+at(1,0)*a)*(1-b)+(at(0,1)*(1-a)+at(1,1)*a)*b;}
 function heightAt(x,z){
  for(const i of buckets.get(Math.floor(x/cell)+','+Math.floor(z/cell))||[]){const a=ids[i]*3,b=ids[i+1]*3,c=ids[i+2]*3;const den=(p[b+2]-p[c+2])*(p[a]-p[c])+(p[c]-p[b])*(p[a+2]-p[c+2]);if(Math.abs(den)<1e-10)continue;
   const u=((p[b+2]-p[c+2])*(x-p[c])+(p[c]-p[b])*(z-p[c+2]))/den,v=((p[c+2]-p[a+2])*(x-p[c])+(p[a]-p[c])*(z-p[c+2]))/den,w=1-u-v;
   if(u>=-1e-6&&v>=-1e-6&&w>=-1e-6)return u*p[a+1]+v*p[b+1]+w*p[c+1];
  }
  return metersAt((x-100)/27-125,50-(z-75)/28)/data.metersPerSceneUnit;
 }
 return {heightAt,metersAt};
}
