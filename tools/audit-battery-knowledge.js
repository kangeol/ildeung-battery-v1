import fs from 'node:fs';import os from 'node:os';
import {conversationTurn,createConversationState} from '../js/smart-consult-conversation.js';
import {knowledgeQuestions,knowledgeFlows} from './lib/battery-knowledge-fixtures.js';
const j=p=>JSON.parse(fs.readFileSync(p)),rows=j('data/manufacturers.json').flatMap(m=>j('data/'+m.file).map(r=>({...r,manufacturerId:m.id,manufacturerName:m.name}))),areas=j('seo-data/smart-consult-location-index.json').localities,catalog=j('data/battery-prices.json'),policy=j('data/consult-service-policy.json'),evidence=[];
function ask(q,state=createConversationState(),family='session'){const o=conversationTurn(state,q,rows,areas,catalog,policy);evidence.push({family,q,messages:o.messages,state:o.state});return o.state;}
for(const [family,qs] of Object.entries(knowledgeQuestions))for(const q of qs)ask(q,undefined,family);
for(const flow of knowledgeFlows){let s=createConversationState();for(const q of flow)s=ask(q,s);}
fs.writeFileSync(os.tmpdir()+'/battery-knowledge-'+(process.argv.includes('--after')?'after':'before')+'.json',JSON.stringify(evidence,null,2));console.log(evidence.map(({family,q,messages})=>({family,q,messages})));
