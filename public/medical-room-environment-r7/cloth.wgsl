struct Cloth{state:vec4f,cart:vec4f,sink:vec4f,material:vec4f};
@group(2) @binding(0)var<uniform>c:Cloth;
fn fabric(v:V,p:vec2f,o:Output)->Output{if(c.state.w<.5||f.view.w<.5){return o;}var rect=c.cart;var bend=c.state.x;var peak=c.material.x;if(p.x>=c.sink.x&&p.x<=c.sink.z&&p.y>=c.sink.y&&p.y<=c.sink.w){rect=c.sink;bend=c.state.y;peak=c.material.y;}
 if(p.x<rect.x||p.x>rect.z||p.y<rect.y||p.y>rect.w){return o;}
 let uv=(p-rect.xy)/(rect.zw-rect.xy);let across=sin(3.141592654*uv.x);let supported=pow(sin(3.141592654*uv.y),2.);let mode=across*supported;
 // Fixed margins keep the original supported silhouette. Fold texture flexes inside that actual material.
 let delta=vec2f(.18*bend*sin(6.283185307*uv.y)*across,bend*mode);
 let sampleP=clamp(p-delta,rect.xy,rect.zw);var vv=v;vv.pixel=f.rect.xy+sampleP/f.image.xy*f.rect.zw;var r=lightingFragment(vv);
 let slopeX=bend*3.141592654*cos(3.141592654*uv.x)*supported/(rect.z-rect.x);let slopeY=bend*6.283185307*across*sin(6.283185307*uv.y)/(rect.w-rect.y);let normal=normalize(vec3f(-slopeX,-slopeY,1.));
 let light=normalize(vec3f(.84,-.20,.50));let response=max(dot(normal,light),0.)/.50;
 let materialMask=smoothstep(0.,.04,uv.x)*(1.-smoothstep(.96,1.,uv.x))*smoothstep(0.,.04,uv.y)*(1.-smoothstep(.96,1.,uv.y));
 // Relative Lambert response is a 2.5D cloth approximation; motion is also explicit source-UV transport.
 r.scene=vec4f(mix(o.scene.rgb,r.scene.rgb*mix(1.,response,c.material.z),materialMask),o.scene.a);
 r.sourceSignal=o.sourceSignal;return r;
}
