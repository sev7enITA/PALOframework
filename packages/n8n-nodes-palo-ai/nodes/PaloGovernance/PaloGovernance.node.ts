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
	decisionOutput,
	normalizeBaseUrl,
	parseObject,
	parseStringArray,
	sha256,
	type PaloGatewayResponse,
} from './paloUtils';

const operationOptions = ['read', 'create', 'update', 'delete', 'execute', 'delegate'].map(
	(value) => ({ name: value.charAt(0).toUpperCase() + value.slice(1), value }),
);

export class PaloGovernance implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PALO Governance',
		name: 'paloGovernance',
		icon: { light: 'file:palo.svg', dark: 'file:palo.dark.svg' },
		group: ['transform'],
		version: 1,
		description: 'Evaluate an agent action through the PALO governance gateway',
		subtitle: '={{$parameter["operation"]}}',
		defaults: { name: 'PALO Governance' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main, NodeConnectionTypes.Main, NodeConnectionTypes.Main],
		outputNames: ['Allowed', 'Approval Required', 'Denied'],
		usableAsTool: true,
		credentials: [{ name: 'paloApi', required: true }],
		properties: [
			{
				displayName:
					'Developer preview: this node makes PALO decisions visible. Production connectors and verified community-node status are not yet claimed.',
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
						name: 'Propose Action',
						value: 'propose',
						description: 'Submit a normalized Action Claim before a tool call',
						action: 'Propose an agent action',
					},
					{
						name: 'Resume Approved Action',
						value: 'resume',
						description: 'Re-evaluate the exact immutable claim after human approval',
						action: 'Resume an approved action',
					},
				],
				default: 'propose',
			},
			{
				displayName: 'Case ID',
				name: 'caseId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { operation: ['propose'] } },
			},
			{
				displayName: 'Agent ID',
				name: 'agentId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { operation: ['propose'] } },
			},
			{
				displayName: 'Proposed Tool',
				name: 'proposedTool',
				type: 'string',
				default: '',
				placeholder: 'jira_create_issue',
				required: true,
				displayOptions: { show: { operation: ['propose'] } },
			},
			{
				displayName: 'Action Operation',
				name: 'actionOperation',
				type: 'options',
				options: operationOptions,
				default: 'execute',
				displayOptions: { show: { operation: ['propose'] } },
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'string',
				default: '',
				placeholder: 'jira:issue',
				required: true,
				displayOptions: { show: { operation: ['propose'] } },
			},
			{
				displayName: 'Resource Path',
				name: 'path',
				type: 'string',
				default: '/',
				required: true,
				displayOptions: { show: { operation: ['propose'] } },
			},
			{
				displayName: 'Network Intent',
				name: 'networkIntent',
				type: 'options',
				options: [
					{ name: 'Bidirectional', value: 'bidirectional' },
					{ name: 'None', value: 'none' },
					{ name: 'Read', value: 'read' },
					{ name: 'Write', value: 'write' },
				],
				default: 'none',
				displayOptions: { show: { operation: ['propose'] } },
			},
			{
				displayName: 'Network Host',
				name: 'networkHost',
				type: 'string',
				default: '',
				placeholder: 'api.example.com',
				displayOptions: {
					show: { operation: ['propose'], networkIntent: ['read', 'write', 'bidirectional'] },
				},
			},
			{
				displayName: 'Arguments (JSON)',
				name: 'arguments',
				type: 'json',
				default: '{}',
				required: true,
				displayOptions: { show: { operation: ['propose'] } },
			},
			{
				displayName: 'Argument Schema (JSON)',
				name: 'argumentSchema',
				type: 'json',
				default: '{}',
				description: 'Trusted JSON Schema used by the registered agent profile',
				displayOptions: { show: { operation: ['propose'] } },
			},
			{
				displayName: 'Read Scopes (JSON Array)',
				name: 'readScopes',
				type: 'json',
				default: '[]',
				displayOptions: { show: { operation: ['propose'] } },
			},
			{
				displayName: 'Write Scopes (JSON Array)',
				name: 'writeScopes',
				type: 'json',
				default: '[]',
				displayOptions: { show: { operation: ['propose'] } },
			},
			{
				displayName: 'Sequence Number',
				name: 'sequenceNumber',
				type: 'number',
				typeOptions: { minValue: 1, numberPrecision: 0 },
				default: 1,
				description: 'Monotonic sequence maintained by the caller for replay protection',
				displayOptions: { show: { operation: ['propose'] } },
			},
			{
				displayName: 'Expiry (Seconds)',
				name: 'expirySeconds',
				type: 'number',
				typeOptions: { minValue: 30, maxValue: 3600, numberPrecision: 0 },
				default: 300,
				displayOptions: { show: { operation: ['propose'] } },
			},
			{
				displayName: 'Immutable Claim (JSON)',
				name: 'immutableClaim',
				type: 'json',
				default: '{}',
				required: true,
				description: 'Exact claim returned by Propose Action; do not regenerate it',
				displayOptions: { show: { operation: ['resume'] } },
			},
			{
				displayName: 'Approval ID',
				name: 'approvalId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { operation: ['resume'] } },
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const inputs = this.getInputData();
		const outputs: INodeExecutionData[][] = [[], [], []];
		const credentials = await this.getCredentials('paloApi');
		const baseUrl = normalizeBaseUrl(credentials.baseUrl);

		for (let itemIndex = 0; itemIndex < inputs.length; itemIndex++) {
			try {
				const operation = this.getNodeParameter('operation', itemIndex) as 'propose' | 'resume';
				const body =
					operation === 'propose'
						? { claim: buildProposedClaim(this, itemIndex) }
						: {
							claim: assertImmutableClaim(
								this.getNodeParameter('immutableClaim', itemIndex),
							),
							approvalId: this.getNodeParameter('approvalId', itemIndex) as string,
							resume: true,
						};

				const request: IHttpRequestOptions = {
					method: 'POST',
					url: `${baseUrl}/v1/actions/verify`,
					body,
					json: true,
					returnFullResponse: false,
				};
				const response = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'paloApi',
					request,
				)) as PaloGatewayResponse;

				if (!['allowed', 'pending_approval', 'denied'].includes(response?.status)) {
					throw new NodeOperationError(this.getNode(), 'Malformed PALO gateway response', {
						itemIndex,
					});
				}

				const output = decisionOutput(response);
				outputs[output].push({
					json: {
						...inputs[itemIndex].json,
						authorized: response.status === 'allowed',
						pendingApproval: response.status === 'pending_approval',
						claim: body.claim as JsonObject,
						palo: response as JsonObject,
						paloRequestDigest: sha256(body),
					},
					pairedItem: itemIndex,
				});
			} catch (error) {
				if (!this.continueOnFail()) {
					throw new NodeOperationError(this.getNode(), error as Error, { itemIndex });
				}

				outputs[2].push({
					json: {
						...inputs[itemIndex].json,
						palo: {
							authorized: false,
							decision: 'deny',
							connectorError: true,
							message: error instanceof Error ? error.message : 'Unknown connector error',
						},
					},
					pairedItem: itemIndex,
				});
			}
		}

		return outputs;
	}
}

function buildProposedClaim(context: IExecuteFunctions, itemIndex: number): Record<string, unknown> {
	const now = new Date();
	const expirySeconds = context.getNodeParameter('expirySeconds', itemIndex) as number;
	const execution = context.getExecutionId();
	const workflow = context.getWorkflow();
	const node = context.getNode();
	const caseId = context.getNodeParameter('caseId', itemIndex) as string;
	const agentId = context.getNodeParameter('agentId', itemIndex) as string;
	const proposedTool = context.getNodeParameter('proposedTool', itemIndex) as string;
	const sequenceNumber = context.getNodeParameter('sequenceNumber', itemIndex) as number;
	const argumentsValue = parseObject(context.getNodeParameter('arguments', itemIndex), 'Arguments');

	return {
		format: 'palo-agentic-action-claim',
		schemaVersion: '1.1.0',
		claimId: `claim-${randomUUID()}`,
		caseId,
		agentId,
		requestedAt: now.toISOString(),
		expiresAt: new Date(now.getTime() + expirySeconds * 1000).toISOString(),
		nonce: randomBytes(24).toString('base64url'),
		sequenceNumber,
		idempotencyKey: `n8n:${agentId}:${randomUUID()}`,
		action: {
			tool: proposedTool,
			operation: context.getNodeParameter('actionOperation', itemIndex) as string,
			resource: context.getNodeParameter('resource', itemIndex) as string,
			path: context.getNodeParameter('path', itemIndex) as string,
			networkIntent: context.getNodeParameter('networkIntent', itemIndex) as string,
			...(context.getNodeParameter('networkHost', itemIndex, '')
				? { networkHost: context.getNodeParameter('networkHost', itemIndex, '') as string }
				: {}),
			arguments: argumentsValue,
			argumentsDigest: `sha256:${sha256(argumentsValue)}`,
			argumentSchemaDigest: `sha256:${sha256(
				parseObject(context.getNodeParameter('argumentSchema', itemIndex), 'Argument Schema'),
			)}`,
		},
		requestedScopes: {
			read: parseStringArray(context.getNodeParameter('readScopes', itemIndex), 'Read Scopes'),
			write: parseStringArray(
				context.getNodeParameter('writeScopes', itemIndex),
				'Write Scopes',
			),
		},
		externalNetwork: context.getNodeParameter('networkIntent', itemIndex) !== 'none',
		delegation: { depth: 0, subagentCount: 0 },
		metadata: {
			platform: 'n8n',
			executionId: execution,
			executionMode: context.getMode(),
			workflowId: workflow.id,
			workflowName: workflow.name,
			nodeId: node.id,
			nodeType: node.type,
			nodeTypeVersion: node.typeVersion,
			itemIndex,
		},
	};
}
