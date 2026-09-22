import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const tests=['test-final-faq.js','test-location-nlu.js','test-smart-consult.js','test-smart-consult-conversation.js','test-smart-consult-nlu-v4.js','test-smart-consult-v5.js','test-smart-consult-v7.js','test-battery-pricing.js','test-brand-service.js','test-product-as-hours.js','test-battery-certainty.js','test-db-driven-flow.js','test-smart-consult-launcher.js','test-smart-consult-viewport.js','test-smart-consult-branding.js','test-battery-certainty-scope.js','audit-sitemap-stability.js','audit-sitewide-service.js','audit-blog-sync-regression.js','audit-work-cases.js'];
const results=[];
const routed=new Set(['test-location-nlu.js','test-battery-pricing.js','test-brand-service.js','test-product-as-hours.js','test-battery-certainty.js','test-db-driven-flow.js']);
for(const test of tests){
 const started=Date.now();
 const output=execFileSync(process.execPath,[`tools/${test}`,...(routed.has(test)?['--faq']:[])],{encoding:'utf8',maxBuffer:20e6});
 results.push({test,status:'PASS',durationMs:Date.now()-started,output});
 fs.mkdirSync('docs/evidence/final-faq',{recursive:true});fs.writeFileSync('docs/evidence/final-faq/regression-results.json',JSON.stringify(results,null,2)+'\n');console.log(`PASS ${test}`);
}
