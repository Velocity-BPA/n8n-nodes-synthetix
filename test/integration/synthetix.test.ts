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

import { NETWORKS, getNetworkConfig, isMainnet, isTestnet } from '../../nodes/Synthetix/constants/networks';
import { CONTRACT_ADDRESSES } from '../../nodes/Synthetix/constants/contracts';
import { POOLS, POOL_DEFAULTS } from '../../nodes/Synthetix/constants/pools';
import { PERPS_MARKETS, SPOT_MARKETS, ORDER_TYPES } from '../../nodes/Synthetix/constants/markets';
import { ORACLE_TYPES, COLLATERAL_TYPES } from '../../nodes/Synthetix/constants/oracles';

describe('Network Configuration', () => {
	describe('NETWORKS constant', () => {
		it('should have Ethereum mainnet configuration', () => {
			expect(NETWORKS[1]).toBeDefined();
			expect(NETWORKS[1].name).toBe('Ethereum Mainnet');
			expect(NETWORKS[1].chainId).toBe(1);
		});

		it('should have Optimism configuration', () => {
			expect(NETWORKS[10]).toBeDefined();
			expect(NETWORKS[10].name).toBe('Optimism');
			expect(NETWORKS[10].chainId).toBe(10);
		});

		it('should have Base configuration', () => {
			expect(NETWORKS[8453]).toBeDefined();
			expect(NETWORKS[8453].name).toBe('Base');
		});

		it('should have Arbitrum configuration', () => {
			expect(NETWORKS[42161]).toBeDefined();
			expect(NETWORKS[42161].name).toBe('Arbitrum One');
		});

		it('should have testnet configurations', () => {
			expect(NETWORKS[11155420]).toBeDefined(); // Optimism Sepolia
			expect(NETWORKS[84532]).toBeDefined(); // Base Sepolia
			expect(NETWORKS[421614]).toBeDefined(); // Arbitrum Sepolia
		});
	});

	describe('getNetworkConfig', () => {
		it('should return config for valid chain ID', () => {
			const config = getNetworkConfig(1);
			expect(config).toBeDefined();
			expect(config?.chainId).toBe(1);
		});

		it('should return undefined for invalid chain ID', () => {
			const config = getNetworkConfig(999999);
			expect(config).toBeUndefined();
		});
	});

	describe('isMainnet', () => {
		it('should return true for Ethereum mainnet', () => {
			expect(isMainnet(1)).toBe(true);
		});

		it('should return true for Optimism mainnet', () => {
			expect(isMainnet(10)).toBe(true);
		});

		it('should return false for testnet', () => {
			expect(isMainnet(11155420)).toBe(false);
		});
	});

	describe('isTestnet', () => {
		it('should return true for Optimism Sepolia', () => {
			expect(isTestnet(11155420)).toBe(true);
		});

		it('should return false for mainnet', () => {
			expect(isTestnet(1)).toBe(false);
		});
	});
});

describe('Contract Addresses', () => {
	describe('CONTRACT_ADDRESSES constant', () => {
		it('should have addresses for Ethereum mainnet', () => {
			expect(CONTRACT_ADDRESSES[1]).toBeDefined();
			expect(CONTRACT_ADDRESSES[1].CoreProxy).toBeDefined();
		});

		it('should have addresses for Optimism', () => {
			expect(CONTRACT_ADDRESSES[10]).toBeDefined();
			expect(CONTRACT_ADDRESSES[10].CoreProxy).toBeDefined();
		});

		it('should have PerpsMarketProxy on supported chains', () => {
			// Optimism has perps
			expect(CONTRACT_ADDRESSES[10].PerpsMarketProxy).toBeDefined();
		});

		it('should have SpotMarketProxy on supported chains', () => {
			expect(CONTRACT_ADDRESSES[10].SpotMarketProxy).toBeDefined();
		});
	});
});

describe('Pools Configuration', () => {
	describe('POOLS constant', () => {
		it('should have Spartan Council pool', () => {
			const spartanPool = Object.values(POOLS).find(p => p.name.includes('Spartan'));
			expect(spartanPool).toBeDefined();
		});

		it('should have pool IDs as numbers', () => {
			Object.values(POOLS).forEach(pool => {
				expect(typeof pool.id).toBe('number');
			});
		});
	});

	describe('POOL_DEFAULTS constant', () => {
		it('should have default values', () => {
			expect(POOL_DEFAULTS.minLiquidityRatio).toBeDefined();
			expect(POOL_DEFAULTS.issuanceRatio).toBeDefined();
			expect(POOL_DEFAULTS.liquidationRatio).toBeDefined();
		});

		it('should have sensible default ratios', () => {
			expect(POOL_DEFAULTS.issuanceRatio).toBeGreaterThan(100);
			expect(POOL_DEFAULTS.liquidationRatio).toBeLessThan(POOL_DEFAULTS.issuanceRatio);
		});
	});
});

describe('Markets Configuration', () => {
	describe('PERPS_MARKETS constant', () => {
		it('should have ETH perps market', () => {
			const ethMarket = PERPS_MARKETS.find(m => m.symbol === 'ETH');
			expect(ethMarket).toBeDefined();
		});

		it('should have BTC perps market', () => {
			const btcMarket = PERPS_MARKETS.find(m => m.symbol === 'BTC');
			expect(btcMarket).toBeDefined();
		});

		it('should have market IDs', () => {
			PERPS_MARKETS.forEach(market => {
				expect(market.id).toBeDefined();
			});
		});
	});

	describe('SPOT_MARKETS constant', () => {
		it('should have sUSD market', () => {
			const susdMarket = SPOT_MARKETS.find(m => m.symbol === 'sUSD');
			expect(susdMarket).toBeDefined();
		});

		it('should have sETH market', () => {
			const sethMarket = SPOT_MARKETS.find(m => m.symbol === 'sETH');
			expect(sethMarket).toBeDefined();
		});
	});

	describe('ORDER_TYPES constant', () => {
		it('should have market order type', () => {
			expect(ORDER_TYPES.MARKET).toBeDefined();
		});

		it('should have limit order type', () => {
			expect(ORDER_TYPES.LIMIT).toBeDefined();
		});
	});
});

describe('Oracle Configuration', () => {
	describe('ORACLE_TYPES constant', () => {
		it('should have Chainlink oracle type', () => {
			expect(ORACLE_TYPES.CHAINLINK).toBeDefined();
		});

		it('should have Pyth oracle type', () => {
			expect(ORACLE_TYPES.PYTH).toBeDefined();
		});
	});

	describe('COLLATERAL_TYPES constant', () => {
		it('should have SNX collateral', () => {
			expect(COLLATERAL_TYPES.SNX).toBeDefined();
		});

		it('should have ETH collateral', () => {
			expect(COLLATERAL_TYPES.ETH).toBeDefined();
		});

		it('should have USDC collateral', () => {
			expect(COLLATERAL_TYPES.USDC).toBeDefined();
		});
	});
});

describe('Node Structure', () => {
	it('should export Synthetix node class', async () => {
		const { Synthetix } = await import('../../nodes/Synthetix/Synthetix.node');
		expect(Synthetix).toBeDefined();
	});

	it('should have proper node description', async () => {
		const { Synthetix } = await import('../../nodes/Synthetix/Synthetix.node');
		const node = new Synthetix();
		expect(node.description).toBeDefined();
		expect(node.description.displayName).toBe('Synthetix');
		expect(node.description.name).toBe('synthetix');
	});

	it('should have resources property', async () => {
		const { Synthetix } = await import('../../nodes/Synthetix/Synthetix.node');
		const node = new Synthetix();
		const resourceProp = node.description.properties.find(p => p.name === 'resource');
		expect(resourceProp).toBeDefined();
		expect(resourceProp?.type).toBe('options');
	});

	it('should have all expected resources', async () => {
		const { Synthetix } = await import('../../nodes/Synthetix/Synthetix.node');
		const node = new Synthetix();
		const resourceProp = node.description.properties.find(p => p.name === 'resource');
		const resources = (resourceProp?.options as Array<{ value: string }>)?.map(o => o.value) || [];
		
		const expectedResources = [
			'account', 'collateral', 'pool', 'market', 'delegation',
			'vault', 'debt', 'rewards', 'liquidation', 'perps',
			'spot', 'snxUsd', 'oracle', 'fee', 'crossChain',
			'snxToken', 'governance', 'permission', 'configuration',
			'analytics', 'subgraph', 'utility'
		];

		expectedResources.forEach(resource => {
			expect(resources).toContain(resource);
		});
	});
});

describe('Trigger Node Structure', () => {
	it('should export SynthetixTrigger node class', async () => {
		const { SynthetixTrigger } = await import('../../nodes/Synthetix/SynthetixTrigger.node');
		expect(SynthetixTrigger).toBeDefined();
	});

	it('should have proper trigger node description', async () => {
		const { SynthetixTrigger } = await import('../../nodes/Synthetix/SynthetixTrigger.node');
		const node = new SynthetixTrigger();
		expect(node.description).toBeDefined();
		expect(node.description.displayName).toBe('Synthetix Trigger');
		expect(node.description.group).toContain('trigger');
	});

	it('should have event categories', async () => {
		const { SynthetixTrigger } = await import('../../nodes/Synthetix/SynthetixTrigger.node');
		const node = new SynthetixTrigger();
		const categoryProp = node.description.properties.find(p => p.name === 'eventCategory');
		expect(categoryProp).toBeDefined();
		expect(categoryProp?.type).toBe('options');
	});
});
