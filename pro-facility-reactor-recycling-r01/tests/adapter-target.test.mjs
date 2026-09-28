import test from 'node:test';
import assert from 'node:assert/strict';
import {requestedTarget} from '../preview/route.mjs';

test('static route can open the assigned recycling target without changing target behavior',()=>{
  assert.equal(requestedTarget('?target=B&verify=1'),'B');
  assert.equal(requestedTarget('?target=A&verify=1'),'A');
  assert.equal(requestedTarget('?verify=1'),null);
  assert.equal(requestedTarget('?target=unknown&verify=1'),null);
});
