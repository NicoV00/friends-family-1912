export type RenderSurface = { draw: (seconds: number) => void; visible: boolean };

const vertex = `attribute vec2 aPosition;
varying vec2 vUv;
void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}`;

const fragment = `precision highp float;
varying vec2 vUv;
uniform sampler2D uType;
uniform vec2 uSize,uTexture;
uniform vec3 uForeground,uBackground,uAccent,uLensForeground;
uniform float uTime,uMode,uOffset,uWordScale,uTravel;
uniform vec2 uBallCenter,uBallScale;
uniform vec2 uPointer;
uniform float uPointerActive;
void main(){
  vec2 pixel=vec2(vUv.x,1.-vUv.y)*uSize;
  float mask=0.;
  vec3 background=uBackground;
  vec3 foreground=uForeground;
  if(uMode<.5){
    vec2 delta=pixel-uPointer;
    float influence=exp(-dot(delta,delta)/38000.)*uPointerActive;
    pixel+=vec2(sin(delta.y*.025+uTime*2.),cos(delta.x*.02-uTime*1.6))*12.*influence;
    background+=vec3(.025,-.008,-.005)*sin(length(delta)*.035-uTime*3.)*influence;
    float scale=min(uSize.y*.34,116.)/uTexture.y;
    float center=uSize.x*.5;
    float mobile=1.-smoothstep(600.,900.,uSize.x);
    float rx=min(245.,uSize.x*mix(.30,.41,mobile));
    // A brief blink closes the entire lens and its lettering around the centre line.
    float blinkPhase=mod(uTime,8.4);
    float blink=smoothstep(5.0,5.14,blinkPhase)*(1.-smoothstep(5.19,5.43,blinkPhase));
    float openness=mix(1.,.035,blink);
    float ry=rx*.43*openness;
    vec2 oval=vec2((pixel.x-center)/rx,(pixel.y-uSize.y*.5)/ry);
    float lens=1.-smoothstep(.992,1.008,dot(oval,oval));
    float nx=clamp(oval.x,-1.,1.);
    float envelope=sqrt(max(0.,1.-nx*nx));
    float density=pow(abs(nx),3.);
    float refraction=1.+.08*(1.-nx*nx)+.15*density;
    float sourceX=mix(pixel.x,center+(pixel.x-center)*refraction,lens);
    // Fit the glyphs to the ellipse: taller at the axis, tapered at both ends.
    float bulge=mix(1.,(.20+2.15*pow(envelope,1.0))*openness,lens);
    // Concave horizontal carousel: both ends approach the viewer.
    float screenX=(pixel.x-center)/(uSize.x*.5);
    // A rounded bowl with a horizontal tangent at the centre, not a V-shaped pinch.
    float sideDepth=1.+mix(4.8,2.15,mobile)*screenX*screenX;
    float tapeDepth=sideDepth;
    float sourceY=.48+(pixel.y-uSize.y*.5)/(uTexture.y*scale*bulge*tapeDepth);
    float curveStrength=mix(1.65,.65,mobile);
    float curvedX=center+uSize.x*.5*atan(screenX*curveStrength)/atan(curveStrength);
    sourceX=mix(curvedX,sourceX,lens);
    // Keep the tape type at a constant width; fit only the text inside the lens.
    sourceX=center+(sourceX-center)/mix(1.,uWordScale,lens);
    vec2 sampleUV=vec2(fract((sourceX/scale+uOffset)/uTexture.x),1.-sourceY);
    mask=texture2D(uType,sampleUV).a;
    mask*=step(0.,sourceY)*step(sourceY,1.);
    float inner=1.-smoothstep(.90,.93,dot(oval,oval));
    background=mix(background,uAccent,lens);
    foreground=mix(uForeground,mix(uAccent,uLensForeground,inner),lens);
    float rim=(1.-smoothstep(.91,.99,dot(oval,oval)))*smoothstep(.80,.92,dot(oval,oval));
    foreground+=vec3(.035)*rim;
  }else if(uMode<1.5){
    float scale=uSize.x/uTexture.x;
    float ny=abs((pixel.y-uSize.y*.49)/(uSize.y*.51));
    float squeeze=.38+1.02*pow(min(1.,ny),1.65);
    float sourceX=.5+(vUv.x-.5)/squeeze;
    float sourceY=fract((pixel.y/scale+uTime*78.)/uTexture.y);
    vec4 typePixel=texture2D(uType,vec2(sourceX,1.-sourceY));
    mask=typePixel.a;
    foreground=mix(vec3(.843,.945,.247),uForeground,typePixel.g);
    mask*=step(0.,sourceX)*step(sourceX,1.);
  }else{
    float radius=min(250.,min(uSize.x*.30,uSize.y*.32));
    vec2 q=(pixel-uBallCenter)/(radius*uBallScale);
    float angle=sin(uTime*.12)*.16;
    q=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*q;
    float radius2=dot(q,q);
    float inside=1.-smoothstep(.995,1.005,radius2);
    float z=sqrt(max(.0001,1.-radius2));
    float longitude=atan(q.x,z);
    float latitude=asin(clamp(q.y,-1.,1.));
    float sourceX=fract(.5+longitude/3.14159265+uTime*.045);
    float sourceY=fract(.5+latitude/3.14159265+sin(uTime*.1)*.08);
    mask=texture2D(uType,vec2(sourceX,1.-sourceY)).a*inside;
    background=mix(uBackground,uAccent,inside);
  }
  gl_FragColor=vec4(mix(background,foreground,mask),1.);
}`;

const color = (value: string) => [1,3,5].map(index=>parseInt(value.slice(index,index+2),16)/255);

function typeTexture(mode: string, message: string, maxTextureSize:number) {
  const canvas=document.createElement('canvas');
  const ctx=canvas.getContext('2d')!;
  ctx.font='900 180px "Fase Pressure"';
  ctx.letterSpacing='-2px';
  if(mode==='ribbon'){
    const ratio=Math.min(1,(maxTextureSize-4)/ctx.measureText(message).width);
    const typeSize=180*ratio;
    ctx.font=`900 ${typeSize}px "Fase Pressure"`;ctx.letterSpacing=`${-2*ratio}px`;
    const textWidth=ctx.measureText(message).width;
    canvas.width=Math.ceil(textWidth);canvas.height=Math.ceil(220*ratio);
    canvas.dataset.typeSize=String(typeSize);
    ctx.font=`900 ${typeSize}px "Fase Pressure"`;ctx.letterSpacing=`${-2*ratio}px`;ctx.textBaseline='middle';ctx.fillStyle='#fff';
    ctx.strokeStyle='#fff';ctx.lineWidth=5*ratio;ctx.lineJoin='round';ctx.strokeText(message,0,canvas.height*.523);
    ctx.fillText(message,0,canvas.height*.523);
  }else{
    const lines=message.includes('|')?message.split('|'):['VINCENZO','FASE','MONTEVIDEO','EMILE','19.12.26','FASE','MONTEVIDEO','EMILE'];
    const lineHeight=192;
    canvas.width=1000;canvas.height=lineHeight*lines.length;
    ctx.font='900 200px "Fase Pressure"';ctx.letterSpacing='-4px';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';
    ctx.strokeStyle='#fff';ctx.lineWidth=6;ctx.lineJoin='round';
    for(let i=0;i<lines.length;i++){
      if(mode==='vertical'&&lines[i]==='19.12'){
        ctx.save();ctx.translate(500,(i+.5)*lineHeight);ctx.fillStyle='#ff0000';ctx.beginPath();ctx.ellipse(0,0,410,82,0,0,Math.PI*2);ctx.fill();
        ctx.globalCompositeOperation='destination-out';ctx.font='900 168px "Fase Pressure"';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('19.12',0,6,720);ctx.restore();
        continue;
      }
      const natural=ctx.measureText(lines[i]).width;
      ctx.save();ctx.translate(500,(i+.5)*lineHeight);ctx.scale(940/natural,1);
      ctx.strokeText(lines[i],0,8);ctx.fillText(lines[i],0,8);ctx.restore();
    }
  }
  return canvas;
}

/** Studio ease-out (.22,1,.36,1), evaluated once per frame without layout. */
function snapEase(progress:number){
  let low=0,high=1,t=progress;
  for(let i=0;i<10;i++){
    const x=3*(1-t)*(1-t)*t*.22+3*(1-t)*t*t*.36+t*t*t;
    if(x<progress)low=t;else high=t;t=(low+high)*.5;
  }
  return 1-Math.pow(1-t,3);
}

function ribbonStops(message:string,typeSize:number){
  const context=document.createElement('canvas').getContext('2d')!;
  context.font=`900 ${typeSize}px "Fase Pressure"`;
  context.letterSpacing=`${-2*typeSize/180}px`;
  return [...message.matchAll(/\S(?:.*?\S)?(?= {2,}|$)/g)].map(match=>({
    word:match[0],
    width:context.measureText(match[0]).width,
    center:context.measureText(message.slice(0,match.index)).width+context.measureText(match[0]).width*.5,
  }));
}

/** Two inverse maps, shared type, one GPU draw per visible surface per frame. */
export function createWarpSurface(element: HTMLElement): RenderSurface {
  const canvas=element.querySelector<HTMLCanvasElement>('canvas')!;
  const gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'low-power',preserveDrawingBuffer:true});
  if(!gl)return {draw:()=>{},visible:false};
  const compile=(type:number,source:string)=>{
    const shader=gl.createShader(type)!;gl.shaderSource(shader,source);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader)||'Shader compilation failed');
    return shader;
  };
  const program=gl.createProgram()!;
  gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))return {draw:()=>{},visible:false};
  gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const position=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  const mode=element.dataset.warp||'ribbon';
  const message=element.dataset.message||'FASE  VINCENZO  EMILE  19.12  MONTEVIDEO  ';
  const source=typeTexture(mode,message,Math.min(8192,gl.getParameter(gl.MAX_TEXTURE_SIZE)));
  const stops=mode==='ribbon'?ribbonStops(message,Number(source.dataset.typeSize)):[];
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
  gl.uniform1i(gl.getUniformLocation(program,'uType'),0);
  gl.uniform2f(gl.getUniformLocation(program,'uTexture'),source.width,source.height);
  gl.uniform1f(gl.getUniformLocation(program,'uMode'),mode==='ribbon'?0:mode==='vertical'?1:2);
  gl.uniform3fv(gl.getUniformLocation(program,'uForeground'),color(element.dataset.foreground||'#b8fb7c'));
  gl.uniform3fv(gl.getUniformLocation(program,'uBackground'),color(element.dataset.background||'#393838'));
  gl.uniform3fv(gl.getUniformLocation(program,'uAccent'),color(element.dataset.accent||'#b8fb7c'));
  gl.uniform3fv(gl.getUniformLocation(program,'uLensForeground'),color(element.dataset.lensForeground||element.dataset.background||'#393838'));
  const size=gl.getUniformLocation(program,'uSize'), time=gl.getUniformLocation(program,'uTime'), offset=gl.getUniformLocation(program,'uOffset'), wordScale=gl.getUniformLocation(program,'uWordScale');
  const travel=gl.getUniformLocation(program,'uTravel');
  const ballCenter=gl.getUniformLocation(program,'uBallCenter'),ballScale=gl.getUniformLocation(program,'uBallScale');
  const pointerLocation=gl.getUniformLocation(program,'uPointer'),pointerActive=gl.getUniformLocation(program,'uPointerActive');
  let liquidX=-1000,liquidY=-1000,liquidActive=0;
  element.addEventListener('pointermove',event=>{const rect=element.getBoundingClientRect();liquidX=event.clientX-rect.left;liquidY=event.clientY-rect.top;liquidActive=1;},{passive:true});
  element.addEventListener('pointerleave',()=>{liquidActive=0;});
  let lastTime=0,width=1,height=1;
  let x=.5,y=.5,vx=0,vy=0,squash=0,squashVelocity=0,axis=0,dragging=false,pointer=-1,grabX=0,grabY=0,lastX=0,lastY=0,lastPointerTime=0;
  const motionAllowed=()=>!matchMedia('(prefers-reduced-motion: reduce)').matches&&document.querySelector('.motion-toggle')?.getAttribute('aria-pressed')!=='true';
  if(mode==='orbit'){
    element.addEventListener('pointerdown',event=>{
      if(!motionAllowed())return;
      const rect=element.getBoundingClientRect(),px=event.clientX-rect.left,py=event.clientY-rect.top;
      if(Math.hypot(px-x*width,py-y*height)>Math.min(250,width*.30,height*.32))return;
      dragging=true;pointer=event.pointerId;grabX=px-x*width;grabY=py-y*height;lastX=px;lastY=py;lastPointerTime=performance.now();vx=vy=0;
      element.setPointerCapture(pointer);element.classList.add('is-dragging');event.preventDefault();
    });
    element.addEventListener('pointermove',event=>{
      if(!dragging||event.pointerId!==pointer)return;
      const rect=element.getBoundingClientRect(),px=event.clientX-rect.left,py=event.clientY-rect.top,now=performance.now(),dt=Math.max(.008,(now-lastPointerTime)/1000);
      vx=vx*.25+Math.max(-3000,Math.min(3000,(px-lastX)/dt))*.75;vy=vy*.25+Math.max(-3000,Math.min(3000,(py-lastY)/dt))*.75;
      x=(px-grabX)/width;y=(py-grabY)/height;lastX=px;lastY=py;lastPointerTime=now;
    });
    const release=(event:PointerEvent)=>{if(event.pointerId!==pointer)return;dragging=false;pointer=-1;element.classList.remove('is-dragging');if(event.type==='pointercancel'||performance.now()-lastPointerTime>140)vx=vy=0;else{vx*=1.45;vy*=1.45;}};
    element.addEventListener('pointerup',release);element.addEventListener('pointercancel',release);element.addEventListener('lostpointercapture',release);
  }
  const draw=(seconds:number)=>{
    const dt=Math.min(.04,Math.max(0,seconds-lastTime));
    lastTime=seconds;
    if(mode==='orbit'){
      const radius=Math.min(250,width*.30,height*.32),rx=radius/width,ry=radius/height;
      if(!dragging){x+=vx*dt/width;y+=vy*dt/height;vx*=Math.exp(-.24*dt);vy*=Math.exp(-.24*dt);}
      if(x<rx||x>1-rx){const wall=x<rx?rx:1-rx;x=dragging?wall:wall-(x-wall);if(!dragging&&Math.abs(vx)>10){squashVelocity+=Math.min(3.5,Math.abs(vx)/450);axis=0;vx*=-.94;}}
      if(y<ry||y>1-ry){const wall=y<ry?ry:1-ry;y=dragging?wall:wall-(y-wall);if(!dragging&&Math.abs(vy)>10){squashVelocity+=Math.min(3.5,Math.abs(vy)/450);axis=1;vy*=-.94;}}
      element.dataset.ballPosition=`${x.toFixed(3)},${y.toFixed(3)}`;
      element.dataset.ballSpeed=String(Math.round(Math.hypot(vx,vy)));
      squashVelocity+=(-70*squash-13*squashVelocity)*dt;squash+=squashVelocity*dt;
      const deform=Math.max(-.12,Math.min(.22,squash));
      gl.uniform2f(ballCenter,x*width,y*height);gl.uniform2f(ballScale,axis===0?1-deform:1+deform*.55,axis===0?1+deform*.55:1-deform);
    }
    if(stops.length){
      const cycle=3.6,hold=2.55;
      const index=Math.floor(seconds/cycle);
      const current=stops[index%stops.length];
      const next=stops[(index+1)%stops.length];
      const start=current.center+Math.floor(index/stops.length)*source.width;
      const finish=next.center+Math.floor((index+1)/stops.length)*source.width;
      const progress=Math.max(0,Math.min(1,(seconds%cycle-hold)/(cycle-hold)));
      gl.uniform1f(travel,progress);
      const scale=Math.min(height*.34,116)/source.height;
      const mobile=Math.max(0,Math.min(1,(900-width)/300));
      const rx=Math.min(245,width*(.30+.11*mobile));
      // Leave room at the oval's tapered tips, even for the longest name.
      const fit=(textWidth:number)=>Math.min(1.08,rx*1.48/(textWidth*scale));
      gl.uniform1f(wordScale,fit(current.width)+(fit(next.width)-fit(current.width))*snapEase(progress));
      gl.uniform1f(offset,start+(finish-start)*snapEase(progress)-width*.5/scale);
      element.dataset.phase=progress===0?'hold':'travel';
      element.dataset.centeredWord=current.word;
    }
    gl.uniform2f(pointerLocation,liquidX,liquidY);gl.uniform1f(pointerActive,liquidActive);
    gl.uniform1f(time,seconds);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    element.classList.add('is-rendered');canvas.dataset.ready='true';
  };
  const resize=new ResizeObserver(()=>{
    width=element.clientWidth;height=element.clientHeight;
    const dpr=Math.min(devicePixelRatio||1,1.5);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    gl.viewport(0,0,canvas.width,canvas.height);gl.uniform2f(size,width,height);draw(lastTime);
  });
  resize.observe(element);
  canvas.addEventListener('webglcontextlost',()=>{element.classList.remove('is-rendered');});
  return {draw,visible:false};
}
