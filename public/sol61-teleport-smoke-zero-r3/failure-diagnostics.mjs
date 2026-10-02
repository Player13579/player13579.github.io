const scalar=value=>typeof value==='string'||typeof value==='number'&&Number.isFinite(value)?value:null;
export function captureFailure(error){
  const message=scalar(error?.message)||scalar(error)||'Unknown WebGPU failure';
  const diagnostics=Array.isArray(error?.diagnostics)?error.diagnostics.map(item=>({
    type:scalar(item?.type),message:scalar(item?.message),lineNum:scalar(item?.lineNum),linePos:scalar(item?.linePos),
    offset:scalar(item?.offset),length:scalar(item?.length)
  })):[];
  return Object.freeze({message,stack:scalar(error?.stack)||message,pipelineLabel:scalar(error?.pipelineLabel),diagnostics:Object.freeze(diagnostics)});
}
export function recordFailure(error,sink){
  if(!Array.isArray(sink?.errors)||!Array.isArray(sink?.errorDiagnostics))throw new TypeError('Failure report arrays are required');
  const detail=captureFailure(error);sink.errors.push(detail.stack);sink.errorDiagnostics.push(detail);return detail;
}
