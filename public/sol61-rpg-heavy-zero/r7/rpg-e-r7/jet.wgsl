 // R7 separates leading pressure from rear vent without creating a second shot.
 let rear=kind==1u;let q=vec2f(select(p.x,-p.x,rear),p.y);let axis=q.x;
 let travel=smoothstep(0.0,select(65.0,35.0,rear),t);let extent=select(0.93,0.94,rear)*travel;
 let motion=1.0-reduced*0.70;
 let bend=select(sin(axis*9.0-t*0.024)*0.012*axis,sin(axis*6.0-t*0.011)*0.060*axis,rear)*motion;
 let leadingWidth=0.055+0.085*max(axis,0.0)+0.012*pow(sin(axis*14.0-t*0.034),2.0)*max(axis,0.0);
 let ventWidth=0.13+0.40*max(axis,0.0)*(0.80+0.20*smoothstep(25.0,125.0,t));
 let width=select(leadingWidth,ventWidth,rear);
 let root=smoothstep(-0.022,0.025,axis);let tip=1.0-smoothstep(extent-select(0.12,0.22,rear),extent,axis);
 let edge=1.0-smoothstep(0.72,0.98,abs(q.y));let inside=root*tip*edge;
 let envelope=smoothstep(0.0,12.0,t)*pow(max(0.0,1.0-t/launchEnd),0.65);let transverse=(q.y-bend)/max(width,0.02);
 let shell=exp(-transverse*transverse*1.3)*inside;
 let core=exp(-transverse*transverse*5.0)*inside*exp(-max(axis,0.0)*select(1.1,4.4,rear));
 let leadingCells=0.60+0.40*pow(0.5+0.5*cos(axis*18.0-t*0.038),2.0);
 let ventFold=0.70+0.30*pow(0.5+0.5*cos(axis*5.5-t*0.012),2.0);
 let cells=select(leadingCells,ventFold,rear);let rim=exp(-pow(abs(transverse)-0.83,2.0)*20.0)*inside;
 let flameLife=exp(-t/select(340.0,145.0,rear));
 var rgb=select(vec3f(2.5,0.25,0.02),vec3f(3.4,0.75,0.08),rear)*shell*envelope*flameLife;
 rgb+=select(vec3f(9.0,6.8,3.2),vec3f(6.8,3.2,0.45),rear)*core*cells*envelope*flameLife;
 rgb+=vec3f(1.4,0.40,0.07)*rim*envelope*flameLife*0.35;
 let optical=exp(-transverse*transverse*0.32)*inside*envelope*flameLife*0.055;rgb+=vec3f(2.0,0.65,0.13)*optical;
 let exhaust=smoothstep(select(85.0,50.0,rear),select(210.0,180.0,rear),t)*shell*envelope;
 let shade=clamp(0.45+transverse*0.20+sin(axis*select(8.0,5.5,rear)-t*select(0.007,0.011,rear))*0.15,0.0,1.0);
 let exhaustGain=select(0.38,0.55,rear);rgb+=mix(vec3f(0.035,0.046,0.061),vec3f(0.29,0.27,0.23),shade)*exhaust*exhaustGain;
 let alpha=clamp(shell*envelope*(flameLife+exhaust*exhaustGain)+optical,0.0,1.0);
 return vec4f(rgb,alpha); // same HDR/premultiplied source-over interface
