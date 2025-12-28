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

import { toWei, fromWei, formatWei, mulWei, divWei, convertDecimals } from '../../nodes/Synthetix/utils/weiUtils';
import { calculateCRatio, calculateRequiredCollateral, calculateHealthFactor, isLiquidatable } from '../../nodes/Synthetix/utils/ratioUtils';
import { isValidAccountId, isValidAddress, hasPermission, ACCOUNT_PERMISSIONS } from '../../nodes/Synthetix/utils/accountUtils';
import { calculateAccountDebt, calculateDebtSharePercentage } from '../../nodes/Synthetix/utils/debtUtils';

describe('Wei Utilities', () => {
	describe('toWei', () => {
		it('should convert 1 ether to wei', () => {
			const result = toWei('1', 18);
			expect(result).toBe('1000000000000000000');
		});

		it('should convert 1.5 ether to wei', () => {
			const result = toWei('1.5', 18);
			expect(result).toBe('1500000000000000000');
		});

		it('should handle 6 decimals (USDC)', () => {
			const result = toWei('100', 6);
			expect(result).toBe('100000000');
		});

		it('should handle small amounts', () => {
			const result = toWei('0.001', 18);
			expect(result).toBe('1000000000000000');
		});

		it('should handle zero', () => {
			const result = toWei('0', 18);
			expect(result).toBe('0');
		});
	});

	describe('fromWei', () => {
		it('should convert wei to ether', () => {
			const result = fromWei('1000000000000000000', 18);
			expect(result).toBe('1');
		});

		it('should convert wei to decimal ether', () => {
			const result = fromWei('1500000000000000000', 18);
			expect(result).toBe('1.5');
		});

		it('should handle 6 decimals', () => {
			const result = fromWei('100000000', 6);
			expect(result).toBe('100');
		});
	});

	describe('formatWei', () => {
		it('should format wei with precision', () => {
			const result = formatWei('1234567890000000000', 18, 4);
			expect(result).toBe('1.2346');
		});

		it('should handle small amounts', () => {
			const result = formatWei('1000000000000000', 18, 6);
			expect(result).toBe('0.001000');
		});
	});

	describe('mulWei', () => {
		it('should multiply wei values', () => {
			const result = mulWei('2000000000000000000', '3000000000000000000');
			expect(result).toBe('6000000000000000000');
		});
	});

	describe('divWei', () => {
		it('should divide wei values', () => {
			const result = divWei('6000000000000000000', '2000000000000000000');
			expect(result).toBe('3000000000000000000');
		});
	});

	describe('convertDecimals', () => {
		it('should convert from 18 to 6 decimals', () => {
			const result = convertDecimals('1000000000000000000', 18, 6);
			expect(result).toBe('1000000');
		});

		it('should convert from 6 to 18 decimals', () => {
			const result = convertDecimals('1000000', 6, 18);
			expect(result).toBe('1000000000000000000');
		});
	});
});

describe('Ratio Utilities', () => {
	describe('calculateCRatio', () => {
		it('should calculate 200% C-ratio', () => {
			const collateral = '2000000000000000000000'; // 2000
			const debt = '1000000000000000000000'; // 1000
			const result = calculateCRatio(collateral, debt);
			expect(result).toBe(200);
		});

		it('should calculate 400% C-ratio', () => {
			const collateral = '4000000000000000000000';
			const debt = '1000000000000000000000';
			const result = calculateCRatio(collateral, debt);
			expect(result).toBe(400);
		});

		it('should handle zero debt', () => {
			const result = calculateCRatio('1000000000000000000', '0');
			expect(result).toBe(Infinity);
		});

		it('should handle zero collateral', () => {
			const result = calculateCRatio('0', '1000000000000000000');
			expect(result).toBe(0);
		});
	});

	describe('calculateRequiredCollateral', () => {
		it('should calculate required collateral for 400% target', () => {
			const debt = BigInt('1000000000000000000000'); // 1000
			const targetRatio = BigInt(40000); // 400%
			const result = calculateRequiredCollateral(debt.toString(), targetRatio);
			expect(result.toString()).toBe('4000000000000000000000');
		});
	});

	describe('calculateHealthFactor', () => {
		it('should calculate health factor above liquidation', () => {
			const collateral = '2000000000000000000000';
			const debt = '1000000000000000000000';
			const liqRatio = BigInt(15000); // 150%
			const result = calculateHealthFactor(collateral, debt, liqRatio);
			expect(result).toBeGreaterThan(100);
		});

		it('should calculate health factor at liquidation threshold', () => {
			const collateral = '1500000000000000000000';
			const debt = '1000000000000000000000';
			const liqRatio = BigInt(15000);
			const result = calculateHealthFactor(collateral, debt, liqRatio);
			expect(result).toBeCloseTo(100, 0);
		});
	});

	describe('isLiquidatable', () => {
		it('should return true when below liquidation ratio', () => {
			const currentRatio = BigInt(14000); // 140%
			const liqRatio = BigInt(15000); // 150%
			expect(isLiquidatable(currentRatio, liqRatio)).toBe(true);
		});

		it('should return false when above liquidation ratio', () => {
			const currentRatio = BigInt(20000); // 200%
			const liqRatio = BigInt(15000); // 150%
			expect(isLiquidatable(currentRatio, liqRatio)).toBe(false);
		});
	});
});

describe('Account Utilities', () => {
	describe('isValidAccountId', () => {
		it('should validate numeric account ID', () => {
			expect(isValidAccountId('12345')).toBe(true);
		});

		it('should reject non-numeric account ID', () => {
			expect(isValidAccountId('abc')).toBe(false);
		});

		it('should reject empty account ID', () => {
			expect(isValidAccountId('')).toBe(false);
		});

		it('should reject negative account ID', () => {
			expect(isValidAccountId('-1')).toBe(false);
		});
	});

	describe('isValidAddress', () => {
		it('should validate correct Ethereum address', () => {
			expect(isValidAddress('0x742d35Cc6634C0532925a3b844Bc454e4438f44e')).toBe(true);
		});

		it('should reject invalid address', () => {
			expect(isValidAddress('0xinvalid')).toBe(false);
		});

		it('should reject empty address', () => {
			expect(isValidAddress('')).toBe(false);
		});

		it('should reject address without 0x prefix', () => {
			expect(isValidAddress('742d35Cc6634C0532925a3b844Bc454e4438f44e')).toBe(false);
		});
	});

	describe('hasPermission', () => {
		it('should detect admin permission', () => {
			const permissions = [ACCOUNT_PERMISSIONS.ADMIN];
			expect(hasPermission(permissions, ACCOUNT_PERMISSIONS.ADMIN)).toBe(true);
		});

		it('should return false for missing permission', () => {
			const permissions = [ACCOUNT_PERMISSIONS.DELEGATE];
			expect(hasPermission(permissions, ACCOUNT_PERMISSIONS.ADMIN)).toBe(false);
		});
	});
});

describe('Debt Utilities', () => {
	describe('calculateAccountDebt', () => {
		it('should calculate total debt from shares', () => {
			const shares = '100000000000000000000'; // 100 shares
			const totalDebt = '1000000000000000000000'; // 1000 total
			const totalShares = '500000000000000000000'; // 500 total shares
			const result = calculateAccountDebt(shares, totalDebt, totalShares);
			expect(result).toBe('200000000000000000000'); // 200 debt
		});
	});

	describe('calculateDebtSharePercentage', () => {
		it('should calculate share percentage', () => {
			const shares = '100000000000000000000';
			const totalShares = '1000000000000000000000';
			const result = calculateDebtSharePercentage(shares, totalShares);
			expect(result).toBe(10); // 10%
		});

		it('should handle zero total shares', () => {
			const result = calculateDebtSharePercentage('100', '0');
			expect(result).toBe(0);
		});
	});
});
