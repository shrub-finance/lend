// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {DataTypes} from '../data-structures/DataTypes.sol';
import {MethodParams} from '../data-structures/MethodParams.sol';
import {HelpersLogic} from "../view/HelpersLogic.sol";
import {LendingPlatformEvents} from '../data-structures/LendingPlatformEvents.sol';
import {ShrubView} from '../view/ShrubView.sol';
import {WadRayMath} from "@aave/core-v3/contracts/protocol/libraries/math/WadRayMath.sol";

import "../../interfaces/IMockAaveV3.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../interfaces/IBorrowPositionToken.sol";
import "../../interfaces/IAETH.sol";

library BorrowInternalLogic {
    // This runs after the collateralProvider has sent aETH to Shrub
/**
    * @notice Internal function called to record all changes related to borrowing - run after sending collateral
    * @dev The following checks are made: validPool, sufficientCollateral, availableLiquidity
    * @dev USDC is transferred to the beneficiary in the amount of principal
    * @param params DataTypes.TakeLoanInternalParams
*/
    function borrowInternal(
        MethodParams.BorrowInternalParams memory params,
        DataTypes.LendState storage lendState,
        mapping(uint40 => DataTypes.BorrowingPool) storage borrowingPools,
        mapping(uint40 => DataTypes.LendingPool) storage lendingPools,
        mapping(uint40 => uint256) storage activePoolIndex
    ) internal {

        require(
            params.collateral >= ShrubView.requiredCollateral(params.ltv, params.principal, params.ethPrice),
            "Insufficient collateral provided for specified ltv"
        );

        // Ensure the ltv is valid and calculate the apy
        uint16 apy = HelpersLogic.getAPYBasedOnLTV(params.ltv);

        // Check if the loan amount is less than or equal to the liquidity across pools
        uint totalAvailableLiquidity = ShrubView.getAvailableForPeriod(
            params.timestamp,
            lendingPools,
            borrowingPools,
            activePoolIndex,
            params.activePools
        );

        require(
            params.principal <= totalAvailableLiquidity,
            "Insufficient liquidity across pools"
        );

        // Transfer the loan amount in USDC to the borrower
        params.usdc.transfer(params.beneficiary, params.principal);

        DataTypes.BorrowData memory bd;
        bd.startDate = params.startDate;
        bd.endDate = params.timestamp;
        bd.principal = params.principal;
        bd.originalPrincipal = params.originalPrincipal;
        bd.collateral = params.collateral;
        bd.apy = apy;
        uint tokenId = params.bpt.mint(params.borrower, bd);

        // Update borrowingPools
        borrowingPools[params.timestamp].principal += params.principal;
        borrowingPools[params.timestamp].collateral += params.collateral;
        uint deltaBpPoolShares;

        if (lendState.aEthSnapshotBalance == 0) {
            deltaBpPoolShares = params.collateral;
        } else {
            deltaBpPoolShares = WadRayMath.wadDiv(
                WadRayMath.wadMul(params.collateral, lendState.bpTotalPoolShares),
                lendState.aEthSnapshotBalance + lendState.newCollateralSinceSnapshot - lendState.claimedCollateralSinceSnapshot
            );
        }

        borrowingPools[params.timestamp].poolShareAmount += deltaBpPoolShares;
        lendState.bpTotalPoolShares += deltaBpPoolShares;
        lendState.newCollateralSinceSnapshot += params.collateral;  // Keep track of the collateral since the last snapshot
        emit LendingPlatformEvents.NewBorrow(tokenId, params.timestamp, params.beneficiary, params.collateral, params.principal, params.startDate, apy);
    }
}
