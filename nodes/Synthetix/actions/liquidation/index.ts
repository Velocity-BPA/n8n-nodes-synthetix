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
import { isLiquidatable, calculateHealthFactor } from '../../utils/ratioUtils';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['liquidation'],
			},
		},
		options: [
			{ name: 'Check Liquidatable', value: 'checkLiquidatable', description: 'Check if position can be liquidated', action: 'Check liquidatable' },
			{ name: 'Liquidate Account', value: 'liquidateAccount', description: 'Liquidate an undercollateralized position', action: 'Liquidate account' },
			{ name: 'Get Liquidation Parameters', value: 'getParameters', description: 'Get liquidation configuration', action: 'Get liquidation parameters' },
			{ name: 'Simulate Liquidation', value: 'simulate', description: 'Simulate liquidation outcome', action: 'Simulate liquidation' },
			{ name: 'Get Liquidation History', value: 'getHistory', description: 'Get liquidation events', action: 'Get liquidation history' },
			{ name: 'Get Health Factor', value: 'getHealthFactor', description: 'Calculate position health factor', action: 'Get health factor' },
		],
		default: 'checkLiquidatable',
	},

	// Account ID
	{
		displayName: 'Account ID',
		name: 'accountId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['liquidation'],
				operation: ['checkLiquidatable', 'liquidateAccount', 'simulate', 'getHealthFactor'],
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
				resource: ['liquidation'],
				operation: ['checkLiquidatable', 'liquidateAccount', 'simulate', 'getHealthFactor'],
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
				resource: ['liquidation'],
				operation: ['checkLiquidatable', 'liquidateAccount', 'simulate', 'getParameters', 'getHealthFactor'],
			},
		},
		default: '',
		placeholder: '0x... (token address)',
		description: 'Address of the collateral token',
	},

	// Limit for history
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['liquidation'],
				operation: ['getHistory'],
			},
		},
		default: 50,
		description: 'Maximum number of results to return',
	},
];

export async function execute(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	const credentialType = this.getNodeParameter('credentialType', itemIndex) as string;

	switch (operation) {
		case 'checkLiquidatable': {
			const accountId = this.getNodeParameter('accountId', itemIndex) as string;
			const poolId = this.getNodeParameter('poolId', itemIndex) as string;
			const collateralType = this.getNodeParameter('collateralType', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), `Invalid account ID: ${accountId}`, { itemIndex });
			}

			if (!isValidAddress(collateralType)) {
				throw new NodeOperationError(this.getNode(), `Invalid collateral address: ${collateralType}`, { itemIndex });
			}

			const client = await createSynthetixClient(this);
			const canLiquidate = await client.isPositionLiquidatable(
				BigInt(accountId),
				BigInt(poolId),
				collateralType,
			);

			const position = await client.getPosition(BigInt(accountId), BigInt(poolId), collateralType);
			const cRatio = Number(position.cRatio) / 1e18 * 100;

			return {
				accountId,
				poolId,
				collateralType,
				isLiquidatable: canLiquidate,
				currentCRatio: cRatio.toFixed(2) + '%',
				debt: formatWei(position.debt),
				collateralValue: formatWei(position.collateralValue),
				note: canLiquidate ? 'Position can be liquidated' : 'Position is healthy',
			};
		}

		case 'liquidateAccount': {
			if (credentialType !== 'network') {
				throw new NodeOperationError(this.getNode(), 'Liquidate requires network credentials', { itemIndex });
			}

			const accountId = this.getNodeParameter('accountId', itemIndex) as string;
			const poolId = this.getNodeParameter('poolId', itemIndex) as string;
			const collateralType = this.getNodeParameter('collateralType', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), `Invalid account ID: ${accountId}`, { itemIndex });
			}

			if (!isValidAddress(collateralType)) {
				throw new NodeOperationError(this.getNode(), `Invalid collateral address: ${collateralType}`, { itemIndex });
			}

			const client = await createSynthetixClient(this);

			// Check if liquidatable first
			const canLiquidate = await client.isPositionLiquidatable(
				BigInt(accountId),
				BigInt(poolId),
				collateralType,
			);

			if (!canLiquidate) {
				throw new NodeOperationError(this.getNode(), 'Position is not liquidatable', { itemIndex });
			}

			const result = await client.liquidate(
				BigInt(accountId),
				BigInt(poolId),
				collateralType,
			);

			return {
				success: true,
				accountId,
				poolId,
				collateralType,
				debtLiquidated: formatWei(result.debtLiquidated),
				collateralLiquidated: formatWei(result.collateralLiquidated),
				amountRewarded: formatWei(result.amountRewarded),
				transactionHash: result.transactionHash,
				blockNumber: result.blockNumber,
			};
		}

		case 'getParameters': {
			const collateralType = this.getNodeParameter('collateralType', itemIndex) as string;

			if (!isValidAddress(collateralType)) {
				throw new NodeOperationError(this.getNode(), `Invalid collateral address: ${collateralType}`, { itemIndex });
			}

			const client = await createSynthetixClient(this);
			const config = await client.getCollateralConfiguration(collateralType);

			return {
				collateralType,
				liquidationRatio: formatWei(config.liquidationRatioD18),
				liquidationRatioPercentage: (Number(config.liquidationRatioD18) / 1e18 * 100).toFixed(2) + '%',
				liquidationReward: formatWei(config.liquidationRewardD18),
				liquidationRewardPercentage: (Number(config.liquidationRewardD18) / 1e18 * 100).toFixed(2) + '%',
				issuanceRatio: formatWei(config.issuanceRatioD18),
				issuanceRatioPercentage: (Number(config.issuanceRatioD18) / 1e18 * 100).toFixed(2) + '%',
			};
		}

		case 'simulate': {
			const accountId = this.getNodeParameter('accountId', itemIndex) as string;
			const poolId = this.getNodeParameter('poolId', itemIndex) as string;
			const collateralType = this.getNodeParameter('collateralType', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), `Invalid account ID: ${accountId}`, { itemIndex });
			}

			if (!isValidAddress(collateralType)) {
				throw new NodeOperationError(this.getNode(), `Invalid collateral address: ${collateralType}`, { itemIndex });
			}

			const client = await createSynthetixClient(this);
			const position = await client.getPosition(BigInt(accountId), BigInt(poolId), collateralType);
			const config = await client.getCollateralConfiguration(collateralType);

			const cRatio = Number(position.cRatio) / 1e18 * 100;
			const liquidationRatio = Number(config.liquidationRatioD18) / 1e18 * 100;
			const liquidationRewardPercent = Number(config.liquidationRewardD18) / 1e18;

			const canLiquidate = isLiquidatable(cRatio, liquidationRatio);

			if (!canLiquidate) {
				return {
					accountId,
					poolId,
					collateralType,
					isLiquidatable: false,
					currentCRatio: cRatio.toFixed(2) + '%',
					liquidationRatio: liquidationRatio.toFixed(2) + '%',
					message: 'Position cannot be liquidated',
				};
			}

			// Estimate liquidation outcome
			const debtToLiquidate = position.debt;
			const collateralToSeize = (BigInt(position.collateralValue.toString()) * BigInt(Math.floor((1 + liquidationRewardPercent) * 1000))) / BigInt(1000);

			return {
				accountId,
				poolId,
				collateralType,
				isLiquidatable: true,
				currentCRatio: cRatio.toFixed(2) + '%',
				liquidationRatio: liquidationRatio.toFixed(2) + '%',
				estimatedDebtLiquidated: formatWei(debtToLiquidate),
				estimatedCollateralSeized: formatWei(collateralToSeize),
				estimatedReward: (Number(collateralToSeize) * liquidationRewardPercent / (1 + liquidationRewardPercent)).toFixed(4),
				note: 'Estimates may vary based on oracle prices at execution',
			};
		}

		case 'getHistory': {
			const limit = this.getNodeParameter('limit', itemIndex) as number;

			const client = await createSubgraphClient(this, credentialType === 'api' ? 'synthetixApi' : 'synthetixNetwork');
			const liquidations = await client.getLiquidations({}, limit);

			return liquidations.map((l) => ({
				accountId: l.accountId,
				poolId: l.poolId,
				collateralType: l.collateralType,
				debtLiquidated: l.debtLiquidated,
				collateralLiquidated: l.collateralLiquidated,
				amountRewarded: l.amountRewarded,
				liquidator: l.liquidator,
				timestamp: l.timestamp,
				transactionHash: l.transactionHash,
			})) as IDataObject[];
		}

		case 'getHealthFactor': {
			const accountId = this.getNodeParameter('accountId', itemIndex) as string;
			const poolId = this.getNodeParameter('poolId', itemIndex) as string;
			const collateralType = this.getNodeParameter('collateralType', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), `Invalid account ID: ${accountId}`, { itemIndex });
			}

			const client = await createSynthetixClient(this);
			const position = await client.getPosition(BigInt(accountId), BigInt(poolId), collateralType);
			const config = await client.getCollateralConfiguration(collateralType);

			const cRatio = Number(position.cRatio) / 1e18 * 100;
			const liquidationRatio = Number(config.liquidationRatioD18) / 1e18 * 100;
			const healthFactor = calculateHealthFactor(cRatio, liquidationRatio);

			let status: string;
			if (healthFactor >= 2) status = 'Very Healthy';
			else if (healthFactor >= 1.5) status = 'Healthy';
			else if (healthFactor >= 1.2) status = 'Moderate Risk';
			else if (healthFactor >= 1) status = 'High Risk';
			else status = 'Liquidatable';

			return {
				accountId,
				poolId,
				collateralType,
				healthFactor: healthFactor.toFixed(4),
				currentCRatio: cRatio.toFixed(2) + '%',
				liquidationRatio: liquidationRatio.toFixed(2) + '%',
				status,
				isLiquidatable: healthFactor < 1,
			};
		}

		default:
			throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex });
	}
}
