/**
 * Runs a command with environment variables set, portably.
 *
 * `VAR=value cmd` is POSIX shell syntax and fails on Windows, and this project
 * is developed on Windows. Rather than take a dependency on cross-env for two
 * convenience scripts, this does the same job in a few lines.
 *
 * Usage: node tools/run-with-env.mjs KEY=value [KEY=value ...] -- <cmd> [args]
 */
import { spawn } from 'node:child_process';

const argv = process.argv.slice(2);
const split = argv.indexOf('--');
if (split === -1) {
  console.error('Usage: node tools/run-with-env.mjs KEY=value ... -- <command> [args]');
  process.exit(2);
}

const env = { ...process.env };
for (const pair of argv.slice(0, split)) {
  const eq = pair.indexOf('=');
  if (eq < 1) {
    console.error(`Not a KEY=value assignment: ${pair}`);
    process.exit(2);
  }
  env[pair.slice(0, eq)] = pair.slice(eq + 1);
}

const [command, ...args] = argv.slice(split + 1);
if (!command) {
  console.error('No command given after --');
  process.exit(2);
}

// shell:true so that `npx`/`.cmd` shims resolve the same way they do in npm scripts.
const child = spawn(command, args, { env, stdio: 'inherit', shell: true });
child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 1)));
child.on('error', (err) => {
  console.error(err.message);
  process.exit(1);
});
