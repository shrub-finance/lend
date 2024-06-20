// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "../../tokenization/PoolShareToken.sol";

library DataTypes {
    struct EndOfLoanParams {
        uint16 bonus; // Percentage of borrow debt that liquidator gets to keep as a reward (out of the collateral) (percentage)
        uint40 duration; // Time after the endDate of the loan this phase becomes eligible
        bool liquidationEligible; // If liquidation is a option - if false, only ForceExtendBorrow may be called
        bool shrubLiquidationEligible; // If liquidation from shrub is a option
    }

    struct InterestValue {
        uint16 apy;
        bool isValid;
    }

    struct PlatformConfiguration {
        // LTV to APY mapping
        uint16[5] REVERSE_SORTED_VALID_LTV; // ARRAY of valid LTV sorted in reverse order (percentage)
        mapping(uint16 => InterestValue) LTV_TO_APY; // LTV (percentage) => InterestValue(apy (percentage), isValid (bool))
        uint16 MAX_LTV_FOR_EXTEND; // Highest possible LTV for ExtendBorrow or ForceExtendBorrow (percentage)
        uint16 LIQUIDATION_THRESHOLD; // LTV at which a borrow becomes eligible for liquidation (percentage)
        uint16 LIQUIDATION_BONUS; // Bonus for liquidator performing liquidation in terms of percentage of the debt for a borrow (percentage)
        EndOfLoanParams[7] END_OF_LOAN_PHASES;
        uint16 SHRUB_INTEREST_FEE;  // Percentage of interest paid by the borrower that is allocated to Shrub Treasury (percentage)
        uint16 SHRUB_YIELD_FEE;  // Percentage of yield earned on aETH collateral that is allocated to Shrub Treasury (percentage)
        uint40 DEPOSIT_CUTOFF_THRESHOLD;  // Deposits to a Lending Pool must be made at least this much time before the endDate (duration seconds)
        uint40 EARLY_REPAYMENT_THRESHOLD;  // Threshold before the endDate of a borrow when full repayment can be made with no penalty
        uint16 EARLY_REPAYMENT_APY;  // APY for calculating the penalty of an early repayment
    }

    struct LendState {
        uint40 lastSnapshotDate;
        uint aEthSnapshotBalance;
        uint newCollateralSinceSnapshot;
        uint claimedCollateralSinceSnapshot;
        uint bpTotalPoolShares; // Wad
    }

    struct LendingPool {
        // uint40 endDate
        uint256 principal; // Total amount of USDC that has been contributed to the LP
        uint256 accumInterest; // The amount of USDC interest earned
        uint256 accumYield; // The amount of aETH earned through Aave
        uint256 shrubInterest; // Interest allocated for Shrub Treasury
        uint256 shrubYield; // Yield allocated for Shrub Treasury
        PoolShareToken poolShareToken;
        bool finalized; // If the pool is finalized and eligible for withdraws
    }

    struct BorrowingPool {
        uint principal; // Total amount of USDC that has been borrowed in this buckets' borrows
        uint collateral; // The total amount of ETH collateral deposited for borrows in this bucket
        uint poolShareAmount; // Relative claim of the total platform aETH for this bucket. Used to calculate yield for lending pools
        uint totalAccumInterest; // Tracking accumulator for use in case of borrow default
        uint totalAccumYield; // Tracking accumulator for use in case of borrow default
        uint totalRepaid; // Tracking accumulator for use in case of borrow default - tracks USDC paid back
    }

    struct PoolDetails {
        uint lendPrincipal;
        uint lendAccumInterest;
        uint lendAccumYield;
        address lendPoolShareTokenAddress;
        uint lendPoolShareTokenTotalSupply;
        uint lendShrubInterest;
        uint lendShrubYield;
        uint borrowPrincipal;
        uint borrowCollateral;
        uint borrowPoolShareAmount;
        uint borrowTotalAccumInterest;
        uint borrowTotalAccumYield;
        uint borrowTotalRepaid;
    }


/**
    * @notice BorrowData struct
    * @dev There is a BorrowData tied to each borrow position token
    * @elem uint40 startDate - Max Date with uint40 is 2106 (83 years from now)
    * @elem uint40 endDate - End Date of the loan (uint40)
    * @elem uint256 principal - USDC Amount borrowed (6 decimals)
    * @elem uint256 originalPrincipal - Amount of USDC originally loaned. Persists across partialRepayment and extendBorrow. Used to calculate earlyRepaymentPenalty (6 Decimals)
    * @elem uint256 collateral - ETH provided as collateral (Wad)
    * @elem uint16 apy - Interest rate of loan (percentage)
*/
    struct BorrowData {
        uint40 startDate;  // Max Date with uint40 is 2106 (83 years from now)
        uint40 endDate;  // End Date of the loan (uint40)
        uint256 principal;  // USDC Amount borrowed (6 decimals)
        uint256 originalPrincipal;  // tracking of USDC Original Amount borrowed (6 decimals)
        uint256 collateral;  // ETH provided as collateral (Wad)
        uint16 apy;  // Interest rate of loan (percentage)
    }
}
