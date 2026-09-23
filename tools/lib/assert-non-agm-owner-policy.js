import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

// The only newly authorized catalog change. Historical freeze tests retain
// byte/path freezes for all other data and an exact structural check here.
export function assertNonAgmOwnerPolicy() {
  const previous=JSON.parse(execFileSync('git',['show','14deabe851b137eb2682a77512f98aa8b2805168:data/battery-prices.json'],{encoding:'utf8'}));
  assert.deepEqual(JSON.parse(fs.readFileSync('data/battery-prices.json','utf8')),{
    ...previous,nonAgmBrandPolicy:{brand:'DELKOR',scope:'canonical_non_agm',authority:'Owner: ILDEUNG_AI_CONSULT_OWNER_NON_AGM_DELKOR_BRAND_POLICY_V1'}
  });
}
