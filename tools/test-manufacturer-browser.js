import fs from 'node:fs';import {pathToFileURL} from 'node:url';import path from 'node:path';
let code=fs.readFileSync('tools/test-spec-brand-query-browser.js','utf8');
code=code.replace("'../js/smart-consult-conversation.js'",JSON.stringify(pathToFileURL(path.resolve('js/smart-consult-conversation.js')).href));
code=code.replace("session='brand-query-'+width","session='manufacturer-'+width").replace("owner?'non-agm-owner-policy':'spec-brand-query'","'manufacturer-browser'");
const questions=['40AL 제조회사 어디예요?','80L 제조사는요?','DIN74L 제조업체 어디예요?','65-900 제조회사는?','AGM60 제조사는?','AGM70 제조회사는 어디예요?','AGM80 제조업체 어디예요?','AGM80R 메이커는?','AGM95 어느 회사 제품이에요?','AGM95R 제조사는?','AGM105 제조사는 어디예요?','제조회사 어디예요?','제조사는요?','40AL 제조회사랑 가격 알려줘','AGM70 제조회사랑 가격 알려줘','60 제조사는?','60 제조사랑 가격은?','AGM70 어느 나라 제품이에요?','AGM70 원산지가 어디예요?','델코 AGM 어디서 제조돼요?','바르타 AGM 어디서 제조돼요?','80L 원산지가 어디예요?','볼보 S60 제조사는?','BMW 5시리즈 배터리 제조사는?','G80 배터리 제조회사는?'];
const flows=[['80L은 얼마인가요?','제조사는요?'],['BMW 5시리즈 2020년식','가격은?','제조회사는?'],['AGM60','제조사는?','바르타도 있어요?'],['AGM70','제조사는?','바르타 가격은?'],['40AL 어디 브랜드예요?','제조회사는?']];
code=code.replace(/const questions=owner\?[\s\S]*?;\nfor\(const q of questions\)/,'const questions='+JSON.stringify(questions)+';\nfor(const q of questions)');
code=code.replace(/const flows=owner\?[\s\S]*?;\nfor\(const flow of flows\)/,'const flows='+JSON.stringify(flows)+';\nfor(const flow of flows)');
await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
