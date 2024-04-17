// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "../../tokenization/PoolShareToken.sol";

library DataTypes {
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
        uint principal; // Total amount of USDC that has been borrowed in this buckets' loans
        uint collateral; // The total amount of ETH collateral deposited for loans in this bucket
        uint poolShareAmount; // Relative claim of the total platform aETH for this bucket. Used to calculate yield for lending pools
        uint totalAccumInterest; // Tracking accumulator for use in case of loan default
        uint totalAccumYield; // Tracking accumulator for use in case of loan default
        uint totalRepaid; // Tracking accumulator for use in case of loan default - tracks USDC paid back
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

    struct BorrowData {
        uint40 startDate;  // Max Date with uint40 is 2106 (83 years from now)
        uint40 endDate;
        uint256 principal;
        uint256 collateral;
        uint32 apy;
    }

    struct TakeLoanInternalParams {
        uint256 principal; // Amount of USDC with 6 decimal places
        uint256 collateral; // Amount of ETH collateral with 18 decimal places
        uint32 ltv; // ltv expressed as a percentage
        uint40 timestamp;
        uint40 startDate;
        address beneficiary;
        address loanHolder;
    }

    struct calcLPIncreasesParams {
        uint aEthYieldDistribution; // Amount of AETH yield since last snapshot allocated to a borrowing pool (Wad)
        uint accumInterestBP; // Amount of accumulated USDC interest belonging to a borrowing pool (6 decimals)
        uint lendingPoolPrincipal; // Amount of USDC principal in a lending pool (6 decimals)
        uint contributionDenominator; // Sum of USDC principal of all lending pools eligible for a distribution from the borrowing pool
    }

    struct calcLPIncreasesResult {
        uint deltaAccumYield; // New aETH yield to be distributed to this lending pool from this borrowing pool (Wad)
        uint deltaShrubYield; // New aETH yield to be distributed as fees to the shrub treasury from this borrowing pool (Wad)
        uint deltaAccumInterest; // New aETH yield to be distributed to this lending pool from this borrowing pool (Wad)
        uint deltaShrubInterest; // New aETH yield to be distributed to this lending pool from this borrowing pool (Wad)
    }


//    struct ChainlinkResponse {
//        uint80 roundId;
//        int256 answer;
//        uint256 startedAt;
//        uint256 updatedAt;
//        uint80 answeredInRound;
//    }


}
