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
import { createSubgraphClient } from '../../transport/subgraphClient';
import { formatWei } from '../../utils/weiUtils';
import { isValidAccountId, isValidAddress } from '../../utils/accountUtils';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['rewards'],
			},
		},
		options: [
			{ name: 'Get Claimable Rewards', value: 'getClaimable', description: 'Get claimable rewards amount', action: 'Get claimable rewards' },
			{ name: 'Claim Rewards', value: 'claim', description: 'Claim available rewards', action: 'Claim rewards' },
			{ name: 'Get Reward Rate', value: 'getRewardRate', description: 'Get current reward rate', action: 'Get reward rate' },
			{ name: 'Get Rewards by Pool', value: 'getRewardsByPool', description: 'Get rewards for a pool', action: 'Get rewards by pool' },
			{ name: 'Get Rewards by Account', value: 'getRewardsByAccount', description: 'Get rewards for an account', action: 'Get rewards by account' },
			{ name: 'Get Reward History', value: 'getRewardHistory', description: 'Get reward claim history', action: 'Get reward history' },
		],
		default: 'getClaimable',
	},

	// Account ID
	{
		displayName: 'Account ID',
		name: 'accountId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['rewards'],
				operation: ['getClaimable', 'claim', 'getRewardsByAccount', 'getRewardHistory'],
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
				resource: ['rewards'],
				operation: ['getClaimable', 'claim', 'getRewardRate', 'getRewardsByPool'],
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
				resource: ['rewards'],
				operation: ['getClaimable', 'claim', 'getRewardRate'],
			},
		},
		default: '',
		placeholder: '0x... (token address)',
		description: 'Address of the collateral token',
	},

	// Distributor Address
	{
		displayName: 'Distributor Address',
		name: 'distributorAddress',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['rewards'],
				operation: ['getClaimable', 'claim', 'getRewardRate'],
			},
		},
		default: '',
		placeholder: '0x... (distributor address)',
		description: 'Address of the rewards distributor contract',
	},
];

export async function execute(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	const credentialType = this.getNodeParameter('credentialType', itemIndex) as string;

	switch (operation) {
		case 'getClaimable': {
			const accountId = this.getNodeParameter('accountId', itemIndex) as string;
			const poolId = this.getNodeParameter('poolId', itemIndex) as string;
			const collateralType = this.getNodeParameter('collateralType', itemIndex) as string;
			const distributorAddress = this.getNodeParameter('distributorAddress', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), `Invalid account ID: ${accountId}`, { itemIndex });
			}

			if (!isValidAddress(distributorAddress)) {
				throw new NodeOperationError(this.getNode(), `Invalid distributor address: ${distributorAddress}`, { itemIndex });
			}

			const client = await createSynthetixClient(this);
			const rewards = await client.getAvailableRewards(
				BigInt(accountId),
				BigInt(poolId),
				collateralType,
				distributorAddress,
			);

			return {
				accountId,
				poolId,
				collateralType,
				distributorAddress,
				claimableRewards: formatWei(rewards),
				claimableRewardsRaw: rewards.toString(),
			};
		}

		case 'claim': {
			if (credentialType !== 'network') {
				throw new NodeOperationError(this.getNode(), 'Claim rewards requires network credentials', { itemIndex });
			}

			const accountId = this.getNodeParameter('accountId', itemIndex) as string;
			const poolId = this.getNodeParameter('poolId', itemIndex) as string;
			const collateralType = this.getNodeParameter('collateralType', itemIndex) as string;
			const distributorAddress = this.getNodeParameter('distributorAddress', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), `Invalid account ID: ${accountId}`, { itemIndex });
			}

			if (!isValidAddress(distributorAddress)) {
				throw new NodeOperationError(this.getNode(), `Invalid distributor address: ${distributorAddress}`, { itemIndex });
			}

			const client = await createSynthetixClient(this);
			const result = await client.claimRewards(
				BigInt(accountId),
				BigInt(poolId),
				collateralType,
				distributorAddress,
			);

			return {
				success: true,
				accountId,
				poolId,
				collateralType,
				distributorAddress,
				claimedAmount: formatWei(result.claimedAmount),
				transactionHash: result.transactionHash,
				blockNumber: result.blockNumber,
			};
		}

		case 'getRewardRate': {
			const poolId = this.getNodeParameter('poolId', itemIndex) as string;
			const collateralType = this.getNodeParameter('collateralType', itemIndex) as string;
			const distributorAddress = this.getNodeParameter('distributorAddress', itemIndex) as string;

			if (!isValidAddress(distributorAddress)) {
				throw new NodeOperationError(this.getNode(), `Invalid distributor address: ${distributorAddress}`, { itemIndex });
			}

			const client = await createSynthetixClient(this);
			const rate = await client.getRewardRate(
				BigInt(poolId),
				collateralType,
				distributorAddress,
			);

			// Calculate APY from rate (rate is per second)
			const secondsPerYear = 365 * 24 * 60 * 60;
			const ratePerSecond = Number(rate) / 1e18;
			const apy = ratePerSecond * secondsPerYear * 100;

			return {
				poolId,
				collateralType,
				distributorAddress,
				rewardRate: formatWei(rate),
				rewardRateRaw: rate.toString(),
				estimatedAPY: apy.toFixed(2) + '%',
			};
		}

		case 'getRewardsByPool': {
			const poolId = this.getNodeParameter('poolId', itemIndex) as string;

			const client = await createSubgraphClient(this, credentialType === 'api' ? 'synthetixApi' : 'synthetixNetwork');
			const rewards = await client.getRewardsClaimed({ poolId }, 50);

			return rewards.map((r) => ({
				accountId: r.accountId,
				poolId: r.poolId,
				collateralType: r.collateralType,
				amount: r.amount,
				timestamp: r.timestamp,
			})) as IDataObject[];
		}

		case 'getRewardsByAccount': {
			const accountId = this.getNodeParameter('accountId', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), `Invalid account ID: ${accountId}`, { itemIndex });
			}

			const client = await createSubgraphClient(this, credentialType === 'api' ? 'synthetixApi' : 'synthetixNetwork');
			const rewards = await client.getRewardsClaimed({ accountId }, 50);

			return rewards.map((r) => ({
				accountId: r.accountId,
				poolId: r.poolId,
				collateralType: r.collateralType,
				amount: r.amount,
				timestamp: r.timestamp,
			})) as IDataObject[];
		}

		case 'getRewardHistory': {
			const accountId = this.getNodeParameter('accountId', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), `Invalid account ID: ${accountId}`, { itemIndex });
			}

			const client = await createSubgraphClient(this, credentialType === 'api' ? 'synthetixApi' : 'synthetixNetwork');
			const rewards = await client.getRewardsClaimed({ accountId }, 100);

			return rewards.map((r) => ({
				accountId: r.accountId,
				poolId: r.poolId,
				collateralType: r.collateralType,
				amount: r.amount,
				distributor: r.distributor,
				timestamp: r.timestamp,
				transactionHash: r.transactionHash,
			})) as IDataObject[];
		}

		default:
			throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex });
	}
}
