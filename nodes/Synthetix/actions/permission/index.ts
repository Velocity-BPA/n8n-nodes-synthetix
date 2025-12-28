/**
 * n8n-nodes-synthetix: Permission Resource
 *
 * [Velocity BPA Licensing Notice]
 * This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).
 * Use of this node by for-profit organizations in production environments
 * requires a commercial license from Velocity BPA.
 * For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.
 */

import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { getSynthetixClient } from '../../transport/synthetixClient';
import { isValidAccountId, isValidAddress, ACCOUNT_PERMISSIONS } from '../../utils/accountUtils';

/**
 * Permission resource operations
 * Handles Synthetix v3 account permission management
 */
export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['permission'],
			},
		},
		options: [
			{
				name: 'Grant Permission',
				value: 'grant',
				description: 'Grant a permission to an address on an account',
				action: 'Grant permission',
			},
			{
				name: 'Revoke Permission',
				value: 'revoke',
				description: 'Revoke a permission from an address on an account',
				action: 'Revoke permission',
			},
			{
				name: 'Get Permissions',
				value: 'getPermissions',
				description: 'Get all permissions for an account',
				action: 'Get permissions',
			},
			{
				name: 'Has Permission',
				value: 'hasPermission',
				description: 'Check if an address has a specific permission on an account',
				action: 'Has permission',
			},
			{
				name: 'Get Permission Types',
				value: 'getTypes',
				description: 'Get all available permission types',
				action: 'Get permission types',
			},
			{
				name: 'Rename Account',
				value: 'renameAccount',
				description: 'Rename an account (requires ADMIN permission)',
				action: 'Rename account',
			},
		],
		default: 'getPermissions',
	},
	// Grant permission parameters
	{
		displayName: 'Account ID',
		name: 'accountId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['permission'],
				operation: ['grant', 'revoke', 'getPermissions', 'hasPermission', 'renameAccount'],
			},
		},
		default: '',
		placeholder: '123456789',
		description: 'The NFT account ID',
	},
	{
		displayName: 'Target Address',
		name: 'targetAddress',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['permission'],
				operation: ['grant', 'revoke', 'hasPermission'],
			},
		},
		default: '',
		placeholder: '0x...',
		description: 'The address to grant/revoke permission to/from',
	},
	{
		displayName: 'Permission',
		name: 'permission',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['permission'],
				operation: ['grant', 'revoke', 'hasPermission'],
			},
		},
		options: [
			{
				name: 'Admin',
				value: 'ADMIN',
				description: 'Full control over the account',
			},
			{
				name: 'Withdraw',
				value: 'WITHDRAW',
				description: 'Can withdraw collateral from the account',
			},
			{
				name: 'Delegate',
				value: 'DELEGATE',
				description: 'Can delegate collateral to pools',
			},
			{
				name: 'Mint',
				value: 'MINT',
				description: 'Can mint snxUSD against the account',
			},
			{
				name: 'Rewards',
				value: 'REWARDS',
				description: 'Can claim rewards for the account',
			},
			{
				name: 'Perps Modify Collateral',
				value: 'PERPS_MODIFY_COLLATERAL',
				description: 'Can modify perps collateral',
			},
			{
				name: 'Perps Commit Order',
				value: 'PERPS_COMMIT_ORDER',
				description: 'Can commit perps orders',
			},
		],
		default: 'WITHDRAW',
		description: 'The permission type to grant/revoke/check',
	},
	{
		displayName: 'New Name',
		name: 'newName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['permission'],
				operation: ['renameAccount'],
			},
		},
		default: '',
		placeholder: 'My Trading Account',
		description: 'The new name for the account',
	},
];

/**
 * Execute permission operations
 */
export async function execute(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	const credentialType = this.getNodeParameter('credentialType', itemIndex) as string;

	switch (operation) {
		case 'grant': {
			if (credentialType !== 'network') {
				throw new NodeOperationError(
					this.getNode(),
					'Grant permission requires Network credentials with a private key',
					{ itemIndex },
				);
			}

			const accountId = this.getNodeParameter('accountId', itemIndex) as string;
			const targetAddress = this.getNodeParameter('targetAddress', itemIndex) as string;
			const permission = this.getNodeParameter('permission', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), 'Invalid account ID format', { itemIndex });
			}

			if (!isValidAddress(targetAddress)) {
				throw new NodeOperationError(this.getNode(), 'Invalid target address format', { itemIndex });
			}

			const credentials = await this.getCredentials('synthetixNetwork');
			const client = getSynthetixClient(credentials);

			// Grant permission using the account proxy
			const tx = await client.grantPermission(accountId, permission, targetAddress);

			return {
				success: true,
				operation: 'grant',
				accountId,
				targetAddress,
				permission,
				permissionDescription: ACCOUNT_PERMISSIONS[permission] || 'Unknown permission',
				transactionHash: tx.hash,
				blockNumber: tx.blockNumber,
			};
		}

		case 'revoke': {
			if (credentialType !== 'network') {
				throw new NodeOperationError(
					this.getNode(),
					'Revoke permission requires Network credentials with a private key',
					{ itemIndex },
				);
			}

			const accountId = this.getNodeParameter('accountId', itemIndex) as string;
			const targetAddress = this.getNodeParameter('targetAddress', itemIndex) as string;
			const permission = this.getNodeParameter('permission', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), 'Invalid account ID format', { itemIndex });
			}

			if (!isValidAddress(targetAddress)) {
				throw new NodeOperationError(this.getNode(), 'Invalid target address format', { itemIndex });
			}

			const credentials = await this.getCredentials('synthetixNetwork');
			const client = getSynthetixClient(credentials);

			const tx = await client.revokePermission(accountId, permission, targetAddress);

			return {
				success: true,
				operation: 'revoke',
				accountId,
				targetAddress,
				permission,
				permissionDescription: ACCOUNT_PERMISSIONS[permission] || 'Unknown permission',
				transactionHash: tx.hash,
				blockNumber: tx.blockNumber,
			};
		}

		case 'getPermissions': {
			const accountId = this.getNodeParameter('accountId', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), 'Invalid account ID format', { itemIndex });
			}

			let credentials;
			let client;

			if (credentialType === 'network') {
				credentials = await this.getCredentials('synthetixNetwork');
				client = getSynthetixClient(credentials);
			} else {
				credentials = await this.getCredentials('synthetixApi');
				client = getSynthetixClient({
					network: credentials.environment as string,
					rpcUrl: credentials.subgraphUrl as string,
				});
			}

			const permissions = await client.getAccountPermissions(accountId);

			return {
				accountId,
				permissions: permissions.map((p: { address: string; permissions: string[] }) => ({
					address: p.address,
					permissions: p.permissions,
					permissionDescriptions: p.permissions.map(
						(perm: string) => ACCOUNT_PERMISSIONS[perm] || 'Unknown permission',
					),
				})),
				totalAddressesWithPermissions: permissions.length,
			};
		}

		case 'hasPermission': {
			const accountId = this.getNodeParameter('accountId', itemIndex) as string;
			const targetAddress = this.getNodeParameter('targetAddress', itemIndex) as string;
			const permission = this.getNodeParameter('permission', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), 'Invalid account ID format', { itemIndex });
			}

			if (!isValidAddress(targetAddress)) {
				throw new NodeOperationError(this.getNode(), 'Invalid target address format', { itemIndex });
			}

			let credentials;
			let client;

			if (credentialType === 'network') {
				credentials = await this.getCredentials('synthetixNetwork');
				client = getSynthetixClient(credentials);
			} else {
				credentials = await this.getCredentials('synthetixApi');
				client = getSynthetixClient({
					network: credentials.environment as string,
					rpcUrl: credentials.subgraphUrl as string,
				});
			}

			const hasPermission = await client.hasPermission(accountId, permission, targetAddress);

			return {
				accountId,
				targetAddress,
				permission,
				permissionDescription: ACCOUNT_PERMISSIONS[permission] || 'Unknown permission',
				hasPermission,
			};
		}

		case 'getTypes': {
			return {
				permissionTypes: Object.entries(ACCOUNT_PERMISSIONS).map(([key, description]) => ({
					permission: key,
					description,
				})),
				totalTypes: Object.keys(ACCOUNT_PERMISSIONS).length,
			};
		}

		case 'renameAccount': {
			if (credentialType !== 'network') {
				throw new NodeOperationError(
					this.getNode(),
					'Rename account requires Network credentials with a private key',
					{ itemIndex },
				);
			}

			const accountId = this.getNodeParameter('accountId', itemIndex) as string;
			const newName = this.getNodeParameter('newName', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), 'Invalid account ID format', { itemIndex });
			}

			const credentials = await this.getCredentials('synthetixNetwork');
			const client = getSynthetixClient(credentials);

			const tx = await client.renameAccount(accountId, newName);

			return {
				success: true,
				operation: 'renameAccount',
				accountId,
				newName,
				transactionHash: tx.hash,
				blockNumber: tx.blockNumber,
			};
		}

		default:
			throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex });
	}
}
