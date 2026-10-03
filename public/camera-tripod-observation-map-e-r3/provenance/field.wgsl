struct CameraField{color:vec3f,emission:vec3f,alpha:f32};
// Two reading regions belong to the observed map surface. Corners mark a
// completed reading, while a vertical front transfers light into that region.
// These are source-space readings, not a camera, screen replacement or new map.
fn readingCorners(q:vec2f,center:vec2f,halfSize:vec2f)->f32{
 let d=abs(q-center);
 let vertical=line(d.x-halfSize.x,.025)*band(d.y,halfSize.y-.11,halfSize.y+.025);
 let horizontal=line(d.y-halfSize.y,.025)*band(d.x,halfSize.x-.11,halfSize.x+.025);
 return vertical+horizontal;
}
fn cameraField(q:vec2f,t:f32,flags:f32)->CameraField{
 let sourceOn=select(0.0,1.0,(u32(flags)&1u)!=0u);let receiverOn=select(0.0,1.0,(u32(flags)&2u)!=0u);
 let wake=smoothstep(0.0,.12,t)*(1.0-smoothstep(.78,1.0,t));
 let plane=band(q.x,-.83,.55)*band(q.y,-.85,.32);
 let acquire=smoothstep(.04,.12,t)*(1.0-smoothstep(.28,.40,t));
 let approach=clamp((t-.06)/.24,0.0,1.0);
 let leftX=mix(-.79,-.68,approach);let rightX=mix(.50,.40,approach);
 let sweepL=line(q.x-leftX-.10*(q.y+.44),.055)*band(q.y,-.72,-.16)*acquire;
 let sweepR=line(q.x-rightX+.10*(q.y+.02),.055)*band(q.y,-.30,.26)*acquire;
 let regionA=band(q.x,-.68,-.28)*band(q.y,-.64,-.24);
 let regionB=band(q.x,0.0,.40)*band(q.y,-.22,.18);
 let travelA=clamp((t-.17)/.28,0.0,1.0);let travelB=clamp((t-.42)/.27,0.0,1.0);
 let frontAX=mix(-.68,-.28,travelA);let frontBX=mix(0.0,.40,travelB);
 let scanA=smoothstep(.14,.20,t)*(1.0-smoothstep(.43,.49,t));
 let scanB=smoothstep(.39,.45,t)*(1.0-smoothstep(.67,.73,t));
 let frontA=line(q.x-frontAX,.045)*regionA*scanA;
 let frontB=line(q.x-frontBX,.045)*regionB*scanB;
 let lockA=smoothstep(.40,.49,t)*(1.0-smoothstep(.82,.95,t));
 let lockB=smoothstep(.66,.75,t)*(1.0-smoothstep(.85,.98,t));
 let cornerA=readingCorners(q,vec2f(-.48,-.44),vec2f(.20))*lockA;
 let cornerB=readingCorners(q,vec2f(.20,-.02),vec2f(.20))*lockB;
 // The received face appears behind each front, never across the gap between
 // readings. The first reading can hold while the second is still acquiring.
 let receivedA=regionA*(1.0-smoothstep(frontAX-.035,frontAX+.035,q.x))*smoothstep(.17,.25,t);
 let receivedB=regionB*(1.0-smoothstep(frontBX-.035,frontBX+.035,q.x))*smoothstep(.42,.50,t);
 let pulse=1.0+.45*exp(-pow((t-.56)/.075,2.0));
 let source=vec3f(.43,.79,1.0)*(sweepL*.95+sweepR*.95+frontA*1.45+frontB*1.45+cornerA*1.45+cornerB*1.45)*plane*wake*sourceOn*pulse;
 let reflected=vec3f(.17,.30,.35)*(receivedA+receivedB*.85)*plane*wake*sourceOn*receiverOn;
 var o:CameraField;o.alpha=(receivedA*.17+receivedB*.15)*wake*sourceOn*receiverOn;
 o.color=source+reflected;o.emission=source;return o;
}
