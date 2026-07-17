import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class PaloApi implements ICredentialType {
	name = 'paloApi';
	displayName = 'PALO API';
	icon = 'file:palo.svg' as const;
	documentationUrl =
		'https://github.com/sev7enITA/PALOframework/blob/main/packages/n8n-nodes-palo-ai/README.md';

	properties: INodeProperties[] = [
		{
			displayName: 'Gateway URL',
			name: 'baseUrl',
			type: 'string',
			default: 'http://127.0.0.1:8787',
			placeholder: 'https://palo-gateway.example.com',
			description: 'Base URL of the authenticated PALO runtime gateway',
			required: true,
		},
		{
			displayName: 'Bearer Token',
			name: 'token',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Gateway token. It is stored as an encrypted n8n credential.',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.token}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/v1/registry',
			method: 'GET',
		},
	};
}
