import { createHash } from 'node:crypto';

export type PaloDecision = 'allowed' | 'pending_approval' | 'denied';

export interface PaloGatewayResponse {
	status: PaloDecision;
	approvalId?: string;
	[key: string]: unknown;
}

export function canonicalize(value: unknown): string {
	if (value === null || typeof value !== 'object') {
		return JSON.stringify(value);
	}

	if (Array.isArray(value)) {
		return `[${value.map((entry) => canonicalize(entry)).join(',')}]`;
	}

	const record = value as Record<string, unknown>;
	return `{${Object.keys(record)
		.sort()
		.map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`)
		.join(',')}}`;
}

export function sha256(value: unknown): string {
	return createHash('sha256').update(canonicalize(value)).digest('hex');
}

export function parseObject(value: unknown, fieldName: string): Record<string, unknown> {
	const parsed = typeof value === 'string' ? JSON.parse(value) : value;
	if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
		throw new Error(`${fieldName} must be a JSON object`);
	}
	return parsed as Record<string, unknown>;
}

export function parseStringArray(value: unknown, fieldName: string): string[] {
	const parsed = typeof value === 'string' ? JSON.parse(value) : value;
	if (!Array.isArray(parsed) || parsed.some((entry) => typeof entry !== 'string')) {
		throw new Error(`${fieldName} must be a JSON array of strings`);
	}
	return parsed;
}

export function normalizeBaseUrl(value: unknown): string {
	const url = new URL(String(value));
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		throw new Error('Gateway URL must use HTTP or HTTPS');
	}
	return url.toString().replace(/\/$/, '');
}

export function decisionOutput(response: PaloGatewayResponse): 0 | 1 | 2 {
	if (response.status === 'allowed') return 0;
	if (response.status === 'pending_approval') return 1;
	return 2;
}

export function assertImmutableClaim(value: unknown): Record<string, unknown> {
	const claim = parseObject(value, 'Immutable Claim');
	if (claim.format !== 'palo-agentic-action-claim' || claim.schemaVersion !== '1.1.0') {
		throw new Error('Immutable Claim must be a PALO Action Claim schemaVersion 1.1.0');
	}
	for (const field of ['claimId', 'caseId', 'agentId', 'action']) {
		if (!(field in claim)) throw new Error(`Immutable Claim is missing ${field}`);
	}
	return claim;
}
