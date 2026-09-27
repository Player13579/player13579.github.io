// W3C WGSL CRD 2026-09-21, section 16.2. Language tokens, not prose excerpts.
// https://www.w3.org/TR/2026/CRD-WGSL-20260921/#reserved-words
export const RESERVED_WORDS = new Set(`NULL Self abstract active alignas alignof as asm asm_fragment async attribute auto await become cast catch class co_await co_return co_yield coherent column_major common compile compile_fragment concept const_cast consteval constexpr constinit crate debugger decltype delete demote demote_to_helper do dynamic_cast enum explicit export extends extern external fallthrough filter final finally friend from fxgroup get goto groupshared highp impl implements import inline instanceof interface layout lowp macro macro_rules match mediump meta mod module move mut mutable namespace new nil noexcept noinline nointerpolation non_coherent noncoherent noperspective null nullptr of operator package packoffset partition pass patch pixelfragment precise precision premerge priv protected pub public readonly ref regardless register reinterpret_cast require resource restrict self set shared sizeof smooth snorm static static_assert static_cast std subroutine super target template this thread_local throw trait try type typedef typeid typename typeof union unless unorm unsafe unsized use using varying virtual volatile wgsl where with writeonly yield`.split(/\s+/));
export const KEYWORDS = new Set(`alias break case const const_assert continue continuing default diagnostic discard else enable false fn for if let loop override requires return struct switch true var while`.split(/\s+/));

export function stripWGSLComments(text) {
  let output='',i=0,depth=0;
  while(i<text.length){
    if(depth){if(text.slice(i,i+2)==='/*'){depth++;output+='  ';i+=2;}else if(text.slice(i,i+2)==='*/'){depth--;output+='  ';i+=2;}else{output+=text[i]==='\n'?'\n':' ';i++;}continue;}
    if(text.slice(i,i+2)==='//'){while(i<text.length&&text[i]!=='\n'){output+=' ';i++;}continue;}
    if(text.slice(i,i+2)==='/*'){depth=1;output+='  ';i+=2;continue;}
    output+=text[i++];
  }
  if(depth)throw new Error('Unterminated nested WGSL comment');return output;
}
export function inspectWGSL(text,{label='shader',specification=null}={}) {
  const code=stripWGSLComments(text);const errors=[];const checks=[];
  for(const m of code.matchAll(/\b[A-Za-z_][A-Za-z0-9_]*\b/g)){
    if(RESERVED_WORDS.has(m[0]))errors.push(`reserved identifier ${m[0]} at ${m.index}`);
    if(m[0].startsWith('__'))errors.push(`reserved double-underscore identifier ${m[0]}`);
  }
  checks.push('reserved-word tokens and __ identifiers scanned outside nested comments');
  const stack=[];const close={')':'(',']':'[','}':'{'};
  for(let i=0;i<code.length;i++){const c=code[i];if('([{'.includes(c))stack.push(c);else if(')]}'.includes(c)&&stack.pop()!==close[c])errors.push(`unbalanced ${c} at ${i}`);}
  if(stack.length)errors.push('unclosed delimiter');checks.push('braces, brackets and parentheses balanced');
  const fields=[];
  for(const m of code.matchAll(/\bstruct\s+(\w+)\s*\{([\s\S]*?)\}/g)){
    const names=[...m[2].matchAll(/(?:\)|^|,)\s*([A-Za-z_]\w*)\s*:/g)].map(x=>x[1]);
    if(new Set(names).size!==names.length)errors.push(`duplicate field in ${m[1]}`);
    fields.push({name:m[1],fields:names});
  }
  const bindings=[...code.matchAll(/@group\((\d+)\)\s*@binding\((\d+)\)\s*var(?:<([^>]+)>)?\s+(\w+)\s*:\s*([^;]+);/g)].map(m=>({group:Number(m[1]),binding:Number(m[2]),address:m[3]??null,name:m[4],wgslType:m[5].trim()}));
  if(new Set(bindings.map(b=>`${b.group}:${b.binding}`)).size!==bindings.length)errors.push('duplicate group:binding');
  if(specification){
    for(const stage of ['vertex','fragment']){
      const entry=specification[stage];if(!new RegExp(`@${stage}\\s+fn\\s+${entry}\\s*\\(`).test(code))errors.push(`missing ${stage} entrypoint ${entry}`);
    }
    if(bindings.length!==specification.bindings.length)errors.push('binding count mismatch');
    for(const b of specification.bindings){const actual=bindings.find(x=>x.group===0&&x.binding===b.binding);
      if(!actual){errors.push(`missing binding ${b.binding}`);continue;}
      const kind=actual.address?.includes('uniform')?'uniform':actual.address?.includes('storage')?'read-only-storage':actual.wgslType==='sampler'?'sampler':actual.wgslType.startsWith('texture_2d')?'texture':'unsupported';
      if(kind!==b.kind)errors.push(`binding ${b.binding}: expected ${b.kind}, found ${kind}`);
    }
    checks.push('explicit bind-group descriptors match reflected declarations');
    checks.push('vertex / fragment entrypoint names exist');
    if(specification.name==='scene'){
      if(!/@location\(0\)\s+radiance\s*:\s*vec4f/.test(code)||!/@location\(1\)\s+bloomSeed\s*:\s*vec4f/.test(code))errors.push('MRT locations mismatch');
      for(const structure of ['Globals','Volume','BodyPart']){
        const match=code.match(new RegExp(`struct\\s+${structure}\\s*\\{([\\s\\S]*?)\\}`));
        if(!match||[...match[1].matchAll(/:\s*vec4f\b/g)].length!==4)errors.push(`${structure} is not four vec4f / 64 bytes`);
      }
      checks.push('4×vec4f host-shareable structures: alignment16 / stride64');
    }
  }
  return {label,status:errors.length?'fail':'pass',scope:'static lexical/structural/descriptor checks; not a WGSL type checker or GPU compiler',checks,errors,bindings,fields};
}
