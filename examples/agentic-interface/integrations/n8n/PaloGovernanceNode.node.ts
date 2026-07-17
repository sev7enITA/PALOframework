import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { IExecuteFunctions } from 'n8n-core';
import { INodeExecutionData, INodeType, INodeTypeDescription, NodeOperationError } from 'n8n-workflow';

export class PaloGovernanceNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PALO Agent Governance', name: 'paloGovernance', icon: 'fa:robot', group: ['transform'], version: 2,
		description: 'Developer-preview example that submits canonical claims to a local PALO gateway; not for production authorization or tool execution.',
		defaults: { name: 'PALO Governance' }, inputs: ['main'], outputs: ['main'],
		properties: [
			{ displayName: 'Gateway URL', name: 'gatewayUrl', type: 'string', default: 'http://127.0.0.1:8787', required: true },
			{ displayName: 'Gateway Token', name: 'gatewayToken', type: 'string', typeOptions: { password: true }, default: '', required: true },
			{ displayName: 'Case File ID', name: 'caseId', type: 'string', default: '', required: true },
			{ displayName: 'Agent ID', name: 'agentId', type: 'string', default: '', required: true },
			{ displayName: 'Proposed Tool', name: 'proposedTool', type: 'string', default: '', required: true },
			{ displayName: 'Operation', name: 'operation', type: 'options', options: ['read', 'create', 'update', 'delete', 'execute', 'delegate'].map((name) => ({ name, value: name })), default: 'read', required: true },
			{ displayName: 'Resource', name: 'resource', type: 'string', default: '', required: true },
			{ displayName: 'Normalized Path', name: 'path', type: 'string', default: '/', required: true },
			{ displayName: 'Argument Schema (JSON)', name: 'argumentSchema', type: 'json', default: '{"type":"object"}', required: true },
			{ displayName: 'Sequence Number', name: 'sequenceNumber', type: 'number', default: 1, required: true },
			{ displayName: 'Read Scopes', name: 'readScopes', type: 'json', default: '[]', required: true },
			{ displayName: 'Write Scopes', name: 'writeScopes', type: 'json', default: '[]', required: true },
			{ displayName: 'External Network', name: 'externalNetwork', type: 'boolean', default: false },
			{ displayName: 'Network Host', name: 'networkHost', type: 'string', default: '' },
			{ displayName: 'Arguments (JSON)', name: 'arguments', type: 'json', default: '{}', required: true },
			{ displayName: 'Approval ID', name: 'approvalId', type: 'string', default: '', description: 'Experimental field only. This example regenerates claims and does not implement a production-safe immutable-claim approval resume.' },
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const canonical = (value: unknown): string => Array.isArray(value)
			? `[${value.map(canonical).join(',')}]`
			: value && typeof value === 'object'
				? `{${Object.keys(value as object).sort().map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}`
				: JSON.stringify(value);
		const items = this.getInputData();
		const output: INodeExecutionData[] = [];
		for (let i = 0; i < items.length; i++) {
			try {
				const gatewayUrl = (this.getNodeParameter('gatewayUrl', i) as string).replace(/\/$/, '');
				const gatewayToken = this.getNodeParameter('gatewayToken', i) as string;
				if (gatewayToken.length < 24) throw new Error('Gateway token must contain at least 24 characters');
				const args = this.getNodeParameter('arguments', i) as object;
				const argumentSchema = this.getNodeParameter('argumentSchema', i) as object;
				const now = new Date();
				const action: Record<string, unknown> = {
					tool: this.getNodeParameter('proposedTool', i), operation: this.getNodeParameter('operation', i), resource: this.getNodeParameter('resource', i), path: this.getNodeParameter('path', i),
					networkIntent: (this.getNodeParameter('externalNetwork', i) as boolean) ? 'read' : 'none', arguments: args,
					argumentsDigest: `sha256:${createHash('sha256').update(canonical(args)).digest('hex')}`,
					argumentSchemaDigest: `sha256:${createHash('sha256').update(canonical(argumentSchema)).digest('hex')}`,
				};
				const networkHost = this.getNodeParameter('networkHost', i) as string;
				if (networkHost) action.networkHost = networkHost;
				const claim = {
					format: 'palo-agentic-action-claim', schemaVersion: '1.1.0', claimId: `claim-${randomUUID()}`,
					agentId: this.getNodeParameter('agentId', i), caseId: this.getNodeParameter('caseId', i), action,
					requestedScopes: { read: this.getNodeParameter('readScopes', i), write: this.getNodeParameter('writeScopes', i) },
					externalNetwork: this.getNodeParameter('externalNetwork', i), delegation: { depth: 0, subagentCount: 0 },
					requestedAt: now.toISOString(), expiresAt: new Date(now.getTime() + 120000).toISOString(), nonce: randomBytes(24).toString('base64url'),
					idempotencyKey: `n8n:${this.getNodeParameter('agentId', i)}:${randomUUID()}`, sequenceNumber: this.getNodeParameter('sequenceNumber', i),
				};
				const approvalId = this.getNodeParameter('approvalId', i) as string;
				const decision = await this.helpers.httpRequest({
					method: 'POST', url: `${gatewayUrl}/v1/actions/verify`, headers: { Authorization: `Bearer ${gatewayToken}` },
					body: { claim, ...(approvalId ? { approvalId } : {}) }, json: true, timeout: 5000,
				});
				if (decision.status === 'denied') throw new NodeOperationError(this.getNode(), `PALO authority denied: ${(decision.reasons || []).join('; ')}`);
				output.push({ json: { authorized: decision.status === 'allowed', pendingApproval: decision.status === 'pending_approval', claim, decision }, pairedItem: { item: i } });
			} catch (error) {
				if (!this.continueOnFail()) throw error;
				output.push({ json: { authorized: false, error: error instanceof Error ? error.message : String(error) }, pairedItem: { item: i } });
			}
		}
		return [output];
	}
}
