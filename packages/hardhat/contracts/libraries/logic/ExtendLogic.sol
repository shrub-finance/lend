// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

// Logic
import {BorrowInternalLogic} from './BorrowInternalLogic.sol';
import {RepayLogic} from './RepayLogic.sol';
import {HelpersLogic} from "../view/HelpersLogic.sol";
import {ShrubView} from '../view/ShrubView.sol';

import {DataTypes} from '../data-structures/DataTypes.sol';
import {MethodParams} from '../data-structures/MethodParams.sol';
import {PercentageMath} from "@aave/core-v3/contracts/protocol/libraries/math/PercentageMath.sol";

import "../../interfaces/IMockAaveV3.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../interfaces/IBorrowPositionToken.sol";

library ExtendLogic {

    struct extendBorrowLocal {
        uint newCollateral;
        uint newPrincipal;
        uint flashLoanAmount;
        uint freedCollateral;
    }

    struct forceExtendBorrowLocal {
        uint debt;
        address borrower;
        uint availabilityTime;
        uint bonusPecentage;
        uint bonusUsdc;
        uint bonus;
        uint newCollateral;
        uint flashLoanAmount;
        uint freedCollateral;
        uint16 smallestLtv;
    }


    function extendBorrow(
        MethodParams.extendBorrowParams memory params,
        DataTypes.LendState storage lendState,
        DataTypes.PlatformConfiguration storage config,
        uint40[] calldata activePools,
        mapping(uint40 => DataTypes.BorrowingPool) storage borrowingPools,
        mapping(uint40 => DataTypes.LendingPool) storage lendingPools,
        mapping(uint40 => uint256) storage activePoolIndex
    ) external {
        extendBorrowLocal memory local;
        require(msg.value == params.additionalCollateral, "Wrong amount of Ether provided.");
        // Check that the user holds at least additionalCollateral of USDC
        require(params.usdc.balanceOf(msg.sender) >= params.additionalRepayment, "Insufficient USDC balance");
        DataTypes.BorrowData memory bd = params.bpt.getBorrow(params.tokenId);
        // Check that the newTimestamp is after the endDate of the token
        require(params.newTimestamp > bd.endDate, "newTimestamp must be greater than endDate of the borrow");
        // Check that the additionalRepayment is less than the current debt of the loan
        require(ShrubView.getBorrowDebt(params.tokenId, params.bpt, lendState) > params.additionalRepayment, "additionalRepayment must be less than the total debt of the borrow");
        // Use the existing collateral and additionalCollateral to take a loan at the newTimestamp of the current loan debt minus additionalRepayment
        if (params.additionalCollateral > 0) {
            // Convert additionalCollateral to aETH and move to platform
            params.aeth.deposit{value: params.additionalCollateral}(msg.sender);
        }
        local.newCollateral = bd.collateral + params.additionalCollateral;
        local.newPrincipal = ShrubView.getBorrowDebt(params.tokenId, params.bpt, lendState) - params.additionalRepayment;
        local.flashLoanAmount = 0;
        // User Receives a flash loan for the aETH collateral required to take the new loan
        if (local.newCollateral > params.aeth.balanceOf(msg.sender)) {
            local.flashLoanAmount = local.newCollateral - params.aeth.balanceOf(msg.sender);
            // Transfer aETH from this contract to sender as a flash loan
            params.aeth.transfer(msg.sender, local.flashLoanAmount);
        }
        params.aeth.transferFrom(msg.sender, address(this), local.newCollateral);
        BorrowInternalLogic.borrowInternal(
            MethodParams.BorrowInternalParams({
                principal: local.newPrincipal,
                originalPrincipal: bd.originalPrincipal,
                collateral: local.newCollateral,
                ltv: params.ltv,
                timestamp: params.newTimestamp,
                startDate: lendState.lastSnapshotDate,
                beneficiary: msg.sender,
                borrower: msg.sender,
                ethPrice: params.ethPrice,
                usdc: params.usdc,
                bpt: params.bpt,
                activePools: activePools
            }),
            lendState,
            borrowingPools,
            lendingPools,
            activePoolIndex
        );
        local.freedCollateral = RepayLogic.repayBorrowInternal(
            MethodParams.repayBorrowInternalParams({
                tokenId: params.tokenId,
                repayer: msg.sender,
                beneficiary: msg.sender,
                isExtend: true,
                usdc: params.usdc,
                bpt: params.bpt
            }),
            lendState,
            config,
            borrowingPools
        );
        params.aeth.transfer(msg.sender, local.freedCollateral);
        if (local.flashLoanAmount > 0) {
            params.aeth.transferFrom(msg.sender, address(this), local.flashLoanAmount);
        }
    }


/**
    * @notice Called by liquidator to force the extension of an expired borrow.
    * @dev Bonuses and durations for the liquidationPhase are specified in Configuration
*/

    function forceExtendBorrow(
        MethodParams.forceExtendBorrowParams memory params,
        DataTypes.PlatformConfiguration storage config,
        DataTypes.LendState storage lendState,
        uint40[] calldata activePools,
        mapping(uint40 => uint256) storage activePoolIndex,
        mapping(uint40 => DataTypes.BorrowingPool) storage borrowingPools,
        mapping(uint40 => DataTypes.LendingPool) storage lendingPools
    ) external {
        forceExtendBorrowLocal memory local;
        DataTypes.BorrowData memory loanDetails = params.bpt.getBorrow(params.tokenId);
        local.debt = ShrubView.getBorrowDebt(params.tokenId, params.bpt, lendState);
        local.borrower = params.bpt.ownerOf(params.tokenId);
        local.availabilityTime = config.END_OF_LOAN_PHASES[params.liquidationPhase].duration;
        require(HelpersLogic.currentTimestamp() > loanDetails.endDate + local.availabilityTime ,"loan is not eligible for extension");
        local.bonusPecentage = config.END_OF_LOAN_PHASES[params.liquidationPhase].bonus;
        // The caller will be rewarded with some amount of the users' collateral. This will be based on the size of the debt to be refinanced
        local.bonusUsdc = PercentageMath.percentMul(
            local.debt,
            local.bonusPecentage
        );
        local.bonus = ShrubView.usdcToEth(local.bonusUsdc, params.ethPrice);
        // flash loan if necessary for collateral
        // take new loan on behalf of the holder - collateral is same as previous loan minus bonus
        local.newCollateral = loanDetails.collateral - local.bonus;
        local.flashLoanAmount = 0;
        if (local.newCollateral > params.aeth.balanceOf(msg.sender)) {
            local.flashLoanAmount = local.newCollateral - params.aeth.balanceOf(msg.sender);
            // Transfer aETH from this contract to sender as a flash loan
            params.aeth.transfer(msg.sender, local.flashLoanAmount);
        }
        params.aeth.transferFrom(msg.sender, address(this), local.newCollateral);
        local.smallestLtv = ShrubView.calculateSmallestValidLtv(
                    ShrubView.getLtv(params.tokenId, params.ethPrice, params.bpt, lendState),
                    true,
                    config
                );
        BorrowInternalLogic.borrowInternal(
            MethodParams.BorrowInternalParams({
                principal: local.debt,
                originalPrincipal: loanDetails.originalPrincipal,
                collateral: local.newCollateral,
                ltv: local.smallestLtv,
                timestamp: ShrubView.getNextActivePool(loanDetails.endDate, activePools, activePoolIndex),
                startDate: lendState.lastSnapshotDate,
                beneficiary: msg.sender,
                borrower: local.borrower,
                ethPrice: params.ethPrice,
                usdc: params.usdc,
                bpt: params.bpt,
                activePools: activePools
            }),
            lendState,
            borrowingPools,
            lendingPools,
            activePoolIndex
        );

        // repay previous loan and collect collateral
        // TODO: Platform is retaining the aETH - some should be flowing to the liquidator

        local.freedCollateral = RepayLogic.repayBorrowInternal(
            MethodParams.repayBorrowInternalParams({
                tokenId: params.tokenId,
                repayer: msg.sender,
                beneficiary: msg.sender,
                isExtend: true,
                usdc: params.usdc,
                bpt: params.bpt
            }),
            lendState,
            config,
            borrowingPools
        );
        params.aeth.transfer(msg.sender, local.freedCollateral);
        if (local.flashLoanAmount > 0) {
            // Transfer aETH from sender to Shrub to repay flash loan
            //console.log("about to send %s from %s with %s allowance", flashLoanAmount, msg.sender, aeth.allowance(msg.sender, address(this)));
            params.aeth.transferFrom(msg.sender, address(this), local.flashLoanAmount);
        }
    }
}
