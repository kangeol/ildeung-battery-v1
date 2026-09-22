import fs from 'node:fs';import {syncBuiltinESMExports} from 'node:module';
if(process.env.NODE_OPTIONS)process.env.NODE_OPTIONS=process.env.NODE_OPTIONS.replace('./tools/test-vehicle-selection-evidence.js',import.meta.url);
const route=p=>typeof p==='string'?p.replace(/^docs[\\/]evidence[\\/]final-faq(?=[\\/]|$)/,'docs/evidence/vehicle-selection/regression').replace(/^docs[\\/]evidence[\\/]standalone-spec(?=[\\/]|$)/,'docs/evidence/vehicle-selection/standalone'):p;
for(const key of ['mkdirSync','writeFileSync']){const original=fs[key];fs[key]=function(p,...args){return original.call(this,route(p),...args);};}syncBuiltinESMExports();
