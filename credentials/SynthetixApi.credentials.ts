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
 * Synthetix API Credentials
 * 
 * Configures API and subgraph access for Synthetix v3 protocol.
 * Used for querying indexed data and analytics endpoints.
 */
export class SynthetixApi implements ICredentialType {
  name = 'synthetixApi';
  displayName = 'Synthetix API';
  documentationUrl = 'https://docs.synthetix.io/v/v3/';
  
  properties: INodeProperties[] = [
    {
      displayName: 'API Environment',
      name: 'environment',
      type: 'options',
      default: 'mainnet',
      options: [
        {
          name: 'Mainnet (Production)',
          value: 'mainnet',
        },
        {
          name: 'Testnet',
          value: 'testnet',
        },
        {
          name: 'Custom',
          value: 'custom',
        },
      ],
      description: 'The API environment to connect to',
    },
    {
      displayName: 'Subgraph URL (Optimism)',
      name: 'subgraphUrlOptimism',
      type: 'string',
      default: 'https://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix-optimism-mainnet',
      description: 'The Graph subgraph endpoint for Optimism',
    },
    {
      displayName: 'Subgraph URL (Base)',
      name: 'subgraphUrlBase',
      type: 'string',
      default: 'https://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix-base-mainnet',
      description: 'The Graph subgraph endpoint for Base',
    },
    {
      displayName: 'Subgraph URL (Arbitrum)',
      name: 'subgraphUrlArbitrum',
      type: 'string',
      default: 'https://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix-arbitrum-mainnet',
      description: 'The Graph subgraph endpoint for Arbitrum',
    },
    {
      displayName: 'Custom Subgraph URL',
      name: 'customSubgraphUrl',
      type: 'string',
      default: '',
      displayOptions: {
        show: {
          environment: ['custom'],
        },
      },
      placeholder: 'https://api.thegraph.com/subgraphs/name/...',
      description: 'Custom subgraph endpoint URL',
    },
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      description: 'API key for authenticated endpoints (if required)',
    },
    {
      displayName: 'Perps Subgraph URL',
      name: 'perpsSubgraphUrl',
      type: 'string',
      default: '',
      placeholder: 'https://api.thegraph.com/subgraphs/name/synthetixio-team/perps-...',
      description: 'Optional dedicated subgraph for perpetuals data',
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        Authorization: '={{"Bearer " + $credentials.apiKey}}',
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      method: 'POST',
      url: '={{$credentials.subgraphUrlOptimism}}',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: '{ _meta { block { number } } }',
      }),
    },
  };
}
