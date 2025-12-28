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
import { toWei, fromWei, formatWei } from '../utils/weiUtils';
import { isValidAccountId, isValidAddress } from '../utils/accountUtils';
import { calculateCRatio } from '../utils/ratioUtils';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['collateral'],
			},
		},
		options: [
			{ name: 'Deposit Collateral', value: 'deposit', description: 'Deposit collateral into account', action: 'Deposit collateral' },
			{ name: 'Withdraw Collateral', value: 'withdraw', description: 'Withdraw collateral from account', action: 'Withdraw collateral' },
			{ name: 'Get Collateral Balance', value: 'getBalance', description: 'Get collateral balance for account', action: 'Get collateral balance' },
			{ name: 'Get Collateral Value', value: 'getValue', description: 'Get USD value of collateral', action: 'Get collateral value' },
			{ name: 'Get Collateral Types', value: 'getTypes', description: 'Get supported collateral types', action: 'Get collateral types' },
			{ name: 'Get Collateral Configuration', value: 'getConfiguration', description: 'Get collateral configuration', action: 'Get collateral configuration' },
			{ name: 'Get Available Collateral', value: 'getAvailable', description: 'Get available (withdrawable) collateral', action: 'Get available collateral' },
			{ name: 'Get Collateral Ratio', value: 'getCRatio', description: 'Calculate collateralization ratio', action: 'Get collateral ratio' },
			{ name: 'Get Required Collateral', value: 'getRequired', description: 'Calculate required collateral for debt', action: 'Get required collateral' },
		],
		default: 'getBalance',
	},

	// Account ID
	{
		displayName: 'Account ID',
		name: 'accountId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['collateral'],
				operation: ['deposit', 'withdraw', 'getBalance', 'getValue', 'getAvailable', 'getCRatio'],
			},
		},
		default: '',
		placeholder: '123456789',
		description: 'The Synthetix account ID',
	},

	// Collateral Type
	{
		displayName: 'Collateral Type',
		name: 'collateralType',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['collateral'],
				operation: ['deposit', 'withdraw', 'getBalance', 'getValue', 'getConfiguration', 'getAvailable', 'getCRatio'],
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
				resource: ['collateral'],
				operation: ['deposit', 'withdraw'],
			},
		},
		default: '',
		placeholder: '100.0',
		description: 'Amount of collateral tokens',
	},

	// Pool ID for C-Ratio calculations
	{
		displayName: 'Pool ID',
		name: 'poolId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['collateral'],
				operation: ['getCRatio', 'getRequired'],
			},
		},
		default: '1',
		description: 'Pool ID for ratio calculations',
	},

	// Target debt for required collateral
	{
		displayName: 'Target Debt',
		name: 'targetDebt',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['collateral'],
				operation: ['getRequired'],
			},
		},
		default: '',
		placeholder: '1000',
		description: 'Target debt amount in snxUSD',
	},

	// Target C-Ratio
	{
		displayName: 'Target C-Ratio (%)',
		name: 'targetCRatio',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['collateral'],
				operation: ['getRequired'],
			},
		},
		default: 500,
		description: 'Target collateralization ratio percentage (e.g., 500 for 500%)',
	},
];

export async function execute(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	const credentialType = this.getNodeParameter('credentialType', itemIndex) as string;

	if (credentialType !== 'network' && ['deposit', 'withdraw'].includes(operation)) {
		throw new NodeOperationError(this.getNode(), `${operation} requires network credentials`, { itemIndex });
	}

	const client = await createSynthetixClient(this);

	switch (operation) {
		case 'deposit': {
			const accountId = this.getNodeParameter('accountId', itemIndex) as string;
			const collateralType = this.getNodeParameter('collateralType', itemIndex) as string;
			const amount = this.getNodeParameter('amount', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), `Invalid account ID: ${accountId}`, { itemIndex });
			}

			if (!isValidAddress(collateralType)) {
				throw new NodeOperationError(this.getNode(), `Invalid collateral address: ${collateralType}`, { itemIndex });
			}

			const amountWei = toWei(amount);
			const result = await client.deposit(BigInt(accountId), collateralType, amountWei);

			return {
				success: true,
				accountId,
				collateralType,
				amount,
				amountWei: amountWei.toString(),
				transactionHash: result.transactionHash,
				blockNumber: result.blockNumber,
			};
		}

		case 'withdraw': {
			const accountId = this.getNodeParameter('accountId', itemIndex) as string;
			const collateralType = this.getNodeParameter('collateralType', itemIndex) as string;
			const amount = this.getNodeParameter('amount', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), `Invalid account ID: ${accountId}`, { itemIndex });
			}

			if (!isValidAddress(collateralType)) {
				throw new NodeOperationError(this.getNode(), `Invalid collateral address: ${collateralType}`, { itemIndex });
			}

			const amountWei = toWei(amount);
			const result = await client.withdraw(BigInt(accountId), collateralType, amountWei);

			return {
				success: true,
				accountId,
				collateralType,
				amount,
				amountWei: amountWei.toString(),
				transactionHash: result.transactionHash,
				blockNumber: result.blockNumber,
			};
		}

		case 'getBalance': {
			const accountId = this.getNodeParameter('accountId', itemIndex) as string;
			const collateralType = this.getNodeParameter('collateralType', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), `Invalid account ID: ${accountId}`, { itemIndex });
			}

			const collateral = await client.getAccountCollateral(BigInt(accountId), collateralType);

			return {
				accountId,
				collateralType,
				totalDeposited: formatWei(collateral.totalDeposited),
				totalAssigned: formatWei(collateral.totalAssigned),
				totalLocked: formatWei(collateral.totalLocked),
				totalDepositedRaw: collateral.totalDeposited.toString(),
				totalAssignedRaw: collateral.totalAssigned.toString(),
				totalLockedRaw: collateral.totalLocked.toString(),
			};
		}

		case 'getValue': {
			const accountId = this.getNodeParameter('accountId', itemIndex) as string;
			const collateralType = this.getNodeParameter('collateralType', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), `Invalid account ID: ${accountId}`, { itemIndex });
			}

			const collateral = await client.getAccountCollateral(BigInt(accountId), collateralType);
			// Note: In practice, you'd multiply by oracle price to get USD value
			// This is a simplified version

			return {
				accountId,
				collateralType,
				totalDeposited: formatWei(collateral.totalDeposited),
				totalDepositedRaw: collateral.totalDeposited.toString(),
				note: 'Use oracle resource to get current USD value',
			};
		}

		case 'getTypes': {
			// Return configured collateral types from constants
			const { COLLATERAL_TYPES } = await import('../constants/oracles');
			const network = client.getNetwork();

			const types = COLLATERAL_TYPES[network] || {};

			return Object.entries(types).map(([symbol, config]) => ({
				symbol,
				address: config.address,
				decimals: config.decimals,
				oracleNodeId: config.oracleNodeId,
				isEnabled: config.isEnabled,
			}));
		}

		case 'getConfiguration': {
			const collateralType = this.getNodeParameter('collateralType', itemIndex) as string;

			if (!isValidAddress(collateralType)) {
				throw new NodeOperationError(this.getNode(), `Invalid collateral address: ${collateralType}`, { itemIndex });
			}

			const config = await client.getCollateralConfiguration(collateralType);

			return {
				collateralType,
				depositingEnabled: config.depositingEnabled,
				issuanceRatioD18: formatWei(config.issuanceRatioD18),
				liquidationRatioD18: formatWei(config.liquidationRatioD18),
				liquidationRewardD18: formatWei(config.liquidationRewardD18),
				oracleNodeId: config.oracleNodeId,
				tokenAddress: config.tokenAddress,
				minDelegationD18: formatWei(config.minDelegationD18),
			};
		}

		case 'getAvailable': {
			const accountId = this.getNodeParameter('accountId', itemIndex) as string;
			const collateralType = this.getNodeParameter('collateralType', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), `Invalid account ID: ${accountId}`, { itemIndex });
			}

			const available = await client.getAccountAvailableCollateral(BigInt(accountId), collateralType);

			return {
				accountId,
				collateralType,
				available: formatWei(available),
				availableRaw: available.toString(),
			};
		}

		case 'getCRatio': {
			const accountId = this.getNodeParameter('accountId', itemIndex) as string;
			const poolId = this.getNodeParameter('poolId', itemIndex) as string;
			const collateralType = this.getNodeParameter('collateralType', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), `Invalid account ID: ${accountId}`, { itemIndex });
			}

			const position = await client.getPosition(BigInt(accountId), BigInt(poolId), collateralType);

			const cRatio = calculateCRatio(position.collateralValue, position.debt);

			return {
				accountId,
				poolId,
				collateralType,
				collateralValue: formatWei(position.collateralValue),
				debt: formatWei(position.debt),
				cRatio: cRatio.toFixed(2),
				cRatioPercentage: `${cRatio.toFixed(2)}%`,
				isHealthy: cRatio >= 500,
				isLiquidatable: cRatio < 150 && cRatio > 0,
			};
		}

		case 'getRequired': {
			const targetDebt = this.getNodeParameter('targetDebt', itemIndex) as string;
			const targetCRatio = this.getNodeParameter('targetCRatio', itemIndex) as number;

			const debtWei = toWei(targetDebt);
			const requiredCollateral = (debtWei * BigInt(targetCRatio)) / BigInt(100);

			return {
				targetDebt,
				targetCRatio: `${targetCRatio}%`,
				requiredCollateralValue: formatWei(requiredCollateral),
				requiredCollateralValueRaw: requiredCollateral.toString(),
				note: 'This is the required collateral VALUE in USD. Divide by collateral price to get token amount.',
			};
		}

		default:
			throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex });
	}
}
