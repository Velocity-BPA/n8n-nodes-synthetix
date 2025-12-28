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
	INodeType,
	INodeTypeDescription,
	ITriggerFunctions,
	ITriggerResponse,
} from 'n8n-workflow';
import { ethers } from 'ethers';

// Event topic hashes for Synthetix v3 events
const EVENT_TOPICS = {
	// Account events
	AccountCreated: ethers.id('AccountCreated(uint128,address)'),
	AccountTransferred: ethers.id('Transfer(address,address,uint256)'),
	PermissionGranted: ethers.id('PermissionGranted(uint128,bytes32,address,address)'),
	PermissionRevoked: ethers.id('PermissionRevoked(uint128,bytes32,address,address)'),

	// Collateral events
	Deposited: ethers.id('Deposited(uint128,address,uint256,address)'),
	Withdrawn: ethers.id('Withdrawn(uint128,address,uint256,address)'),
	CollateralConfigured: ethers.id('CollateralConfigured(address,bool)'),

	// Delegation events
	DelegationUpdated: ethers.id('DelegationUpdated(uint128,uint128,address,uint256,uint256,address)'),

	// Pool events
	PoolCreated: ethers.id('PoolCreated(uint128,address,address)'),
	PoolConfigurationSet: ethers.id('PoolConfigurationSet(uint128,tuple[],address)'),
	PoolNameUpdated: ethers.id('PoolNameUpdated(uint128,string,address)'),

	// Market events
	MarketRegistered: ethers.id('MarketRegistered(address,uint128,address)'),
	MarketUsdDeposited: ethers.id('MarketUsdDeposited(uint128,address,uint256,address)'),
	MarketUsdWithdrawn: ethers.id('MarketUsdWithdrawn(uint128,address,uint256,address)'),

	// Liquidation events
	Liquidation: ethers.id('Liquidation(uint128,uint128,address,uint256,uint256,uint128,uint256,address)'),
	VaultLiquidation: ethers.id('VaultLiquidation(uint128,address,uint256,uint256,uint256,address)'),

	// snxUSD events
	UsdMinted: ethers.id('UsdMinted(uint128,uint128,address,uint256,address)'),
	UsdBurned: ethers.id('UsdBurned(uint128,uint128,address,uint256,address)'),

	// Rewards events
	RewardsClaimed: ethers.id('RewardsClaimed(uint128,uint128,address,address,uint256,address)'),
	RewardsDistributed: ethers.id('RewardsDistributed(uint128,address,address,uint256,uint256,uint256)'),

	// Perps events
	OrderCommitted: ethers.id('OrderCommitted(uint128,uint8,uint256,uint256,uint256,bytes32,address,address)'),
	OrderSettled: ethers.id('OrderSettled(uint128,uint128,uint256,int256,int256,int256,int128,uint256,uint256,uint256,bytes32,address)'),
	OrderCancelled: ethers.id('OrderCancelled(uint128,uint128,uint256,uint256,address)'),
	PositionLiquidated: ethers.id('PositionLiquidated(uint128,uint128,int256,int256,int256,uint256,address)'),

	// Spot events
	SynthBought: ethers.id('SynthBought(uint256,uint256,tuple,uint256,uint256,address,uint256)'),
	SynthSold: ethers.id('SynthSold(uint256,uint256,tuple,uint256,uint256,address,uint256)'),
	SynthWrapped: ethers.id('SynthWrapped(uint256,uint256,tuple,uint256,address)'),
	SynthUnwrapped: ethers.id('SynthUnwrapped(uint256,uint256,tuple,uint256,address)'),
};

// Emit licensing notice once
let licensingNoticeEmitted = false;
function emitLicensingNotice(): void {
	if (!licensingNoticeEmitted) {
		console.warn(`
[Velocity BPA Licensing Notice]

This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).

Use of this node by for-profit organizations in production environments requires
a commercial license from Velocity BPA.

For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.
`);
		licensingNoticeEmitted = true;
	}
}

export class SynthetixTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Synthetix Trigger',
		name: 'synthetixTrigger',
		icon: 'file:synthetix.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Listen for Synthetix v3 protocol events in real-time',
		defaults: {
			name: 'Synthetix Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'synthetixNetwork',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Event Category',
				name: 'eventCategory',
				type: 'options',
				options: [
					{ name: 'Account', value: 'account' },
					{ name: 'Collateral', value: 'collateral' },
					{ name: 'Delegation', value: 'delegation' },
					{ name: 'Pool', value: 'pool' },
					{ name: 'Market', value: 'market' },
					{ name: 'Liquidation', value: 'liquidation' },
					{ name: 'snxUSD', value: 'snxUsd' },
					{ name: 'Rewards', value: 'rewards' },
					{ name: 'Perps', value: 'perps' },
					{ name: 'Spot', value: 'spot' },
				],
				default: 'account',
				description: 'Category of events to listen for',
			},
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				displayOptions: {
					show: {
						eventCategory: ['account'],
					},
				},
				options: [
					{ name: 'Account Created', value: 'AccountCreated' },
					{ name: 'Account Transferred', value: 'AccountTransferred' },
					{ name: 'Permission Granted', value: 'PermissionGranted' },
					{ name: 'Permission Revoked', value: 'PermissionRevoked' },
				],
				default: 'AccountCreated',
				description: 'Account event to listen for',
			},
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				displayOptions: {
					show: {
						eventCategory: ['collateral'],
					},
				},
				options: [
					{ name: 'Collateral Deposited', value: 'Deposited' },
					{ name: 'Collateral Withdrawn', value: 'Withdrawn' },
					{ name: 'Collateral Configured', value: 'CollateralConfigured' },
				],
				default: 'Deposited',
				description: 'Collateral event to listen for',
			},
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				displayOptions: {
					show: {
						eventCategory: ['delegation'],
					},
				},
				options: [
					{ name: 'Delegation Updated', value: 'DelegationUpdated' },
				],
				default: 'DelegationUpdated',
				description: 'Delegation event to listen for',
			},
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				displayOptions: {
					show: {
						eventCategory: ['pool'],
					},
				},
				options: [
					{ name: 'Pool Created', value: 'PoolCreated' },
					{ name: 'Pool Configuration Set', value: 'PoolConfigurationSet' },
					{ name: 'Pool Name Updated', value: 'PoolNameUpdated' },
				],
				default: 'PoolCreated',
				description: 'Pool event to listen for',
			},
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				displayOptions: {
					show: {
						eventCategory: ['market'],
					},
				},
				options: [
					{ name: 'Market Registered', value: 'MarketRegistered' },
					{ name: 'Market USD Deposited', value: 'MarketUsdDeposited' },
					{ name: 'Market USD Withdrawn', value: 'MarketUsdWithdrawn' },
				],
				default: 'MarketRegistered',
				description: 'Market event to listen for',
			},
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				displayOptions: {
					show: {
						eventCategory: ['liquidation'],
					},
				},
				options: [
					{ name: 'Account Liquidation', value: 'Liquidation' },
					{ name: 'Vault Liquidation', value: 'VaultLiquidation' },
				],
				default: 'Liquidation',
				description: 'Liquidation event to listen for',
			},
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				displayOptions: {
					show: {
						eventCategory: ['snxUsd'],
					},
				},
				options: [
					{ name: 'USD Minted', value: 'UsdMinted' },
					{ name: 'USD Burned', value: 'UsdBurned' },
				],
				default: 'UsdMinted',
				description: 'snxUSD event to listen for',
			},
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				displayOptions: {
					show: {
						eventCategory: ['rewards'],
					},
				},
				options: [
					{ name: 'Rewards Claimed', value: 'RewardsClaimed' },
					{ name: 'Rewards Distributed', value: 'RewardsDistributed' },
				],
				default: 'RewardsClaimed',
				description: 'Rewards event to listen for',
			},
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				displayOptions: {
					show: {
						eventCategory: ['perps'],
					},
				},
				options: [
					{ name: 'Order Committed', value: 'OrderCommitted' },
					{ name: 'Order Settled', value: 'OrderSettled' },
					{ name: 'Order Cancelled', value: 'OrderCancelled' },
					{ name: 'Position Liquidated', value: 'PositionLiquidated' },
				],
				default: 'OrderCommitted',
				description: 'Perps event to listen for',
			},
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				displayOptions: {
					show: {
						eventCategory: ['spot'],
					},
				},
				options: [
					{ name: 'Synth Bought', value: 'SynthBought' },
					{ name: 'Synth Sold', value: 'SynthSold' },
					{ name: 'Synth Wrapped', value: 'SynthWrapped' },
					{ name: 'Synth Unwrapped', value: 'SynthUnwrapped' },
				],
				default: 'SynthBought',
				description: 'Spot market event to listen for',
			},
			{
				displayName: 'Contract Address',
				name: 'contractAddress',
				type: 'string',
				default: '',
				placeholder: '0x...',
				description: 'Contract address to listen for events (leave empty for default)',
			},
			{
				displayName: 'Filter Options',
				name: 'filterOptions',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				options: [
					{
						displayName: 'Account ID',
						name: 'accountId',
						type: 'string',
						default: '',
						description: 'Filter by specific account ID',
					},
					{
						displayName: 'Pool ID',
						name: 'poolId',
						type: 'string',
						default: '',
						description: 'Filter by specific pool ID',
					},
					{
						displayName: 'Market ID',
						name: 'marketId',
						type: 'string',
						default: '',
						description: 'Filter by specific market ID',
					},
					{
						displayName: 'From Address',
						name: 'fromAddress',
						type: 'string',
						default: '',
						description: 'Filter by sender address',
					},
				],
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		emitLicensingNotice();

		const credentials = await this.getCredentials('synthetixNetwork');
		const event = this.getNodeParameter('event') as string;
		const contractAddress = this.getNodeParameter('contractAddress', '') as string;
		const filterOptions = this.getNodeParameter('filterOptions', {}) as IDataObject;

		// Connect to provider
		const rpcUrl = credentials.rpcUrl as string;
		const provider = new ethers.JsonRpcProvider(rpcUrl);

		// Get event topic
		const eventTopic = EVENT_TOPICS[event as keyof typeof EVENT_TOPICS];

		if (!eventTopic) {
			throw new Error(`Unknown event type: ${event}`);
		}

		// Build filter
		const filter: ethers.Filter = {
			topics: [eventTopic],
		};

		if (contractAddress) {
			filter.address = contractAddress;
		}

		// Add indexed parameter filters
		if (filterOptions.accountId) {
			filter.topics = filter.topics || [];
			filter.topics[1] = ethers.zeroPadValue(
				ethers.toBeHex(filterOptions.accountId as string),
				32,
			);
		}

		// Event handler
		const eventHandler = (log: ethers.Log) => {
			const eventData: IDataObject = {
				event,
				blockNumber: log.blockNumber,
				transactionHash: log.transactionHash,
				logIndex: log.index,
				address: log.address,
				topics: log.topics,
				data: log.data,
				timestamp: new Date().toISOString(),
			};

			// Parse event data based on type
			try {
				const parsedData = parseEventData(event, log);
				eventData.parsed = parsedData;
			} catch {
				eventData.parseError = 'Could not parse event data';
			}

			this.emit([this.helpers.returnJsonArray([eventData])]);
		};

		// Subscribe to events
		provider.on(filter, eventHandler);

		// Manual trigger for testing
		const manualTriggerFunction = async () => {
			const latestBlock = await provider.getBlockNumber();
			const logs = await provider.getLogs({
				...filter,
				fromBlock: latestBlock - 100,
				toBlock: latestBlock,
			});

			if (logs.length > 0) {
				const eventData = logs.map((log) => ({
					event,
					blockNumber: log.blockNumber,
					transactionHash: log.transactionHash,
					logIndex: log.index,
					address: log.address,
					topics: log.topics,
					data: log.data,
					timestamp: new Date().toISOString(),
				}));

				this.emit([this.helpers.returnJsonArray(eventData)]);
			}
		};

		// Cleanup function
		const closeFunction = async () => {
			provider.off(filter, eventHandler);
			provider.destroy();
		};

		return {
			closeFunction,
			manualTriggerFunction,
		};
	}
}

/**
 * Parse event data based on event type
 */
function parseEventData(event: string, log: ethers.Log): IDataObject {
	const data: IDataObject = {};

	switch (event) {
		case 'AccountCreated':
			data.accountId = BigInt(log.topics[1] || '0').toString();
			data.owner = ethers.getAddress('0x' + (log.topics[2] || '').slice(-40));
			break;

		case 'Deposited':
		case 'Withdrawn':
			data.accountId = BigInt(log.topics[1] || '0').toString();
			data.collateralType = ethers.getAddress('0x' + (log.topics[2] || '').slice(-40));
			// Amount in data field
			if (log.data && log.data.length >= 66) {
				data.amount = BigInt('0x' + log.data.slice(2, 66)).toString();
			}
			break;

		case 'DelegationUpdated':
			data.accountId = BigInt(log.topics[1] || '0').toString();
			data.poolId = BigInt(log.topics[2] || '0').toString();
			data.collateralType = ethers.getAddress('0x' + (log.topics[3] || '').slice(-40));
			break;

		case 'PoolCreated':
			data.poolId = BigInt(log.topics[1] || '0').toString();
			data.owner = ethers.getAddress('0x' + (log.topics[2] || '').slice(-40));
			break;

		case 'Liquidation':
			data.accountId = BigInt(log.topics[1] || '0').toString();
			data.poolId = BigInt(log.topics[2] || '0').toString();
			data.collateralType = ethers.getAddress('0x' + (log.topics[3] || '').slice(-40));
			break;

		case 'UsdMinted':
		case 'UsdBurned':
			data.accountId = BigInt(log.topics[1] || '0').toString();
			data.poolId = BigInt(log.topics[2] || '0').toString();
			break;

		case 'RewardsClaimed':
			data.accountId = BigInt(log.topics[1] || '0').toString();
			data.poolId = BigInt(log.topics[2] || '0').toString();
			data.collateralType = ethers.getAddress('0x' + (log.topics[3] || '').slice(-40));
			break;

		case 'OrderCommitted':
		case 'OrderSettled':
		case 'OrderCancelled':
			data.marketId = BigInt(log.topics[1] || '0').toString();
			data.accountId = BigInt(log.topics[2] || '0').toString();
			break;

		case 'PositionLiquidated':
			data.accountId = BigInt(log.topics[1] || '0').toString();
			data.marketId = BigInt(log.topics[2] || '0').toString();
			break;

		case 'SynthBought':
		case 'SynthSold':
		case 'SynthWrapped':
		case 'SynthUnwrapped':
			data.synthMarketId = BigInt(log.topics[1] || '0').toString();
			break;

		default:
			data.rawTopics = log.topics;
			data.rawData = log.data;
	}

	return data;
}
