import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
import {postSyncBaseline} from './blog-sync-approved-freeze.js';
export function assertHomepageFreeze(){
 for(const p of ['index.html','css/home-hero-intro.css'])assert.equal(fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n'),execFileSync('git',['show',postSyncBaseline+':'+p],{encoding:'utf8'}).replace(/\r\n/g,'\n'),p+' approved homepage frozen');
}
