import {worldShader} from './world-shader.mjs';
const anchor='const HIT_STATE_ENABLED=true;';
if(worldShader.split(anchor).length!==2)throw Error('hit diagnostic anchor');
export const hitStateOffShader=worldShader.replace(anchor,'const HIT_STATE_ENABLED=false;');
