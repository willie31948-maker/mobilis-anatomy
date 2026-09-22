const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldEffect = `  useEffect(() => {
    const actionName = exercise;
    const action = actions[actionName];
    if (!action) return;

    action.play();`;
    
const newEffect = `  useEffect(() => {
    const actionName = exercise;
    const action = actions[actionName];
    if (!action) return;

    Object.values(actions).forEach(a => {
      if (a && a !== action) a.stop();
    });

    action.play();`;

code = code.replace(oldEffect, newEffect);
code = code.replace(/}, \[actions, progress, playing\]\);/g, "}, [actions, progress, playing, exercise]);");

fs.writeFileSync('src/App.tsx', code);
console.log("Fixed animation switching");
