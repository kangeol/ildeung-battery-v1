import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
export function assertHomepageFreeze(){
 for(const p of ['index.html','css/home-hero-intro.css'])assert.equal(fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n'),execFileSync('git',['show','821b74e95cf1b5ffac0503ebbbb9fa060d78c7b7:'+p],{encoding:'utf8'}).replace(/\r\n/g,'\n'),p+' approved homepage frozen');
}
