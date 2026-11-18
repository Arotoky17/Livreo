import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = fileURLToPath(new URL('../', import.meta.url));
const npm = process.env.npm_execpath ?? path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
const processus = [];
let arretEnCours = false;
function arreter(code = 0) {
  if (arretEnCours) return;
  arretEnCours = true;
  for (const enfant of processus) enfant.kill();
  process.exitCode = code;
}
for (const dossier of ['backend', 'frontend']) {
  const enfant = spawn(process.execPath, [npm, 'run', 'dev'], { cwd: path.join(racine, dossier), stdio: 'inherit', windowsHide: true });
  processus.push(enfant);
  enfant.on('error', (erreur) => { console.error(`Impossible de demarrer ${dossier} : ${erreur.message}`); arreter(1); });
  enfant.on('exit', (code) => { if (!arretEnCours) arreter(code ?? 1); });
}
process.on('SIGINT', () => arreter());
process.on('SIGTERM', () => arreter());
