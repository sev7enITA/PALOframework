'use strict';

const {
	assertImmutableClaim,
	canonicalize,
	decisionOutput,
	normalizeBaseUrl,
	parseStringArray,
	sha256,
} = require('../dist/nodes/PaloGovernance/paloUtils.js');

function equal(actual, expected, label) {
	if (actual !== expected) throw new Error(`${label}: expected ${expected}, received ${actual}`);
}

function deepEqual(actual, expected, label) {
	equal(JSON.stringify(actual), JSON.stringify(expected), label);
}

function throws(action, pattern, label) {
	try {
		action();
	} catch (error) {
		if (pattern.test(String(error.message))) return;
		throw new Error(`${label}: unexpected error ${error.message}`);
	}
	throw new Error(`${label}: expected an error`);
}

const left = { z: 2, a: { d: 4, c: 3 } };
const right = { a: { c: 3, d: 4 }, z: 2 };
equal(canonicalize(left), canonicalize(right), 'canonical JSON');
equal(sha256(left), sha256(right), 'stable digest');

equal(decisionOutput({ status: 'allowed' }), 0, 'allow output');
equal(decisionOutput({ status: 'pending_approval' }), 1, 'approval output');
equal(decisionOutput({ status: 'denied' }), 2, 'deny output');

const claim = {
	format: 'palo-agentic-action-claim',
	schemaVersion: '1.1.0',
	claimId: 'claim-00000000-0000-0000-0000-000000000000',
	caseId: 'case-1',
	agentId: 'agent-test01',
	action: {},
};
deepEqual(assertImmutableClaim(JSON.stringify(claim)), claim, 'immutable claim');
throws(() => assertImmutableClaim({ caseId: 'case-1' }), /PALO Action Claim/, 'incomplete claim');

deepEqual(parseStringArray('["read:issue"]', 'Read Scopes'), ['read:issue'], 'scope parsing');
throws(() => parseStringArray('[1]', 'Read Scopes'), /array of strings/, 'invalid scope');

equal(normalizeBaseUrl('https://palo.example.com/'), 'https://palo.example.com', 'base URL');
throws(() => normalizeBaseUrl('file:///tmp/palo'), /HTTP or HTTPS/, 'invalid protocol');

console.log('PALO utility tests passed');
