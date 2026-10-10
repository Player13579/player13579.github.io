function deepFreeze(value){if(value&&typeof value==='object'){for(const item of Object.values(value))deepFreeze(item);Object.freeze(value);}return value;}
export function freezeDiagnosticSnapshot(value){return deepFreeze(JSON.parse(JSON.stringify(value??null)));}
