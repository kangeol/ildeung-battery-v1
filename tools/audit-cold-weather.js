import fs from 'node:fs';import os from 'node:os';
import {conversationTurn,createConversationState} from '../js/smart-consult-conversation.js';
import {coldQuestions,coldControls,coldCombined,coldFlows} from './lib/cold-weather-fixtures.js';
const j=p=>JSON.parse(fs.readFileSync(p)),rows=j('data/manufacturers.json').flatMap(m=>j('data/'+m.file).map(r=>({...r,manufacturerId:m.id,manufacturerName:m.name}))),areas=j('seo-data/smart-consult-location-index.json').localities,catalog=j('data/battery-prices.json'),policy=j('data/consult-service-policy.json'),evidence=[];
function ask(q,state=createConversationState(),family='session'){const o=conversationTurn(state,q,rows,areas,catalog,policy);evidence.push({family,q,messages:o.messages,state:o.state});return o.state;}
for(const [family,questions]of Object.entries({direct:coldQuestions,controls:coldControls,combined:coldCombined}))for(const q of questions)ask(q,undefined,family);
for(const flow of coldFlows){let s=createConversationState();for(const q of flow)s=ask(q,s);}
fs.writeFileSync(os.tmpdir()+'/cold-weather-'+(process.argv.includes('--after')?'after':'before')+'.json',JSON.stringify(evidence,null,2));
console.log(JSON.stringify({turns:evidence.length,answers:evidence.filter(e=>e.family==='direct').map(({q,messages,state})=>({q,messages,intent:state.lastIntent}))},null,2));
