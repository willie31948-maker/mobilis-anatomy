/**
 * 3D Anatomy Viewer & Exercise Demonstration
 *
 * Runs exclusively on a standard Three.js AnimationMixer pipeline with
 * baked GLTF skeletal animation tracks. All procedural trigonometric math,
 * manual bone rotations, and kinematic overrides have been eliminated.
 */

import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';

if (typeof window !== 'undefined') {
  window.__THREE = THREE;
}

let lastTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

const COLORS = {
  base:      0x851414,   // anatomical carmine red (#851414)
  tendon:    0xeae6df,   // tendon off-white (#eae6df)
  bone:      0xded9cc,   // solid ivory/bone (#ded9cc)
  hover:     0xb82e2e,
  sel:       0x4fd1c5,
  short:     0xf6ad55,
  weak:      0x63b3ed,
  primary:   0xef4444,   // muscle doing the main work
  secondary: 0xfbbf24,   // assisting muscle
  accent:    0xd47a00,   // emissive glow on the active muscle (warm amber)
};

function createMuscleMaterial(isSkinned = false) {
  return new THREE.MeshStandardMaterial({
    color: COLORS.base,
    roughness: 0.45,
    metalness: 0.05,
    transparent: false,
    opacity: 1.0,
    depthWrite: true,
    side: THREE.DoubleSide,
  });
}

function createBoneMaterial() {
  return new THREE.MeshStandardMaterial({
    color: COLORS.bone,
    roughness: 0.55,
    metalness: 0.05,
    transparent: false,
    opacity: 1.0,
    depthWrite: true,
    side: THREE.DoubleSide,
  });
}

export class AnatomyViewer {
  constructor(container, opts = {}) {
    this.container = container;
    this.onSelect = opts.onSelect || (() => {});
    this.meshes = new Map();      // muscle_id -> [mesh, ...]
    this.bones = [];              // skeletal context meshes
    this.bonesVisible = true;
    this.states = {};
    this.selected = null;
    this.loaded = new Set();
    this.mixer = null;
    this.clips = new Map();
    this.currentAction = null;
    this.currentClipName = null;
    this.scrubbing = false;
    this.roles = null;
    this._lastTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this._clock = {
      getDelta: () => {
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const dt = (now - this._lastTime) * 0.001;
        this._lastTime = now;
        return dt;
      }
    };
    this._init();
  }

  _init() {
    const w = this.container.clientWidth || 400;
    const h = opts_height(this.container);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xd8dbe0);

    this.camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 5000);
    this.camera.position.set(0, 5, 90);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1, 2));
    this.renderer.setSize(w, h);
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(0, 0.95, 0);

    // Studio directional and hemisphere lighting for clear anatomical contrast
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x555555, 1.2);
    this.scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(5, 10, 7);
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 1.0);
    rimLight.position.set(-5, 5, -5);
    this.scene.add(rimLight);

    // Soft ground contact shadow receiver at world floor
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const sCtx = shadowCanvas.getContext('2d');
    const grad = sCtx.createRadialGradient(128, 128, 10, 128, 128, 120);
    grad.addColorStop(0, 'rgba(25, 30, 35, 0.42)');
    grad.addColorStop(0.35, 'rgba(35, 40, 48, 0.24)');
    grad.addColorStop(0.7, 'rgba(60, 65, 75, 0.08)');
    grad.addColorStop(1, 'rgba(216, 219, 224, 0.0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 256, 256);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowGeo = new THREE.PlaneGeometry(2.4, 2.4);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    this.groundShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.groundShadow.rotation.x = -Math.PI / 2;
    this.groundShadow.position.set(0, 0.001, 0);
    this.scene.add(this.groundShadow);

    this.root = new THREE.Group();
    this.scene.add(this.root);

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.hovered = null;

    const el = this.renderer.domElement;
    el.addEventListener('pointermove', (e) => this._onMove(e));
    el.addEventListener('click', (e) => this._onClick(e));
    window.addEventListener('resize', () => this._resize());

    this._animate();
  }

  _resize() {
    const w = this.container.clientWidth || 400;
    const h = opts_height(this.container);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  /**
   * Load individual regional muscle models (e.g. for static 3D assessment / anatomy inspect).
   */
  async loadRegions(regions) {
    const loader = new GLTFLoader();
    for (const region of regions) {
      if (this.loaded.has(region)) continue;
      this.loaded.add(region);
      await new Promise((resolve) => {
        loader.load(
          `models/${region}.glb`,
          (gltf) => {
            gltf.scene.traverse((o) => {
              if (!o.isMesh) return;
              if (o.geometry) o.geometry.computeVertexNormals();

              // Skeletal context: pale, non-interactive, and deliberately given
              // NO muscle identifier. Without that guard a bone could be clicked and
              // looked up as a muscle, which would be a confusing error.
              // All bones are registered into the non-clickable bones collection.
              if (o.name.startsWith('bone__')) {
                // Solid opaque bone material (ivory cream, roughness 0.55)
                o.material = createBoneMaterial();
                o.userData.isBone = true;
                o.visible = !!this.bonesVisible;
                this.bones.push(o);
                // Return immediately without assigning muscle identifiers or adding to meshes map
                return;
              }

              // Non-bone meshes represent muscular anatomy:
              // Meshes are exported as "<muscle_id>__l" / "__r". glTF strips
              // "." from names, so the separator must not be a dot; the
              // trailing _NNN guard covers three.js de-duplicating names.
              // These meshes are registered into the interactive anatomical collection.
              const id = o.name.replace(/__(l|r)(_\d+)?$/, '');
              o.material = createMuscleMaterial(false);
              o.userData.muscleId = id;
              if (!this.meshes.has(id)) this.meshes.set(id, []);
              this.meshes.get(id).push(o);
            });
            this.root.add(gltf.scene);
            resolve();
          },
          undefined,
          (err) => { console.warn('load failed', region, err); resolve(); }
        );
      });
    }
    this._frame();
    this.paintStates(this.states);
  }

  /**
   * Load the baked skeletal animated model (public/models/animated.glb)
   * and initialize the standard Three.js AnimationMixer.
   */
  async loadAnimated(url = 'models/animated.glb') {
    if (this.animatedLoaded) return [...this.clips.keys()];
    const loader = new GLTFLoader();
    const loadUrl = url.includes('?') ? url : `${url}?v=${Date.now()}`;
    const gltf = await new Promise((res, rej) => loader.load(loadUrl, res, undefined, rej));

    // Clear prior children from root
    while (this.root.children.length > 0) {
      this.root.remove(this.root.children[0]);
    }
    this.root.position.set(0, 0, 0);
    this.root.rotation.set(0, 0, 0);
    this.root.scale.set(1, 1, 1);
    this.meshes.clear();
    this.bones = [];
    this.clips.clear();

    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      if (o.geometry) {
        o.geometry.computeVertexNormals();
      }
      const id = o.name.replace(/__(l|r)(_\d+)?$/, '');
      if (o.name.startsWith('bone__')) {
        o.material = createBoneMaterial();
        o.userData.isBone = true;
        o.visible = !!this.bonesVisible;
        this.bones.push(o);
        return;
      }
      o.material = createMuscleMaterial(true);
      o.userData.muscleId = id;
      o.frustumCulled = false;
      if (!this.meshes.has(id)) this.meshes.set(id, []);
      this.meshes.get(id).push(o);
    });

    // Add gltf.scene to scene root
    this.root.add(gltf.scene);

    // Instantiate AnimationMixer on the loaded GLTF model scene
    this.mixer = new THREE.AnimationMixer(gltf.scene);

    // Map all baked animation clips
    const byName = new Map();
    for (const c of gltf.animations) {
      byName.set(c.name, c);
    }
    for (const c of gltf.animations) {
      if (c.name.endsWith('__posture')) continue;
      const posture = byName.get(c.name + '__posture');
      const tracks = posture ? [...c.tracks, ...posture.tracks] : c.tracks;
      const mergedClip = new THREE.AnimationClip(c.name, c.duration, tracks);
      this.clips.set(c.name, mergedClip);
    }
    for (const c of gltf.animations) {
      if (!this.clips.has(c.name)) {
        this.clips.set(c.name, c);
      }
    }

    // Attach skeletal context (skull, arms, hands) if available
    try {
      const ctxGltf = await new Promise((res, rej) => loader.load('models/context.glb', res, undefined, rej));
      const head = gltf.scene.getObjectByName('Head');
      const leftArm = gltf.scene.getObjectByName('LeftArm');
      const rightArm = gltf.scene.getObjectByName('RightArm');
      const leftHand = gltf.scene.getObjectByName('LeftHand');
      const rightHand = gltf.scene.getObjectByName('RightHand');

      const contextMeshes = [];
      ctxGltf.scene.traverse((o) => {
        if (o.isMesh && o.name.startsWith('bone__')) {
          o.material = createBoneMaterial();
          o.userData.isBone = true;
          o.visible = !!this.bonesVisible;
          if (o.geometry) o.geometry.computeVertexNormals();
          contextMeshes.push(o);
        }
      });

      for (const o of contextMeshes) {
        this.bones.push(o);
        let parentBone = null;
        if (o.name.includes('skull') && head) parentBone = head;
        else if (o.name.includes('arm_bones__l') && leftArm) parentBone = leftArm;
        else if (o.name.includes('arm_bones__r') && rightArm) parentBone = rightArm;
        else if (o.name.includes('hand_bones__l') && leftHand) parentBone = leftHand;
        else if (o.name.includes('hand_bones__r') && rightHand) parentBone = rightHand;

        if (parentBone) {
          parentBone.updateWorldMatrix(true, false);
          const invParentMat = parentBone.matrixWorld.clone().invert();
          o.applyMatrix4(invParentMat);
          parentBone.add(o);
        } else {
          this.root.add(o);
        }
      }
    } catch (e) {
      // Optional skeletal context fallback
    }

    // Find and guarantee animation playback
    console.log('Available clips:', gltf.animations ? gltf.animations.map(a => a.name) : []);
    if (gltf.animations && gltf.animations.length > 0) {
      if (this.mixer) this.mixer.stopAllAction();
      this.mixer = new THREE.AnimationMixer(gltf.scene);

      // Play the baked retarget track directly
      const action = this.mixer.clipAction(gltf.animations[0]);
      action.setLoop(THREE.LoopRepeat);
      action.reset();
      action.play();
      this.currentAction = action;
      this.currentClipName = gltf.animations[0].name;
    }

    this.animatedLoaded = true;
    this._frame();
    this.paintStates(this.states);
    return [...this.clips.keys()];
  }

  /**
   * Play a named clip using standard AnimationMixer clipAction.
   */
  playClip(name) {
    if (!this.mixer) return false;
    if (this.currentAction) {
      this.currentAction.stop();
      this.currentAction = null;
    }
    if (!name) {
      this.currentClipName = null;
      this.scrubbing = false;
      return false;
    }
    const clip = this.clips.get(name) || this.clips.get(name + '__posture');
    if (!clip) return false;

    const action = this.mixer.clipAction(clip);
    action.reset();
    action.setLoop(THREE.LoopRepeat);
    action.clampWhenFinished = false;
    action.play();
    this.currentAction = action;
    this.currentClipName = name;
    this.scrubbing = false;
    action.paused = false;
    this.frameForClip(clip);
    return true;
  }

  setSpeed(x) {
    if (this.mixer) this.mixer.timeScale = x;
  }

  /** Duration of the clip currently playing, in seconds (0 if none). */
  clipDuration() {
    if (this.currentAction) return this.currentAction.getClip().duration;
    return 0;
  }

  /** Normalized cycle progress, 0..1. */
  clipProgress() {
    if (this.currentAction) {
      const d = this.clipDuration();
      if (!d) return 0;
      return (this.currentAction.time % d) / d;
    }
    return 0;
  }

  /** Jump to fraction of the animation cycle without tearing down the mixer. */
  scrubTo(frac) {
    if (!this.mixer || !this.currentAction) return;
    const d = this.clipDuration();
    if (!d) return;
    this.currentAction.time = Math.max(0, Math.min(1, frac)) * d;
    this.mixer.update(0);
    this.root.updateMatrixWorld(true);
  }

  setPaused(on) {
    this.scrubbing = !!on;
    if (this.currentAction) this.currentAction.paused = !!on;
  }

  setRoles(roles) {
    this.roles = roles;
    this.paintStates(this.states);
  }

  /**
   * Color muscles by state (short/weak), exercise role (primary/secondary), or selection.
   */
  paintStates(states) {
    this.states = states || {};
    const roles = this.roles;
    for (const [id, list] of this.meshes) {
      const st = this.states[id];
      const role = roles ? roles[id] : null;
      const isSelected = id === this.selected;

      let col = COLORS.base;
      if (roles) {
        if (role === 'primary') col = COLORS.primary;
        else if (role === 'secondary') col = COLORS.secondary;
        else col = COLORS.base;
      } else if (isSelected) {
        col = COLORS.sel;
      } else if (st === 'short') {
        col = COLORS.short;
      } else if (st === 'weak') {
        col = COLORS.weak;
      }

      const dim = roles
        ? (!role && !isSelected)
        : (Object.keys(this.states).length > 0 && !st && !isSelected);

      for (const m of list) {
        m.material.color.setHex(col);
        m.material.roughness = 0.45;
        if (m.material.emissive) {
          if (isSelected) {
            m.material.emissive.setHex(COLORS.accent).multiplyScalar(0.4);
            m.material.emissiveIntensity = 0.5;
          } else if (roles && role === 'primary') {
            m.material.emissive.setHex(0xd47a00).multiplyScalar(0.4);
            m.material.emissiveIntensity = 0.5;
          } else {
            m.material.emissive.setHex(0x000000);
            m.material.emissiveIntensity = 0.0;
          }
        }
        if (dim) {
          m.material.color.multiplyScalar(0.45);
        }
        m.material.transparent = false;
        m.material.opacity = 1.0;
        m.material.depthWrite = true;
        m.material.side = THREE.DoubleSide;
        m.visible = true;
      }
    }
    for (const b of this.bones) {
      if (b.material) {
        b.material.color.setHex(COLORS.bone);
        b.material.transparent = false;
        b.material.opacity = 1.0;
        b.material.depthWrite = true;
      }
      b.visible = !!this.bonesVisible;
    }
  }

  setBonesVisible(on) {
    this.bonesVisible = !!on;
    for (const b of this.bones) b.visible = !!on;
  }

  select(id) {
    this.selected = id;
    this.paintStates(this.states);
  }

  isolate(ids) {
    const set = ids && ids.length ? new Set(ids) : null;
    for (const [id, list] of this.meshes) {
      for (const m of list) m.visible = !set || set.has(id);
    }
  }

  _pick(e) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    this.pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.root.children, true);
    for (const h of hits) {
      if (h.object.visible && h.object.userData.muscleId) return h.object;
    }
    return null;
  }

  _onMove(e) {
    const obj = this._pick(e);
    const id = obj ? obj.userData.muscleId : null;
    if (id === this.hovered) return;
    this.hovered = id;
    this.renderer.domElement.style.cursor = id ? 'pointer' : 'default';
    const label = document.getElementById('v3d-label');
    if (label) {
      label.textContent = id ? (window.muscleName ? window.muscleName(id) : id) : '';
      label.style.opacity = id ? 1 : 0;
    }
  }

  _onClick(e) {
    const obj = this._pick(e);
    if (!obj) return;
    const id = obj.userData.muscleId;
    this.select(id);
    this.onSelect(id);
  }

  /**
   * Main render loop.
   * Advances the Three.js AnimationMixer via timestamp delta on every frame.
   */
  _animate() {
    requestAnimationFrame((t) => this._animate(t));
    const currentTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const rawDelta = (currentTime - lastTime) * 0.001;
    lastTime = currentTime;
    const delta = Math.min(this._clock.getDelta ? this._clock.getDelta() : rawDelta, 0.1);

    if (this.mixer && !this.scrubbing && delta > 0) {
      this.mixer.update(delta);
    }
    this._tickLerp(delta);
    if (this.controls) this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  _frame() {
    const box = new THREE.Box3().setFromObject(this.root);
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    this.root.position.sub(center);
    const maxDim = Math.max(size.x, size.y, size.z);
    const dist = (maxDim / 2) / Math.tan((this.camera.fov * Math.PI) / 360) * 1.15;

    this.camera.position.set(0, size.y * 0.15, dist);
    this.camera.near = dist / 100;
    this.camera.far = dist * 10;
    this.camera.updateProjectionMatrix();

    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  frameForClip(clip) {
    const box = new THREE.Box3();
    const was = this.currentAction ? this.currentAction.time : 0;
    for (const f of [0, 0.25, 0.5, 0.75]) {
      if (this.currentAction) {
        this.currentAction.time = clip.duration * f;
        this.mixer.update(0);
      }
      this.root.updateMatrixWorld(true);
      this._expandPosedBox(box);
    }
    if (this.currentAction) {
      this.currentAction.time = was;
      this.mixer.update(0);
      this.root.updateMatrixWorld(true);
    }
    this._applyFraming(box);
  }

  frameForPose() {
    const box = new THREE.Box3();
    this._expandPosedBox(box);
    this._applyFraming(box);
  }

  _expandPosedBox(box) {
    const t = new THREE.Vector3();
    for (const [, list] of this.meshes) {
      for (const m of list) {
        const pos = m.geometry.attributes.position;
        if (!pos) continue;
        const step = Math.max(1, Math.floor(pos.count / 24));
        for (let i = 0; i < pos.count; i += step) {
          t.fromBufferAttribute(pos, i);
          if (m.isSkinnedMesh) m.applyBoneTransform(i, t);
          m.localToWorld(t);
          box.expandByPoint(t);
        }
      }
    }
    return box;
  }

  focusOn(id, opts) {
    const list = this.meshes.get(id);
    if (!list || !list.length) return false;

    const boxOf = (m) => {
      const b = new THREE.Box3();
      const v = new THREE.Vector3();
      const pos = m.geometry.attributes.position;
      if (!pos) return b;
      const step = Math.max(1, Math.floor(pos.count / 120));
      for (let i = 0; i < pos.count; i += step) {
        v.fromBufferAttribute(pos, i);
        if (m.isSkinnedMesh) m.applyBoneTransform(i, v);
        m.localToWorld(v);
        b.expandByPoint(v);
      }
      return b;
    };

    const visible = list.filter((m) => m.visible);
    const candidates = visible.length ? visible : list;
    let box = null;
    let best = -Infinity;
    for (const m of candidates) {
      const b = boxOf(m);
      if (b.isEmpty()) continue;
      const score = -b.getCenter(new THREE.Vector3()).distanceTo(this.camera.position);
      if (score > best) { best = score; box = b; }
    }
    if (!box || box.isEmpty()) return false;

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const bodyBox = new THREE.Box3();
    this._expandPosedBox(bodyBox);
    const bodyDim = bodyBox.isEmpty()
      ? Math.max(size.x, size.y, size.z)
      : Math.max(...bodyBox.getSize(new THREE.Vector3()).toArray());
    const muscleDim = Math.max(size.x, size.y, size.z);
    const framed = Math.max(muscleDim * 2.2, bodyDim * 0.28);
    const dist = (framed / 2) / Math.tan((this.camera.fov * Math.PI) / 360);

    const dir = this.camera.position.clone().sub(this.controls.target);
    if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
    dir.normalize();

    const off = (opts && opts.offset) || 0.25;
    const lift = Math.min(muscleDim * off, framed * 0.06);
    const pos = center.clone()
      .add(dir.multiplyScalar(dist))
      .add(new THREE.Vector3(0, lift, 0));

    this.lerpTo(pos, center);
    this.focused = id;
    return true;
  }

  resetCamera() {
    const box = new THREE.Box3();
    if (this.mixer && this.currentAction) {
      const clip = this.currentAction.getClip();
      const was = this.currentAction.time;
      for (const f of [0, 0.25, 0.5, 0.75]) {
        this.currentAction.time = clip.duration * f;
        this.mixer.update(0);
        this.root.updateMatrixWorld(true);
        this._expandPosedBox(box);
      }
      this.currentAction.time = was;
      this.mixer.update(0);
      this.root.updateMatrixWorld(true);
    } else {
      this._expandPosedBox(box);
    }
    if (box.isEmpty()) return;
    const { position, target } = this._framingFor(box);
    this.lerpTo(position, target);
    this.focused = null;
  }

  lerpTo(position, target, ms) {
    this._lerp = {
      fromPos: this.camera.position.clone(),
      toPos: position.clone(),
      fromTar: this.controls.target.clone(),
      toTar: target.clone(),
      t: 0,
      dur: Math.max(1, (ms == null ? 620 : ms)) / 1000,
    };
  }

  _tickLerp(dt) {
    const L = this._lerp;
    if (!L) return;
    L.t = Math.min(1, L.t + dt / L.dur);
    const e = L.t < 0.5 ? 2 * L.t * L.t : 1 - Math.pow(-2 * L.t + 2, 2) / 2;
    this.camera.position.lerpVectors(L.fromPos, L.toPos, e);
    this.controls.target.lerpVectors(L.fromTar, L.toTar, e);
    const d = this.camera.position.distanceTo(this.controls.target);
    this.camera.near = Math.max(d / 100, 0.01);
    this.camera.far = d * 10;
    this.camera.updateProjectionMatrix();
    if (L.t >= 1) this._lerp = null;
  }

  _framingFor(box) {
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const dist = (maxDim / 2) / Math.tan((this.camera.fov * Math.PI) / 360) * 1.35;

    const targetY = box.min.y <= 0.15 && box.max.y >= 1.4 ? 0.95 : Math.max(0.18, center.y);
    const target = new THREE.Vector3(center.x, targetY, center.z);

    const angleY = 32 * (Math.PI / 180);
    const elev = 12 * (Math.PI / 180);
    const cosElev = Math.cos(elev);
    const offset = new THREE.Vector3(
      Math.sin(angleY) * cosElev,
      Math.sin(elev),
      Math.cos(angleY) * cosElev
    ).normalize().multiplyScalar(dist);

    const position = target.clone().add(offset);
    return { position, target, dist };
  }

  _applyFraming(box) {
    if (box.isEmpty()) return;
    this._lerp = null;
    const { position, target, dist } = this._framingFor(box);
    this.camera.position.copy(position);
    this.camera.up.set(0, 1, 0);
    this.camera.near = dist / 100;
    this.camera.far = dist * 10;
    this.camera.updateProjectionMatrix();
    this.controls.target.copy(target);
    this.controls.update();
  }
}

function opts_height(container) {
  return container.clientHeight && container.clientHeight > 100 ? container.clientHeight : 520;
}
