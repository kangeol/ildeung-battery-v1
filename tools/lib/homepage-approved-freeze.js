import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
export function assertHomepageFreeze(){
 for(const p of ['index.html','css/home-hero-intro.css'])assert.equal(fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n'),execFileSync('git',['show','ec9efc0b64b59394105c1d956786bdec7591c3ae:'+p],{encoding:'utf8'}).replace(/\r\n/g,'\n'),p+' approved homepage frozen');
}
