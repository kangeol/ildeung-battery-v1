import fs from 'node:fs';import os from 'node:os';import {conversationTurn,createConversationState} from '../js/smart-consult-conversation.js';
import {stageQuestions,stageCombined,stageFlows} from './lib/purchase-stage-fixtures.js';
const j=p=>JSON.parse(fs.readFileSync(p)),rows=j('data/manufacturers.json').flatMap(m=>j('data/'+m.file).map(r=>({...r,manufacturerId:m.id,manufacturerName:m.name}))),areas=j('seo-data/smart-consult-location-index.json').localities,catalog=j('data/battery-prices.json'),policy=j('data/consult-service-policy.json'),evidence=[];
function ask(q,family,state=createConversationState()){const o=conversationTurn(state,q,rows,areas,catalog,policy);evidence.push({family,q,messages:o.messages,state:o.state});return o.state;}
for(const [f,qs]of Object.entries(stageQuestions))for(const q of qs)ask(q,f);
for(const q of stageCombined)ask(q,'combined');for(const flow of stageFlows){let s=createConversationState();for(const q of flow)s=ask(q,'session',s);}
fs.writeFileSync(os.tmpdir()+'/purchase-stage-'+(process.argv[2]||'before')+'.json',JSON.stringify(evidence,null,2));console.log(evidence.map(e=>({family:e.family,q:e.q,m:e.messages})));console.log({count:evidence.length});
