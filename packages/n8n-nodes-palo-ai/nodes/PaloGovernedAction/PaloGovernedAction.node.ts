import { randomBytes, randomUUID } from 'node:crypto';

import type {
	IExecuteFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	assertImmutableClaim,
	assuranceOutput,
	normalizeBaseUrl,
	parseObject,
	parseStringArray,
	sha256,
	type PaloAssuranceResponse,
} from '../PaloGovernance/paloUtils';

const actionOperations = ['read', 'create', 'update', 'delete', 'execute', 'delegate'].map(
	(value) => ({ name: value.charAt(0).toUpperCase() + value.slice(1), value }),
);

export class PaloGovernedAction implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PALO Governed Action',
		name: 'paloGovernedAction',
		icon: {
			light: 'file:../PaloGovernance/palo.svg',
			dark: 'file:../PaloGovernance/palo.dark.svg',
		},
		group: ['transform'],
		version: 1,
		description: 'Authorize, execute and verify the declared effect of an agent action',
		subtitle: '={{$parameter["operation"]}}',
		defaults: { name: 'PALO Governed Action' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [
			NodeConnectionTypes.Main,
			NodeConnectionTypes.Main,
			NodeConnectionTypes.Main,
			NodeConnectionTypes.Main,
		],
		outputNames: ['Verified', 'Review Required', 'Denied', 'Execution Failed'],
		usableAsTool: true,
		credentials: [{ name: 'paloApi', required: true }],
		properties: [
			{
				displayName:
					'Full-cycle developer preview: PALO authorizes the exact claim, invokes an operator-provisioned trusted executor, verifies authoritative post-state and opens an incident when the result is mismatched or inconclusive.',
				name: 'previewNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Execute Governed Action',
						value: 'execute',
						description: 'Create Action Claim 1.2 and run the complete assurance cycle',
						action: 'Execute a governed action',
					},
					{
						name: 'Resume Approved Action',
						value: 'resume',
						description: 'Execute the exact immutable claim after a bound approval',
						action: 'Resume an approved governed action',
					},
				],
				default: 'execute',
			},
			{
				displayName: 'Case ID', name: 'caseId', type: 'string', default: '', required: true,
				displayOptions: { show: { operation: ['execute'] } },
			},
			{
				displayName: 'Agent ID', name: 'agentId', type: 'string', default: '', required: true,
				displayOptions: { show: { operation: ['execute'] } },
			},
			{
				displayName: 'Action', name: 'proposedTool', type: 'string', default: '', placeholder: 'catalog_update', required: true,
				description: 'Registered tool name handled by the trusted PALO executor',
				displayOptions: { show: { operation: ['execute'] } },
			},
			{
				displayName: 'Action Operation', name: 'actionOperation', type: 'options', options: actionOperations, default: 'execute',
				displayOptions: { show: { operation: ['execute'] } },
			},
			{
				displayName: 'Resource', name: 'resource', type: 'string', default: '', placeholder: 'catalog:item', required: true,
				displayOptions: { show: { operation: ['execute'] } },
			},
			{
				displayName: 'Target Path', name: 'path', type: 'string', default: '/', required: true,
				displayOptions: { show: { operation: ['execute'] } },
			},
			{
				displayName: 'Tenant ID', name: 'tenantId', type: 'string', default: '',
				description: 'Optional tenant boundary bound into the Effect Contract and capability',
				displayOptions: { show: { operation: ['execute'] } },
			},
			{
				displayName: 'Arguments (JSON)', name: 'arguments', type: 'json', default: '{}', required: true,
				displayOptions: { show: { operation: ['execute'] } },
			},
			{
				displayName: 'Argument Schema (JSON)', name: 'argumentSchema', type: 'json', default: '{}', required: true,
				description: 'Must match the trusted schema registered in the agent authority profile',
				displayOptions: { show: { operation: ['execute'] } },
			},
			{
				displayName: 'Expected Result Contract (JSON)', name: 'effectDefinition', type: 'json', required: true,
				default: '{"preconditions":[],"expectedEffects":[],"forbiddenEffects":[],"verification":{"windowSeconds":30,"onInconclusive":"hold_and_review","maxAttempts":1}}',
				description: 'Closed predicate DSL; arbitrary code and expressions are not executed by PALO',
				displayOptions: { show: { operation: ['execute'] } },
			},
			{
				displayName: 'Read Scopes (JSON Array)', name: 'readScopes', type: 'json', default: '[]',
				displayOptions: { show: { operation: ['execute'] } },
			},
			{
				displayName: 'Write Scopes (JSON Array)', name: 'writeScopes', type: 'json', default: '[]',
				displayOptions: { show: { operation: ['execute'] } },
			},
			{
				displayName: 'Network Intent', name: 'networkIntent', type: 'options',
				options: [{ name: 'Bidirectional', value: 'bidirectional' }, { name: 'None', value: 'none' }, { name: 'Read', value: 'read' }, { name: 'Write', value: 'write' }],
				default: 'none', displayOptions: { show: { operation: ['execute'] } },
			},
			{
				displayName: 'Network Host', name: 'networkHost', type: 'string', default: '', placeholder: 'api.example.com',
				displayOptions: { show: { operation: ['execute'], networkIntent: ['read', 'write', 'bidirectional'] } },
			},
			{
				displayName: 'Sequence Number', name: 'sequenceNumber', type: 'number', typeOptions: { minValue: 1, numberPrecision: 0 }, default: 1,
				displayOptions: { show: { operation: ['execute'] } },
			},
			{
				displayName: 'Claim Expiry (Seconds)', name: 'expirySeconds', type: 'number', typeOptions: { minValue: 30, maxValue: 3600, numberPrecision: 0 }, default: 300,
				displayOptions: { show: { operation: ['execute'] } },
			},
			{
				displayName: 'Immutable Claim 1.2 (JSON)', name: 'immutableClaim', type: 'json', default: '{}', required: true,
				description: 'Use the exact claim from the Review Required output',
				displayOptions: { show: { operation: ['resume'] } },
			},
			{
				displayName: 'Approval ID', name: 'approvalId', type: 'string', default: '', required: true,
				displayOptions: { show: { operation: ['resume'] } },
			},
			{
				displayName: 'Executor ID', name: 'executorId', type: 'string', default: 'executor-palo-default', required: true,
				description: 'Trusted executor manifest and operator-provisioned handler',
			},
			{
				displayName: 'Verifier ID', name: 'verifierId', type: 'string', default: 'verifier-palo-default', required: true,
				description: 'Authoritative post-state verifier',
			},
			{
				displayName: 'Capability TTL (Seconds)', name: 'capabilityTtlSeconds', type: 'number', typeOptions: { minValue: 5, maxValue: 300, numberPrecision: 0 }, default: 60,
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const inputs = this.getInputData();
		const outputs: INodeExecutionData[][] = [[], [], [], []];
		const credentials = await this.getCredentials('paloApi');
		const baseUrl = normalizeBaseUrl(credentials.baseUrl);

		for (let itemIndex = 0; itemIndex < inputs.length; itemIndex++) {
			try {
				const operation = this.getNodeParameter('operation', itemIndex) as 'execute' | 'resume';
				const claim = operation === 'execute'
					? buildActionClaim(this, itemIndex)
					: assertImmutableClaim(this.getNodeParameter('immutableClaim', itemIndex));
				if (claim.schemaVersion !== '1.2.0') throw new NodeOperationError(this.getNode(), 'Governed execution requires an immutable Action Claim 1.2', { itemIndex });
				const body = {
					claim,
					...(operation === 'resume' ? { approvalId: this.getNodeParameter('approvalId', itemIndex) as string } : {}),
					executorId: this.getNodeParameter('executorId', itemIndex) as string,
					verifierId: this.getNodeParameter('verifierId', itemIndex) as string,
					capabilityTtlSeconds: this.getNodeParameter('capabilityTtlSeconds', itemIndex) as number,
				};
				const request: IHttpRequestOptions = { method: 'POST', url: `${baseUrl}/v1/actions/execute`, body, json: true, returnFullResponse: false };
				const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'paloApi', request)) as PaloAssuranceResponse;
				if (!['verified', 'review_required', 'denied', 'execution_failed', 'execution_unknown'].includes(response?.status)) {
					throw new NodeOperationError(this.getNode(), 'Malformed PALO assurance response', { itemIndex });
				}
				outputs[assuranceOutput(response)].push({
					json: { ...inputs[itemIndex].json, verified: response.status === 'verified', reviewRequired: response.status === 'review_required' || response.status === 'execution_unknown', claim: claim as JsonObject, palo: response as JsonObject, paloRequestDigest: sha256(body) },
					pairedItem: itemIndex,
				});
			} catch (error) {
				if (!this.continueOnFail()) throw new NodeOperationError(this.getNode(), error as Error, { itemIndex });
				outputs[3].push({ json: { ...inputs[itemIndex].json, palo: { verified: false, connectorError: true, message: error instanceof Error ? error.message : 'Unknown connector error' } }, pairedItem: itemIndex });
			}
		}
		return outputs;
	}
}

function buildActionClaim(context: IExecuteFunctions, itemIndex: number): Record<string, unknown> {
	const now = new Date();
	const expirySeconds = context.getNodeParameter('expirySeconds', itemIndex) as number;
	const argumentsValue = parseObject(context.getNodeParameter('arguments', itemIndex), 'Arguments');
	const argumentSchema = parseObject(context.getNodeParameter('argumentSchema', itemIndex), 'Argument Schema');
	const effectDefinition = parseObject(context.getNodeParameter('effectDefinition', itemIndex), 'Expected Result Contract');
	for (const field of ['preconditions', 'expectedEffects', 'forbiddenEffects']) {
		if (!Array.isArray(effectDefinition[field])) throw new NodeOperationError(context.getNode(), `Expected Result Contract ${field} must be an array`, { itemIndex });
	}
	if (!effectDefinition.verification || typeof effectDefinition.verification !== 'object') throw new NodeOperationError(context.getNode(), 'Expected Result Contract verification must be an object', { itemIndex });
	const caseId = context.getNodeParameter('caseId', itemIndex) as string;
	const agentId = context.getNodeParameter('agentId', itemIndex) as string;
	const resource = context.getNodeParameter('resource', itemIndex) as string;
	const targetPath = context.getNodeParameter('path', itemIndex) as string;
	const tenantId = context.getNodeParameter('tenantId', itemIndex, '') as string;
	const networkIntent = context.getNodeParameter('networkIntent', itemIndex) as string;
	return {
		format: 'palo-agentic-action-claim', schemaVersion: '1.2.0', claimId: `claim-${randomUUID()}`, caseId, agentId,
		requestedAt: now.toISOString(), expiresAt: new Date(now.getTime() + expirySeconds * 1000).toISOString(), nonce: randomBytes(24).toString('base64url'),
		sequenceNumber: context.getNodeParameter('sequenceNumber', itemIndex) as number, idempotencyKey: `n8n:${agentId}:${randomUUID()}`,
		action: {
			tool: context.getNodeParameter('proposedTool', itemIndex) as string,
			operation: context.getNodeParameter('actionOperation', itemIndex) as string,
			resource, path: targetPath, networkIntent,
			...(context.getNodeParameter('networkHost', itemIndex, '') ? { networkHost: context.getNodeParameter('networkHost', itemIndex, '') as string } : {}),
			arguments: argumentsValue, argumentsDigest: `sha256:${sha256(argumentsValue)}`, argumentSchemaDigest: `sha256:${sha256(argumentSchema)}`,
		},
		requestedScopes: { read: parseStringArray(context.getNodeParameter('readScopes', itemIndex), 'Read Scopes'), write: parseStringArray(context.getNodeParameter('writeScopes', itemIndex), 'Write Scopes') },
		externalNetwork: networkIntent !== 'none', delegation: { depth: 0, subagentCount: 0 },
		effectContract: {
			format: 'palo-agentic-effect-contract', schemaVersion: '1.0.0', effectContractId: `effect-${randomUUID()}`,
			resourceSelector: { resource, path: targetPath, ...(tenantId ? { tenantId } : {}) },
			preconditions: effectDefinition.preconditions, expectedEffects: effectDefinition.expectedEffects, forbiddenEffects: effectDefinition.forbiddenEffects,
			verification: effectDefinition.verification,
		},
		metadata: { platform: 'n8n', ...(tenantId ? { tenantId } : {}), executionId: context.getExecutionId(), executionMode: context.getMode(), workflowId: context.getWorkflow().id, workflowName: context.getWorkflow().name, nodeId: context.getNode().id, nodeType: context.getNode().type, nodeTypeVersion: context.getNode().typeVersion, itemIndex },
	};
}
