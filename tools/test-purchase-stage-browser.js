import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import {stageQuestions,stageCombined,stageFlows} from './lib/purchase-stage-fixtures.js';
let code=fs.readFileSync('tools/test-spec-brand-query-browser.js','utf8');
code=code.replace("'../js/smart-consult-conversation.js'",JSON.stringify(pathToFileURL(path.resolve('js/smart-consult-conversation.js')).href));
code=code.replace("session='brand-query-'+width","session='purchase-stage-'+width").replace("owner?'non-agm-owner-policy':'spec-brand-query'","'purchase-stage-browser'");
code=code.replace(/const questions=owner\?[\s\S]*?;\nfor\(const q of questions\)/,'const questions='+JSON.stringify([...Object.values(stageQuestions).flat(),...stageCombined])+';\nfor(const q of questions)');
code=code.replace(/const flows=owner\?[\s\S]*?;\nfor\(const flow of flows\)/,'const flows='+JSON.stringify(stageFlows)+';\nfor(const flow of flows)');
code=code.replace("reset();ask(owner?'80L 브랜드랑 가격 알려줘':'AGM70 브랜드랑 가격 알려줘');","reset();ask('AGM105로 할게요 총 얼마고 코딩비?');");
await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
