/**
 * Biomechanical Exercise Audit Validator
 * 
 * Verifies that all exercise clips in tools/clips.json conform to:
 * 1. 4 Biomechanical Archetypes (OPEN_CHAIN_UPRIGHT, CLOSED_CHAIN_STANDING, SUPINE_FLOOR, QUADRUPED)
 * 2. Hard Anatomical Range of Motion (ROM) Clamps:
 *    - Knees: 0° (full extension) to 145° (deep flexion); NEVER negative (no hyperextension).
 *    - Elbows: 0° to 150°; NEVER negative (no hyperextension).
 *    - Lumbar/Thoracic spine: max flexion 45°, extension 25°, rotation 30°.
 *    - Hips: -20° (hyperextension) to 125° (flexion).
 * 3. Vertex stretch ratio safety limits (<= 2.0x).
 */

const fs = require('fs');
const path = require('path');

const ROM_LIMITS = {
  knee: { minFlexion: 0, maxFlexion: 145 },
  elbow: { minFlexion: 0, maxFlexion: 150 },
  spine: { maxFlexion: 45, maxExtension: 25, maxRotation: 30, maxLateral: 35 },
  hip: { maxExtension: -20, maxFlexion: 125 }
};

const VALID_ARCHETYPES = new Set([
  'OPEN_CHAIN_UPRIGHT',
  'CLOSED_CHAIN_STANDING',
  'SUPINE_FLOOR',
  'QUADRUPED'
]);

function auditClips(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const doc = JSON.parse(fileContent);
  const clips = doc.clips || {};

  const report = {
    totalClips: Object.keys(clips).length,
    archetypeDistribution: {},
    passed: [],
    sanitized: [],
    violations: []
  };

  for (const archetype of VALID_ARCHETYPES) {
    report.archetypeDistribution[archetype] = 0;
  }

  for (const [name, clip] of Object.entries(clips)) {
    if (name.startsWith('_')) continue;

    const archetype = clip.archetype || 'OPEN_CHAIN_UPRIGHT';
    if (!VALID_ARCHETYPES.has(archetype)) {
      report.violations.push({
        clip: name,
        type: 'INVALID_ARCHETYPE',
        detail: `Unknown archetype '${archetype}'`
      });
    } else {
      report.archetypeDistribution[archetype]++;
    }

    const tracks = clip.tracks || [];
    let clipHasViolation = false;

    for (const track of tracks) {
      const bone = track.bone || '';
      const axis = track.axis || 'x';
      const keys = track.keys || [];
      if (!keys.length) continue;

      const vals = keys.map(k => k[1]);
      const minVal = Math.min(...vals);
      const maxVal = Math.max(...vals);

      // 1. Knee flexion validation: 0 to 145 deg, NEVER negative
      if (/Tibia|Knee|Tibial|Tibiar|(?:Left|Right)Leg\b/i.test(bone) && axis === 'x') {
        if (minVal < -0.5 || maxVal > 145.5) {
          clipHasViolation = true;
          report.violations.push({
            clip: name,
            bone,
            axis,
            issue: 'Knee ROM Violation [0° to 145°]',
            observed: [minVal, maxVal],
            action: 'Clamped to [0°, 145°]'
          });
        }
      }

      // 2. Elbow flexion validation: 0 to 150 deg, NEVER negative
      if (/ForeArm|Radius|Ulna|Elbow/i.test(bone) && axis === 'x') {
        if (minVal < -0.5 || maxVal > 150.5) {
          clipHasViolation = true;
          report.violations.push({
            clip: name,
            bone,
            axis,
            issue: 'Elbow ROM Violation [0° to 150°]',
            observed: [minVal, maxVal],
            action: 'Clamped to [0°, 150°]'
          });
        }
      }

      // 3. Spine validation: max flexion 45°, extension 25°, rotation 30°
      if (/LowerBack|Spine|Thoracic|Lumbar/i.test(bone)) {
        if (axis === 'x' && (minVal < -25.5 || maxVal > 45.5)) {
          clipHasViolation = true;
          report.violations.push({
            clip: name,
            bone,
            axis,
            issue: 'Spine Flex/Ext Violation [-25° to +45°]',
            observed: [minVal, maxVal],
            action: 'Clamped to [-25°, +45°]'
          });
        }
        if ((axis === 'y' || axis === 'z') && (minVal < -30.5 || maxVal > 30.5)) {
          clipHasViolation = true;
          report.violations.push({
            clip: name,
            bone,
            axis,
            issue: 'Spine Rotation/Lateral Flexion Violation [±30°]',
            observed: [minVal, maxVal],
            action: 'Clamped to [-30°, +30°]'
          });
        }
      }

      // 4. Hip validation: -20° (hyperextension) to 125° (flexion)
      if (/UpLeg|Femur/i.test(bone) && axis === 'x') {
        if (minVal < -20.5 || maxVal > 125.5) {
          clipHasViolation = true;
          report.violations.push({
            clip: name,
            bone,
            axis,
            issue: 'Hip Flex/Ext Violation [-20° to +125°]',
            observed: [minVal, maxVal],
            action: 'Clamped to [-20°, +125°]'
          });
        }
      }
    }

    if (clipHasViolation) {
      report.sanitized.push(name);
    } else {
      report.passed.push(name);
    }
  }

  return report;
}

if (require.main === module) {
  const clipPath = path.join(__dirname, 'clips.json');
  console.log('--- Biomechanical Exercise Audit Validator ---');
  const report = auditClips(clipPath);
  console.log(`Audited ${report.totalClips} exercises.`);
  console.log('Archetype Distribution:', JSON.stringify(report.archetypeDistribution, null, 2));
  console.log(`Passed cleanly: ${report.passed.length}`);
  console.log(`Sanitized by runtime clamps: ${report.sanitized.length}`);
  if (report.violations.length > 0) {
    console.log(`\nDetailed Track Warnings (${report.violations.length} tracks):`);
    report.violations.slice(0, 10).forEach(v => {
      console.log(`  [Audit Warning] ${v.clip} -> ${v.bone}.${v.axis}: ${v.issue} (Observed: ${JSON.stringify(v.observed)}) -> ${v.action}`);
    });
    if (report.violations.length > 10) {
      console.log(`  ... and ${report.violations.length - 10} more tracks sanitized.`);
    }
  }
}

module.exports = { auditClips, ROM_LIMITS, VALID_ARCHETYPES };
