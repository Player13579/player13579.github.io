import assert from 'node:assert/strict';
import {isParentStartup,acceptsRetire} from './gallery-auth.mjs';
const win={name:'actual-parent'},token='0123456789abcdef0123456789abcdef',id='human-transmutation-sol61-r5',epoch=7,origin='https://dva.invalid';
const startup={isEmbedded:true,token,requestedVersion:id,versionId:id,epoch};
assert.equal(isParentStartup(startup),true);
for(const patch of [{isEmbedded:false},{token:'bad'},{requestedVersion:'human-transmutation-sol61-r4'},{epoch:0},{epoch:1.2}])
  assert.equal(isParentStartup({...startup,...patch}),false);
const retire={parentStartup:true,eventOrigin:origin,ownOrigin:origin,eventSource:win,parentWindow:win,
  data:{schema:'dva-gallery-startup/v1',action:'retire',token,versionId:id,attemptEpoch:epoch},token,versionId:id,epoch};
assert.equal(acceptsRetire(retire),true);
for(const patch of [{eventOrigin:'https://attacker.invalid'},{eventSource:{}},{parentStartup:false},
  {data:{...retire.data,token:'f'.repeat(32)}},{data:{...retire.data,versionId:'human-transmutation-sol61-r4'}},
  {data:{...retire.data,attemptEpoch:epoch+1}},{data:{...retire.data,action:'start'}},
  {data:{...retire.data,schema:'other'}}]) assert.equal(acceptsRetire({...retire,...patch}),false);
console.log(JSON.stringify({status:'pass',checks:['valid-R5-startup','invalid-startup-isolation','authorized-retire','origin-source-token-version-epoch-action-schema-binding']}));
