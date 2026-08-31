const fs = require('fs');
const p = 'D:/大创作/游戏/Next Bigger Catch/game.js';
const code = fs.readFileSync(p, 'utf8');
try {
  new Function(code);
  console.log('SYNTAX OK, length=' + code.length);
} catch (e) {
  console.log('SYNTAX ERROR: ' + e.message);
}
