import * as THREE from './vendor/three.module.js';
import {createHeightSampler} from './terrain-height.js';

export function createTerrain(scene,data){
 const sampler=createHeightSampler(data),{positions:p,indices:ids,shore}=data;
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geometry.setIndex(ids);
 // Per-face colors and flat normals keep the relief quiet and readable.
 const surface=geometry.toNonIndexed();geometry.dispose();const v=surface.getAttribute('position'),colors=[];
 const palette=[new THREE.Color('#bfd4a1'),new THREE.Color('#c3c996'),new THREE.Color('#c7aa75'),new THREE.Color('#b39873'),new THREE.Color('#839b8e'),new THREE.Color('#cdd8cc')];
 for(let i=0;i<v.count;i+=3){const meters=(v.getY(i)+v.getY(i+1)+v.getY(i+2))/3*55;const breaks=[0,350,1000,1700,2400,3200];let band=0;while(band<4&&meters>breaks[band+1])band++;const t=Math.max(0,Math.min(1,(meters-breaks[band])/(breaks[band+1]-breaks[band])));const color=palette[band].clone().lerp(palette[band+1],t);for(let j=0;j<3;j++)colors.push(color.r,color.g,color.b);}
 surface.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));surface.computeVertexNormals();
 const mesh=new THREE.Mesh(surface,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide,flatShading:true}));mesh.receiveShadow=true;scene.add(mesh);
 const wall=[];
 for(let i=0;i<shore.length;i++){const a=shore[i]*3,b=shore[(i+1)%shore.length]*3;wall.push(p[a],p[a+1],p[a+2],p[b],p[b+1],p[b+2],p[a],-17,p[a+2], p[b],p[b+1],p[b+2],p[b],-17,p[b+2],p[a],-17,p[a+2]);}
 const skirt=new THREE.BufferGeometry();skirt.setAttribute('position',new THREE.Float32BufferAttribute(wall,3));skirt.computeVertexNormals();scene.add(new THREE.Mesh(skirt,new THREE.MeshStandardMaterial({color:0xb4ac89,roughness:1,side:THREE.DoubleSide})));
 return {...sampler,triangles:ids.length/3};
}
