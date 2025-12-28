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
import { createSynthetixClient } from '../../transport/synthetixClient';
import { toWei, formatWei } from '../../utils/weiUtils';
import { isValidAccountId, isValidAddress } from '../../utils/accountUtils';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['snxUsd'],
			},
		},
		options: [
			{ name: 'Get Balance', value: 'getBalance', description: 'Get snxUSD balance', action: 'Get balance' },
			{ name: 'Get Total Supply', value: 'getTotalSupply', description: 'Get total snxUSD supply', action: 'Get total supply' },
			{ name: 'Mint snxUSD', value: 'mint', description: 'Mint snxUSD against collateral', action: 'Mint snx usd' },
			{ name: 'Burn snxUSD', value: 'burn', description: 'Burn snxUSD to reduce debt', action: 'Burn snx usd' },
			{ name: 'Get Mint Capacity', value: 'getMintCapacity', description: 'Get available mint capacity', action: 'Get mint capacity' },
		],
		default: 'getBalance',
	},

	// Address for balance check
	{
		displayName: 'Address',
		name: 'address',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['snxUsd'],
				operation: ['getBalance'],
			},
		},
		default: '',
		placeholder: '0x...',
		description: 'Address to check balance for',
	},

	// Account ID for mint/burn
	{
		displayName: 'Account ID',
		name: 'accountId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['snxUsd'],
				operation: ['mint', 'burn', 'getMintCapacity'],
			},
		},
		default: '',
		placeholder: '123456789',
		description: 'The Synthetix account ID',
	},

	// Pool ID
	{
		displayName: 'Pool ID',
		name: 'poolId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['snxUsd'],
				operation: ['mint', 'burn', 'getMintCapacity'],
			},
		},
		default: '1',
		description: 'The pool ID',
	},

	// Collateral Type
	{
		displayName: 'Collateral Type',
		name: 'collateralType',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['snxUsd'],
				operation: ['mint', 'burn', 'getMintCapacity'],
			},
		},
		default: '',
		placeholder: '0x... (token address)',
		description: 'Address of the collateral token',
	},

	// Amount
	{
		displayName: 'Amount',
		name: 'amount',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['snxUsd'],
				operation: ['mint', 'burn'],
			},
		},
		default: '',
		placeholder: '100.0',
		description: 'Amount of snxUSD to mint/burn',
	},
];

export async function execute(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	const credentialType = this.getNodeParameter('credentialType', itemIndex) as string;
	const client = await createSynthetixClient(this);

	switch (operation) {
		case 'getBalance': {
			const address = this.getNodeParameter('address', itemIndex) as string;

			if (!isValidAddress(address)) {
				throw new NodeOperationError(this.getNode(), `Invalid address: ${address}`, { itemIndex });
			}

			const balance = await client.getUsdBalance(address);

			return {
				address,
				balance: formatWei(balance),
				balanceRaw: balance.toString(),
			};
		}

		case 'getTotalSupply': {
			const totalSupply = await client.getUsdTotalSupply();

			return {
				totalSupply: formatWei(totalSupply),
				totalSupplyRaw: totalSupply.toString(),
			};
		}

		case 'mint': {
			if (credentialType !== 'network') {
				throw new NodeOperationError(this.getNode(), 'Mint requires network credentials', { itemIndex });
			}

			const accountId = this.getNodeParameter('accountId', itemIndex) as string;
			const poolId = this.getNodeParameter('poolId', itemIndex) as string;
			const collateralType = this.getNodeParameter('collateralType', itemIndex) as string;
			const amount = this.getNodeParameter('amount', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), `Invalid account ID: ${accountId}`, { itemIndex });
			}

			if (!isValidAddress(collateralType)) {
				throw new NodeOperationError(this.getNode(), `Invalid collateral address: ${collateralType}`, { itemIndex });
			}

			const amountWei = toWei(amount);
			const result = await client.mintUsd(
				BigInt(accountId),
				BigInt(poolId),
				collateralType,
				amountWei,
			);

			return {
				success: true,
				accountId,
				poolId,
				collateralType,
				amountMinted: amount,
				transactionHash: result.transactionHash,
				blockNumber: result.blockNumber,
			};
		}

		case 'burn': {
			if (credentialType !== 'network') {
				throw new NodeOperationError(this.getNode(), 'Burn requires network credentials', { itemIndex });
			}

			const accountId = this.getNodeParameter('accountId', itemIndex) as string;
			const poolId = this.getNodeParameter('poolId', itemIndex) as string;
			const collateralType = this.getNodeParameter('collateralType', itemIndex) as string;
			const amount = this.getNodeParameter('amount', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), `Invalid account ID: ${accountId}`, { itemIndex });
			}

			if (!isValidAddress(collateralType)) {
				throw new NodeOperationError(this.getNode(), `Invalid collateral address: ${collateralType}`, { itemIndex });
			}

			const amountWei = toWei(amount);
			const result = await client.burnUsd(
				BigInt(accountId),
				BigInt(poolId),
				collateralType,
				amountWei,
			);

			return {
				success: true,
				accountId,
				poolId,
				collateralType,
				amountBurned: amount,
				transactionHash: result.transactionHash,
				blockNumber: result.blockNumber,
			};
		}

		case 'getMintCapacity': {
			const accountId = this.getNodeParameter('accountId', itemIndex) as string;
			const poolId = this.getNodeParameter('poolId', itemIndex) as string;
			const collateralType = this.getNodeParameter('collateralType', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), `Invalid account ID: ${accountId}`, { itemIndex });
			}

			// Get position and config to calculate mint capacity
			const position = await client.getPosition(BigInt(accountId), BigInt(poolId), collateralType);
			const config = await client.getCollateralConfiguration(collateralType);

			const issuanceRatio = Number(config.issuanceRatioD18) / 1e18;
			const maxDebt = BigInt(position.collateralValue.toString()) * BigInt(Math.floor(1e18 / issuanceRatio)) / BigInt(1e18);
			const mintCapacity = maxDebt - BigInt(position.debt.toString());

			return {
				accountId,
				poolId,
				collateralType,
				currentDebt: formatWei(position.debt),
				maxDebt: formatWei(maxDebt),
				mintCapacity: formatWei(mintCapacity > 0n ? mintCapacity : 0n),
				collateralValue: formatWei(position.collateralValue),
				issuanceRatio: (issuanceRatio * 100).toFixed(2) + '%',
			};
		}

		default:
			throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex });
	}
}
