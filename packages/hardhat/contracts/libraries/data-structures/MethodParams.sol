// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "../../interfaces/IAETH.sol";
import "../../interfaces/IBorrowPositionToken.sol";

library MethodParams {
    struct BorrowInternalParams {
        uint256 principal; // Amount of USDC with 6 decimal places
        uint256 originalPrincipal; // Amount of USDC with 6 decimal places
        uint256 collateral; // Amount of ETH collateral with 18 decimal places
        uint16 ltv; // ltv expressed as a percentage
        uint40 timestamp;  // End date of the borrow
        uint40 startDate;  // Start date of the borrow
        address beneficiary;  // Account to receive the USDC borrowed
        address borrower;  // Account to take passession of the BPT
    }

    struct calcLPIncreasesParams {
        uint aEthYieldDistribution; // Amount of AETH yield since last snapshot allocated to a borrowing pool (Wad)
        uint accumInterestBP; // Amount of accumulated USDC interest belonging to a borrowing pool (6 decimals)
        uint lendingPoolPrincipal; // Amount of USDC principal in a lending pool (6 decimals)
        uint contributionDenominator; // Sum of USDC principal of all lending pools eligible for a distribution from the borrowing pool
        uint16 shrubInterestFee;  // Percentage of interest paid by the borrower that is allocated to Shrub Treasury (percentage)
        uint16 shrubYieldFee;  // Percentage of yield earned on aETH collateral that is allocated to Shrub Treasury (percentage)
    }

    struct takeSnapshotParams {
        uint40[] activePools;
        IAETH aeth;
        IBorrowPositionToken bpt;
        address shrubTreasury;
        IERC20 usdc;
        uint16 shrubInterestFee;  // Percentage of interest paid by the borrower that is allocated to Shrub Treasury (percentage)
        uint16 shrubYieldFee;  // Percentage of yield earned on aETH collateral that is allocated to Shrub Treasury (percentage)
    }
}