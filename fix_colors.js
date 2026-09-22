const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldColorLogic = `        const isExtensor = ['gluteus_maximus', 'rectus_femoris', 'vastus_lateralis', 'vastus_medialis', 'soleus', 'gastrocnemius'].includes(id);
        const isFlexor = ['tibialis_anterior', 'psoas_major', 'iliacus'].includes(id);
        const isHamstring = ['biceps_femoris', 'semitendinosus'].includes(id);
        const isCore = ['transversus_abdominis', 'rectus_abdominis', 'obliquus_externus'].includes(id);`;

const newColorLogic = `        let isExtensor = false;
        let isFlexor = false;
        let isHamstring = false;
        let isCore = ['transversus_abdominis', 'rectus_abdominis', 'obliquus_externus'].includes(id);
        let isUpperBack = false;

        if (exercise === 'squat' || exercise === 'lunge') {
            isExtensor = ['gluteus_maximus', 'rectus_femoris', 'vastus_lateralis', 'vastus_medialis', 'soleus', 'gastrocnemius'].includes(id);
            isFlexor = ['tibialis_anterior', 'psoas_major', 'iliacus'].includes(id);
            isHamstring = ['biceps_femoris', 'semitendinosus'].includes(id);
        } else if (exercise === 'hinge') {
            isExtensor = ['gluteus_maximus', 'biceps_femoris', 'semitendinosus', 'erector_spinae'].includes(id);
            isFlexor = ['rectus_femoris'].includes(id); // quad works as stabilizer mostly
            isHamstring = false; // it is the primary extensor here
        } else if (exercise === 'row') {
            isExtensor = ['latissimus_dorsi', 'trapezius', 'rhomboideus', 'biceps_brachii', 'brachialis', 'posterior_deltoid'].includes(id);
            isFlexor = ['pectoralis_major', 'anterior_deltoid'].includes(id);
            isHamstring = ['gluteus_maximus', 'biceps_femoris'].includes(id); // stabilize
        }`;
        
code = code.replace(oldColorLogic, newColorLogic);
fs.writeFileSync('src/App.tsx', code);
console.log("Fixed colors!");
