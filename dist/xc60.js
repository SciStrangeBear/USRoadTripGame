import * as THREE from './vendor/three.module.js';

// Original stylized geometry inspired by the second-generation XC60.
// Nose +X; wheel axles +Z; proportions intentionally short, tall and round.
export function createXC60(){
 const car=new THREE.Group();car.name='Q版白色 XC60';
 const material=(color,roughness=.4,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
 const white=material(0xf6f7f5,.27,.15),black=material(0x202a31,.52),glass=material(0x233e49,.18,.4),chrome=material(0xbecbd0,.23,.8),rubber=material(0x192026,.85),rim=material(0xe3e9eb,.24,.7);
 const led=new THREE.MeshStandardMaterial({color:0xf1fbff,emissive:0xc6ecff,emissiveIntensity:.7});
 const red=new THREE.MeshStandardMaterial({color:0xc9232c,emissive:0xce1423,emissiveIntensity:.35});
 function add(geo,mat,x=0,y=0,z=0,parent=car){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function rounded(w,h,d,r,mat,x,y,z,parent=car){
  const shape=new THREE.Shape();const a=w/2-r,b=h/2-r;
  shape.moveTo(-a,-b);shape.lineTo(a,-b);shape.lineTo(a,b);shape.lineTo(-a,b);shape.closePath();
  const g=new THREE.ExtrudeGeometry(shape,{depth:d-2*r,bevelEnabled:true,bevelSize:r,bevelThickness:r,bevelSegments:3,steps:1,curveSegments:4});g.translate(0,0,-d/2+r);g.computeVertexNormals();
  return add(g,mat,x,y,z,parent);
 }
 function line(a,b,r,mat,parent=car){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),v=vb.clone().sub(va);const m=add(new THREE.CylinderGeometry(r,r,v.length(),8),mat,...va.clone().add(vb).multiplyScalar(.5).toArray(),parent);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return m;}
 function panel(vertices,mat){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices.flat(),3));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();const m=add(g,mat);m.material.side=THREE.DoubleSide;return m;}
 rounded(18.8,5,9.9,.65,white,0,4.8,0);
 rounded(18.5,1.25,10,.35,black,0,2.65,0);
 rounded(6.7,.65,8.8,.25,white,5.2,7.15,0); // short high bonnet
 const cabin=new THREE.Shape();cabin.moveTo(-8,6.4);cabin.lineTo(-6.9,10.5);cabin.quadraticCurveTo(-6.5,11.25,-5.5,11.25);cabin.lineTo(1.1,11.25);cabin.quadraticCurveTo(2,11.25,2.55,10.5);cabin.lineTo(5.2,6.4);cabin.closePath();
 const cabGeo=new THREE.ExtrudeGeometry(cabin,{depth:7.8,bevelEnabled:true,bevelSize:.38,bevelThickness:.35,bevelSegments:3,curveSegments:8});cabGeo.translate(0,0,-3.9);add(cabGeo,white);
 // Four separate glass panels leave a visible white sill and dark B pillar.
 for(const side of [-1,1]){
  const z=side*4.27;
  panel([[-6.95,7.05,z],[-6.25,10.35,z],[-2.25,10.5,z],[-2.25,7.05,z]],glass);
  panel([[-1.85,7.05,z],[-1.85,10.5,z],[1.75,10.4,z],[4.05,7.05,z]],glass);
  line([-7.1,6.92,z], [4.15,6.92,z],.09,chrome);
  rounded(1.15,.24,.2,.06,chrome,.2,6.15,side*5);
  rounded(1.15,.24,.2,.06,chrome,-5,6.15,side*5);
  line([-2.05,3.4,side*5.02],[-2.05,6.7,side*5.02],.045,black);
  rounded(1.5,.9,1.25,.25,white,3.1,7.35,side*5.05);
  rounded(.65,.56,1.15,.13,glass,2.48,7.35,side*5.05);
  line([-6.1,11.65,side*3.12],[1.1,11.65,side*3.12],.13,chrome);
 }
 panel([[5.43,7.25,-3.7],[3,10.65,-3.45],[3,10.65,3.45],[5.43,7.25,3.7]],glass);
 panel([[-8.55,7.2,3.7],[-7.6,10.35,3.4],[-7.6,10.35,-3.4],[-8.55,7.2,-3.7]],glass);
 rounded(6.6,.16,5.4,.06,glass,-2,11.65,0); // panoramic roof
 rounded(2.2,.35,8.2,.14,white,-6.6,11.1,0); // rear spoiler
 // Volvo face: dark grille, chrome uprights, diagonal sash and circular badge.
 rounded(.32,2.75,4.5,.12,chrome,9.42,4.85,0);
 rounded(.35,2.4,4.13,.12,black,9.63,4.85,0);
 for(let z=-1.75;z<=1.8;z+=.5)line([9.84,3.83,z],[9.84,5.87,z],.06,chrome);
 line([9.96,3.9,-1.85],[9.96,5.85,1.85],.11,chrome);
 const badge=add(new THREE.TorusGeometry(.4,.095,8,24),chrome,10.04,4.88,0);badge.rotation.y=Math.PI/2;
 rounded(.15,.17,.78,.04,black,10.16,4.88,0);
 // Hammer-shaped DRLs on both front corners.
 for(const side of [-1,1]){
  rounded(.4,1.15,2.2,.17,glass,9.37,6,side*3.45);
  line([9.62,6,side*2.5],[9.62,6,side*4.36],.13,led);
  line([9.64,5.62,side*2.76],[9.64,6.38,side*2.76],.13,led);
  // Tall rear lights with an inward hook, visible from the following camera.
  line([-8.55,7.35,side*4.25],[-7.5,10.48,side*3.98],.24,red);
  line([-8.55,7.35,side*4.25],[-9.65,7.4,side*4.25],.24,red);
  line([-9.65,7.4,side*4.25],[-9.65,5.95,side*4.25],.24,red);
  line([-9.65,5.95,side*4.25],[-9.65,5.95,side*2.6],.24,red);
 }
 rounded(.32,.5,6,.15,chrome,9.44,2.76,0);
 rounded(.32,.5,6,.15,chrome,-9.44,2.76,0);
 function label(text,x,y,w,h,front){
  const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.clearRect(0,0,512,128);ctx.fillStyle='#273944';ctx.font='600 74px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,68);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  const m=add(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false}),x,y,0);m.rotation.y=front?Math.PI/2:-Math.PI/2;
 }
 label('V O L V O',-9.48,5.1,4.9,.62,false);
 rounded(.2,.85,2.8,.08,white,-9.5,3.88,0);label('XC60',-9.64,3.88,2.4,.65,false);
 rounded(.2,.85,2.8,.08,white,9.5,3.1,0);label('XC60',9.64,3.1,2.4,.65,true);
 const wheels=[];
 for(const x of [-5.9,5.7])for(const side of [-1,1]){
  const wheel=new THREE.Group();wheel.position.set(x,2.6,side*4.8);car.add(wheel);wheels.push(wheel);
  const tire=add(new THREE.CylinderGeometry(2.6,2.6,1.8,24),rubber,0,0,0,wheel);tire.rotation.x=Math.PI/2;
  const disk=add(new THREE.CylinderGeometry(1.91,1.91,.16,24),black,0,0,side*.97,wheel);disk.rotation.x=Math.PI/2;
  for(let i=0;i<5;i++){
   const a=i*Math.PI*2/5;
   line([Math.cos(a)*.45,Math.sin(a)*.45,side*1.1],[Math.cos(a+.18)*1.75,Math.sin(a+.18)*1.75,side*1.1],.2,rim,wheel);
  }
  const hub=add(new THREE.CylinderGeometry(.48,.48,.18,16),chrome,0,0,side*1.12,wheel);hub.rotation.x=Math.PI/2;
 }
 car.userData.model='White XC60 · chibi';
 return {car,wheels,wheelRadius:2.6};
}
