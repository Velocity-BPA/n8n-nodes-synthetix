/**
 * n8n-nodes-synthetix
 * Copyright (c) 2025 Velocity BPA
 *
 * This file is licensed under the Business Source License 1.1 (BSL 1.1).
 * You may use this file in compliance with the BSL 1.1, except for any use
 * that competes with Velocity BPA's commercial offerings.
 *
 * See the LICENSE file in the repository root for full terms.
 * For commercial licensing, contact licensing@velobpa.com.
 */

import type { IExecuteFunctions, INodeProperties, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { createSynthetixClient } from '../transport/synthetixClient';
import { createSubgraphClient } from '../transport/subgraphClient';
import { fromWei, formatWei } from '../utils/weiUtils';
import { isValidAccountId, isValidAddress } from '../utils/accountUtils';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['account'],
			},
		},
		options: [
			{ name: 'Create Account', value: 'createAccount', description: 'Create a new Synthetix account NFT', action: 'Create account' },
			{ name: 'Get Account', value: 'getAccount', description: 'Get account details', action: 'Get account' },
			{ name: 'Get Account Owner', value: 'getAccountOwner', description: 'Get the owner of an account', action: 'Get account owner' },
			{ name: 'Get Account Permissions', value: 'getAccountPermissions', description: 'Get account permissions', action: 'Get account permissions' },
			{ name: 'Get Account Collateral', value: 'getAccountCollateral', description: 'Get collateral deposited in account', action: 'Get account collateral' },
			{ name: 'Get Account Debt', value: 'getAccountDebt', description: 'Get debt owed by account', action: 'Get account debt' },
			{ name: 'Get Account Positions', value: 'getAccountPositions', description: 'Get all positions for an account', action: 'Get account positions' },
			{ name: 'Get Accounts by Owner', value: 'getAccountsByOwner', description: 'Get all accounts owned by an address', action: 'Get accounts by owner' },
			{ name: 'Get Account History', value: 'getAccountHistory', description: 'Get account transaction history', action: 'Get account history' },
			{ name: 'Transfer Account', value: 'transferAccount', description: 'Transfer account NFT to another address', action: 'Transfer account' },
		],
		default: 'getAccount',
	},

	// Account ID parameter
	{
		displayName: 'Account ID',
		name: 'accountId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['getAccount', 'getAccountOwner', 'getAccountPermissions', 'getAccountCollateral', 'getAccountDebt', 'getAccountPositions', 'getAccountHistory', 'transferAccount'],
			},
		},
		default: '',
		placeholder: '123456789',
		description: 'The Synthetix account ID (NFT token ID)',
	},

	// Requested Account ID for creation
	{
		displayName: 'Requested Account ID',
		name: 'requestedAccountId',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['createAccount'],
			},
		},
		default: '',
		placeholder: 'Leave empty for auto-generated ID',
		description: 'Optional specific account ID to request. Leave empty for auto-generated.',
	},

	// Owner address parameter
	{
		displayName: 'Owner Address',
		name: 'ownerAddress',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['getAccountsByOwner'],
			},
		},
		default: '',
		placeholder: '0x...',
		description: 'Ethereum address of the account owner',
	},

	// Collateral type for getAccountCollateral
	{
		displayName: 'Collateral Type',
		name: 'collateralType',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['getAccountCollateral'],
			},
		},
		default: '',
		placeholder: '0x... (token address)',
		description: 'Address of the collateral token',
	},

	// Pool ID for getAccountDebt
	{
		displayName: 'Pool ID',
		name: 'poolId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['getAccountDebt'],
			},
		},
		default: '1',
		placeholder: '1',
		description: 'The pool ID to check debt for',
	},

	// Transfer destination
	{
		displayName: 'To Address',
		name: 'toAddress',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['transferAccount'],
			},
		},
		default: '',
		placeholder: '0x...',
		description: 'Address to transfer the account NFT to',
	},
];

export async function execute(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	const credentialType = this.getNodeParameter('credentialType', itemIndex) as string;

	switch (operation) {
		case 'createAccount': {
			if (credentialType !== 'network') {
				throw new NodeOperationError(this.getNode(), 'Create account requires network credentials', { itemIndex });
			}

			const client = await createSynthetixClient(this);
			const requestedAccountId = this.getNodeParameter('requestedAccountId', itemIndex) as string;

			const accountId = requestedAccountId ? BigInt(requestedAccountId) : undefined;
			const result = await client.createAccount(accountId);

			return {
				success: true,
				accountId: result.accountId.toString(),
				transactionHash: result.transactionHash,
				blockNumber: result.blockNumber,
			};
		}

		case 'getAccount': {
			const accountId = this.getNodeParameter('accountId', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), `Invalid account ID: ${accountId}`, { itemIndex });
			}

			if (credentialType === 'api') {
				const client = await createSubgraphClient(this, 'synthetixApi');
				const account = await client.getAccount(accountId);

				if (!account) {
					throw new NodeOperationError(this.getNode(), `Account not found: ${accountId}`, { itemIndex });
				}

				return account as unknown as IDataObject;
			} else {
				const client = await createSynthetixClient(this);
				const owner = await client.getAccountOwner(BigInt(accountId));
				const permissions = await client.getAccountPermissions(BigInt(accountId));

				return {
					accountId,
					owner,
					permissions,
				};
			}
		}

		case 'getAccountOwner': {
			const accountId = this.getNodeParameter('accountId', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), `Invalid account ID: ${accountId}`, { itemIndex });
			}

			const client = await createSynthetixClient(this);
			const owner = await client.getAccountOwner(BigInt(accountId));

			return {
				accountId,
				owner,
			};
		}

		case 'getAccountPermissions': {
			const accountId = this.getNodeParameter('accountId', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), `Invalid account ID: ${accountId}`, { itemIndex });
			}

			const client = await createSynthetixClient(this);
			const permissions = await client.getAccountPermissions(BigInt(accountId));

			return {
				accountId,
				permissions,
			};
		}

		case 'getAccountCollateral': {
			const accountId = this.getNodeParameter('accountId', itemIndex) as string;
			const collateralType = this.getNodeParameter('collateralType', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), `Invalid account ID: ${accountId}`, { itemIndex });
			}

			if (!isValidAddress(collateralType)) {
				throw new NodeOperationError(this.getNode(), `Invalid collateral address: ${collateralType}`, { itemIndex });
			}

			const client = await createSynthetixClient(this);
			const collateral = await client.getAccountCollateral(BigInt(accountId), collateralType);
			const available = await client.getAccountAvailableCollateral(BigInt(accountId), collateralType);

			return {
				accountId,
				collateralType,
				totalDeposited: formatWei(collateral.totalDeposited),
				totalAssigned: formatWei(collateral.totalAssigned),
				totalLocked: formatWei(collateral.totalLocked),
				available: formatWei(available),
				totalDepositedRaw: collateral.totalDeposited.toString(),
				totalAssignedRaw: collateral.totalAssigned.toString(),
				totalLockedRaw: collateral.totalLocked.toString(),
				availableRaw: available.toString(),
			};
		}

		case 'getAccountDebt': {
			const accountId = this.getNodeParameter('accountId', itemIndex) as string;
			const poolId = this.getNodeParameter('poolId', itemIndex) as string;
			const collateralType = this.getNodeParameter('collateralType', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), `Invalid account ID: ${accountId}`, { itemIndex });
			}

			const client = await createSynthetixClient(this);
			const position = await client.getPosition(BigInt(accountId), BigInt(poolId), collateralType);

			return {
				accountId,
				poolId,
				collateralType,
				debt: formatWei(position.debt),
				debtRaw: position.debt.toString(),
				collateralAmount: formatWei(position.collateralAmount),
				collateralValue: formatWei(position.collateralValue),
				cRatio: fromWei(position.cRatio).toString(),
			};
		}

		case 'getAccountPositions': {
			const accountId = this.getNodeParameter('accountId', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), `Invalid account ID: ${accountId}`, { itemIndex });
			}

			if (credentialType === 'api') {
				const client = await createSubgraphClient(this, 'synthetixApi');
				const positions = await client.getPositionsByAccount(accountId);
				return positions as unknown as IDataObject[];
			} else {
				const client = await createSubgraphClient(this, 'synthetixNetwork');
				const positions = await client.getPositionsByAccount(accountId);
				return positions as unknown as IDataObject[];
			}
		}

		case 'getAccountsByOwner': {
			const ownerAddress = this.getNodeParameter('ownerAddress', itemIndex) as string;

			if (!isValidAddress(ownerAddress)) {
				throw new NodeOperationError(this.getNode(), `Invalid address: ${ownerAddress}`, { itemIndex });
			}

			if (credentialType === 'api') {
				const client = await createSubgraphClient(this, 'synthetixApi');
				const accounts = await client.getAccountsByOwner(ownerAddress);
				return accounts as unknown as IDataObject[];
			} else {
				const client = await createSynthetixClient(this);
				const accountIds = await client.getAccountsByOwner(ownerAddress);

				return accountIds.map((id) => ({
					accountId: id.toString(),
					owner: ownerAddress,
				}));
			}
		}

		case 'getAccountHistory': {
			const accountId = this.getNodeParameter('accountId', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), `Invalid account ID: ${accountId}`, { itemIndex });
			}

			const client = await createSubgraphClient(this, credentialType === 'api' ? 'synthetixApi' : 'synthetixNetwork');
			const history = await client.getAccountHistory(accountId);
			return history as IDataObject[];
		}

		case 'transferAccount': {
			if (credentialType !== 'network') {
				throw new NodeOperationError(this.getNode(), 'Transfer account requires network credentials', { itemIndex });
			}

			const accountId = this.getNodeParameter('accountId', itemIndex) as string;
			const toAddress = this.getNodeParameter('toAddress', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), `Invalid account ID: ${accountId}`, { itemIndex });
			}

			if (!isValidAddress(toAddress)) {
				throw new NodeOperationError(this.getNode(), `Invalid address: ${toAddress}`, { itemIndex });
			}

			const client = await createSynthetixClient(this);
			const result = await client.transferAccount(BigInt(accountId), toAddress);

			return {
				success: true,
				accountId,
				from: result.from,
				to: toAddress,
				transactionHash: result.transactionHash,
				blockNumber: result.blockNumber,
			};
		}

		default:
			throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex });
	}
}
