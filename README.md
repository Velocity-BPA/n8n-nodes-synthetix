# n8n-nodes-synthetix

> [Velocity BPA Licensing Notice]
>
> This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).
>
> Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.
>
> For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.

A comprehensive n8n community node for the Synthetix v3 DeFi protocol, providing 22 resource categories and 100+ operations for interacting with Synthetix's modular liquidity layer across multiple EVM networks.

![n8n](https://img.shields.io/badge/n8n-community--node-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![License](https://img.shields.io/badge/license-BSL--1.1-blue)
![Synthetix](https://img.shields.io/badge/Synthetix-v3-00D1FF)

## Features

- **Multi-Network Support**: Ethereum, Optimism, Base, Arbitrum (mainnet and testnets)
- **Account Management**: Create and manage Synthetix account NFTs
- **Collateral Operations**: Deposit, withdraw, and delegate collateral
- **Pool & Market Interactions**: Query and manage liquidity pools and markets
- **Perpetuals Trading**: Full perps v3 order management
- **Spot Markets**: Synth trading and wrapping operations
- **snxUSD Operations**: Mint, burn, and transfer stablecoin
- **Liquidation Monitoring**: Health factor checks and liquidation alerts
- **Rewards Management**: Track and claim staking rewards
- **Real-Time Triggers**: Event-based workflow automation
- **Comprehensive Utilities**: Wei conversions, C-ratio calculations, validation helpers

## Installation

### Community Nodes (Recommended)

1. Open n8n and go to **Settings** > **Community Nodes**
2. Click **Install a community node**
3. Enter `n8n-nodes-synthetix`
4. Accept the risks and click **Install**

### Manual Installation

```bash
# Navigate to your n8n custom nodes directory
cd ~/.n8n/custom

# Clone or copy the package
npm install n8n-nodes-synthetix
```

### Development Installation

```bash
# 1. Extract and navigate to the package
cd n8n-nodes-synthetix

# 2. Install dependencies
npm install

# 3. Build the project
npm run build

# 4. Create symlink to n8n custom nodes directory
# For Linux/macOS:
mkdir -p ~/.n8n/custom
ln -s $(pwd) ~/.n8n/custom/n8n-nodes-synthetix

# For Windows (run as Administrator):
# mklink /D %USERPROFILE%\.n8n\custom\n8n-nodes-synthetix %CD%

# 5. Restart n8n
n8n start
```

## Credentials Setup

### Synthetix Network Credentials

For blockchain interactions (read & write operations):

| Field | Description | Example |
|-------|-------------|---------|
| Network | Target network | Optimism |
| RPC URL | Blockchain RPC endpoint | https://mainnet.optimism.io |
| Private Key | Wallet private key (for write operations) | 0x... |
| Chain ID | Network chain ID (auto-populated) | 10 |
| Subgraph URL | Optional GraphQL endpoint | https://api.thegraph.com/... |

### Synthetix API Credentials

For read-only subgraph queries:

| Field | Description | Example |
|-------|-------------|---------|
| Environment | Target environment | Production |
| Subgraph URL | GraphQL endpoint | https://api.thegraph.com/... |
| API Key | Optional API key | api-key-123 |

## Resources & Operations

### Account Resource
| Operation | Description |
|-----------|-------------|
| Create Account | Create new Synthetix account NFT |
| Get Account | Retrieve account details |
| Get Account Owner | Get account owner address |
| Get Account Permissions | List account permissions |
| Get Account Collateral | Get deposited collateral |
| Get Account Debt | Get account debt position |
| Get Account Positions | List all positions |
| Get Accounts by Owner | Find accounts by wallet |
| Transfer Account | Transfer account ownership |

### Collateral Resource
| Operation | Description |
|-----------|-------------|
| Deposit | Deposit collateral to account |
| Withdraw | Withdraw collateral from account |
| Get Balance | Get collateral balance |
| Get Value | Get USD value of collateral |
| Get Types | List supported collateral types |
| Get Configuration | Get collateral settings |
| Get C-Ratio | Calculate collateralization ratio |
| Get Required | Calculate required collateral |

### Pool Resource
| Operation | Description |
|-----------|-------------|
| Get Pool | Get pool details |
| Get Pool Configuration | Get pool market allocations |
| Get Pool Collateral | Get total pool collateral |
| Get Pool Debt | Get total pool debt |
| Get Pool Markets | List markets in pool |
| Get Vault Debt | Get vault debt by collateral |
| Get Vault Collateral | Get vault collateral amount |
| List Pools | List all available pools |

### Market Resource
| Operation | Description |
|-----------|-------------|
| Get Market | Get market details |
| Get Markets | List all markets |
| Get Market Debt | Get market debt |
| Get Credit Capacity | Get available credit |
| Get Utilization | Get capacity utilization |
| Get Price | Get market price |
| List Perps Markets | List perpetual markets |
| List Spot Markets | List spot markets |

### Delegation Resource
| Operation | Description |
|-----------|-------------|
| Delegate | Delegate collateral to pool |
| Get Delegated | Get delegated amount |
| Get Position | Get delegation position |
| Get Position Debt | Get position debt share |
| Update Delegation | Modify delegation |
| Get Delegations by Account | List all delegations |

### Vault Resource
| Operation | Description |
|-----------|-------------|
| Get Vault | Get vault details |
| Get Vault Debt | Get vault total debt |
| Get Vault Collateral | Get vault collateral |
| Get Vault C-Ratio | Get vault health |
| Get Vault by Pool and Collateral | Find specific vault |
| List Vaults | List all vaults |

### Debt Resource
| Operation | Description |
|-----------|-------------|
| Get Account Debt | Get debt for account |
| Get Pool Debt | Get total pool debt |
| Get Market Debt | Get market-reported debt |
| Burn Debt | Burn snxUSD to repay debt |
| Get Debt Shares | Get debt share tokens |
| Calculate Debt Share | Calculate share percentage |
| Get Debt Distribution | Get debt allocation |

### Rewards Resource
| Operation | Description |
|-----------|-------------|
| Get Claimable | Get claimable rewards |
| Claim | Claim rewards |
| Get Reward Rate | Get current APY |
| Get Rewards by Pool | Get pool rewards |
| Get Rewards by Account | Get account rewards |
| Get Reward History | Get historical rewards |

### Liquidation Resource
| Operation | Description |
|-----------|-------------|
| Check Liquidatable | Check if position can be liquidated |
| Liquidate Account | Liquidate undercollateralized position |
| Get Parameters | Get liquidation settings |
| Simulate | Simulate liquidation outcome |
| Get History | Get liquidation history |
| Get Health Factor | Calculate position health |

### Perps Resource
| Operation | Description |
|-----------|-------------|
| Get Market | Get perps market data |
| Get Markets | List all perps markets |
| Get Position | Get open position |
| Get Open Interest | Get market OI |
| Get Funding Rate | Get current funding |
| Get Index Price | Get oracle index price |
| Get Fill Price | Get execution price |
| Compute Order Fees | Estimate order fees |
| Commit Order | Submit new order |
| Settle Order | Execute pending order |
| Cancel Order | Cancel pending order |
| Get Pending Order | Check order status |
| Modify Collateral | Add/remove margin |
| Get Available Margin | Get withdrawable margin |
| Can Liquidate | Check liquidation eligibility |
| Liquidate | Liquidate perps position |

### Spot Resource
| Operation | Description |
|-----------|-------------|
| Get Market | Get spot market data |
| Get Markets | List spot markets |
| Get Synth Price | Get synth oracle price |
| Wrap | Convert collateral to synth |
| Unwrap | Convert synth to collateral |
| Buy | Buy synth with USD |
| Sell | Sell synth for USD |
| Quote Buy | Get buy quote |
| Quote Sell | Get sell quote |
| Get Fees | Get market fee config |
| Get Wrapper | Get wrapper settings |

### snxUSD Resource
| Operation | Description |
|-----------|-------------|
| Get Balance | Get snxUSD balance |
| Get Total Supply | Get circulating supply |
| Mint | Mint snxUSD against collateral |
| Burn | Burn snxUSD to repay debt |
| Get Mint Capacity | Get maximum mintable |

### Oracle Resource
| Operation | Description |
|-----------|-------------|
| Get Nodes | List oracle nodes |
| Get Price | Get oracle price |
| Get Types | List oracle types |
| Get Collateral Price | Get collateral asset price |

### Fee Resource
| Operation | Description |
|-----------|-------------|
| Get Collateral Fees | Get liquidation fees |
| Get Spot Fees | Get spot trading fees |
| Get Perps Order Fees | Get perps fee estimate |

### Cross-Chain Resource
| Operation | Description |
|-----------|-------------|
| Get Supported Chains | List supported networks |
| Get Chain Info | Get network configuration |

### SNX Token Resource
| Operation | Description |
|-----------|-------------|
| Get Balance | Get SNX token balance |
| Get Contract | Get SNX contract address |

### Governance Resource
| Operation | Description |
|-----------|-------------|
| Get Info | Get governance structure info |

### Permission Resource
| Operation | Description |
|-----------|-------------|
| Grant Permission | Grant account permission |
| Revoke Permission | Remove permission |
| Get Permissions | List account permissions |
| Has Permission | Check specific permission |
| Get Permission Types | List permission types |

### Configuration Resource
| Operation | Description |
|-----------|-------------|
| Get System Config | Get protocol settings |
| Get Collateral Config | Get collateral parameters |
| Get Market Config | Get market settings |
| Get Pool Config | Get pool parameters |
| Get Feature Flags | Get enabled features |

### Analytics Resource
| Operation | Description |
|-----------|-------------|
| Get Protocol TVL | Get total value locked |
| Get Protocol Stats | Get protocol metrics |
| Get Volume Stats | Get trading volume |
| Get Pool Rankings | Rank pools by metrics |
| Get User Stats | Get user statistics |
| Get Market Stats | Get market metrics |

### Subgraph Resource
| Operation | Description |
|-----------|-------------|
| Query Accounts | Query indexed accounts |
| Query Pools | Query indexed pools |
| Query Markets | Query indexed markets |
| Query Positions | Query indexed positions |
| Query Liquidations | Query liquidation events |
| Query Rewards | Query reward events |
| Custom Query | Execute custom GraphQL |
| Get Status | Check subgraph health |

### Utility Resource
| Operation | Description |
|-----------|-------------|
| Wei to Ether | Convert wei to decimal |
| Ether to Wei | Convert decimal to wei |
| Convert Decimals | Change decimal precision |
| Calculate C-Ratio | Compute collateralization ratio |
| Calculate Required Collateral | Estimate needed collateral |
| Calculate Health Factor | Compute position health |
| Check Liquidatable | Check liquidation status |
| Validate Account ID | Verify account ID format |
| Validate Address | Verify Ethereum address |
| Get Contract Addresses | Get protocol contracts |
| Get Network Config | Get network details |
| List Networks | List supported networks |

## Trigger Node

The **Synthetix Trigger** node enables real-time event monitoring:

### Event Categories

| Category | Events |
|----------|--------|
| Account | Created, Transferred, Permission Changed |
| Collateral | Deposited, Withdrawn, Configured |
| Delegation | Updated |
| Pool | Created, Configuration Set, Name Updated |
| Market | Registered, USD Deposited, USD Withdrawn |
| Liquidation | Account Liquidated, Vault Liquidated |
| snxUSD | Minted, Burned |
| Rewards | Claimed, Distributed |
| Perps | Order Committed/Settled/Cancelled, Position Liquidated |
| Spot | Synth Bought/Sold, Wrapped/Unwrapped |

## Usage Examples

### Creating an Account

```javascript
// Synthetix Node Configuration
{
  "resource": "account",
  "operation": "createAccount"
}
// Returns: { accountId: "12345", owner: "0x...", transactionHash: "0x..." }
```

### Depositing Collateral

```javascript
{
  "resource": "collateral",
  "operation": "deposit",
  "accountId": "12345",
  "collateralType": "0x...", // SNX token address
  "amount": "1000" // 1000 tokens
}
```

### Delegating to a Pool

```javascript
{
  "resource": "delegation",
  "operation": "delegate",
  "accountId": "12345",
  "poolId": "1",
  "collateralType": "0x...",
  "amount": "1000",
  "leverage": "1" // 1x leverage
}
```

### Minting snxUSD

```javascript
{
  "resource": "snxUsd",
  "operation": "mint",
  "accountId": "12345",
  "poolId": "1",
  "collateralType": "0x...",
  "amount": "100" // Mint 100 snxUSD
}
```

### Opening a Perps Position

```javascript
{
  "resource": "perps",
  "operation": "commitOrder",
  "accountId": "12345",
  "marketId": "100", // ETH perps
  "sizeDelta": "1", // 1 ETH long
  "acceptablePrice": "2000" // Max entry price
}
```

### Monitoring Liquidations (Trigger)

```javascript
{
  "eventCategory": "liquidation",
  "event": "Liquidation",
  "filterOptions": {
    "poolId": "1"
  }
}
```

## Synthetix v3 Concepts

### Account NFT
Synthetix v3 uses NFTs to represent user accounts. All positions, collateral, and permissions are tied to these account tokens, enabling account abstraction and delegation.

### Pool
A pool aggregates collateral from stakers and provides liquidity to markets. The Spartan Council pool is the primary pool managed by governance.

### Market
Markets are derivative products that borrow liquidity from pools. Examples include perpetual futures markets and spot synth markets.

### Vault
A vault represents the intersection of a pool and collateral type. Each vault tracks the total collateral and debt for that combination.

### Delegation
Users delegate their collateral to pools, which then provide liquidity to markets. Delegation earns rewards but also shares in market debt.

### snxUSD
The protocol's native stablecoin, minted against delegated collateral. Used for trading and as the settlement currency.

### C-Ratio (Collateralization Ratio)
The ratio of collateral value to debt. Higher is safer. Below the liquidation ratio triggers liquidation.

### Issuance Ratio
The target C-ratio for minting snxUSD (typically 400-500%).

### Liquidation Ratio
The minimum C-ratio before liquidation (typically 150%).

### Health Factor
A normalized measure of position safety. Above 1.0 is safe, at or below 1.0 is liquidatable.

## Networks

| Network | Chain ID | Status |
|---------|----------|--------|
| Ethereum Mainnet | 1 | ✅ Production |
| Optimism | 10 | ✅ Production |
| Base | 8453 | ✅ Production |
| Arbitrum One | 42161 | ✅ Production |
| Optimism Sepolia | 11155420 | 🧪 Testnet |
| Base Sepolia | 84532 | 🧪 Testnet |
| Arbitrum Sepolia | 421614 | 🧪 Testnet |

## Error Handling

The node provides descriptive error messages for common scenarios:

- **Invalid Account ID**: Account ID must be a positive number
- **Invalid Address**: Ethereum addresses must be 42 characters with 0x prefix
- **Insufficient Collateral**: Position would be undercollateralized
- **Liquidation Risk**: C-ratio would fall below liquidation threshold
- **Network Error**: RPC connection failed
- **Transaction Failed**: Blockchain transaction reverted

## Security Best Practices

1. **Never expose private keys** in workflows or logs
2. **Use testnets** for development and testing
3. **Monitor C-ratios** to avoid liquidation
4. **Set slippage limits** on trades
5. **Validate addresses** before transactions
6. **Use dedicated wallets** for automation
7. **Implement alerts** for position health

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint
npm run lint

# Fix linting issues
npm run lint:fix
```

## Author

**Velocity BPA**
- Website: [velobpa.com](https://velobpa.com)
- GitHub: [Velocity-BPA](https://github.com/Velocity-BPA)

## Licensing

This n8n community node is licensed under the **Business Source License 1.1**.

### Free Use
Permitted for personal, educational, research, and internal business use.

### Commercial Use
Use of this node within any SaaS, PaaS, hosted platform, managed service,
or paid automation offering requires a commercial license.

For licensing inquiries:
**licensing@velobpa.com**

See [LICENSE](LICENSE), [COMMERCIAL_LICENSE.md](COMMERCIAL_LICENSE.md), and [LICENSING_FAQ.md](LICENSING_FAQ.md) for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## Support

- **Documentation**: [Synthetix v3 Docs](https://docs.synthetix.io/)
- **Issues**: GitHub Issues
- **Discord**: [Synthetix Discord](https://discord.gg/synthetix)

## Acknowledgments

- [Synthetix](https://synthetix.io/) - DeFi liquidity protocol
- [n8n](https://n8n.io/) - Workflow automation platform
- [ethers.js](https://ethers.org/) - Ethereum library
