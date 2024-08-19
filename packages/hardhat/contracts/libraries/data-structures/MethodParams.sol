// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "../../interfaces/IAETH.sol";
import "../../interfaces/IBorrowPositionToken.sol";
import "../../interfaces/IComet.sol";
import "../../interfaces/IMockAaveV3.sol";
import "../../interfaces/IWETH.sol";

import "./DataTypes.sol";

library MethodParams {

    struct shrubLiquidationParams {
        uint tokenId;
        uint liquidationPhase;
        uint ethPrice;
        address shrubTreasury;
        IBorrowPositionToken bpt;
        IAETH aeth;
        IERC20 usdc;
    }

    struct borrowLiquidationParams{
        uint tokenId;
        uint percentage;
        uint ethPrice;
        IBorrowPositionToken bpt;
        IAETH aeth;
        IERC20 usdc;
    }

    struct forceExtendBorrowParams {
        uint tokenId;
        uint liquidationPhase;
        uint ethPrice;
        IBorrowPositionToken bpt;
        IAETH aeth;
        IERC20 usdc;
    }

    struct extendBorrowParams {
        uint tokenId;
        uint40 newTimestamp;
        uint256 additionalCollateral; // Amount of new ETH collateral with - 18 decimals
        uint256 additionalRepayment; // Amount of new USDC to be used to repay the existing borrow - 6 decimals
        uint16 ltv;
        uint ethPrice;
        IERC20 usdc;
        IBorrowPositionToken bpt;
        IAETH aeth;
        IComet cweth;
        bool isComp;
    }

    struct BorrowInternalParams {
        uint256 principal; // Amount of USDC with 6 decimal places
        uint256 originalPrincipal; // Amount of USDC with 6 decimal places
        uint256 collateral; // Amount of ETH collateral with 18 decimal places
        uint16 ltv; // ltv expressed as a percentage
        uint40 timestamp;  // End date of the borrow
        uint40 startDate;  // Start date of the borrow
        address beneficiary;  // Account to receive the USDC borrowed
        address borrower;  // Account to take passession of the BPT
        uint256 ethPrice;
        IERC20 usdc;
        IBorrowPositionToken bpt;
        uint40[] activePools; // Sorted ascending list of timestamps of active pools
    }

    struct repayBorrowInternalParams {
        uint tokenId;
        address repayer;
        address beneficiary;
        bool isExtend;
        IERC20 usdc;
        IBorrowPositionToken bpt;
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
        IComet cweth;
        IBorrowPositionToken bpt;
        address shrubTreasury;
        IERC20 usdc;
        uint16 shrubInterestFee;  // Percentage of interest paid by the borrower that is allocated to Shrub Treasury (percentage)
        uint16 shrubYieldFee;  // Percentage of yield earned on aETH collateral that is allocated to Shrub Treasury (percentage)
    }
    
    struct borrowParams {
        uint256 principal; // Amount of USDC with 6 decimal places
        uint256 collateral; // Amount of ETH collateral with 18 decimal places
        uint16 ltv;
        uint40 timestamp;
        uint256 ethPrice;
        uint40[] activePools; // Sorted ascending list of timestamps of active pools
        IERC20 usdc;
        IBorrowPositionToken bpt;
        IMockAaveV3 wrappedTokenGateway;
        IComet cweth;
        IWETH weth;
    }
}
