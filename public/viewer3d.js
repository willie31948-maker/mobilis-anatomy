/**
 * 3D anatomy viewer.
 *
 * The contract with the rest of the app is deliberately tiny:
 *   - meshes are named "<muscle_id>.l" / "<muscle_id>.r"
 *   - clicking one calls window.showDetail(muscle_id)
 *   - paintStates({muscle_id: 'short'|'weak'}) colours them
 *
 * That is the same contract the 2D SVG map honours (data-mid attributes), which
 * is why swapping in real anatomy required no change to the assessment engine,
 * the programme builder, or the API. If you later replace Z-Anatomy with
 * commissioned models, re-run tools/extract_models.py with a new muscle_map.json
 * and this file keeps working unchanged.
 */

import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
window.__THREE=THREE;

const COLORS = {
  base:  0xb0655f,   // muscle red, desaturated so the state colours read clearly
  hover: 0xe0917f,
  sel:   0x4fd1c5,
  short: 0xf6ad55,
  weak:  0x63b3ed,
  bone:  0xd9cfc0,   // pale ivory; visually recedes behind muscle
  primary:   0xef4444,  // muscle doing the main work
  secondary: 0xfbbf24,  // assisting muscle
  accent:    0x1fbfb4,  // emissive glow on the ACTIVE muscle (teal, matches sel)
};

export class AnatomyViewer {
  constructor(container, opts = {}) {
    this.container = container;
    this.onSelect = opts.onSelect || (() => {});
    this.meshes = new Map();      // muscle_id -> [mesh, ...]
    this.bones = [];              // skeletal context; never clickable
    this.states = {};
    this.selected = null;
    this.loaded = new Set();
    this.mixer = null;
    this.clips = new Map();
    this.currentAction = null;
    this.roles = null;          // {muscleId: 'primary'|'secondary'} for exercise view
    this._clock = new THREE.Clock();
    this._init();
  }

  _init() {
    const w = this.container.clientWidth || 400;
    const h = opts_height(this.container);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f1417);

    this.camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 5000);
    this.camera.position.set(0, 5, 90);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;

    // Three-point-ish lighting. Anatomy reads badly under a single lamp:
    // the forms are subtle and need rim light to separate overlapping muscles.
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(60, 80, 100);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x88aaff, 0.45);
    fill.position.set(-80, 20, 40);
    this.scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 0.6);
    rim.position.set(0, 30, -120);
    this.scene.add(rim);

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

              // Skeletal context: pale, non-interactive, and deliberately given
              // NO muscleId. Without that guard a bone could be clicked and
              // looked up as a muscle, which would be a confusing lie.
              if (o.name.startsWith('bone__')) {
                // Opaque with real depth: bone must occlude and be occluded
                // correctly. Rendering it transparent with depthWrite off made
                // the skull and hand bones paint OVER the muscles in front of
                // them, which read as an x-ray rather than an anatomy model.
                o.material = new THREE.MeshPhongMaterial({
                  color: COLORS.bone, shininess: 4, specular: 0x0a0a0a,
                });
                o.userData.isBone = true;
                this.bones.push(o);
                return;
              }

              // Meshes are exported as "<muscle_id>__l" / "__r". glTF strips
              // "." from names, so the separator must not be a dot; the
              // trailing _NNN guard covers three.js de-duplicating names.
              const id = o.name.replace(/__(l|r)(_\d+)?$/, '');
              o.material = new THREE.MeshPhongMaterial({
                color: COLORS.base, shininess: 18, specular: 0x222222,
                transparent: true, opacity: 1,
              });
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

  /** Fit the camera to whatever is currently loaded. */
  _frame() {
    const box = new THREE.Box3().setFromObject(this.root);
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    this.root.position.sub(center);           // recentre geometry on the origin
    const maxDim = Math.max(size.x, size.y, size.z);
    const dist = (maxDim / 2) / Math.tan((this.camera.fov * Math.PI) / 360);
    this.camera.position.set(0, 0, dist * 1.45);
    this.camera.near = dist / 100;
    this.camera.far = dist * 10;
    this.camera.updateProjectionMatrix();
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  /**
   * Re-frame the camera for the pose the model is CURRENTLY in.
   *
   * _frame() runs once at load, on the standing rest pose. That was fine while
   * every clip was standing -- and wrong the moment postures arrived: a supine
   * glute bridge is anatomically correct and still renders as a confusing
   * mess, because the standing front-on camera now looks straight down the
   * length of the body at the soles of the feet. The animation was right and
   * the view was useless, which is the same class of failure as the rest of
   * this version: plausible output, no information.
   *
   * So measure the posed bounding box and look at the body from the side it is
   * actually long in, with the vertical axis chosen so it never renders
   * upside down.
   */
  /** Frame a whole clip: fit every sampled instant, so nothing drifts out. */
  frameForClip(clip) {
    const box = new THREE.Box3();
    for (const f of [0, 0.25, 0.5, 0.75]) {
      this.mixer.setTime(clip.duration * f);
      this.root.updateMatrixWorld(true);
      this._expandPosedBox(box);
    }
    this._applyFraming(box);
  }

  frameForPose() {
    const box = new THREE.Box3();
    this._expandPosedBox(box);
    this._applyFraming(box);
  }

  /**
   * Grow `box` by the CURRENTLY POSED geometry.
   *
   * Box3.setFromObject / expandByObject read geometry.boundingBox, which for a
   * SkinnedMesh is the REST pose -- skinning runs on the GPU and never updates
   * it. So the "posed" box came back identical for every clip, the camera never
   * moved, and a supine glute bridge kept the standing front-on view and
   * rendered as an unreadable tangle. Sample the skinned vertices instead.
   */
  _expandPosedBox(box) {
    const t = new THREE.Vector3();
    for (const [, list] of this.meshes) {
      for (const m of list) {
        const pos = m.geometry.attributes.position;
        const step = Math.max(1, Math.floor(pos.count / 24));
        for (let i = 0; i < pos.count; i += step) {
          t.fromBufferAttribute(pos, i);
          m.applyBoneTransform(i, t);
          m.localToWorld(t);
          box.expandByPoint(t);
        }
      }
    }
    return box;
  }

  /**
   * Frame tightly on ONE muscle, animated.
   *
   * Uses the POSED box (see _expandPosedBox): a SkinnedMesh's
   * geometry.boundingBox is its rest pose, so framing the selected deltoid
   * during an overhead press off setFromObject would aim the camera at where
   * the deltoid is when the arms are down.
   *
   * The body stays in shot deliberately. An early version filled the frame
   * with the muscle alone and it became impossible to tell what you were
   * looking at -- a tightly cropped psoas and a tightly cropped serratus are
   * both just a red shape. The floor on the framed size keeps enough torso or
   * limb around it to read as anatomy.
   */
  focusOn(id, opts) {
    const list = this.meshes.get(id);
    if (!list || !list.length) return false;

    // Frame ONE SIDE, not both.
    //
    // Every muscle id maps to a left and a right mesh. A box spanning both
    // has its centre in the midline -- between the two deltoids, inside the
    // ribcage, on neither muscle -- so the camera aimed at empty space and
    // pulled back far enough to hold both, which is most of the torso. Pick
    // the side facing the camera so the framed muscle is the visible one.
    const boxOf = (m) => {
      const b = new THREE.Box3();
      const v = new THREE.Vector3();
      const pos = m.geometry.attributes.position;
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
      // "Facing the camera" = nearest to it. Framing the far deltoid would
      // put the near one between it and the lens.
      const score = -b.getCenter(new THREE.Vector3()).distanceTo(this.camera.position);
      if (score > best) { best = score; box = b; }
    }
    if (!box || box.isEmpty()) return false;

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    // Context floor: never crop closer than this fraction of the whole body,
    // so a small muscle is still shown in its place rather than as an
    // abstract blob.
    const bodyBox = new THREE.Box3();
    this._expandPosedBox(bodyBox);
    const bodyDim = bodyBox.isEmpty()
      ? Math.max(size.x, size.y, size.z)
      : Math.max(...bodyBox.getSize(new THREE.Vector3()).toArray());
    const muscleDim = Math.max(size.x, size.y, size.z);
    const framed = Math.max(muscleDim * 2.2, bodyDim * 0.28);
    const dist = (framed / 2) / Math.tan((this.camera.fov * Math.PI) / 360);

    // Approach from the direction the camera is already in, so a focus move
    // never swings the body round behind itself -- that reads as the model
    // jumping rather than the camera moving.
    const dir = this.camera.position.clone().sub(this.controls.target);
    if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
    dir.normalize();
    // Vertical offset, as a fraction of the MUSCLE's own size rather than the
    // framed size. Scaling it by `framed` meant a muscle that hit the
    // context floor got an offset sized by the whole body -- 0.172 units for
    // a deltoid, which slid the muscle noticeably off centre instead of
    // nudging it. The offset should be proportional to the thing being
    // looked at.
    const off = (opts && opts.offset) || 0.25;
    const lift = Math.min(muscleDim * off, framed * 0.06);
    const pos = center.clone()
      .add(dir.multiplyScalar(dist))
      .add(new THREE.Vector3(0, lift, 0));   // slight lift: sits it centred-high
    this.lerpTo(pos, center);
    this.focused = id;
    return true;
  }

  /**
   * Return to the framing that fits the whole body, animated.
   *
   * Uses the UNION of several instants through the clip, the same way
   * playClip does, not the pose at this instant. Framing the current pose
   * looks right for one frame and then wrong: the animation keeps running
   * during the 620ms lerp, so the body the camera was fitted to is not the
   * body that arrives. Measured, reset came back to 3.44 units where the
   * initial fit was 3.16 -- a visible 9% overshoot that varied with whichever
   * frame you happened to press the button on.
   */
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
      this.currentAction.time = was;      // never disturb playback position
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

  /**
   * Start a smooth camera move. Interpolation runs in _animate, not on a
   * timer: a setInterval-driven lerp drifts against the render loop and
   * stutters visibly at low frame rates, which is exactly when a user is
   * already struggling to read the model.
   */
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
    const e = L.t < 0.5 ? 2 * L.t * L.t : 1 - Math.pow(-2 * L.t + 2, 2) / 2;  // easeInOut
    this.camera.position.lerpVectors(L.fromPos, L.toPos, e);
    this.controls.target.lerpVectors(L.fromTar, L.toTar, e);
    const d = this.camera.position.distanceTo(this.controls.target);
    this.camera.near = Math.max(d / 100, 0.01);
    this.camera.far = d * 10;
    this.camera.updateProjectionMatrix();
    if (L.t >= 1) this._lerp = null;
  }

  /** The camera position/target that frames `box`, without applying it. */
  _framingFor(box) {
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const dist = (maxDim / 2) / Math.tan((this.camera.fov * Math.PI) / 360) * 1.9;
    const position = (size.z <= size.x)
      ? new THREE.Vector3(center.x, center.y, center.z + dist)
      : new THREE.Vector3(center.x + dist, center.y, center.z);
    return { position, target: center, dist };
  }

  _applyFraming(box) {
    if (box.isEmpty()) return;
    this._lerp = null;              // an explicit reframe wins over a lerp
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const dist = (maxDim / 2) / Math.tan((this.camera.fov * Math.PI) / 360) * 1.9;

    // Keep world Y as up and stand off along whichever horizontal axis the
    // body is thinner in -- the axis you are not looking down. Choosing the
    // globally thinnest axis instead put the camera overhead for a supine
    // clip, framing the bridge end-on down the length of the body: correct
    // data, unreadable view. Up stays world Y even for a lying body, which is
    // how you would watch someone from the side, and never renders upside down.
    if (size.z <= size.x) {
      this.camera.position.set(center.x, center.y, center.z + dist);
    } else {
      this.camera.position.set(center.x + dist, center.y, center.z);
    }
    this.camera.up.set(0, 1, 0);
    this.camera.near = dist / 100;
    this.camera.far = dist * 10;
    this.camera.updateProjectionMatrix();
    this.controls.target.copy(center);
    this.controls.update();
  }

  paintStates(states) {
    this.states = states || {};
    const roles = this.roles;
    for (const [id, list] of this.meshes) {
      const st = this.states[id];
      const role = roles ? roles[id] : null;
      // Exercise roles take precedence when an exercise is being demonstrated;
      // assessment colours are the default view.
      const col = roles
        ? (role === 'primary' ? COLORS.primary : role === 'secondary' ? COLORS.secondary : COLORS.base)
        : id === this.selected ? COLORS.sel
        : st === 'short' ? COLORS.short
        : st === 'weak' ? COLORS.weak
        : COLORS.base;
      const dim = roles
        ? !role
        : Object.keys(this.states).length > 0 && !st && id !== this.selected;
      for (const m of list) {
        m.material.color.setHex(col);
        // EMISSIVE ACCENT on the active muscle.
        //
        // Base colour alone is not enough to find a selection. In the
        // exercise library the whole body is darkened to 0.42, and against
        // that a recoloured muscle still reads as "some slightly different
        // brown" -- especially for a muscle that is partly occluded, which is
        // most of them. Emissive light is not affected by the scene lighting
        // or by how steeply the surface faces the camera, so it stays legible
        // on a muscle lying edge-on or half behind another.
        if (m.material.emissive) {
          if (id === this.selected) {
            // Pre-multiply the colour instead of setting emissiveIntensity.
            // These are MeshPhongMaterials and Phong IGNORES
            // emissiveIntensity -- it only reads `emissive`. Setting the
            // intensity looked correct in the material inspector (0.55) and
            // did nothing on screen, which is the sort of "the data is right
            // and the render is wrong" gap that has caught me repeatedly here.
            m.material.emissive.setHex(COLORS.accent).multiplyScalar(0.6);
          } else {
            m.material.emissive.setHex(0x000000);
          }
        }
        // Dimming used to be opacity 0.22 with depthWrite OFF. On the
        // assessment body that reads fine, because only a handful of muscles
        // are dimmed. In the exercise library almost the WHOLE body is dimmed,
        // and ~90 unsorted transparent layers stack into a smear you cannot
        // read a movement out of -- the model was posed correctly and looked
        // like a blur. Dim by DARKENING an opaque mesh instead: the silhouette
        // stays solid, so the posture is legible, and the highlighted muscles
        // still pop.
        if (dim) {
          m.material.color.multiplyScalar(0.42);
          m.material.transparent = false;
          m.material.opacity = 1;
          m.material.depthWrite = true;
        } else {
          m.material.transparent = false;
          m.material.opacity = 1;
          m.material.depthWrite = true;
        }
      }
    }
  }

  /** Show or hide the skeletal context layer. */
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
    for (const h of hits) if (h.object.visible && h.object.userData.muscleId) return h.object;
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

  _animate() {
    requestAnimationFrame(() => this._animate());
    // CLAMP THE FRAME DELTA.
    //
    // requestAnimationFrame stops while the tab or the canvas is hidden, but
    // the Clock keeps running, so the first frame back reports a delta of
    // however long that was -- seconds, sometimes. That single frame then
    // completes an entire camera lerp instantly (the test caught exactly
    // this: "lerp was 1 done after 50ms") and advances the animation mixer by
    // a whole rep, which looks like the model teleporting when you switch
    // back to the tab. 100ms is a generous real frame; anything longer is a
    // gap, not a frame.
    const dt = Math.min(this._clock.getDelta(), 0.1);
    if (this.mixer && !this.scrubbing) this.mixer.update(dt);
    this._tickLerp(dt);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Load the skinned+animated model. Replaces the static region meshes: a
   * skinned mesh must travel with its armature, so the animated build is one
   * file rather than eleven.
   */
  async loadAnimated(url = 'models/animated.glb') {
    if (this.animatedLoaded) return;
    const loader = new GLTFLoader();
    const gltf = await new Promise((res, rej) => loader.load(url, res, undefined, rej));

    // Drop the static meshes so we do not render two overlapping bodies.
    for (const [, list] of this.meshes) for (const m of list) m.parent && m.parent.remove(m);
    this.meshes.clear();
    for (const b of this.bones) b.parent && b.parent.remove(b);
    this.bones = [];

    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      const id = o.name.replace(/__(l|r)(_\d+)?$/, '');
      o.material = new THREE.MeshPhongMaterial({
        color: COLORS.base, shininess: 18, specular: 0x222222,
        transparent: true, opacity: 1, skinning: true,
      });
      o.userData.muscleId = id;
      o.frustumCulled = false;   // skinned bounds are wrong until posed
      if (!this.meshes.has(id)) this.meshes.set(id, []);
      this.meshes.get(id).push(o);
    });

    this.root.add(gltf.scene);
    this.mixer = new THREE.AnimationMixer(gltf.scene);

    // The build keyframes the setup posture on a parent empty (it cannot go on
    // the armature: the exporter needs that node for its Z-up -> Y-up
    // conversion). glTF has no notion of "these two clips belong together", so
    // the exporter emits "<clip>" and "<clip>__posture" as separate
    // animations -- and playing only the first left every lying-down exercise
    // performed standing, which is the exact bug this version fixes.
    // Merge each pair back into one clip on load.
    const byName = new Map();
    for (const c of gltf.animations) byName.set(c.name, c);
    for (const c of gltf.animations) {
      if (c.name.endsWith('__posture')) continue;
      const post = byName.get(`${c.name}__posture`);
      const tracks = post ? [...c.tracks, ...post.tracks] : c.tracks;
      const merged = new THREE.AnimationClip(c.name, Math.max(c.duration, post ? post.duration : 0), tracks);
      this.clips.set(c.name, merged);
    }
    this.animatedLoaded = true;
    this._frame();
    this.paintStates(this.states);
    return [...this.clips.keys()];
  }

  /** Play a named clip, or stop everything when given null. */
  playClip(name) {
    if (!this.mixer) return false;
    if (this.currentAction) { this.currentAction.stop(); this.currentAction = null; }
    if (!name) { this.mixer.setTime(0); this.scrubbing = false; return false; }
    const clip = this.clips.get(name);
    if (!clip) return false;
    const a = this.mixer.clipAction(clip);
    a.reset();
    a.setLoop(THREE.LoopRepeat, Infinity);
    a.play();
    this.currentAction = a;
    // Frame the UNION of several points through the clip, not just the
    // mid-pose. The grounding pass translates the whole body during a
    // closed-chain movement, so a camera fitted to one instant lets the model
    // wander out of shot at the others -- the hip hinge framed its deep
    // position and then rose most of the way off the top of the canvas.
    this.frameForClip(clip);
    this.mixer.setTime(0);
    this.scrubbing = false;
    a.paused = false;
    return true;
  }

  setSpeed(x) { if (this.mixer) this.mixer.timeScale = x; }

  /** Duration of the clip currently playing, in seconds (0 if none). */
  clipDuration() {
    return this.currentAction ? this.currentAction.getClip().duration : 0;
  }

  /** Where we are in the current cycle, 0..1. */
  clipProgress() {
    const d = this.clipDuration();
    if (!d || !this.currentAction) return 0;
    return (this.currentAction.time % d) / d;
  }

  /**
   * Jump to a fraction of the cycle.
   *
   * Sets the ACTION's time, not just the mixer's. mixer.setTime rewinds the
   * whole mixer from zero and re-evaluates, which for a paused scrub means
   * every drag re-runs the clip from its start -- fine for a test harness
   * sampling a few instants, visibly laggy when dragged. Writing
   * action.time and calling mixer.update(0) evaluates exactly one frame.
   */
  scrubTo(frac) {
    if (!this.mixer || !this.currentAction) return;
    const d = this.clipDuration();
    if (!d) return;
    this.currentAction.time = Math.max(0, Math.min(1, frac)) * d;
    this.mixer.update(0);
    this.root.updateMatrixWorld(true);
  }

  /** Pause/resume without tearing down the action, so scrubbing keeps the pose. */
  setPaused(on) {
    this.scrubbing = !!on;
    if (this.currentAction) this.currentAction.paused = !!on;
  }

  /**
   * Exercise view: colour by role in the movement rather than by assessment.
   * Passing null returns to assessment colouring.
   */
  setRoles(roles) {
    this.roles = roles;
    this.paintStates(this.states);
  }
}

function opts_height(container) {
  return container.clientHeight && container.clientHeight > 100 ? container.clientHeight : 520;
}
