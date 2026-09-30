const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'app.js'),'utf8');
const start=source.indexOf('function powerCabinetOutsideViewport(');
const end=source.indexOf('\n}',start)+2;
const outside=vm.runInNewContext(source.slice(start,end)+';powerCabinetOutsideViewport');
function moduleApi(file,key){const context={};vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),context);return context[key];}
const reactor=moduleApi('webgpu-reactor-room-objects-e.js','DvaWebGPUReactorRoomObjectsE');
const power=moduleApi('webgpu-power-room-objects-e.js','DvaWebGPUPowerRoomObjectsE');
const viewport={width:400,height:300,pixelWidth:800,pixelHeight:600};
test('reactor cabinet without halfWidth fields is omitted outside the actual planner support',()=>{
 const spec=reactor.OBJECTS['v302-reactor-powerCabinet-3'];
 assert.equal(spec.halfWidth,undefined);
 assert.equal(outside(spec,'reactorRoomObjectsE',{x:2300,y:1300},1,viewport),true);
 const radius=Math.max(spec.width,spec.height)*.94;
 assert.equal(outside(spec,'reactorRoomObjectsE',{x:spec.x+radius,y:spec.y},1,viewport),false);
 assert.equal(outside(spec,'reactorRoomObjectsE',{x:spec.x+radius+.01,y:spec.y},1,viewport),true);
 assert.equal(outside(spec,'reactorRoomObjectsE',{x:spec.x-100,y:spec.y-100},2,viewport),false);
});
test('power cabinet retains its own rectangular support and malformed input is not silently omitted',()=>{
 const spec=power.OBJECTS['v302-power-powerCabinet-1'];
 assert.ok(spec);
 assert.equal(outside(spec,'powerRoomObjectsE',{x:spec.x+spec.halfWidth,y:spec.y},1,viewport),false);
 assert.equal(outside(spec,'powerRoomObjectsE',{x:spec.x+spec.halfWidth+.01,y:spec.y},1,viewport),true);
 assert.equal(outside(spec,'powerRoomObjectsE',{x:NaN,y:0},1,viewport),false);
 assert.equal(outside(spec,'powerRoomObjectsE',{x:0,y:0},0,viewport),false);
});
