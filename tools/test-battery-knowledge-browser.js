import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
import {knowledgeQuestions,knowledgeFlows} from './lib/battery-knowledge-fixtures.js';
let code=fs.readFileSync('tools/test-spec-brand-query-browser.js','utf8');
code=code.replace("'../js/smart-consult-conversation.js'",JSON.stringify(pathToFileURL(path.resolve('js/smart-consult-conversation.js')).href));
code=code.replace("session='brand-query-'+width","session='knowledge-'+width").replace("owner?'non-agm-owner-policy':'spec-brand-query'","'battery-knowledge-browser'");
code=code.replace(/const questions=owner\?[\s\S]*?;\nfor\(const q of questions\)/,'const questions='+JSON.stringify(Object.values(knowledgeQuestions).flat())+';\nfor(const q of questions)');
code=code.replace(/const flows=owner\?[\s\S]*?;\nfor\(const flow of flows\)/,'const flows='+JSON.stringify(knowledgeFlows)+';\nfor(const flow of flows)');
code=code.replace("reset();ask(owner?'80L 브랜드랑 가격 알려줘':'AGM70 브랜드랑 가격 알려줘');","reset();ask('CCA가 뭐예요?');");
await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
