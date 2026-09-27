// Numbers and words cast in metal, from Playfair Display Black outlines (data/glyphs.json), the way the
// Sovereignty simulator stands its freedom year on the water. The bevel grows outward from the true outline
// so sharp corners never spike across the face.
import * as THREE from 'three';

let GL = null;
export async function loadGlyphs(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('glyphs ' + res.status);
  GL = await res.json();
}

const cache = new Map();
function glyphGeometry(ch, depth, bevel) {
  const key = ch + '|' + depth + '|' + bevel;
  if (cache.has(key)) return cache.get(key);
  const g = GL.glyphs[ch];
  if (!g || !g.cmds.length) { cache.set(key, null); return null; }
  const path = new THREE.ShapePath(), s = 1 / 1000;
  for (const c of g.cmds) {
    if (c[0] === 'M') path.moveTo(c[1] * s, c[2] * s);
    else if (c[0] === 'L') path.lineTo(c[1] * s, c[2] * s);
    else if (c[0] === 'Q') path.quadraticCurveTo(c[1] * s, c[2] * s, c[3] * s, c[4] * s);
    else if (c[0] === 'C') path.bezierCurveTo(c[1] * s, c[2] * s, c[3] * s, c[4] * s, c[5] * s, c[6] * s);
  }
  const geo = new THREE.ExtrudeGeometry(path.toShapes(false), { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelOffset: 0, bevelSegments: 3, curveSegments: 9 });
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();
  // Sliver triangles in the outline can leave zero-length normals, which shade as NaN, and the bloom would
  // spread one NaN pixel over the whole frame. Give them a sane normal.
  const n = geo.attributes.normal;
  for (let i = 0; i < n.count; i++) if (Math.hypot(n.getX(i), n.getY(i), n.getZ(i)) < 1e-6) n.setXYZ(i, 0, 0, 1);
  cache.set(key, geo);
  return geo;
}

/**
 * Cast `text` in metal. `size` is the em in world units. Returns an upright group standing on y = 0 and, when a
 * mirror material is given, its reflection under the water.
 */
export function castText(text, { size = 1, depth = 0.2, bevel = 0.022, material, mirrorMaterial = null, tracking = 0 }) {
  const group = new THREE.Group();
  let x = 0, minY = Infinity, maxY = -Infinity;
  for (const ch of text) {
    const g = GL && GL.glyphs[ch];
    const adv = g ? g.advance / 1000 : 0.5;
    const geo = g ? glyphGeometry(ch, depth, bevel) : null;
    if (geo) {
      const m = new THREE.Mesh(geo, material);
      m.position.x = x;
      group.add(m);
      geo.computeBoundingBox();
      minY = Math.min(minY, geo.boundingBox.min.y);
      maxY = Math.max(maxY, geo.boundingBox.max.y);
    }
    x += adv + tracking;
  }
  for (const m of group.children) m.position.x -= x / 2;
  if (!isFinite(minY)) { minY = 0; maxY = 0.7; }
  for (const m of group.children) m.position.y -= minY - 0.004;
  group.scale.setScalar(size);
  const out = { group, mirror: null, width: x * size, height: (maxY - minY) * size };
  if (mirrorMaterial) {
    const mirror = group.clone();
    mirror.traverse((o) => { if (o.isMesh) { o.material = mirrorMaterial; o.renderOrder = 1; } });
    mirror.scale.set(size, -size, size);
    out.mirror = mirror;
  }
  return out;
}

/** Width and height of cast text in world units, from the glyph data alone (no geometry is built). */
export function textBounds(text, size = 1) {
  let x = 0, minY = Infinity, maxY = -Infinity;
  for (const ch of text) {
    const g = GL && GL.glyphs[ch];
    x += g ? g.advance / 1000 : 0.5;
    if (!g) continue;
    for (const c of g.cmds) for (let i = 2; i < c.length; i += 2) { minY = Math.min(minY, c[i]); maxY = Math.max(maxY, c[i]); }
  }
  if (!isFinite(minY)) { minY = 0; maxY = 700; }
  return { width: x * size, height: ((maxY - minY) / 1000) * size };
}

/** Stand cast text on the water of a level (y = 0 there), with its reflection, rising as `rise` goes 0 to 1. */
export function standOnWater(cast, parent, x, z, rotY = 0) {
  const holder = new THREE.Group();
  holder.position.set(x, 0, z);
  holder.rotation.y = rotY;
  holder.add(cast.group);
  if (cast.mirror) holder.add(cast.mirror);
  parent.add(holder);
  holder.userData.cast = cast;
  holder.userData.setRise = (rise) => {
    const y = -(1 - rise) * cast.height * 1.05;
    cast.group.position.y = y;
    if (cast.mirror) cast.mirror.position.y = -y;
  };
  return holder;
}
