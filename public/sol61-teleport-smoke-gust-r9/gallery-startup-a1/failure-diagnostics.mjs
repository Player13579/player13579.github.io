const scalar=value=>typeof value==='string'||typeof value==='number'&&Number.isFinite(value)?value:null;
export function captureFailure(error){
  const message=scalar(error?.message)||scalar(error)||'Unknown WebGPU failure';
  const diagnostics=[];
  for(const item of Array.isArray(error?.diagnostics)?error.diagnostics:[]){
    const pipelineLabel=scalar(item?.label)||scalar(item?.pipelineLabel)||scalar(error?.pipelineLabel);
    const rows=Array.isArray(item?.messages)?item.messages:[item];
    for(const row of rows){
      diagnostics.push(Object.freeze({type:scalar(row?.type),message:scalar(row?.message),lineNum:scalar(row?.lineNum),linePos:scalar(row?.linePos),
        offset:scalar(row?.offset),length:scalar(row?.length),pipelineLabel:scalar(row?.pipelineLabel)||pipelineLabel}));
    }
  }
  const frozenDiagnostics=Object.freeze(diagnostics);
  return Object.freeze({message,stack:scalar(error?.stack)||message,pipelineLabel:scalar(error?.pipelineLabel)||frozenDiagnostics[0]?.pipelineLabel||null,diagnostics:frozenDiagnostics});
}
export function recordFailure(error,sink){
  if(!Array.isArray(sink?.errors)||!Array.isArray(sink?.errorDiagnostics))throw new TypeError('Failure report arrays are required');
  const detail=captureFailure(error);sink.errors.push(detail.stack);sink.errorDiagnostics.push(detail);return detail;
}
