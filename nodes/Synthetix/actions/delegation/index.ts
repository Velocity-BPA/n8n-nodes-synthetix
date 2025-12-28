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
				resource: ['delegation'],
			},
		},
		options: [
			{ name: 'Delegate Collateral', value: 'delegate', description: 'Delegate collateral to a pool', action: 'Delegate collateral' },
			{ name: 'Get Delegated Collateral', value: 'getDelegated', description: 'Get delegated collateral amount', action: 'Get delegated collateral' },
			{ name: 'Get Position', value: 'getPosition', description: 'Get full position details', action: 'Get position' },
			{ name: 'Get Position Debt', value: 'getPositionDebt', description: 'Get position debt', action: 'Get position debt' },
			{ name: 'Get Position Collateral', value: 'getPositionCollateral', description: 'Get position collateral', action: 'Get position collateral' },
			{ name: 'Update Delegation', value: 'updateDelegation', description: 'Update delegation amount', action: 'Update delegation' },
			{ name: 'Get Delegations by Account', value: 'getDelegationsByAccount', description: 'Get all delegations for account', action: 'Get delegations by account' },
		],
		default: 'getPosition',
	},

	// Account ID
	{
		displayName: 'Account ID',
		name: 'accountId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['delegation'],
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
				resource: ['delegation'],
				operation: ['delegate', 'getDelegated', 'getPosition', 'getPositionDebt', 'getPositionCollateral', 'updateDelegation'],
			},
		},
		default: '1',
		placeholder: '1',
		description: 'The pool ID to delegate to',
	},

	// Collateral Type
	{
		displayName: 'Collateral Type',
		name: 'collateralType',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['delegation'],
				operation: ['delegate', 'getDelegated', 'getPosition', 'getPositionDebt', 'getPositionCollateral', 'updateDelegation'],
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
				resource: ['delegation'],
				operation: ['delegate', 'updateDelegation'],
			},
		},
		default: '',
		placeholder: '100.0',
		description: 'Amount of collateral to delegate',
	},

	// Leverage
	{
		displayName: 'Leverage',
		name: 'leverage',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['delegation'],
				operation: ['delegate', 'updateDelegation'],
			},
		},
		default: 1,
		description: 'Leverage multiplier (1 = no leverage)',
	},
];

export async function execute(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	const credentialType = this.getNodeParameter('credentialType', itemIndex) as string;
	const accountId = this.getNodeParameter('accountId', itemIndex) as string;

	if (!isValidAccountId(accountId)) {
		throw new NodeOperationError(this.getNode(), `Invalid account ID: ${accountId}`, { itemIndex });
	}

	switch (operation) {
		case 'delegate': {
			if (credentialType !== 'network') {
				throw new NodeOperationError(this.getNode(), 'Delegate requires network credentials', { itemIndex });
			}

			const poolId = this.getNodeParameter('poolId', itemIndex) as string;
			const collateralType = this.getNodeParameter('collateralType', itemIndex) as string;
			const amount = this.getNodeParameter('amount', itemIndex) as string;
			const leverage = this.getNodeParameter('leverage', itemIndex) as number;

			if (!isValidAddress(collateralType)) {
				throw new NodeOperationError(this.getNode(), `Invalid collateral address: ${collateralType}`, { itemIndex });
			}

			const client = await createSynthetixClient(this);
			const amountWei = toWei(amount);
			const leverageWei = toWei(leverage.toString());

			const result = await client.delegateCollateral(
				BigInt(accountId),
				BigInt(poolId),
				collateralType,
				amountWei,
				leverageWei,
			);

			return {
				success: true,
				accountId,
				poolId,
				collateralType,
				amount,
				leverage,
				transactionHash: result.transactionHash,
				blockNumber: result.blockNumber,
			};
		}

		case 'getDelegated': {
			const poolId = this.getNodeParameter('poolId', itemIndex) as string;
			const collateralType = this.getNodeParameter('collateralType', itemIndex) as string;

			const client = await createSynthetixClient(this);
			const position = await client.getPosition(BigInt(accountId), BigInt(poolId), collateralType);

			return {
				accountId,
				poolId,
				collateralType,
				delegatedAmount: formatWei(position.collateralAmount),
				delegatedAmountRaw: position.collateralAmount.toString(),
			};
		}

		case 'getPosition': {
			const poolId = this.getNodeParameter('poolId', itemIndex) as string;
			const collateralType = this.getNodeParameter('collateralType', itemIndex) as string;

			const client = await createSynthetixClient(this);
			const position = await client.getPosition(BigInt(accountId), BigInt(poolId), collateralType);

			return {
				accountId,
				poolId,
				collateralType,
				collateralAmount: formatWei(position.collateralAmount),
				collateralValue: formatWei(position.collateralValue),
				debt: formatWei(position.debt),
				cRatio: (Number(position.cRatio) / 1e18 * 100).toFixed(2) + '%',
				collateralAmountRaw: position.collateralAmount.toString(),
				collateralValueRaw: position.collateralValue.toString(),
				debtRaw: position.debt.toString(),
				cRatioRaw: position.cRatio.toString(),
			};
		}

		case 'getPositionDebt': {
			const poolId = this.getNodeParameter('poolId', itemIndex) as string;
			const collateralType = this.getNodeParameter('collateralType', itemIndex) as string;

			const client = await createSynthetixClient(this);
			const debt = await client.getPositionDebt(BigInt(accountId), BigInt(poolId), collateralType);

			return {
				accountId,
				poolId,
				collateralType,
				debt: formatWei(debt),
				debtRaw: debt.toString(),
			};
		}

		case 'getPositionCollateral': {
			const poolId = this.getNodeParameter('poolId', itemIndex) as string;
			const collateralType = this.getNodeParameter('collateralType', itemIndex) as string;

			const client = await createSynthetixClient(this);
			const collateral = await client.getPositionCollateral(BigInt(accountId), BigInt(poolId), collateralType);

			return {
				accountId,
				poolId,
				collateralType,
				amount: formatWei(collateral.amount),
				value: formatWei(collateral.value),
				amountRaw: collateral.amount.toString(),
				valueRaw: collateral.value.toString(),
			};
		}

		case 'updateDelegation': {
			if (credentialType !== 'network') {
				throw new NodeOperationError(this.getNode(), 'Update delegation requires network credentials', { itemIndex });
			}

			const poolId = this.getNodeParameter('poolId', itemIndex) as string;
			const collateralType = this.getNodeParameter('collateralType', itemIndex) as string;
			const amount = this.getNodeParameter('amount', itemIndex) as string;
			const leverage = this.getNodeParameter('leverage', itemIndex) as number;

			const client = await createSynthetixClient(this);
			const amountWei = toWei(amount);
			const leverageWei = toWei(leverage.toString());

			const result = await client.delegateCollateral(
				BigInt(accountId),
				BigInt(poolId),
				collateralType,
				amountWei,
				leverageWei,
			);

			return {
				success: true,
				accountId,
				poolId,
				collateralType,
				newAmount: amount,
				leverage,
				transactionHash: result.transactionHash,
				blockNumber: result.blockNumber,
			};
		}

		case 'getDelegationsByAccount': {
			const client = await createSubgraphClient(this, credentialType === 'api' ? 'synthetixApi' : 'synthetixNetwork');
			const positions = await client.getPositionsByAccount(accountId);

			return positions.map((p) => ({
				accountId: p.accountId,
				poolId: p.poolId,
				collateralType: p.collateralType,
				collateralAmount: p.collateralAmount,
				debt: p.debt,
				cRatio: p.cRatio,
			})) as IDataObject[];
		}

		default:
			throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex });
	}
}
