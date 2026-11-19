const vertex = `attribute vec2 aPosition;
varying vec2 vUv;
void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}`;

// Broad, posterised fields of ink rather than a soft gradient.
const fragment = `precision mediump float;
varying vec2 vUv;
uniform vec2 uResolution, uPointer;
uniform float uTime, uEnergy;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p), f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){float v=0.;v+=.5*noise(p);p=p*2.03+13.;v+=.25*noise(p);p=p*2.02+7.;v+=.125*noise(p);return v/.875;}
void main(){
 vec2 uv=vUv; vec2 aspect=vec2(uResolution.x/uResolution.y,1.);
 float nearPointer=exp(-length((uv-uPointer)*aspect)*7.)*uEnergy;
 float block=nearPointer>.66?16.:nearPointer>.33?48.:nearPointer>.05?128.:1.;
 vec2 cell=floor(uv*uResolution/block); vec2 snapped=(cell+.5)*block/uResolution;
 uv=mix(uv,snapped,step(1.5,block));
 uv+=(vec2(hash(cell+1.),hash(cell+2.))-.5)*nearPointer*.035;
 vec2 p=uv*aspect*3.; p+=(uv-uPointer)*nearPointer*.4;
 float t=uTime*.035;
 vec2 q=vec2(fbm(p+vec2(0.,t)),fbm(p+vec2(5.2,1.3)-t));
 vec2 r=vec2(fbm(p+3.6*q+vec2(1.7,9.2)+t),fbm(p+3.6*q+vec2(8.3,2.8)-t));
 float v=fbm(p+3.4*r);
 vec3 yellow=vec3(.969,.902,0.); vec3 teal=vec3(.247,.722,.686); vec3 acid=vec3(.831,.941,.235);
 vec3 color=mix(teal,acid,smoothstep(.40,.415,v)); color=mix(color,yellow,smoothstep(.56,.575,v));
 float flash=step(.65,nearPointer)*step(.91,hash(cell+floor(uTime*10.)));
 color=mix(color,vec3(1.,.239,.122),flash);
 gl_FragColor=vec4(color,1.);
}`;

export function createMelt(canvas: HTMLCanvasElement): () => void {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
  if (!gl) return () => {}; // The parent has a solid-color fallback.
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { gl.deleteShader(shader); return null; }
    return shader;
  };
  const vs = compile(gl.VERTEX_SHADER, vertex), fs = compile(gl.FRAGMENT_SHADER, fragment);
  if (!vs || !fs) return () => {};
  const program = gl.createProgram();
  if (!program) return () => {};
  gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return () => {};
  gl.useProgram(program);
  const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'aPosition'); gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const resolution = gl.getUniformLocation(program, 'uResolution');
  const pointer = gl.getUniformLocation(program, 'uPointer');
  const time = gl.getUniformLocation(program, 'uTime');
  const energy = gl.getUniformLocation(program, 'uEnergy');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible = true, frame = 0, start = performance.now(), strength = 0;
  let x = .5, y = .5, lastX = .5, lastY = .5;
  const resize = () => {
    const bounds = canvas.getBoundingClientRect(); const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.max(1, Math.round(bounds.width * dpr)); canvas.height = Math.max(1, Math.round(bounds.height * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  const draw = (now: number) => {
    if (!visible) return;
    gl.uniform2f(resolution, canvas.width, canvas.height); gl.uniform2f(pointer, x, y);
    gl.uniform1f(time, reduced.matches ? 0 : (now - start) / 1000); gl.uniform1f(energy, strength);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); strength *= .93;
    if (!reduced.matches) frame = requestAnimationFrame(draw);
  };
  const move = (event: PointerEvent) => {
    if (reduced.matches) return;
    const rect = canvas.getBoundingClientRect();
    x = (event.clientX - rect.left) / rect.width; y = 1 - (event.clientY - rect.top) / rect.height;
    strength = Math.min(1, strength + Math.hypot(x - lastX, y - lastY) * 9); lastX = x; lastY = y;
  };
  const restart = () => { cancelAnimationFrame(frame); if (visible) draw(performance.now()); };
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; restart(); });
  observer.observe(canvas); window.addEventListener('resize', resize); window.addEventListener('pointermove', move, { passive: true });
  reduced.addEventListener('change', restart); resize(); draw(performance.now());
  return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('resize', resize); window.removeEventListener('pointermove', move); reduced.removeEventListener('change', restart); gl.deleteBuffer(buffer); gl.deleteProgram(program); gl.deleteShader(vs); gl.deleteShader(fs); };
}
