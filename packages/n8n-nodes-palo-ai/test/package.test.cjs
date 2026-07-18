'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const distManifest = JSON.parse(
	fs.readFileSync(path.join(root, 'dist', 'package.json'), 'utf8'),
);

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

assert(manifest.name === 'n8n-nodes-palo-ai', 'package name must remain stable');
assert(manifest.version === '0.2.0', 'full-cycle preview package version must remain 0.2.0');
assert(manifest.n8n?.strict === true, 'n8n strict package metadata is required');
assert(
	manifest.n8n?.nodes?.includes('dist/nodes/PaloGovernance/PaloGovernance.node.js'),
	'compiled governance node must be registered in package metadata',
);
assert(
	manifest.n8n?.nodes?.includes('dist/nodes/PaloGovernedAction/PaloGovernedAction.node.js'),
	'compiled governed-action node must be registered in package metadata',
);
assert(
	manifest.n8n?.credentials?.includes('dist/credentials/PaloApi.credentials.js'),
	'compiled credential type must be registered in package metadata',
);
assert(distManifest.name === manifest.name, 'dist manifest must match package name');
assert(distManifest.version === manifest.version, 'dist manifest must match package version');

for (const file of [
	'dist/nodes/PaloGovernance/PaloGovernance.node.js',
	'dist/nodes/PaloGovernance/PaloGovernance.node.json',
	'dist/nodes/PaloGovernedAction/PaloGovernedAction.node.js',
	'dist/nodes/PaloGovernedAction/PaloGovernedAction.node.json',
	'dist/credentials/PaloApi.credentials.js',
	'README.md',
	'LICENSE',
]) {
	assert(fs.existsSync(path.join(root, file)), `installable package file missing: ${file}`);
}

const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
assert(/not for production authorization/i.test(readme), 'README must retain preview disclaimer');
assert(/not published to npm/i.test(readme), 'README must state npm publication is deferred');

console.log('PALO package metadata and installability checks passed');
