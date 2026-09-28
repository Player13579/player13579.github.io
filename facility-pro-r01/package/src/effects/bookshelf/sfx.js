import {renderStereo} from '../../core/synthesis.js';
export const soundId='DVA-E/bookshelf@0.1.0';
export function synthesize(sampleRate=48000){return renderStereo(0,sampleRate);}
