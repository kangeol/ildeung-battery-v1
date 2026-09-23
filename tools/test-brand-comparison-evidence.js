import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';
const route=p=>typeof p==='string'&&/^docs[\\/]evidence[\\/]/.test(p)&&!/^docs[\\/]evidence[\\/]brand-comparison[\\/]/.test(p)?p.replace(/^docs[\\/]evidence[\\/]/,'docs/evidence/brand-comparison/regression/'):p;
for(const key of ['mkdirSync','writeFileSync']){const old=fs[key];fs[key]=function(p,...args){return old.call(this,route(p),...args);};}syncBuiltinESMExports();
