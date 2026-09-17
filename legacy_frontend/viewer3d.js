/**
 * 3D Anatomy Viewer & Exercise Demonstration
 *
 * Runs exclusively on a standard Three.js AnimationMixer pipeline with
 * baked GLTF skeletal animation tracks. Posture setups and dynamic motions
 * are automatically merged and routed to their respective exercises.
 */

import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';

if (typeof window !== 'undefined') {
  window.__THREE = THREE;
}

/**
 * Three.js loader utility for GLTF/GLB assets returning { scene, animations }.
 * Provides pure Three.js compatibility for React Three Fiber's useGLTF hook.
 *
 * @param {string} url - Asset path or hosted HTTPS URL (e.g. '/squat_sync.glb')
 * @returns {Promise<{ scene: THREE.Group, animations: THREE.AnimationClip[], gltf: object }>}
 */
export async function useGLTF(url) {
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        resolve({
          scene: gltf.scene,
          animations: gltf.animations || [],
          gltf
        });
      },
      undefined,
      (err) => {
        console.error(`[useGLTF] Error loading asset from ${url}:`, err);
        reject(err);
      }
    );
  });
}

/**
 * Three.js animation controller utility compatible with useAnimations hook.
 * Mixamo animation tracks are named differently depending on export settings
 * (commonly mixamo.com or Armature|mixamo.com|Layer0).
 *
 * @param {THREE.AnimationClip[]} animations - Array of animation clips
 * @param {THREE.Object3D} group - Root scene or group
 * @returns {{ actions: Object.<string, THREE.AnimationAction>, names: string[], mixer: THREE.AnimationMixer }}
 */
export function useAnimations(animations = [], group) {
  const mixer = new THREE.AnimationMixer(group);
  const actions = {};
  const names = [];

  if (Array.isArray(animations)) {
    for (const clip of animations) {
      names.push(clip.name);
      actions[clip.name] = mixer.clipAction(clip);
    }
  }

  return { actions, names, mixer };
}

if (typeof window !== 'undefined') {
  window.useGLTF = useGLTF;
  window.useAnimations = useAnimations;
}

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

function createMuscleMaterial() {
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

export const LAYER1_MUSCLES = new Set([
  'gluteus_maximus',
  'gluteus_medius',
  'tfl',
  'hamstrings',
  'rectus_femoris',
  'quadriceps',
  'rectus_abdominis',
  'latissimus_dorsi',
  'pectoralis_major',
  'deltoid',
  'upper_trapezius',
  'lower_trapezius',
  'biceps_brachii',
  'triceps_brachii',
  'brachioradialis',
  'gastrocnemius',
  'tibialis_anterior',
  'sternocleidomastoid',
  'masseter',
  'temporalis'
]);

export const LAYER2_MUSCLES = new Set([
  'iliopsoas',
  'piriformis',
  'adductor_group',
  'multifidus',
  'erector_spinae',
  'transversus_abdominis',
  'quadratus_lumborum',
  'pectoralis_minor',
  'rhomboids',
  'serratus_anterior',
  'rotator_cuff',
  'levator_scapulae',
  'deep_neck_flexors',
  'suboccipitals',
  'scalenes',
  'splenius',
  'pterygoids',
  'digastric',
  'brachialis',
  'pronators',
  'supinator',
  'wrist_extensors',
  'wrist_flexors',
  'finger_flexors',
  'finger_extensors',
  'hand_intrinsics',
  'soleus',
  'tibialis_posterior',
  'peroneals'
]);

export function isBoneMesh(name) {
  if (!name) return false;
  if (name.startsWith('bone__')) return true;
  const lower = name.toLowerCase();
  const skeletalKeywords = [
    'vertebra', 'disc', 'sacrum', 'coccyx', 'nuchal', 'pulposus', 'spine',
    'rib', 'sternum', 'xiphoid', 'costal',
    'hip bone', 'ilium', 'ischium', 'pubis', 'pelvis',
    'femur', 'patella', 'tibia', 'fibula',
    'calcaneus', 'cuboid', 'cuneiform', 'metatarsal', 'navicular', 'talus', 'sesamoid',
    'humerus', 'radius', 'ulna', 'clavicle', 'scapula',
    'scaphoid', 'lunate', 'triquetrum', 'pisiform', 'trapezium', 'trapezoid', 'capitate', 'hamate', 'metacarpal',
    'parietal', 'frontal', 'occipital', 'temporal', 'mandible', 'maxilla', 'zygomatic', 'skull', 'hyoid',
    'skeletal', 'joints.g', 'cartilage'
  ];
  if (skeletalKeywords.some(k => lower.includes(k))) return true;
  if (lower.includes('phalanx') && (lower.includes('foot') || lower.includes('hand'))) return true;
  return false;
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
    this.meshes = new Map();
    this.bones = [];
    this.bonesVisible = true;
    this.activeLayer = 'all'; // 'all' | 'layer1' | 'layer2' | 'skeleton'
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

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x555555, 1.2);
    this.scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(5, 10, 7);
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 1.0);
    rimLight.position.set(-5, 5, -5);
    this.scene.add(rimLight);

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

              if (o.name.startsWith('bone__')) {
                // Skeletal context meshes: rendered with non-interactive bone material.
                // It is critical that these skeletal context structures are deliberately given
                // NO muscle identifier. Without that explicit barrier, a structural bone could
                // be clicked and mistakenly looked up as an active muscle entity, which would be
                // a major clinical and functional error in the assessment viewer.
                // All bone geometries are strictly placed into the non-clickable bones collection
                // so they provide spatial orientation while refusing selection events completely.
                // Solid opaque bone material (ivory cream, roughness 0.55).
                // They remain completely separate from interactive muscle meshes at all times.
                o.material = createBoneMaterial();
                o.userData.isBone = true;
                o.visible = !!this.bonesVisible;
                this.bones.push(o);
                // Return immediately without assigning muscle identifiers or adding to meshes map.
                return;
              }

              // Non-bone meshes represent muscular anatomy:
              // Meshes are exported as "<muscle_id>__l" / "__r". glTF strips
              // "." from names, so the separator must not be a dot; the
              // trailing _NNN guard covers three.js de-duplicating names.
              // These meshes are registered into the interactive anatomical collection.
              const id = o.name.replace(/__(l|r)(_\d+)?$/, '');
              o.material = createMuscleMaterial();
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

  async loadAnimated(url = '/squat_sync.glb') {
    if (this.animatedLoaded) return [...this.clips.keys()];
    const loader = new GLTFLoader();
    let gltf;
    const cleanUrl = encodeURI(url);
    const loadUrl = cleanUrl.includes('?') ? cleanUrl : `${cleanUrl}?v=${Date.now()}`;
    try {
      gltf = await new Promise((res, rej) => loader.load(loadUrl, res, undefined, rej));
    } catch (err) {
      const fallbacks = [
        '/squat_sync.glb',
        '/squat%20sync.glb',
        '/squat_interactive-transformed.glb',
        '/squat_interactive.glb',
        'models/animated.glb'
      ];
      let loaded = false;
      for (const fb of fallbacks) {
        try {
          gltf = await new Promise((res, rej) => loader.load(`${fb}?v=${Date.now()}`, res, undefined, rej));
          loaded = true;
          break;
        } catch (e) {}
      }
      if (!loaded) throw err;
    }

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
      if (isBoneMesh(o.name)) {
        o.material = createBoneMaterial();
        o.userData.isBone = true;
        o.visible = this.activeLayer === 'skeleton' || (!!this.bonesVisible);
        this.bones.push(o);
        return;
      }
      o.material = createMuscleMaterial();
      o.userData.muscleId = id;
      o.frustumCulled = false;
      if (!this.meshes.has(id)) this.meshes.set(id, []);
      this.meshes.get(id).push(o);
    });

    this.root.add(gltf.scene);

    const animList = gltf.animations || [];
    if (animList.length === 0) {
      console.warn('[3D Viewer] Loaded GLB model, but found 0 animation clips in the file. Ensure "Animation" and "Skinning" are checked in Blender glTF export settings.');
    } else {
      console.log('[3D Viewer] Loaded animation clips:', animList.map(a => a.name));
    }

    // Initialize animation controller with useAnimations
    const { actions, names, mixer } = useAnimations(animList, gltf.scene);
    this.actions = actions;
    this.animNames = names;
    this.mixer = mixer;

    // 1. Index base posture clips (e.g. 'bridge__posture.001' -> 'bridge')
    const postureMap = new Map();
    for (const c of animList) {
      if (c.name.includes('__posture')) {
        const base = c.name.replace('__posture', '').replace(/\.\d+$/, '').trim().toLowerCase();
        postureMap.set(base, c);
      }
    }

    // 2. Merge dynamic action tracks with posture tracks so body positions correctly in space
    for (const c of animList) {
      if (c.name.includes('__posture')) continue;

      const base = c.name.replace(/\.\d+$/, '').trim().toLowerCase();
      const posture = postureMap.get(base);

      const tracks = posture ? [...c.tracks, ...posture.tracks] : c.tracks;
      const duration = c.duration || (posture ? posture.duration : 1);
      const mergedClip = new THREE.AnimationClip(c.name, duration, tracks);

      this.clips.set(c.name, mergedClip);
      this.clips.set(base, mergedClip);
    }

    // Register standalone postures if no dynamic motion track exists
    for (const [base, pClip] of postureMap.entries()) {
      if (!this.clips.has(base)) {
        this.clips.set(base, pClip);
      }
    }

    // 3. Register the baked Mixamo Romanian deadlift retarget track
    const retargetClip = 
      gltf.animations.find(c => c.name === "mixamo.com.002 Retarget") ||
      gltf.animations.find(c => c.name.toLowerCase().includes("retarget")) ||
      gltf.animations.find(c => c.name.toLowerCase().includes("mixamo"));

    if (retargetClip) {
      const deadliftAliases = [
        'mixamo.com.002 retarget',
        'single_leg_romanian_deadlift',
        'single-leg-romanian-deadlift',
        'single_leg_deadlift',
        'romanian_deadlift',
        'romanian-deadlift',
        'deadlift',
        'rdl',
        'hinge',
        'singlelegromaniandeadlift'
      ];
      for (const alias of deadliftAliases) {
        this.clips.set(alias, retargetClip);
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
    } catch (e) {}

    // Identify and prioritize the squat sync animation track from the new asset
    const squatClip = 
      this.clips.get('squat') ||
      this.clips.get('squat_sync') ||
      this.clips.get('squat sync') ||
      this.clips.get('bodyweight_squat') ||
      gltf.animations.find(c => c.name.toLowerCase() === 'squat') ||
      gltf.animations.find(c => c.name.toLowerCase().includes('squat')) ||
      gltf.animations.find(c => c.name.toLowerCase().includes('sync')) ||
      gltf.animations.find(c => c.name.toLowerCase().includes('mixamo')) ||
      gltf.animations.find(c => !c.name.includes('__posture')) ||
      gltf.animations[0];

    this.squatSyncClip = squatClip;

    // Mixamo animation tracks are named differently depending on export settings
    // (commonly mixamo.com or Armature|mixamo.com|Layer0):
    // Ensure animation controller plays the first available track from the new file:
    if (this.currentAction) {
      this.currentAction.stop();
    }

    if (squatClip) {
      // Stops any legacy animations and plays the new squat track
      const action = actions[squatClip.name] || this.mixer.clipAction(squatClip);
      action.reset().fadeIn(0.2).play();
      this.currentAction = action;
      this.currentClipName = squatClip.name;
      this.frameForClip(squatClip);
    } else if (names.length > 0) {
      actions[names[0]]?.reset().fadeIn(0.2).play();
      this.currentAction = actions[names[0]];
      this.currentClipName = names[0];
      const firstClip = gltf.animations[0];
      if (firstClip) this.frameForClip(firstClip);
    } else {
      const startClip = retargetClip || this.clips.get('bridge') || this.clips.values().next().value;
      if (startClip) {
        this.playClip(startClip.name);
      }
    }

    this.animatedLoaded = true;
    this._frame();
    this.paintStates(this.states);
    return [...this.clips.keys()];
  }

  _resolveClip(name) {
    if (!name) return null;
    const clean = name.toLowerCase().trim();
    const stripped = clean.replace(/[-_\s]/g, '');

    // User requested to use the new squat sync glb for all animations in the app:
    const squatClip = 
      this.squatSyncClip ||
      this.clips.get('squat') ||
      this.clips.get('squat_sync') ||
      this.clips.get('squat sync') ||
      this.clips.get('bodyweight_squat') ||
      [...this.clips.values()].find(c => c.name.toLowerCase().includes('squat')) ||
      [...this.clips.values()].find(c => c.name.toLowerCase().includes('sync')) ||
      [...this.clips.values()].find(c => c.name.toLowerCase().includes('mixamo'));

    // Universal override for all exercise animations in the app
    if (squatClip) {
      return squatClip;
    }

    // 1. Direct match
    if (this.clips.has(name)) return this.clips.get(name);
    if (this.clips.has(clean)) return this.clips.get(clean);

    // 2. Romanian deadlift alias routing
    if (
      stripped.includes('deadlift') || 
      stripped.includes('rdl') || 
      stripped.includes('romanian') ||
      stripped.includes('singleleg')
    ) {
      return this.clips.get('single_leg_romanian_deadlift') || 
             [...this.clips.values()].find(c => c.name.toLowerCase().includes('retarget'));
    }

    // 3. Glute bridge routing
    if (stripped.includes('bridge')) {
      return this.clips.get('bridge') || this.clips.get('bridge.001');
    }

    // 4. Squat and Mixamo animation track routing (mixamo.com, Armature|mixamo.com|Layer0, etc.)
    if (stripped.includes('squat')) {
      return this.clips.get('squat') ||
             this.clips.get('bodyweight_squat') ||
             this.clips.get('mixamo.com') ||
             this.clips.get('Armature|mixamo.com|Layer0') ||
             (this.animNames && this.animNames[0] ? this.clips.get(this.animNames[0]) : null) ||
             [...this.clips.values()].find(c => c.name.toLowerCase().includes('squat')) ||
             [...this.clips.values()].find(c => c.name.toLowerCase().includes('mixamo'));
    }

    // 5. Normalized key scan
    for (const [key, clip] of this.clips.entries()) {
      const normKey = key.toLowerCase().replace(/\.\d+$/, '').replace(/[-_\s]/g, '');
      if (normKey === stripped || normKey.includes(stripped) || stripped.includes(normKey)) {
        return clip;
      }
    }

    return (
      (this.animNames && this.animNames[0] ? this.clips.get(this.animNames[0]) : null) ||
      this.clips.get('mixamo.com.002 Retarget') ||
      this.clips.get('mixamo.com') ||
      this.clips.get('Armature|mixamo.com|Layer0') ||
      this.clips.values().next().value
    );
  }

  playClip(name) {
    if (!this.mixer) return false;

    if (!name) {
      if (this.currentAction) {
        this.currentAction.stop();
        this.currentAction = null;
      }
      return false;
    }

    const clip = this._resolveClip(name);
    if (!clip) {
      console.warn('[viewer3d] Clip not found for:', name);
      return false;
    }

    if (this.currentAction) {
      this.currentAction.stop();
    }

    const action = this.actions?.[clip.name] || this.mixer.clipAction(clip);
    action.reset();
    action.fadeIn(0.2);
    action.setEffectiveTimeScale(1.0);
    action.setEffectiveWeight(1.0);
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.clampWhenFinished = false;
    action.play();

    this.currentAction = action;
    this.currentClipName = clip.name;
    this.scrubbing = false;
    action.paused = false;

    this.frameForClip(clip);
    return true;
  }

  setSpeed(x) {
    if (this.mixer) this.mixer.timeScale = x;
  }

  clipDuration() {
    if (this.currentAction) return this.currentAction.getClip().duration;
    return 0;
  }

  clipProgress() {
    if (this.currentAction) {
      const d = this.clipDuration();
      if (!d) return 0;
      return (this.currentAction.time % d) / d;
    }
    return 0;
  }

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

      const isL1 = LAYER1_MUSCLES.has(id);
      const isL2 = LAYER2_MUSCLES.has(id) || (!isL1 && true);

      let layerVisible = true;
      if (this.activeLayer === 'layer1') {
        layerVisible = isL1;
      } else if (this.activeLayer === 'layer2') {
        layerVisible = isL2;
      } else if (this.activeLayer === 'skeleton') {
        layerVisible = false;
      }

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
        m.visible = layerVisible;
      }
    }
    for (const b of this.bones) {
      if (b.material) {
        b.material.color.setHex(COLORS.bone);
        b.material.transparent = false;
        b.material.opacity = 1.0;
        b.material.depthWrite = true;
      }
      if (this.activeLayer === 'skeleton') {
        b.visible = true;
      } else if (this.activeLayer === 'layer2') {
        b.visible = true;
      } else {
        b.visible = !!this.bonesVisible;
      }
    }
  }

  setLayer(layer) {
    this.activeLayer = layer || 'all';
    this.paintStates(this.states);
  }

  setBonesVisible(on) {
    this.bonesVisible = !!on;
    if (this.activeLayer === 'skeleton') {
      for (const b of this.bones) b.visible = true;
    } else {
      for (const b of this.bones) b.visible = !!on;
    }
  }

  select(id) {
    this.selected = id;
    this.paintStates(this.states);
    this._updateDynamicHighlights();
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
      const name = h.object.name || '';
      // Filter out clicks on bones or the rig
      if (name.includes('mixamorig') || isBoneMesh(name) || h.object.userData.isBone) {
        continue;
      }
      if (h.object.visible && (h.object.userData.muscleId || name)) {
        return h.object;
      }
    }
    return null;
  }

  _updateDynamicHighlights() {
    this.root.traverse((child) => {
      if ((child.isSkinnedMesh || child.isMesh) && child.material && !child.userData.isBone) {
        // Clone material instance so highlights don't bleed across all meshes
        if (!child.userData.originalEmissive) {
          child.material = child.material.clone();
          child.userData.originalEmissive = child.material.emissive?.clone() || new THREE.Color(0x000000);
        }

        const id = child.userData.muscleId || child.name;
        if (id === this.selected || child.name === this.selected) {
          child.material.emissive.setHex(0x00ff88); // Bright highlight for selected muscle
          child.material.emissiveIntensity = 0.6;
        } else if (id === this.hovered || child.name === this.hovered) {
          child.material.emissive.setHex(0x3399ff); // Subtle hover glow
          child.material.emissiveIntensity = 0.3;
        } else {
          child.material.emissive.copy(child.userData.originalEmissive);
          child.material.emissiveIntensity = 0;
        }
      }
    });
  }

  _onMove(e) {
    const obj = this._pick(e);
    const id = obj ? (obj.userData.muscleId || obj.name) : null;
    if (id === this.hovered) return;
    this.hovered = id;
    this.renderer.domElement.style.cursor = id ? 'pointer' : 'default';
    this._updateDynamicHighlights();
    const label = document.getElementById('v3d-label');
    if (label) {
      label.textContent = id ? (window.muscleName ? window.muscleName(id) : id) : '';
      label.style.opacity = id ? 1 : 0;
    }
  }

  _onClick(e) {
    const obj = this._pick(e);
    if (!obj) {
      // onPointerMissed: Deselect when clicking empty space
      this.select(null);
      if (this.onSelect) this.onSelect(null);
      return;
    }
    const name = obj.name || '';
    // Filter out clicks on bones or the rig
    if (name.includes('mixamorig') || name.toLowerCase().includes('bone')) {
      return;
    }
    const id = obj.userData.muscleId || name;
    this.select(id);
    if (this.onSelect) this.onSelect(id);
  }

  _animate() {
    requestAnimationFrame((t) => this._animate(t));

    const delta = Math.min(this._clock.getDelta(), 0.1);

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