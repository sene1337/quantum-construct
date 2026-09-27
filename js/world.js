// The look of the construct, after the Sovereignty simulator's scene (js/scene.js there): cast gold metal on a
// dark wet mirror at dawn, ACES tone mapping, soft bloom, embers of light. Text lives on its own layer and is
// drawn after the tone mapping, so the palette's colours stay exact and text never blooms.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const LABELS = 1;
export const HEX = { bg: '#060504', panel: '#100d0a', ink: '#efe8dc', muted: '#a79e90', line: '#2b241d', gold: '#e3b45c', orange: '#f7931a', bad: '#ff8a7a', track: '#3a3129' };

// Sky palettes from the Sovereignty simulator: night, and dawn with the sun on the horizon.
const NIGHT = { Z: [0.001, 0.002, 0.008], M: [0.006, 0.01, 0.03], Hs: [0.06, 0.08, 0.14], Ha: [0.02, 0.025, 0.05], sun: [0.7, 0.78, 1.0] };
const DAWN = { Z: [0.004, 0.009, 0.035], M: [0.09, 0.05, 0.11], Hs: [0.75, 0.27, 0.07], Ha: [0.12, 0.06, 0.08], sun: [1.0, 0.62, 0.3] };
export const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

const SKY_VERT = `varying vec3 vDir;
  void main() { vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`;
const SKY_FRAG = `uniform vec3 uSun, uZ, uM, uHs, uHa, uSunCol; uniform float uGlow, uStars; varying vec3 vDir;
  float hash3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  void main() {
    vec3 d = normalize(vDir);
    float below = step(d.y, 0.0);
    d.y = abs(d.y);
    vec2 dxz = d.xz / max(1e-4, length(d.xz));
    float facing = max(0.0, dot(normalize(uSun.xz), dxz));
    vec3 H = mix(uHa, uHs, pow(facing, 4.0));
    vec3 c = mix(uZ, uM, smoothstep(0.0, 1.0, pow(1.0 - d.y, 4.0)));
    c = mix(c, H, smoothstep(0.35, 1.0, pow(1.0 - d.y, 9.0)));
    float s = max(0.0, dot(d, normalize(vec3(uSun.x, abs(uSun.y), uSun.z))));
    float up = step(0.0, uSun.y);
    c += uSunCol * (pow(s, 5000.0) * 3.2 * up + pow(s, 400.0) * 0.3 * up + pow(s, 24.0) * 0.07) * uGlow;
    float st = step(0.9982, hash3(floor(d * 900.0))) * smoothstep(0.06, 0.3, d.y) * uStars;
    c += vec3(0.75, 0.82, 1.0) * st * 0.8;
    c *= mix(1.0, 0.42, below);
    gl_FragColor = vec4(c, 1.0);
  }`;

// Value noise for the dissolve: metal burns in and out along a noisy front with an orange edge.
const NOISE = `
  float cxHash(vec3 p) { p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float cxNoise(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(cxHash(i), cxHash(i + vec3(1, 0, 0)), f.x), mix(cxHash(i + vec3(0, 1, 0)), cxHash(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(cxHash(i + vec3(0, 0, 1)), cxHash(i + vec3(1, 0, 1)), f.x), mix(cxHash(i + vec3(0, 1, 1)), cxHash(i + vec3(1, 1, 1)), f.x), f.y), f.z); }`;

/** Adds the dissolve (and, for reflections, the fade with depth under the water) to a built-in material. */
export function hookMaterial(mat, fx, { mirror = false, noiseScale = 2.2 } = {}) {
  mat.userData.hooked = true; // (a flag only: userData is JSON-cloned by Material.clone)
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uReveal = fx.reveal;
    sh.uniforms.uFloorY = fx.floorY;
    sh.uniforms.uFadeLen = fx.fadeLen;
    sh.uniforms.uNoiseScale = { value: noiseScale };
    sh.uniforms.uEdge = fx.edge;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCxPos;\nvarying float vCxY;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        vec4 cxW = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          cxW = instanceMatrix * cxW;
        #endif
        vCxPos = cxW.xyz;
        vCxY = (modelMatrix * cxW).y;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vCxPos;\nvarying float vCxY;\nuniform float uReveal, uFloorY, uFadeLen, uNoiseScale, uEdge;\n${NOISE}`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        float cxN = cxNoise(vCxPos * uNoiseScale) * 0.94 + 0.03;
        if (cxN > uReveal) discard;`)
      .replace('#include <opaque_fragment>', `
        outgoingLight += vec3(2.6, 0.85, 0.12) * uEdge * (1.0 - smoothstep(0.0, 0.035, uReveal - cxN)) * step(uReveal, 0.995);
        // Never hand the bloom a NaN or an infinity: one such pixel would blur over the whole frame.
        if (any(isnan(outgoingLight)) || any(isinf(outgoingLight))) outgoingLight = vec3(0.0);
        outgoingLight = min(outgoingLight, vec3(48.0));
        ${mirror ? 'diffuseColor.a *= 0.62 * pow(smoothstep(-uFadeLen, 0.0, vCxY - uFloorY), 1.6);' : ''}
        #include <opaque_fragment>`);
  };
  mat.customProgramCacheKey = () => (mirror ? 'cx-dissolve-mirror' : 'cx-dissolve');
  if (mirror) { mat.transparent = true; mat.depthWrite = false; }
  return mat;
}

/** Per-level effect uniforms: how far the level has burned in, and where its water is, in world units. */
export function makeFx() {
  return { reveal: { value: 1 }, edge: { value: 1 }, floorY: { value: 0 }, fadeLen: { value: 2 }, clipUp: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), clipDown: new THREE.Plane(new THREE.Vector3(0, -1, 0), 0) };
}

/** The materials a level builds with. Each level gets its own instances so it can burn in on its own. */
export function materialKit(fx) {
  const kit = {
    gold: (o = {}) => hookMaterial(new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(1.0, 0.7, 0.32), metalness: 1, roughness: 0.3, ...o }), fx),
    iron: (o = {}) => hookMaterial(new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(0.07, 0.06, 0.055), metalness: 0.9, roughness: 0.52, ...o }), fx),
    // Numbers stand in cast metal, as in the Sovereignty simulator.
    cast: (o = {}) => {
      const m = hookMaterial(new THREE.MeshPhysicalMaterial({ color: new THREE.Color().setRGB(0.98, 0.62, 0.2), metalness: 1, roughness: 0.3, clearcoat: 0.3, clearcoatRoughness: 0.15, ...o }), fx, { noiseScale: 3 });
      m.clippingPlanes = [fx.clipUp];
      return m;
    },
    castMirror: (o = {}) => {
      const m = hookMaterial(new THREE.MeshPhysicalMaterial({ color: new THREE.Color().setRGB(0.98, 0.62, 0.2), metalness: 1, roughness: 0.3, clearcoat: 0.3, clearcoatRoughness: 0.15, ...o }), fx, { mirror: true, noiseScale: 3 });
      m.clippingPlanes = [fx.clipDown];
      return m;
    },
    mirrorOf: (src) => {
      const m = hookMaterial(src.clone(), fx, { mirror: true });
      m.clippingPlanes = [fx.clipDown];
      return m;
    },
    // Light sources: values above 1 bloom.
    glow: (rgb, o = {}) => hookMaterial(new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(...rgb), ...o }), fx),
  };
  return kit;
}

export function createWorld(canvas, { dpr, msaa, still }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', logarithmicDepthBuffer: true, stencil: false });
  } catch (e) { return null; }
  if (!renderer.capabilities.isWebGL2) return null;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.localClippingEnabled = true;
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 2000);
  camera.layers.set(0);

  // Sky: per pixel, mirrored and darkened below the horizon, so the far water is always there.
  const v3 = (a) => ({ value: new THREE.Vector3(...a) });
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false,
    uniforms: { uSun: v3([0.16, 0.02, -1]), uGlow: { value: 1 }, uStars: { value: 0 }, uZ: v3(DAWN.Z), uM: v3(DAWN.M), uHs: v3(DAWN.Hs), uHa: v3(DAWN.Ha), uSunCol: v3(DAWN.sun) },
    vertexShader: SKY_VERT, fragmentShader: SKY_FRAG,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(10, 48, 24), skyMat);
  sky.frustumCulled = false;
  sky.renderOrder = -1000;
  scene.add(sky);
  const sunDir = new THREE.Vector3();
  const setSky = (k) => {
    const U = skyMat.uniforms, m = smooth(0.12, 0.9, k);
    for (const [key, name] of [['uZ', 'Z'], ['uM', 'M'], ['uHs', 'Hs'], ['uHa', 'Ha'], ['uSunCol', 'sun']]) {
      U[key].value.set(...NIGHT[name].map((v, i) => v + (DAWN[name][i] - v) * m));
    }
    U.uSun.value.set(0.16, -0.13 + 0.2 * k, -1).normalize();
    sunDir.copy(U.uSun.value);
    U.uGlow.value = 0.35 + 1.0 * smooth(0.2, 1, k);
    U.uStars.value = 1 - smooth(0.1, 0.55, k);
  };

  // What the metal reflects: the sky plus a soft panel behind the viewer, at four times of day.
  const envScene = new THREE.Scene();
  const envSky = new THREE.Mesh(new THREE.SphereGeometry(50, 48, 24), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: skyMat.uniforms, vertexShader: SKY_VERT.replace('p.xyww', 'p'), fragmentShader: SKY_FRAG }));
  envScene.add(envSky);
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(70, 16), new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide }));
  fill.position.set(0, 7, 30); fill.lookAt(0, 2, 0);
  envScene.add(fill);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envKs = [0.05, 0.4, 0.75, 1.05];
  const envs = envKs.map((k) => {
    setSky(k);
    fill.material.color.setRGB(0.36 - 0.14 * k, 0.3 - 0.16 * k, 0.26 - 0.2 * k);
    return pmrem.fromScene(envScene, 0.02, 0.1, 200).texture;
  });
  pmrem.dispose();
  envSky.geometry.dispose();

  // Light: a warm key from the viewer's side and an orange rim from the sun.
  const key = new THREE.DirectionalLight(0xffe0b8, 2.2);
  key.position.set(-6, 9, 12);
  const rim = new THREE.DirectionalLight(0xffa860, 2.4);
  const amb = new THREE.HemisphereLight(0x302a3a, 0x0a0706, 0.6);
  scene.add(key, rim, amb);

  // Embers: sparks around the viewer. They drift up at rest and stream past when you zoom.
  const EMBERS = 260;
  const seeds = new Float32Array(EMBERS * 4);
  for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
  const eg = new THREE.BufferGeometry();
  eg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(EMBERS * 3), 3));
  eg.setAttribute('seed', new THREE.BufferAttribute(seeds, 4));
  const emberMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uFlow: { value: 0 }, uTan: { value: new THREE.Vector2(1, 1) }, uPx: { value: 1 }, uAmt: { value: 1 } },
    vertexShader: `#include <common>
      #include <logdepthbuf_pars_vertex>
      attribute vec4 seed; uniform float uTime, uFlow, uPx, uAmt; uniform vec2 uTan; varying float vA; varying float vHot;
      void main() {
        float z = fract(seed.z + uFlow * (0.6 + 0.8 * seed.w));
        float depth = 0.25 + 5.0 * z * z;
        float rise = fract(seed.y + uTime * (0.006 + 0.012 * seed.w));
        vec3 p = vec3((seed.x * 2.0 - 1.0 + 0.03 * sin(uTime * 0.4 + seed.w * 40.0)) * depth * uTan.x,
                      (rise * 2.0 - 1.0) * depth * uTan.y, -depth);
        gl_Position = projectionMatrix * vec4(p, 1.0);
        vA = sin(z * 3.14159) * smoothstep(0.0, 0.15, rise) * (1.0 - smoothstep(0.8, 1.0, rise)) * uAmt;
        vHot = seed.w;
        gl_PointSize = uPx * (0.9 + 1.9 * seed.w * seed.w * seed.w) * (0.9 / depth + 0.45);
        #include <logdepthbuf_vertex>
      }`,
    fragmentShader: `#include <common>
      #include <logdepthbuf_pars_fragment>
      varying float vA; varying float vHot;
      void main() {
        #include <logdepthbuf_fragment>
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = smoothstep(1.0, 0.0, d); a *= a;
        vec3 c = mix(vec3(1.5, 0.5, 0.07), vec3(2.6, 1.5, 0.55), vHot * vHot);
        gl_FragColor = vec4(c * a * vA, 1.0);
      }`,
  });
  const embers = new THREE.Points(eg, emberMat);
  embers.frustumCulled = false;
  embers.renderOrder = 50;
  scene.add(embers);

  // Post: bloom on the HDR image, then ACES and sRGB in the output pass.
  const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: msaa });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.42, 0.4, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  let W = 1, H = 1, curDpr = dpr, skyK = -1, envI = -1, flow = 0, baseKey = 2, keyMul = 1, baseRim = 2, rimMul = 1;
  const BLOOM = { strength: 0.42, threshold: 0.92 };
  // The sun on the water: its direction in view space and its strength, shared with every level's water.
  const sun = { viewDir: { value: new THREE.Vector3(0, 0, -1) }, strength: { value: 1 }, color: { value: new THREE.Vector3(1, 0.62, 0.3) } };
  const world = {
    renderer, scene, camera, composer, bloom, embers, still, sun,
    get dpr() { return curDpr; },
    setSky(k) {
      if (Math.abs(k - skyK) < 0.002) return;
      skyK = k;
      setSky(k);
      rim.position.copy(sunDir).multiplyScalar(10);
      sun.strength.value = smooth(0.3, 1.0, k);
      sun.color.value.set(...skyMat.uniforms.uSunCol.value.toArray());
      baseRim = 1.2 + 1.6 * smooth(0.2, 1.0, k);
      rim.intensity = baseRim * rimMul;
      baseKey = 1.5 + 1.2 * k;
      key.intensity = baseKey * keyMul;
      let best = 0;
      envKs.forEach((e, i) => { if (Math.abs(e - k) < Math.abs(envKs[best] - k)) best = i; });
      if (best !== envI) { envI = best; scene.environment = envs[best]; }
    },
    /** Per-level look, blended along the zoom: bloom strength and threshold, how many embers, how bright the key. */
    setLook({ bloom: b = 1, threshold = BLOOM.threshold, embers: e = 1, key: kk = 1, rim: rr = 1 }) {
      bloom.strength = BLOOM.strength * b;
      bloom.threshold = threshold;
      emberMat.uniforms.uAmt.value = e;
      keyMul = kk;
      key.intensity = baseKey * keyMul;
      rimMul = rr;
      rim.intensity = baseRim * rimMul;
    },
    resize(w, h, d = curDpr) {
      if (!(w > 0 && h > 0)) return;
      W = w; H = h; curDpr = d;
      renderer.setPixelRatio(d);
      renderer.setSize(w, h, false);
      composer.setPixelRatio(d);
      composer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },
    size: () => ({ w: W, h: H }),
    tick(t, dt, zoomVel) {
      sky.position.copy(camera.position);
      camera.updateMatrixWorld();
      sun.viewDir.value.copy(sunDir).transformDirection(camera.matrixWorldInverse);
      if (!still) flow += zoomVel * dt * 0.35;
      const U = emberMat.uniforms;
      U.uTime.value = still ? 0 : t;
      U.uFlow.value = flow;
      const tv = Math.tan((camera.fov * Math.PI) / 360);
      U.uTan.value.set(tv * camera.aspect, tv);
      U.uPx.value = curDpr * Math.min(1.6, Math.max(0.8, H / 700));
    },
    render() {
      composer.render();
      // Text: after the tone mapping, never bloomed, never occluded by the metal.
      renderer.autoClear = false;
      renderer.clearDepth();
      const bg = scene.background; scene.background = null;
      camera.layers.set(LABELS);
      renderer.render(scene, camera);
      camera.layers.set(0);
      scene.background = bg;
      renderer.autoClear = true;
    },
  };
  return world;
}
