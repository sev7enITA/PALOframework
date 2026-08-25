import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, realpathSync, symlinkSync } from 'node:fs';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const toolingRoot = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(toolingRoot, '../n8n-nodes-palo-ai');
const binDirectory = join(toolingRoot, 'node_modules', '.bin');
const [command, ...args] = process.argv.slice(2);

if (!command) {
	console.error('A tooling command is required.');
	process.exit(2);
}

const shimTarget = join(toolingRoot, 'node-cli-shim');
const shimDirectory = join(projectRoot, 'node_modules', '@n8n');
const shimLink = join(shimDirectory, 'node-cli');

mkdirSync(shimDirectory, { recursive: true });
if (existsSync(shimLink)) {
	if (realpathSync(shimLink) !== realpathSync(shimTarget)) {
		console.error(`Refusing to replace an existing package at ${shimLink}.`);
		process.exit(1);
	}
} else {
	symlinkSync(shimTarget, shimLink, process.platform === 'win32' ? 'junction' : 'dir');
}

const executable = join(binDirectory, process.platform === 'win32' ? `${command}.cmd` : command);
const result = spawnSync(executable, args, {
	cwd: projectRoot,
	env: {
		...process.env,
		PATH: `${binDirectory}${delimiter}${process.env.PATH ?? ''}`,
	},
	stdio: 'inherit',
	shell: process.platform === 'win32',
});

if (result.error) {
	console.error(`Unable to start ${command}: ${result.error.message}`);
	process.exit(1);
}

process.exit(result.status ?? 1);
