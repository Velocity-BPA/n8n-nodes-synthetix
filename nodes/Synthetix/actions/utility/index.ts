/**
 * [Velocity BPA Licensing Notice]
 *
 * This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).
 *
 * Use of this node by for-profit organizations in production environments requires
 * a commercial license from Velocity BPA.
 *
 * For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.
 */

import type {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { toWei, fromWei, formatWei, convertDecimals } from '../../utils/weiUtils';
import { calculateCRatio, calculateRequiredCollateral, calculateHealthFactor, isLiquidatable } from '../../utils/ratioUtils';
import { isValidAccountId, isValidAddress } from '../../utils/accountUtils';
import { NETWORKS, getNetworkConfig } from '../../constants/networks';
import { CONTRACT_ADDRESSES } from '../../constants/contracts';

/**
 * Utility Resource
 *
 * Helper functions for:
 * - Wei conversions (wei ↔ ether)
 * - C-ratio calculations
 * - Validation helpers
 * - Contract address lookups
 * - Network status checks
 */

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['utility'],
			},
		},
		options: [
			{
				name: 'Convert Wei to Ether',
				value: 'weiToEther',
				description: 'Convert wei amount to ether (18 decimals)',
				action: 'Convert wei to ether',
			},
			{
				name: 'Convert Ether to Wei',
				value: 'etherToWei',
				description: 'Convert ether amount to wei (18 decimals)',
				action: 'Convert ether to wei',
			},
			{
				name: 'Convert Decimals',
				value: 'convertDecimals',
				description: 'Convert between different decimal precisions',
				action: 'Convert decimals',
			},
			{
				name: 'Calculate C-Ratio',
				value: 'calculateCRatio',
				description: 'Calculate collateralization ratio from collateral and debt',
				action: 'Calculate c ratio',
			},
			{
				name: 'Calculate Required Collateral',
				value: 'calculateRequiredCollateral',
				description: 'Calculate collateral needed for target C-ratio',
				action: 'Calculate required collateral',
			},
			{
				name: 'Calculate Health Factor',
				value: 'calculateHealthFactor',
				description: 'Calculate position health factor',
				action: 'Calculate health factor',
			},
			{
				name: 'Check Liquidatable',
				value: 'checkLiquidatable',
				description: 'Check if position would be liquidatable',
				action: 'Check liquidatable',
			},
			{
				name: 'Validate Account ID',
				value: 'validateAccountId',
				description: 'Validate if account ID is valid format',
				action: 'Validate account id',
			},
			{
				name: 'Validate Address',
				value: 'validateAddress',
				description: 'Validate if Ethereum address is valid',
				action: 'Validate address',
			},
			{
				name: 'Get Contract Addresses',
				value: 'getContractAddresses',
				description: 'Get Synthetix contract addresses for a network',
				action: 'Get contract addresses',
			},
			{
				name: 'Get Network Config',
				value: 'getNetworkConfig',
				description: 'Get network configuration details',
				action: 'Get network config',
			},
			{
				name: 'List Networks',
				value: 'listNetworks',
				description: 'List all supported networks',
				action: 'List networks',
			},
		],
		default: 'weiToEther',
	},

	// Wei to Ether parameters
	{
		displayName: 'Wei Amount',
		name: 'weiAmount',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['weiToEther'],
			},
		},
		default: '',
		placeholder: '1000000000000000000',
		description: 'Amount in wei to convert to ether',
	},
	{
		displayName: 'Decimals',
		name: 'weiDecimals',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['weiToEther'],
			},
		},
		default: 18,
		description: 'Number of decimal places (default: 18 for ETH)',
	},

	// Ether to Wei parameters
	{
		displayName: 'Ether Amount',
		name: 'etherAmount',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['etherToWei'],
			},
		},
		default: '',
		placeholder: '1.5',
		description: 'Amount in ether to convert to wei',
	},
	{
		displayName: 'Decimals',
		name: 'etherDecimals',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['etherToWei'],
			},
		},
		default: 18,
		description: 'Number of decimal places (default: 18 for ETH)',
	},

	// Convert Decimals parameters
	{
		displayName: 'Amount',
		name: 'convertAmount',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['convertDecimals'],
			},
		},
		default: '',
		description: 'Amount to convert',
	},
	{
		displayName: 'From Decimals',
		name: 'fromDecimals',
		type: 'number',
		required: true,
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['convertDecimals'],
			},
		},
		default: 18,
		description: 'Source decimal precision',
	},
	{
		displayName: 'To Decimals',
		name: 'toDecimals',
		type: 'number',
		required: true,
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['convertDecimals'],
			},
		},
		default: 6,
		description: 'Target decimal precision',
	},

	// C-Ratio calculation parameters
	{
		displayName: 'Collateral Value (USD)',
		name: 'collateralValue',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['calculateCRatio'],
			},
		},
		default: '',
		placeholder: '1000',
		description: 'Total collateral value in USD',
	},
	{
		displayName: 'Debt Value (USD)',
		name: 'debtValue',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['calculateCRatio'],
			},
		},
		default: '',
		placeholder: '500',
		description: 'Total debt value in USD',
	},

	// Required Collateral parameters
	{
		displayName: 'Debt Amount',
		name: 'reqDebt',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['calculateRequiredCollateral'],
			},
		},
		default: '',
		placeholder: '500',
		description: 'Debt amount to cover',
	},
	{
		displayName: 'Target C-Ratio (%)',
		name: 'targetCRatio',
		type: 'number',
		required: true,
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['calculateRequiredCollateral'],
			},
		},
		default: 400,
		description: 'Target collateralization ratio percentage',
	},

	// Health Factor parameters
	{
		displayName: 'Collateral Value',
		name: 'hfCollateral',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['calculateHealthFactor'],
			},
		},
		default: '',
		description: 'Collateral value in USD',
	},
	{
		displayName: 'Debt Value',
		name: 'hfDebt',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['calculateHealthFactor'],
			},
		},
		default: '',
		description: 'Debt value in USD',
	},
	{
		displayName: 'Liquidation Ratio (%)',
		name: 'hfLiqRatio',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['calculateHealthFactor'],
			},
		},
		default: 150,
		description: 'Liquidation threshold percentage',
	},

	// Check Liquidatable parameters
	{
		displayName: 'Current C-Ratio (%)',
		name: 'currentCRatio',
		type: 'number',
		required: true,
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['checkLiquidatable'],
			},
		},
		default: 200,
		description: 'Current collateralization ratio',
	},
	{
		displayName: 'Liquidation Ratio (%)',
		name: 'liquidationRatio',
		type: 'number',
		required: true,
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['checkLiquidatable'],
			},
		},
		default: 150,
		description: 'Liquidation threshold ratio',
	},

	// Validate Account ID parameter
	{
		displayName: 'Account ID',
		name: 'accountIdToValidate',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['validateAccountId'],
			},
		},
		default: '',
		placeholder: '12345',
		description: 'Account ID to validate',
	},

	// Validate Address parameter
	{
		displayName: 'Address',
		name: 'addressToValidate',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['validateAddress'],
			},
		},
		default: '',
		placeholder: '0x...',
		description: 'Ethereum address to validate',
	},

	// Get Contract Addresses network
	{
		displayName: 'Network',
		name: 'contractNetwork',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['utility'],
				operation: ['getContractAddresses', 'getNetworkConfig'],
			},
		},
		options: [
			{ name: 'Ethereum Mainnet', value: 'ethereum' },
			{ name: 'Optimism', value: 'optimism' },
			{ name: 'Base', value: 'base' },
			{ name: 'Arbitrum', value: 'arbitrum' },
			{ name: 'Optimism Sepolia', value: 'optimism-sepolia' },
			{ name: 'Base Sepolia', value: 'base-sepolia' },
			{ name: 'Arbitrum Sepolia', value: 'arbitrum-sepolia' },
		],
		default: 'ethereum',
		description: 'Network to get addresses for',
	},
];

// Network name to chain ID mapping
const networkMap: Record<string, number> = {
	'ethereum': 1,
	'optimism': 10,
	'base': 8453,
	'arbitrum': 42161,
	'optimism-sepolia': 11155420,
	'base-sepolia': 84532,
	'arbitrum-sepolia': 421614,
};

export async function execute(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	switch (operation) {
		case 'weiToEther': {
			const weiAmount = this.getNodeParameter('weiAmount', itemIndex) as string;
			const decimals = this.getNodeParameter('weiDecimals', itemIndex) as number;

			try {
				const etherAmount = fromWei(weiAmount, decimals);
				const formatted = formatWei(weiAmount, decimals);

				return {
					operation: 'weiToEther',
					input: {
						wei: weiAmount,
						decimals,
					},
					output: {
						ether: etherAmount,
						formatted,
					},
				};
			} catch (error) {
				throw new NodeOperationError(
					this.getNode(),
					`Invalid wei amount: ${(error as Error).message}`,
					{ itemIndex },
				);
			}
		}

		case 'etherToWei': {
			const etherAmount = this.getNodeParameter('etherAmount', itemIndex) as string;
			const decimals = this.getNodeParameter('etherDecimals', itemIndex) as number;

			try {
				const weiAmount = toWei(etherAmount, decimals);

				return {
					operation: 'etherToWei',
					input: {
						ether: etherAmount,
						decimals,
					},
					output: {
						wei: weiAmount,
					},
				};
			} catch (error) {
				throw new NodeOperationError(
					this.getNode(),
					`Invalid ether amount: ${(error as Error).message}`,
					{ itemIndex },
				);
			}
		}

		case 'convertDecimals': {
			const amount = this.getNodeParameter('convertAmount', itemIndex) as string;
			const fromDec = this.getNodeParameter('fromDecimals', itemIndex) as number;
			const toDec = this.getNodeParameter('toDecimals', itemIndex) as number;

			try {
				const converted = convertDecimals(amount, fromDec, toDec);

				return {
					operation: 'convertDecimals',
					input: {
						amount,
						fromDecimals: fromDec,
						toDecimals: toDec,
					},
					output: {
						converted,
					},
				};
			} catch (error) {
				throw new NodeOperationError(
					this.getNode(),
					`Decimal conversion failed: ${(error as Error).message}`,
					{ itemIndex },
				);
			}
		}

		case 'calculateCRatio': {
			const collateral = this.getNodeParameter('collateralValue', itemIndex) as string;
			const debt = this.getNodeParameter('debtValue', itemIndex) as string;

			const collateralNum = parseFloat(collateral);
			const debtNum = parseFloat(debt);

			if (isNaN(collateralNum) || isNaN(debtNum)) {
				throw new NodeOperationError(
					this.getNode(),
					'Invalid collateral or debt value',
					{ itemIndex },
				);
			}

			const cRatio = calculateCRatio(
				toWei(collateral, 18),
				toWei(debt, 18),
			);

			return {
				operation: 'calculateCRatio',
				input: {
					collateralValue: collateral,
					debtValue: debt,
				},
				output: {
					cRatio: cRatio / 100,
					cRatioPercentage: `${cRatio}%`,
					isHealthy: cRatio >= 400,
					status: cRatio >= 400 ? 'Healthy' : cRatio >= 200 ? 'Warning' : 'Critical',
				},
			};
		}

		case 'calculateRequiredCollateral': {
			const debt = this.getNodeParameter('reqDebt', itemIndex) as string;
			const targetRatio = this.getNodeParameter('targetCRatio', itemIndex) as number;

			const debtNum = parseFloat(debt);
			if (isNaN(debtNum)) {
				throw new NodeOperationError(
					this.getNode(),
					'Invalid debt value',
					{ itemIndex },
				);
			}

			const requiredCollateral = calculateRequiredCollateral(
				toWei(debt, 18),
				BigInt(targetRatio * 100),
			);

			return {
				operation: 'calculateRequiredCollateral',
				input: {
					debt,
					targetCRatioPercent: targetRatio,
				},
				output: {
					requiredCollateral: formatWei(requiredCollateral.toString(), 18),
					requiredCollateralRaw: requiredCollateral.toString(),
				},
			};
		}

		case 'calculateHealthFactor': {
			const collateral = this.getNodeParameter('hfCollateral', itemIndex) as string;
			const debt = this.getNodeParameter('hfDebt', itemIndex) as string;
			const liqRatio = this.getNodeParameter('hfLiqRatio', itemIndex) as number;

			const healthFactor = calculateHealthFactor(
				toWei(collateral, 18),
				toWei(debt, 18),
				BigInt(liqRatio * 100),
			);

			let status: string;
			if (healthFactor > 200) status = 'Very Healthy';
			else if (healthFactor > 150) status = 'Healthy';
			else if (healthFactor > 100) status = 'Moderate Risk';
			else if (healthFactor > 0) status = 'High Risk';
			else status = 'Liquidatable';

			return {
				operation: 'calculateHealthFactor',
				input: {
					collateralValue: collateral,
					debtValue: debt,
					liquidationRatioPercent: liqRatio,
				},
				output: {
					healthFactor,
					status,
					isAtRisk: healthFactor < 150,
					isLiquidatable: healthFactor <= 100,
				},
			};
		}

		case 'checkLiquidatable': {
			const currentRatio = this.getNodeParameter('currentCRatio', itemIndex) as number;
			const liqRatio = this.getNodeParameter('liquidationRatio', itemIndex) as number;

			const liquidatable = isLiquidatable(
				BigInt(currentRatio * 100),
				BigInt(liqRatio * 100),
			);

			return {
				operation: 'checkLiquidatable',
				input: {
					currentCRatioPercent: currentRatio,
					liquidationRatioPercent: liqRatio,
				},
				output: {
					isLiquidatable: liquidatable,
					marginToLiquidation: currentRatio - liqRatio,
					status: liquidatable ? 'LIQUIDATABLE' : 'Safe',
				},
			};
		}

		case 'validateAccountId': {
			const accountId = this.getNodeParameter('accountIdToValidate', itemIndex) as string;
			const isValid = isValidAccountId(accountId);

			return {
				operation: 'validateAccountId',
				input: {
					accountId,
				},
				output: {
					isValid,
					message: isValid ? 'Valid account ID' : 'Invalid account ID format',
				},
			};
		}

		case 'validateAddress': {
			const address = this.getNodeParameter('addressToValidate', itemIndex) as string;
			const isValid = isValidAddress(address);

			return {
				operation: 'validateAddress',
				input: {
					address,
				},
				output: {
					isValid,
					message: isValid ? 'Valid Ethereum address' : 'Invalid Ethereum address',
					checksumAddress: isValid ? address : null,
				},
			};
		}

		case 'getContractAddresses': {
			const network = this.getNodeParameter('contractNetwork', itemIndex) as string;
			const chainId = networkMap[network];
			const addresses = CONTRACT_ADDRESSES[chainId] || {};

			return {
				operation: 'getContractAddresses',
				network,
				chainId,
				addresses,
			};
		}

		case 'getNetworkConfig': {
			const network = this.getNodeParameter('contractNetwork', itemIndex) as string;
			const chainId = networkMap[network];
			const config = getNetworkConfig(chainId);

			return {
				operation: 'getNetworkConfig',
				network,
				chainId,
				config: config || { error: 'Network not found' },
			};
		}

		case 'listNetworks': {
			const networks = Object.entries(NETWORKS).map(([key, config]) => ({
				id: key,
				...config,
			}));

			return {
				operation: 'listNetworks',
				networks,
				count: networks.length,
			};
		}

		default:
			throw new NodeOperationError(
				this.getNode(),
				`Unknown operation: ${operation}`,
				{ itemIndex },
			);
	}
}
