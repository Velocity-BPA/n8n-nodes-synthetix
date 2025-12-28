/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * n8n-nodes-synthetix
 * 
 * A comprehensive n8n community node for Synthetix v3 DeFi protocol.
 * Provides full access to accounts, collateral, pools, markets, perpetuals,
 * spot markets, governance, and more.
 */

export * from './credentials/SynthetixNetwork.credentials';
export * from './credentials/SynthetixApi.credentials';
export * from './nodes/Synthetix/Synthetix.node';
export * from './nodes/Synthetix/SynthetixTrigger.node';
