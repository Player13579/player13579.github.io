import {renderStereo} from '../../core/synthesis.js';
export const soundId='DVA-E/security-console@0.1.0';
export function synthesize(sampleRate=48000){return renderStereo(2,sampleRate);}
