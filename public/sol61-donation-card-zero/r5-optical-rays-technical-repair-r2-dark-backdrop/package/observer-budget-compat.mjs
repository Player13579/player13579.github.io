import {POST_WGSL as rawPOST_WGSL,postUniforms as originalPostUniforms} from './observer.mjs';

const sourceExpression='c.rgb+scatter';
const budgetedExpression='c.rgb+scatter-sourceAt(q).rgb*(observer.gains.x+observer.gains.y)*observerActive';
const occurrences=rawPOST_WGSL.split(sourceExpression).length-1;
if(occurrences!==1)throw new Error('Expected exactly one observer present expression');
export const POST_WGSL=rawPOST_WGSL.replace(sourceExpression,budgetedExpression);
export const postUniforms=originalPostUniforms;
