import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

export class PaloGovernanceNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PALO Agent Governance',
		name: 'paloGovernance',
		icon: 'fa:robot',
		group: ['transform'],
		version: 1,
		description: 'Intercepts tool execution, enforces authority gates, and cryptographically signs logs in the PALO Case File.',
		defaults: {
			name: 'PALO Governance',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Case File ID',
				name: 'caseId',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'case-xxxxxx',
				description: 'The active PALO Case File identifier.',
			},
			{
				displayName: 'Agent ID',
				name: 'agentId',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'agent-xxxxxx',
				description: 'The unique identifier of the requesting agent.',
			},
			{
				displayName: 'Proposed Tool',
				name: 'proposedTool',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'e.g. run_command',
				description: 'The name of the tool the agent is proposing to execute.',
			},
			{
				displayName: 'Arguments (JSON)',
				name: 'arguments',
				type: 'json',
				default: '{}',
				required: true,
				description: 'The arguments the agent intends to pass to the tool.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const caseId = this.getNodeParameter('caseId', i) as string;
				const agentId = this.getNodeParameter('agentId', i) as string;
				const proposedTool = this.getNodeParameter('proposedTool', i) as string;
				const args = this.getNodeParameter('arguments', i) as object;

				// Here, the node calls the PALO OPA validation endpoint
				// Mock implementation for OPA check and signing
				const policyInput = {
					agent: { agentId, allowedTools: ['read_file', 'search_web'], requireHumanValidation: false },
					task: { requiredTools: [proposedTool] }
				};

				const isAuthorized = policyInput.agent.allowedTools.includes(proposedTool);

				if (!isAuthorized) {
					throw new NodeOperationError(
						this.getNode(),
						`PALO Authority Denied: Agent ${agentId} is not permitted to execute tool "${proposedTool}".`,
					);
				}

				// Simulated cryptographic signature of the action (evidence logging)
				const timestamp = new Date().toISOString();
				const auditRecord = {
					caseId,
					agentId,
					tool: proposedTool,
					timestamp,
					status: 'authorized',
					signature: 'sig_mock_hex_0123456789abcdef'
				};

				returnData.push({
					json: {
						authorized: true,
						auditRecord,
						arguments: args
					},
					pairedItem: {
						item: i,
					},
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							authorized: false,
							error: error.message,
						},
						pairedItem: {
							item: i,
						},
					});
				} else {
					throw error;
				}
			}
		}

		return [returnData];
	}
}
