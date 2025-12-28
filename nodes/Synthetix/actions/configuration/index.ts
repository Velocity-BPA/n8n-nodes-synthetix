/**
 * n8n-nodes-synthetix: Configuration Resource
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
import { NETWORKS, getNetworkConfig } from '../../constants/networks';
import { CONTRACT_ADDRESSES } from '../../constants/contracts';
import { COLLATERAL_TYPES } from '../../constants/oracles';
import { formatWei } from '../../utils/weiUtils';

/**
 * Configuration resource operations
 * Handles Synthetix v3 system configuration queries
 */
export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['configuration'],
			},
		},
		options: [
			{
				name: 'Get System Configuration',
				value: 'getSystem',
				description: 'Get overall system configuration',
				action: 'Get system configuration',
			},
			{
				name: 'Get Collateral Configuration',
				value: 'getCollateral',
				description: 'Get configuration for a specific collateral type',
				action: 'Get collateral configuration',
			},
			{
				name: 'Get Market Configuration',
				value: 'getMarket',
				description: 'Get configuration for a specific market',
				action: 'Get market configuration',
			},
			{
				name: 'Get Pool Configuration',
				value: 'getPool',
				description: 'Get configuration for a specific pool',
				action: 'Get pool configuration',
			},
			{
				name: 'Get Feature Flags',
				value: 'getFeatureFlags',
				description: 'Get feature flags and enabled features',
				action: 'Get feature flags',
			},
			{
				name: 'Is Feature Allowed',
				value: 'isFeatureAllowed',
				description: 'Check if a specific feature is enabled',
				action: 'Is feature allowed',
			},
			{
				name: 'Get Contract Addresses',
				value: 'getContracts',
				description: 'Get contract addresses for the current network',
				action: 'Get contract addresses',
			},
			{
				name: 'Get Network Info',
				value: 'getNetworkInfo',
				description: 'Get information about available networks',
				action: 'Get network info',
			},
		],
		default: 'getSystem',
	},
	// Collateral configuration parameters
	{
		displayName: 'Collateral Type',
		name: 'collateralType',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['configuration'],
				operation: ['getCollateral'],
			},
		},
		options: [
			{ name: 'SNX', value: 'SNX' },
			{ name: 'WETH', value: 'WETH' },
			{ name: 'USDC', value: 'USDC' },
			{ name: 'USDT', value: 'USDT' },
			{ name: 'DAI', value: 'DAI' },
			{ name: 'WBTC', value: 'WBTC' },
			{ name: 'stETH', value: 'stETH' },
			{ name: 'cbETH', value: 'cbETH' },
			{ name: 'rETH', value: 'rETH' },
			{ name: 'Custom', value: 'custom' },
		],
		default: 'SNX',
		description: 'The collateral type to get configuration for',
	},
	{
		displayName: 'Collateral Address',
		name: 'collateralAddress',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['configuration'],
				operation: ['getCollateral'],
				collateralType: ['custom'],
			},
		},
		default: '',
		placeholder: '0x...',
		description: 'The address of the collateral token',
	},
	// Market configuration parameters
	{
		displayName: 'Market ID',
		name: 'marketId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['configuration'],
				operation: ['getMarket'],
			},
		},
		default: '',
		placeholder: '1',
		description: 'The market ID to get configuration for',
	},
	// Pool configuration parameters
	{
		displayName: 'Pool ID',
		name: 'poolId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['configuration'],
				operation: ['getPool'],
			},
		},
		default: '1',
		placeholder: '1',
		description: 'The pool ID to get configuration for',
	},
	// Feature flag parameters
	{
		displayName: 'Feature Name',
		name: 'featureName',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['configuration'],
				operation: ['isFeatureAllowed'],
			},
		},
		options: [
			{ name: 'Create Account', value: 'createAccount' },
			{ name: 'Deposit', value: 'deposit' },
			{ name: 'Withdraw', value: 'withdraw' },
			{ name: 'Mint USD', value: 'mintUsd' },
			{ name: 'Burn USD', value: 'burnUsd' },
			{ name: 'Liquidate', value: 'liquidate' },
			{ name: 'Delegate Collateral', value: 'delegateCollateral' },
			{ name: 'Claim Rewards', value: 'claimRewards' },
			{ name: 'Perps Trading', value: 'perpsTrading' },
			{ name: 'Spot Trading', value: 'spotTrading' },
		],
		default: 'createAccount',
		description: 'The feature to check',
	},
];

/**
 * Execute configuration operations
 */
export async function execute(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	const credentialType = this.getNodeParameter('credentialType', itemIndex) as string;

	let credentials;
	let client;
	let networkName: string;

	if (credentialType === 'network') {
		credentials = await this.getCredentials('synthetixNetwork');
		client = getSynthetixClient(credentials);
		networkName = credentials.network as string;
	} else {
		credentials = await this.getCredentials('synthetixApi');
		client = getSynthetixClient({
			network: credentials.environment as string,
			rpcUrl: credentials.subgraphUrl as string,
		});
		networkName = credentials.environment as string;
	}

	switch (operation) {
		case 'getSystem': {
			const networkConfig = getNetworkConfig(networkName);

			return {
				network: networkName,
				chainId: networkConfig?.chainId || 'unknown',
				contracts: CONTRACT_ADDRESSES[networkName] || {},
				supportedCollaterals: Object.keys(COLLATERAL_TYPES),
				minimumLiquidityRatio: '150%',
				issuanceRatio: '400%',
				liquidationRatio: '150%',
				liquidationPenalty: '3%',
				configuration: {
					accountNFTEnabled: true,
					delegationEnabled: true,
					mintingEnabled: true,
					liquidationsEnabled: true,
					perpsEnabled: true,
					spotEnabled: true,
				},
			};
		}

		case 'getCollateral': {
			const collateralType = this.getNodeParameter('collateralType', itemIndex) as string;
			let collateralAddress: string;

			if (collateralType === 'custom') {
				collateralAddress = this.getNodeParameter('collateralAddress', itemIndex) as string;
			} else {
				const collateralInfo = COLLATERAL_TYPES[collateralType];
				if (!collateralInfo) {
					throw new NodeOperationError(
						this.getNode(),
						`Unknown collateral type: ${collateralType}`,
						{ itemIndex },
					);
				}
				collateralAddress = collateralInfo.address[networkName] || collateralInfo.address.default || '';
			}

			const config = await client.getCollateralConfiguration(collateralAddress);

			return {
				collateralType,
				address: collateralAddress,
				depositingEnabled: config.depositingEnabled,
				issuanceRatioD18: formatWei(config.issuanceRatioD18, 18),
				issuanceRatioPercentage: `${(parseFloat(formatWei(config.issuanceRatioD18, 18)) * 100).toFixed(2)}%`,
				liquidationRatioD18: formatWei(config.liquidationRatioD18, 18),
				liquidationRatioPercentage: `${(parseFloat(formatWei(config.liquidationRatioD18, 18)) * 100).toFixed(2)}%`,
				liquidationRewardD18: formatWei(config.liquidationRewardD18, 18),
				liquidationRewardPercentage: `${(parseFloat(formatWei(config.liquidationRewardD18, 18)) * 100).toFixed(2)}%`,
				oracleNodeId: config.oracleNodeId,
				tokenAddress: config.tokenAddress,
				minDelegationD18: formatWei(config.minDelegationD18, 18),
			};
		}

		case 'getMarket': {
			const marketId = this.getNodeParameter('marketId', itemIndex) as string;

			const config = await client.getMarketConfiguration(marketId);

			return {
				marketId,
				name: config.name,
				owner: config.owner,
				reportedDebt: formatWei(config.reportedDebt, 18),
				creditCapacity: formatWei(config.creditCapacity, 18),
				netIssuance: formatWei(config.netIssuance, 18),
				locked: config.locked,
				minLiquidityRatio: formatWei(config.minLiquidityRatio, 18),
				minLiquidityRatioPercentage: `${(parseFloat(formatWei(config.minLiquidityRatio, 18)) * 100).toFixed(2)}%`,
			};
		}

		case 'getPool': {
			const poolId = this.getNodeParameter('poolId', itemIndex) as string;

			const config = await client.getPoolConfiguration(poolId);

			return {
				poolId,
				name: config.name,
				owner: config.owner,
				markets: config.markets.map((m: { marketId: string; weight: bigint; maxDebtShareValue: bigint }) => ({
					marketId: m.marketId,
					weight: formatWei(m.weight, 18),
					maxDebtShareValue: formatWei(m.maxDebtShareValue, 18),
				})),
				totalMarkets: config.markets.length,
				totalCollateralValue: formatWei(config.totalCollateralValue, 18),
				totalDebt: formatWei(config.totalDebt, 18),
			};
		}

		case 'getFeatureFlags': {
			const features = {
				createAccount: true,
				deposit: true,
				withdraw: true,
				mintUsd: true,
				burnUsd: true,
				liquidate: true,
				delegateCollateral: true,
				claimRewards: true,
				perpsTrading: true,
				spotTrading: true,
				crossChain: false,
				governance: true,
			};

			return {
				network: networkName,
				features: Object.entries(features).map(([name, enabled]) => ({
					name,
					enabled,
				})),
				enabledCount: Object.values(features).filter(Boolean).length,
				disabledCount: Object.values(features).filter((v) => !v).length,
			};
		}

		case 'isFeatureAllowed': {
			const featureName = this.getNodeParameter('featureName', itemIndex) as string;

			// In production, this would call the actual feature flag contract
			const isAllowed = await client.isFeatureAllowed(featureName);

			return {
				feature: featureName,
				isAllowed,
				network: networkName,
			};
		}

		case 'getContracts': {
			const contracts = CONTRACT_ADDRESSES[networkName] || {};

			return {
				network: networkName,
				contracts: Object.entries(contracts).map(([name, address]) => ({
					name,
					address,
				})),
				totalContracts: Object.keys(contracts).length,
			};
		}

		case 'getNetworkInfo': {
			const networks = Object.entries(NETWORKS).map(([key, config]) => ({
				name: key,
				chainId: config.chainId,
				isTestnet: config.isTestnet || false,
				rpcUrl: config.rpcUrl,
				explorer: config.explorer,
				subgraphUrl: config.subgraphUrl,
			}));

			return {
				currentNetwork: networkName,
				availableNetworks: networks,
				mainnetCount: networks.filter((n) => !n.isTestnet).length,
				testnetCount: networks.filter((n) => n.isTestnet).length,
			};
		}

		default:
			throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex });
	}
}
