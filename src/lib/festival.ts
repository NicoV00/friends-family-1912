import { createWarpSurface, type RenderSurface } from './warp-canvas';
type MotionState = { paused: boolean; reduced: boolean; assembling: boolean; blinking: boolean };
const rgb = { grey: '#99a3aa', ink: '#393838', green: '#b8fb7c' };
const font = '"Fase Pressure"';
type Tile={x:number;y:number;size:number;born:number;vx:number;vy:number;angle:number;delay:number};

const assemblyAnimations=new Set<Animation>();

async function assemblePoster(state:MotionState){
  const poster=document.querySelector<HTMLElement>('#festival-poster');
  const oval=poster?.querySelector<SVGGElement>('.oval-lockup');
  document.documentElement.classList.remove('is-loading');
  if(!poster||!oval)return;
  state.assembling=true;
  if(!state.reduced){
    const animate=(element:Element|null,frames:Keyframe[],options:KeyframeAnimationOptions)=>{
      if(!element)return;
      const animation=element.animate(frames,{fill:'both',easing:'cubic-bezier(.22,1,.36,1)',...options});
      assemblyAnimations.add(animation);return animation;
    };
    animate(oval,[{transform:'scaleY(.035)'},{transform:'scaleY(1.025)',offset:.8},{transform:'scaleY(1)'}],{duration:920});
    animate(poster.querySelector('.concave-lockup'),[{opacity:0,transform:'translateY(40px) scaleY(.88)'},{opacity:1,transform:'translateY(0) scaleY(1)'}],{duration:760,delay:160});
    for(const [index,selector] of ['.poster-kicker','.poster-base'].entries()){
      animate(poster.querySelector(selector),[{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:480,delay:300+index*160});
    }
    await Promise.allSettled([...assemblyAnimations].map(animation=>animation.finished));
    assemblyAnimations.forEach(animation=>animation.cancel());assemblyAnimations.clear();
  }
  state.assembling=false;poster.dataset.assembled='true';
  let visible=true,cycle=0;
  const iris=poster.querySelector<SVGGElement>('.eye-iris');
  const word=poster.querySelector<SVGGElement>('.eye-word');
  poster.addEventListener('pointermove',event=>{
    if(!iris||state.reduced||state.paused||event.pointerType!=='mouse')return;
    const rect=oval.getBoundingClientRect();
    const x=Math.max(-1,Math.min(1,(event.clientX-(rect.left+rect.width/2))/(rect.width/2)));
    const y=Math.max(-1,Math.min(1,(event.clientY-(rect.top+rect.height/2))/(rect.height/2)));
    iris.style.transform=`translate(${x*215}px, ${y*20}px)`;
  },{passive:true});
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;},{threshold:.15});
  observer.observe(poster);
  const blink=()=>{
    if(!state.paused&&!state.reduced&&!document.hidden&&visible){
      state.blinking=true;
      const looking=cycle%2===0&&iris&&word;
      if(looking)iris.style.transform='translate(0px, 0px)';
      const animation=oval.animate(looking?[
        {transform:'scaleY(1)',offset:0}, {transform:'scaleY(.025)',offset:.08},
        {transform:'scaleY(1)',offset:.16}, {transform:'scaleY(1)',offset:.76},
        {transform:'scaleY(.025)',offset:.84}, {transform:'scaleY(1)',offset:.94},
      ]:[
        {transform:'scaleY(1)'},
        {transform:'scaleY(.025)',offset:.40},
        {transform:'scaleY(.025)',offset:.50},
        {transform:'scaleY(1)'},
      ],{duration:looking?5200:500,easing:looking?'linear':'cubic-bezier(.77,0,.175,1)'});
      assemblyAnimations.add(animation);
      if(looking){
        const frames=(show:boolean)=>[{opacity:show?0:1,offset:0},{opacity:show?0:1,offset:.08},{opacity:show?1:0,offset:.081},{opacity:show?1:0,offset:.84},{opacity:show?0:1,offset:.841},{opacity:show?0:1,offset:1}];
        for(const [element,show] of [[iris,true],[word,false]] as const){
          const layer=element.animate(frames(show),{duration:5200});assemblyAnimations.add(layer);
          layer.finished.finally(()=>assemblyAnimations.delete(layer));
        }
      }
      animation.finished.finally(()=>{state.blinking=false;assemblyAnimations.delete(animation);});
    }
    cycle++;setTimeout(blink,cycle%3===0?10500:7600);
  };
  setTimeout(blink,5000);
}

/** Cut tiles out of a real DOM snapshot, including lettering and metadata. */
async function initPixels(state:MotionState,poster:HTMLElement) {
  const canvas=document.createElement('canvas');
  canvas.className='pixel-overlay';canvas.setAttribute('aria-hidden','true');poster.append(canvas);
  const background=poster.querySelector<HTMLElement>('[data-background]')?.dataset.background||poster.dataset.background||getComputedStyle(poster).backgroundColor;
  const ctx=canvas.getContext('2d')!;
  const colorProbe=document.createElement('canvas').getContext('2d')!;colorProbe.fillStyle=background;colorProbe.fillRect(0,0,1,1);
  const baseColor=colorProbe.getImageData(0,0,1,1).data;
  let snapshot:HTMLCanvasElement|null=null;
  let tiles:Tile[]=[];let frame=0;let generation=0;let lastPointer={x:-1000,y:-1000};
  const capture=async()=>{
    const ticket=++generation;
    const {default:html2canvas}=await import('html2canvas');
    const result=await html2canvas(poster,{backgroundColor:background,scale:1,logging:false,useCORS:true,ignoreElements:node=>node.classList.contains('pixel-overlay')});
    if(ticket!==generation) return;
    snapshot=result;canvas.width=poster.clientWidth;canvas.height=poster.clientHeight;
    canvas.dataset.ready='true';
  };
  await capture();
  const paint=(now:number)=>{
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(state.paused||state.reduced||!snapshot){tiles=[];frame=0;return;}
    tiles=tiles.filter(tile=>now-tile.born<1820+tile.delay);
    // Clear every source hole first so one tile cannot erase its neighbour.
    for(const tile of tiles){
      ctx.fillStyle=background;ctx.fillRect(tile.x-.25,tile.y-.25,tile.size+.5,tile.size+.5);
    }
    for(const tile of tiles){
      const t=Math.max(0,(now-tile.born-tile.delay)/1820);
      const separation=t<.32?1-Math.pow(1-t/.32,3):Math.pow(1-(t-.32)/.68,3);
      const dx=tile.vx*separation,dy=(tile.vy+120*t)*separation;
      ctx.save();ctx.translate(tile.x+tile.size/2+dx,tile.y+tile.size/2+dy);
      ctx.rotate(tile.angle*separation);
      ctx.drawImage(snapshot,tile.x,tile.y,tile.size,tile.size,-tile.size/2,-tile.size/2,tile.size,tile.size);
      ctx.restore();
    }
    if(tiles.length)frame=requestAnimationFrame(paint);else frame=0;
  };
  const disturb=(event:PointerEvent)=>{
    if(!snapshot||state.paused||state.reduced||state.assembling||state.blinking)return;
    const rect=poster.getBoundingClientRect();const x=event.clientX-rect.left,y=event.clientY-rect.top;
    if(Math.hypot(x-lastPointer.x,y-lastPointer.y)<24)return;
    lastPointer={x,y};
    const mobile=innerWidth<800, size=mobile?26:48,reach=mobile?1:2;const now=performance.now();
    for(let iy=-reach;iy<=reach;iy++)for(let ix=-reach;ix<=reach;ix++){
      const distance=Math.hypot(ix,iy);if(distance>(mobile?1.5:2.5))continue;
      const sx=Math.floor(x/size)*size+ix*size,sy=Math.floor(y/size)*size+iy*size;
      if(sx<0||sy<0||sx+size>canvas.width||sy+size>canvas.height||tiles.some(t=>t.x===sx&&t.y===sy))continue;
      const sourceContext=snapshot.getContext('2d')!;
      const hasContent=[.2,.5,.8].some(f=>{const pixel=sourceContext.getImageData(Math.floor(sx+size*f),Math.floor(sy+size*.5),1,1).data;return Math.abs(pixel[0]-baseColor[0])+Math.abs(pixel[1]-baseColor[1])+Math.abs(pixel[2]-baseColor[2])>45;});
      if(!hasContent)continue;
      const seed=Math.sin(sx*12.98+sy*78.23);
      const falloff=1-distance/4.6,force=mobile?.42:.75;
      tiles.push({x:sx,y:sy,size,born:now,vx:(ix*26+seed*105)*falloff*force,vy:(35+iy*28+Math.abs(seed)*95)*falloff*force,angle:seed*.08,delay:distance*24});
    }
    tiles=tiles.slice(mobile?-18:-55);if(!frame)frame=requestAnimationFrame(paint);
  };
  poster.addEventListener('pointermove',event=>{if(event.pointerType==='mouse')disturb(event)},{passive:true});
  poster.addEventListener('pointerdown',disturb,{passive:true});
  let timer:ReturnType<typeof setTimeout>;
  const observer=new ResizeObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>{capture().catch(()=>{});},300)});
  observer.observe(poster);
  let lastCapture=performance.now();
  poster.addEventListener('pointerenter',()=>{
    if(!tiles.length&&performance.now()-lastCapture>1000&&!state.paused&&!state.reduced){lastCapture=performance.now();capture().catch(()=>{});}
  },{passive:true});
}

export async function initFestival(){
  await document.fonts.load(`180px ${font}`);
  await document.fonts.ready;
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  const state:MotionState={paused:false,reduced:preference.matches,assembling:false,blinking:false};
  const assembled=assemblePoster(state);
  const surfaces=new Map<HTMLElement,RenderSurface>();
  let animation=0, elapsed=0,previous=0;
  const render=(now:number)=>{
    animation=0;
    if(document.hidden||state.paused||state.reduced){previous=0;return;}
    if(previous)elapsed+=Math.min((now-previous)/1000,.05);
    previous=now;
    let any=false;
    surfaces.forEach(surface=>{if(surface.visible){surface.draw(elapsed);any=true;}});
    if(any)animation=requestAnimationFrame(render);else previous=0;
  };
  const resume=()=>{if(!animation&&!state.paused&&!state.reduced&&!document.hidden)animation=requestAnimationFrame(render);};
  const observer=new IntersectionObserver(entries=>{
    for(const entry of entries){const surface=surfaces.get(entry.target as HTMLElement);if(surface)surface.visible=entry.isIntersecting;}
    resume();
  },{rootMargin:'100px'});
  for(const element of document.querySelectorAll<HTMLElement>('[data-warp]')){
    const surface=createWarpSurface(element);
    surfaces.set(element,surface);surface.draw(0);observer.observe(element);
  }
  const toggle=document.querySelector<HTMLButtonElement>('.motion-toggle');
  const syncButton=()=>{
    if(!toggle)return;
    toggle.setAttribute('aria-pressed',String(state.paused));
    toggle.setAttribute('aria-label',state.paused?'Reanudar animaciones':'Pausar animaciones');
    toggle.innerHTML=`<span aria-hidden="true">${state.paused?'▷':'Ⅱ'}</span>`;
    toggle.hidden=state.reduced;
  };
  toggle?.addEventListener('click',()=>{
    state.paused=!state.paused;
    assemblyAnimations.forEach(animation=>state.paused?animation.pause():animation.play());
    syncButton();resume();
  });
  preference.addEventListener('change',()=>{
    state.reduced=preference.matches;
    if(state.reduced)assemblyAnimations.forEach(animation=>animation.finish());
    syncButton();resume();
  });
  document.addEventListener('visibilitychange',resume);syncButton();resume();
  const signal=document.querySelector<HTMLElement>('.corner-signal');
  const pupil=signal?.querySelector<SVGCircleElement>('.signal-pupil');
  if(signal&&pupil){
    document.addEventListener('pointermove',event=>{
      if(state.paused||state.reduced||event.pointerType!=='mouse')return;
      const rect=signal.getBoundingClientRect();
      const dx=event.clientX-rect.left-rect.width/2,dy=event.clientY-rect.top-rect.height/2;
      const distance=Math.max(180,Math.hypot(dx,dy));
      pupil.style.transform=`translate(${dx/distance*27}px,${dy/distance*10}px)`;
    },{passive:true});
    document.addEventListener('pointerleave',()=>{pupil.style.transform='translate(0,0)';});
  }
  if(!state.reduced)assembled.then(()=>{
    const pixelsObserver=new IntersectionObserver(entries=>{
      for(const entry of entries)if(entry.isIntersecting){pixelsObserver.unobserve(entry.target);initPixels(state,entry.target as HTMLElement).catch(()=>{});}
    },{rootMargin:'120px'});
    document.querySelectorAll<HTMLElement>('main > section:not(.orbit-section)').forEach(section=>pixelsObserver.observe(section));
  });
}
