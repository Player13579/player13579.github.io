(async()=>{
 const q=new URLSearchParams(location.search),baseline=q.has('baseline');if(q.has('embed'))document.body.classList.add('embed');
 const report=window.__luck={state:'loading',errors:[],baseline,verify:q.has('verify'),frame:0};
 try{await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=baseline?'./originals/webgpu-luck-astra-v4.js':'./webgpu-luck-v4-sparkle-r02.js';s.onload=resolve;s.onerror=reject;document.head.append(s);});
 const api=baseline?LuckAstraV4:LuckAstraV4Sparkle;
 const runtime=await api.create(document.querySelector('canvas'),{height:Number(q.get('height')||64),duration:Number(q.get('duration')||1500),reduced:q.has('reduced'),sparkles:!q.has('nosparkles'),background:q.get('background')||'dark',onError:e=>report.errors.push(e)});
 report.runtime=runtime;report.edition=runtime.edition;report.compilation=runtime.messages;report.adapter=runtime.adapter;report.state='ready';window.__capture=(ms,on=true)=>runtime.capture(ms,1,on);
 document.querySelector('#status').textContent=`${runtime.edition} / H${q.get('height')||64} / ${runtime.silent?'消音検証':'音はブラウザ再生条件に従う'}`;
 if(q.has('phase'))await runtime.capture(Number(q.get('phase'))*Number(q.get('duration')||1500));
 window.addEventListener('pagehide',()=>runtime.destroy(),{once:true});
 }catch(e){report.state='error';report.errors.push(e.message||String(e));document.querySelector('#status').textContent=report.errors.join('\n');}
})();