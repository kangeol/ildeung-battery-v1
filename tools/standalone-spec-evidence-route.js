// Re-run the authoritative suite without overwriting historical acceptance evidence.
import fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
// Isolated build audits change cwd; retain this test-only hook's absolute location.
if(process.env.NODE_OPTIONS)process.env.NODE_OPTIONS=process.env.NODE_OPTIONS.replace('./tools/standalone-spec-evidence-route.js',import.meta.url);
const route=p=>typeof p==='string'?p.replace(/^docs[\\/]evidence[\\/]final-faq(?=[\\/]|$)/,'docs/evidence/standalone-spec/regression'):p;
for(const method of ['mkdirSync','writeFileSync']){const original=fs[method];fs[method]=function(p,...args){return original.call(this,route(p),...args);};}
syncBuiltinESMExports();
