// Valoria — liquid chrome hero (WebGL, no dependencies).
// Renders two interlocking chrome rings and an orbiting drop that melt into each other
// when the pointer comes close. Falls back silently to the SVG sculpture when WebGL is
// unavailable, and renders a single still frame when motion is reduced.
(() => {
  'use strict';
  const art = document.querySelector('.hero-art');
  const canvas = art && art.querySelector('.chrome-canvas');
  if (!canvas) return;
  const root = document.documentElement;
  const motionReduced = () => root.classList.contains('reduce-motion');

  let gl = null;
  try {
    gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' });
  } catch { gl = null; }
  if (!gl) return;

  const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uTime;
uniform float uScale;
uniform mat3 uScene;
uniform mat3 uRotA;
uniform mat3 uRotB;
uniform vec3 uOrb;
uniform float uMelt;
uniform float uWobble;

float sdTorus(vec3 p, vec2 t){ vec2 q = vec2(length(p.xz) - t.x, p.y); return length(q) - t.y; }
// 1 inside 'inner', fading to 0 at 'outer' (smoothstep itself needs ascending edges).
float band(float x, float inner, float outer){ return 1.0 - smoothstep(inner, outer, x); }
float smin(float a, float b, float k){ float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }

float map(vec3 p){
  p = uScene * p;
  float a = sdTorus(uRotA * p, vec2(1.0, 0.205));
  float b = sdTorus(uRotB * p, vec2(1.17, 0.118));
  float o = length(p - uOrb) - 0.135;
  float d = smin(a, b, uMelt);
  d = smin(d, o, uMelt * 1.6 + 0.015);
  d += uWobble * sin(p.x * 6.0 + uTime * 1.7) * sin(p.y * 5.0 - uTime * 1.3) * sin(p.z * 6.0 + uTime * 1.1);
  return d;
}

vec3 calcNormal(vec3 p){
  const vec2 e = vec2(0.0007, -0.0007);
  return normalize(e.xyy * map(p + e.xyy) + e.yyx * map(p + e.yyx) + e.yxy * map(p + e.yxy) + e.xxx * map(p + e.xxx));
}

float calcAO(vec3 p, vec3 n){
  float occ = 0.0; float sca = 1.0;
  for (int i = 0; i < 5; i++) {
    float h = 0.015 + 0.08 * float(i);
    occ += (h - map(p + h * n)) * sca;
    sca *= 0.8;
  }
  return clamp(1.0 - 2.4 * occ, 0.0, 1.0);
}

// Procedural photo-studio environment: black room, soft boxes and strip lights.
vec3 env(vec3 d){
  float y = d.y;
  float az = atan(d.x, d.z);
  float sky = smoothstep(-0.02, 0.55, y);
  vec3 c = mix(vec3(0.06), vec3(0.58), sky);
  c += vec3(0.4) * smoothstep(0.55, 0.95, y);
  // black flags break the sky into crisp chrome bands
  float up = smoothstep(-0.02, 0.04, y);
  c *= 1.0 - 0.88 * band(abs(az - 0.85), 0.09, 0.17) * up;
  c *= 1.0 - 0.82 * band(abs(az + 1.35), 0.13, 0.24) * up;
  c *= 1.0 - 0.7 * band(abs(az - 2.7), 0.05, 0.1) * up;
  // soft box behind the camera and two strip lights
  c += vec3(1.5) * band(abs(az + 0.15), 0.3, 0.5) * smoothstep(0.12, 0.26, y) * band(y, 0.62, 0.8);
  c += vec3(1.9) * band(abs(az - 1.95), 0.02, 0.07) * smoothstep(-0.4, 0.0, y);
  c += vec3(1.1) * band(abs(az + 2.35), 0.015, 0.05) * smoothstep(-0.25, 0.05, y);
  // fine detail: thin ceiling lines and a second soft box
  c += vec3(0.55) * band(abs(fract(y * 7.0 + 0.5) - 0.5), 0.012, 0.03) * smoothstep(0.3, 0.6, y) * band(abs(az - 0.4), 0.6, 1.0);
  c += vec3(0.9) * band(abs(az - 2.9), 0.18, 0.3) * smoothstep(0.05, 0.2, y) * band(y, 0.45, 0.6);
  c += vec3(3.0) * pow(max(dot(d, normalize(vec3(-0.45, 0.55, 0.7))), 0.0), 220.0);
  c += vec3(1.6) * pow(max(dot(d, normalize(vec3(0.7, 0.3, 0.6))), 0.0), 400.0);
  // razor horizon line, then a dark studio floor
  c += vec3(1.0) * exp(-pow(y * 24.0, 2.0));
  vec3 ground = vec3(0.03) + vec3(0.07) * smoothstep(-0.7, -0.04, y);
  return mix(ground, c, smoothstep(-0.035, 0.008, y));
}

float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main(){
  float m = min(uRes.x, uRes.y);
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / m * uScale;
  vec3 ro = vec3(0.0, 0.0, 4.0);
  vec3 rd = normalize(vec3(uv, -1.9));
  const float R = 1.6;
  float b = dot(ro, rd);
  float c = dot(ro, ro) - R * R;
  float h = b * b - c;
  if (h < 0.0) { gl_FragColor = vec4(0.0); return; }
  h = sqrt(h);
  float t = max(-b - h, 0.0);
  float tmax = -b + h;
  float minD = 1e9; float tMin = t; bool hit = false;
  for (int i = 0; i < 128; i++) {
    float d = map(ro + rd * t);
    if (d < minD) { minD = d; tMin = t; }
    if (d < 0.0005) { hit = true; break; }
    t += d * 0.82;
    if (t > tmax) break;
  }
  float px = tMin * uScale / (m * 1.9);
  float alpha = hit ? 1.0 : 1.0 - smoothstep(0.0, px * 1.6, minD);
  if (alpha <= 0.001) { gl_FragColor = vec4(0.0); return; }
  vec3 p = ro + rd * (hit ? t : tMin);
  vec3 n = calcNormal(p);
  vec3 r = reflect(rd, n);
  float fres = pow(clamp(1.0 + dot(rd, n), 0.0, 1.0), 4.0);
  vec3 col = env(r);
  col = mix(col * 0.86, col + 0.08, fres);
  col *= mix(0.45, 1.0, calcAO(p, n));
  // Gold metal: reflections are tinted warm (deeper in the shadows, paler near the sky lights)
  col *= mix(vec3(1.0, 0.7, 0.26), vec3(1.0, 0.84, 0.5), smoothstep(-0.4, 0.6, r.y)) * 1.22;
  col = 1.0 - exp(-col * 1.6);
  col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = vec4(col * alpha, alpha);
}`;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { console.warn('Valoria chrome shader:', gl.getShaderInfoLog(shader)); return null; }
    return shader;
  }
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  ['uRes', 'uTime', 'uScale', 'uScene', 'uRotA', 'uRotB', 'uOrb', 'uMelt', 'uWobble'].forEach(name => { U[name] = gl.getUniformLocation(program, name); });

  // 3x3 rotation helpers (column-major, as WebGL expects).
  const rx = a => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, s, 0, -s, c]; };
  const ry = a => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 1, 0, s, 0, c]; };
  const rz = a => { const c = Math.cos(a), s = Math.sin(a); return [c, s, 0, -s, c, 0, 0, 0, 1]; };
  const mul = (A, B) => {
    const o = new Array(9);
    for (let col = 0; col < 3; col++) for (let row = 0; row < 3; row++) {
      o[col * 3 + row] = A[row] * B[col * 3] + A[3 + row] * B[col * 3 + 1] + A[6 + row] * B[col * 3 + 2];
    }
    return o;
  };

  const pointer = { x: 0, y: 0, tx: 0, ty: 0, near: 0, nearTarget: 0, pulse: 0 };
  const coarse = matchMedia('(pointer: coarse)').matches;
  let quality = coarse ? 0.8 : 1;
  const maxDpr = coarse ? 1.75 : 2;
  let width = 0, height = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr) * quality;
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (w !== width || h !== height) {
      width = canvas.width = w;
      height = canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    return true;
  }

  function draw(time) {
    if (!resize()) return;
    const t = time;
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;
    pointer.near += (pointer.nearTarget - pointer.near) * 0.04;
    pointer.pulse *= 0.955;
    const scene = mul(ry(pointer.x * 0.55), rx(pointer.y * 0.4));
    const rotA = mul(mul(rz(0.52), rx(-1.2 + 0.12 * Math.sin(t * 0.37))), ry(t * 0.32));
    const rotB = mul(mul(rz(-0.8), rx(1.02 + 0.1 * Math.cos(t * 0.29))), ry(-t * 0.26));
    gl.uniform2f(U.uRes, width, height);
    gl.uniform1f(U.uTime, t);
    gl.uniform1f(U.uScale, width / height > 1.15 ? 1.53 : 1.61);
    gl.uniformMatrix3fv(U.uScene, false, scene);
    gl.uniformMatrix3fv(U.uRotA, false, rotA);
    gl.uniformMatrix3fv(U.uRotB, false, rotB);
    gl.uniform3f(U.uOrb, Math.cos(t * 0.55) * 1.18, 0.78 + 0.16 * Math.sin(t * 0.8), Math.sin(t * 0.55) * 0.62);
    gl.uniform1f(U.uMelt, 0.05 + 0.2 * pointer.near + 0.12 * pointer.pulse);
    gl.uniform1f(U.uWobble, 0.006 * pointer.near + 0.03 * pointer.pulse);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  let raf = 0, running = false, visible = true, lost = false, start = performance.now(), frames = 0, slowFrames = 0, last = 0, ready = false;
  function markReady() {
    if (ready) return;
    ready = true;
    art.classList.add('has-webgl');
  }
  function loop(now) {
    if (!running) return;
    const dt = last ? now - last : 16;
    last = now;
    draw((now - start) / 1000);
    markReady();
    // Adaptive resolution: step quality down on slow devices.
    frames++;
    if (dt > 28) slowFrames++;
    if (frames === 45) {
      if (slowFrames > 18 && quality > 0.5) quality = Math.max(0.5, quality * 0.8);
      frames = 0; slowFrames = 0;
    }
    raf = requestAnimationFrame(loop);
  }
  function update() {
    if (lost) return;
    const should = visible && !document.hidden && !motionReduced();
    if (should && !running) { running = true; last = 0; raf = requestAnimationFrame(loop); }
    else if (!should && running) { running = false; cancelAnimationFrame(raf); }
    if (!should && visible && motionReduced()) { draw(2.4); markReady(); }
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; update(); }).observe(art);
  }
  document.addEventListener('visibilitychange', update);
  new MutationObserver(update).observe(root, { attributes: true, attributeFilter: ['class'] });
  if ('ResizeObserver' in window) new ResizeObserver(() => { if (!running && visible && !lost) { draw(2.4); } }).observe(canvas);

  addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    const rect = art.getBoundingClientRect();
    if (!rect.width) return;
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    pointer.tx = Math.max(-1, Math.min(1, (event.clientX - cx) / (rect.width / 2)));
    pointer.ty = Math.max(-1, Math.min(1, (event.clientY - cy) / (rect.height / 2)));
    const dist = Math.hypot((event.clientX - cx) / rect.width, (event.clientY - cy) / rect.height);
    pointer.nearTarget = Math.max(0, Math.min(1, 1.25 - dist * 2.2));
  }, { passive: true });
  art.addEventListener('pointerdown', () => { pointer.pulse = 1; });

  // If the GPU drops the context, quietly hand the stage back to the SVG sculpture.
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); lost = true; running = false; cancelAnimationFrame(raf); art.classList.remove('has-webgl'); });

  update();
})();
