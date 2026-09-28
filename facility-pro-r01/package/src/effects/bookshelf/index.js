import {createEffectRenderer} from '../../core/renderer.js';
import {sample} from './sampler.js';
import {synthesize,soundId} from './sfx.js';
export {sample,synthesize,soundId};
export const definition=Object.freeze({key:'bookshelf',title:'索引の綴合',version:'0.1.0',kind:0,sample,synthesize,soundId,shaderURL:new URL('./effect.wgsl',import.meta.url)});
export async function createE(canvas,options={}){return createEffectRenderer(canvas,definition,options);}
