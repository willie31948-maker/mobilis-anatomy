/**
 * Primary / secondary muscle involvement per exercise, plus the animation clip
 * that demonstrates it.
 *
 * Kept in a SEPARATE file from exercises.js on purpose. `targets` in
 * exercises.js answers a clinical question — "which muscle is this exercise
 * prescribed FOR, in which mode" — and the programme builder's safety rule
 * depends on it. This file answers a different, anatomical question: "which
 * muscles actually do work during the movement". Merging them would let a
 * display concern quietly change what gets prescribed.
 *
 * Concretely: the doorway pec stretch is PRESCRIBED for pectoralis major and
 * minor (targets), but the muscles WORKING to hold you there include the
 * rhomboids and lower trapezius. Those are different lists and both are right.
 *
 * `clip` names an animation from the Z-Biomechanics rig, or null when no
 * suitable mocap exists — in which case the app shows a static pose and says
 * so rather than playing a misleading movement.
 */

const EXERCISE_MUSCLES = {
  // ---- Hip ---------------------------------------------------------------
  half_kneeling_hip_flexor_stretch: { primary: ['iliopsoas'], secondary: ['rectus_femoris', 'gluteus_maximus'], clip: 'hip_flexor_stretch', note: 'The back glute squeeze is what makes the stretch real, so it works too.' },
  couch_stretch: { primary: ['rectus_femoris'], secondary: ['iliopsoas', 'gluteus_maximus'], clip: 'couch_stretch' },
  glute_bridge: { primary: ['gluteus_maximus', 'hamstrings'], secondary: ['erector_spinae', 'transversus_abdominis'], clip: 'bridge' },
  hip_thrust: { primary: ['gluteus_maximus'], secondary: ['hamstrings', 'quadriceps', 'transversus_abdominis'], clip: 'hip_thrust' },
  side_lying_hip_abduction: { primary: ['gluteus_medius'], secondary: ['tfl', 'quadratus_lumborum'], clip: 'hip_abduction', note: 'Rotating the top hip slightly back keeps TFL from taking over.' },
  copenhagen_plank: { primary: ['adductor_group'], secondary: ['transversus_abdominis', 'quadratus_lumborum'], clip: 'copenhagen' },
  monster_walk: { primary: ['gluteus_medius'], secondary: ['gluteus_maximus', 'tfl', 'quadriceps'], clip: 'hip_abduction' },
  single_leg_rdl: { primary: ['gluteus_maximus', 'hamstrings'], secondary: ['gluteus_medius', 'erector_spinae', 'multifidus', 'soleus'], clip: 'hinge' },

  // ---- Hamstrings / thigh -------------------------------------------------
  supine_hamstring_stretch: { primary: ['hamstrings'], secondary: ['gastrocnemius'], clip: 'leg_raise' },
  nordic_curl_eccentric: { primary: ['hamstrings'], secondary: ['gluteus_maximus', 'erector_spinae'], clip: 'nordic' },
  quad_setting: { primary: ['quadriceps'], secondary: ['rectus_femoris'], clip: 'quad_setting' },
  spanish_squat: { primary: ['quadriceps'], secondary: ['rectus_femoris', 'gluteus_maximus', 'soleus'], clip: 'squat' },

  // ---- Core / spine -------------------------------------------------------
  dead_bug: { primary: ['transversus_abdominis'], secondary: ['multifidus', 'rectus_abdominis', 'iliopsoas'], clip: 'dead_bug' },
  bird_dog: { primary: ['multifidus', 'transversus_abdominis'], secondary: ['gluteus_maximus', 'erector_spinae', 'deltoid'], clip: 'bird_dog' },
  side_plank: { primary: ['quadratus_lumborum'], secondary: ['gluteus_medius', 'transversus_abdominis', 'deltoid'], clip: 'side_plank' },
  ql_side_bend_stretch: { primary: ['quadratus_lumborum'], secondary: ['latissimus_dorsi', 'erector_spinae'], clip: 'side_bend' },
  cat_cow: { primary: ['erector_spinae', 'multifidus'], secondary: ['transversus_abdominis', 'rectus_abdominis'], clip: 'spine_flexion' },

  // ---- Shoulder / thoracic ------------------------------------------------
  doorway_pec_stretch: { primary: ['pectoralis_major', 'pectoralis_minor'], secondary: ['rhomboids', 'lower_trapezius', 'deltoid'], clip: 'doorway_pec_stretch', note: 'Prescribed for the pecs; the rhomboids and lower trap work to hold the position.' },
  pec_minor_release: { primary: ['pectoralis_minor'], secondary: ['pectoralis_major'], clip: null },
  prone_y_raise: { primary: ['lower_trapezius'], secondary: ['rhomboids', 'deltoid', 'rotator_cuff', 'erector_spinae'], clip: 'prone_y_raise' },
  wall_slide: { primary: ['serratus_anterior', 'lower_trapezius'], secondary: ['rotator_cuff', 'deltoid'], clip: 'wall_slide' },
  serratus_punch: { primary: ['serratus_anterior'], secondary: ['pectoralis_minor', 'triceps_brachii'], clip: 'serratus_punch' },
  band_external_rotation: { primary: ['rotator_cuff'], secondary: ['rhomboids', 'lower_trapezius', 'deltoid'], clip: 'shoulder_rotation' },
  thoracic_extension_roller: { primary: ['erector_spinae'], secondary: ['latissimus_dorsi', 'rhomboids'], clip: 'spine_extension' },
  lat_stretch_kneeling: { primary: ['latissimus_dorsi'], secondary: ['rhomboids', 'erector_spinae', 'triceps_brachii'], clip: 'lat_stretch' },
  face_pull: { primary: ['rhomboids', 'lower_trapezius'], secondary: ['rotator_cuff', 'deltoid', 'upper_trapezius'], clip: 'row' },
  deltoid_raise: { primary: ['deltoid'], secondary: ['rotator_cuff', 'upper_trapezius', 'serratus_anterior'], clip: 'shoulder_abduction' },
  sleeper_stretch: { primary: ['rotator_cuff'], secondary: ['deltoid'], clip: 'sleeper_stretch' },

  // ---- Neck ---------------------------------------------------------------
  chin_tuck: { primary: ['deep_neck_flexors'], secondary: ['suboccipitals', 'sternocleidomastoid'], clip: 'neck_flexion' },
  upper_trap_stretch: { primary: ['upper_trapezius'], secondary: ['levator_scapulae', 'scalenes'], clip: 'neck_side_bend' },
  levator_stretch: { primary: ['levator_scapulae'], secondary: ['upper_trapezius', 'splenius'], clip: 'neck_side_bend' },
  suboccipital_release: { primary: ['suboccipitals'], secondary: ['splenius', 'upper_trapezius'], clip: null },
  scm_stretch: { primary: ['sternocleidomastoid'], secondary: ['scalenes', 'upper_trapezius'], clip: 'neck_side_bend' },
  scalene_stretch: { primary: ['scalenes'], secondary: ['sternocleidomastoid', 'upper_trapezius'], clip: 'neck_side_bend' },
  diaphragmatic_breathing: { primary: ['transversus_abdominis'], secondary: ['scalenes', 'sternocleidomastoid'], clip: 'breathing', note: 'Aim is to DOWN-train the accessory breathing muscles shown in secondary.' },

  // ---- Jaw ----------------------------------------------------------------
  jaw_relaxation: { primary: ['masseter', 'temporalis'], secondary: ['pterygoids'], clip: null },
  masseter_release: { primary: ['masseter'], secondary: ['temporalis', 'pterygoids'], clip: null },
  controlled_jaw_opening: { primary: ['digastric'], secondary: ['pterygoids', 'masseter'], clip: 'jaw_open' },

  // ---- Arm / forearm / hand ----------------------------------------------
  wrist_extensor_eccentric: { primary: ['wrist_extensors'], secondary: ['finger_extensors', 'brachioradialis', 'supinator'], clip: 'wrist_extension' },
  wrist_flexor_eccentric: { primary: ['wrist_flexors'], secondary: ['finger_flexors', 'pronators'], clip: 'wrist_flexion' },
  wrist_flexor_stretch: { primary: ['wrist_flexors', 'finger_flexors'], secondary: ['pronators'], clip: 'wrist_extension' },
  wrist_extensor_stretch: { primary: ['wrist_extensors', 'finger_extensors'], secondary: ['supinator'], clip: 'wrist_flexion' },
  forearm_supination_pronation: { primary: ['supinator', 'pronators'], secondary: ['biceps_brachii', 'brachioradialis'], clip: 'forearm_rotation' },
  grip_strengthening: { primary: ['finger_flexors'], secondary: ['hand_intrinsics', 'wrist_flexors'], clip: 'grip' },
  finger_extension_band: { primary: ['finger_extensors'], secondary: ['hand_intrinsics', 'wrist_extensors'], clip: 'finger_extension' },
  median_nerve_glide: { primary: ['finger_flexors'], secondary: ['wrist_flexors', 'pronators', 'scalenes'], clip: 'nerve_glide' },
  thumb_opposition: { primary: ['hand_intrinsics'], secondary: ['finger_flexors'], clip: 'thumb_opposition' },
  biceps_curl: { primary: ['biceps_brachii'], secondary: ['brachialis', 'brachioradialis', 'deltoid'], clip: 'elbow_flexion' },
  hammer_curl: { primary: ['brachioradialis', 'brachialis'], secondary: ['biceps_brachii', 'wrist_extensors'], clip: 'elbow_flexion' },
  triceps_extension: { primary: ['triceps_brachii'], secondary: ['deltoid', 'transversus_abdominis'], clip: 'elbow_extension' },

  // ---- Lower leg ----------------------------------------------------------
  calf_stretch_knee_straight: { primary: ['gastrocnemius'], secondary: ['soleus', 'tibialis_posterior'], clip: 'ankle_dorsiflexion' },
  calf_stretch_knee_bent: { primary: ['soleus'], secondary: ['tibialis_posterior'], clip: 'ankle_dorsiflexion' },
  knee_to_wall_mobilisation: { primary: ['soleus'], secondary: ['gastrocnemius', 'tibialis_anterior'], clip: 'ankle_dorsiflexion' },
  heel_raise: { primary: ['gastrocnemius', 'soleus'], secondary: ['tibialis_posterior', 'peroneals'], clip: 'heel_raise' },
  band_eversion: { primary: ['peroneals'], secondary: ['tibialis_anterior'], clip: 'ankle_eversion' },
  single_leg_balance: { primary: ['peroneals', 'gluteus_medius'], secondary: ['soleus', 'tibialis_posterior', 'tibialis_anterior'], clip: 'single_leg_stance' },
  tib_raise: { primary: ['tibialis_anterior'], secondary: ['peroneals'], clip: 'ankle_dorsiflexion' },
  leg_press: { primary: ['quadriceps', 'gluteus_maximus'], secondary: ['hamstrings', 'adductor_group', 'gastrocnemius', 'soleus'], clip: 'leg_press' },
  push_up: { primary: ['pectoralis_major', 'triceps_brachii', 'deltoid'], secondary: ['serratus_anterior', 'transversus_abdominis', 'rectus_abdominis'], clip: 'push_up' },
  romanian_deadlift: { primary: ['hamstrings', 'gluteus_maximus'], secondary: ['erector_spinae', 'multifidus', 'latissimus_dorsi'], clip: 'hinge' },
};

module.exports = { EXERCISE_MUSCLES };
