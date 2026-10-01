import {readFile,writeFile} from 'node:fs/promises';
const light=await readFile(new URL('./support-light/world.wgsl',import.meta.url),'utf8');
if(!light.includes('@fragment fn fragment(v:V)->Output'))throw Error('frozen r6 entry absent');
const water=await readFile(new URL('./fluid.wgsl',import.meta.url),'utf8');
const cloth=await readFile(new URL('./cloth.wgsl',import.meta.url),'utf8');
await writeFile(new URL('./world.wgsl',import.meta.url),light.replace('@fragment fn fragment(v:V)->Output','fn lightingFragment(v:V)->Output')+'\n'+cloth+'\n'+water);
