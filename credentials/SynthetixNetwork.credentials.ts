/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

/**
 * Synthetix Network Credentials
 * 
 * Configures blockchain network connection for Synthetix v3 protocol.
 * Supports Ethereum Mainnet, Optimism, Base, Arbitrum, and custom endpoints.
 */
export class SynthetixNetwork implements ICredentialType {
  name = 'synthetixNetwork';
  displayName = 'Synthetix Network';
  documentationUrl = 'https://docs.synthetix.io/v/v3/';
  
  properties: INodeProperties[] = [
    {
      displayName: 'Network',
      name: 'network',
      type: 'options',
      default: 'optimism',
      options: [
        {
          name: 'Ethereum Mainnet',
          value: 'mainnet',
        },
        {
          name: 'Optimism',
          value: 'optimism',
        },
        {
          name: 'Base',
          value: 'base',
        },
        {
          name: 'Arbitrum',
          value: 'arbitrum',
        },
        {
          name: 'Optimism Sepolia (Testnet)',
          value: 'optimism-sepolia',
        },
        {
          name: 'Base Sepolia (Testnet)',
          value: 'base-sepolia',
        },
        {
          name: 'Arbitrum Sepolia (Testnet)',
          value: 'arbitrum-sepolia',
        },
        {
          name: 'Custom',
          value: 'custom',
        },
      ],
      description: 'The blockchain network to connect to',
    },
    {
      displayName: 'RPC Endpoint URL',
      name: 'rpcUrl',
      type: 'string',
      default: '',
      placeholder: 'https://mainnet.optimism.io',
      description: 'The RPC endpoint URL for the network. Leave empty to use default public endpoints.',
    },
    {
      displayName: 'Custom RPC URL',
      name: 'customRpcUrl',
      type: 'string',
      default: '',
      required: true,
      displayOptions: {
        show: {
          network: ['custom'],
        },
      },
      placeholder: 'https://your-custom-rpc.com',
      description: 'Custom RPC endpoint URL when using a custom network',
    },
    {
      displayName: 'Chain ID',
      name: 'chainId',
      type: 'number',
      default: 10,
      description: 'The chain ID for the network. Auto-populated based on network selection.',
      displayOptions: {
        show: {
          network: ['custom'],
        },
      },
    },
    {
      displayName: 'Private Key',
      name: 'privateKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      placeholder: '0x...',
      description: 'Private key for signing transactions. Required for write operations. Never share this key!',
    },
    {
      displayName: 'Subgraph Endpoint',
      name: 'subgraphUrl',
      type: 'string',
      default: '',
      placeholder: 'https://api.thegraph.com/subgraphs/name/synthetix/...',
      description: 'Optional custom Synthetix subgraph endpoint for querying indexed data',
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {},
  };

  test: ICredentialTestRequest = {
    request: {
      method: 'POST',
      url: '={{$credentials.rpcUrl || $credentials.customRpcUrl || "https://mainnet.optimism.io"}}',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_chainId',
        params: [],
        id: 1,
      }),
    },
  };
}
