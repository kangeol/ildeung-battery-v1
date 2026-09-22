import fs from 'node:fs';import {syncBuiltinESMExports} from 'node:module';
if(process.env.NODE_OPTIONS)process.env.NODE_OPTIONS=process.env.NODE_OPTIONS.replace('./tools/test-authentic-evidence.js',import.meta.url);
const route=p=>typeof p==='string'&&/^docs[\\/]evidence[\\/]/.test(p)&&!/^docs[\\/]evidence[\\/]authentic-cash[\\/]/.test(p)?p.replace(/^docs[\\/]evidence[\\/]/,`docs/evidence/authentic-cash/${process.env.AUTHENTIC_AUDIT_STAGE==='final'?'final-regression':'regression'}/`):p;
for(const key of ['mkdirSync','writeFileSync']){const old=fs[key];fs[key]=function(p,...args){return old.call(this,route(p),...args);};}syncBuiltinESMExports();
