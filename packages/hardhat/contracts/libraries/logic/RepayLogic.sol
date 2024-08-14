// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {DataTypes} from '../data-structures/DataTypes.sol';
import {MethodParams} from '../data-structures/MethodParams.sol';
import {LendingPlatformEvents} from '../data-structures/LendingPlatformEvents.sol';
import {WadRayMath} from "@aave/core-v3/contracts/protocol/libraries/math/WadRayMath.sol";
import {PercentageMath} from "@aave/core-v3/contracts/protocol/libraries/math/PercentageMath.sol";
import {Constants} from "../configuration/Constants.sol";
import {ShrubView} from "../view/ShrubView.sol";

import "../../interfaces/IMockAaveV3.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../interfaces/IBorrowPositionToken.sol";
import "../../interfaces/IAETH.sol";

library RepayLogic {
    function partialRepayBorrow(
        uint256 tokenId,
        uint256 repaymentAmount,
        IERC20 usdc,
        IBorrowPositionToken bpt,
        DataTypes.LendState storage lendState,
        mapping(uint40 => DataTypes.BorrowingPool) storage borrowingPools
    ) external {
        // Check that the user has sufficient funds
        require(usdc.balanceOf(msg.sender) >= repaymentAmount, "insufficient balance");
        // Check that the funds are less than the owed balance
        require(repaymentAmount < getBorrowDebt(tokenId, bpt, lendState), "repayment amount must be less than total debt");
        require(repaymentAmount >= getBorrowInterest(tokenId, bpt, lendState), "repayment amount must be at least the accumulated interest");
        // Check that funds are approved
        // Transfer USDC funds to Shrub
        usdc.transferFrom(
            msg.sender,
            address(this),
            repaymentAmount
        );
        // Update BPT Collateral and loans
//        bpt.updateSnapshot(tokenId, debt - repaymentAmount);
        // Update BP Collateral and loans
//        borrowingPools[bpt.getEndDate(tokenId)].principal -= repaymentAmount;
        // Update BP pool share amount (aETH)
        // Emit event for tracking/analytics/subgraph
//        uint newPrincipal = 0;
        uint principalReduction = bpt.partialRepayBorrow(tokenId, repaymentAmount, lendState.lastSnapshotDate, msg.sender);

        DataTypes.BorrowingPool storage borrowingPool = borrowingPools[bpt.getEndDate(tokenId)];
        borrowingPool.principal -= principalReduction;

        emit LendingPlatformEvents.PartialRepayBorrow(tokenId, repaymentAmount, principalReduction);
    }

/**
    * @notice internal function to repay a borrow
    * @dev takes USDC payment to repay loan (debt+penalty), burns BPT, and updates accounting
    * @dev collateral must be handled by calling functions
    * @return freedCollateral - uint256 - amount of collateral that is unlocked by this repayment
*/
    function repayBorrowInternal(
        MethodParams.repayBorrowInternalParams memory params,
        DataTypes.LendState storage lendState,
        DataTypes.PlatformConfiguration storage config,
        mapping(uint40 => DataTypes.BorrowingPool) storage borrowingPools

        // uint tokenId;
        // address repayer;
        // address beneficiary;
        // bool isExtend;
        // IERC20 usdc;
        // IBorrowPositionToken bpt;
    ) internal returns (uint freedCollateral) {
        //console.log("Running repayBorrowInternal");
        // Check that repayer owns the bpt
//        //console.log("ownerOf(tokenId): %s, repayer: %s", bpt.ownerOf(tokenId), repayer);
        // Determine the principal, interest, and collateral of the debt
        DataTypes.BorrowData memory bd = params.bpt.getBorrow(params.tokenId);
        DataTypes.BorrowingPool memory tempBorrowingPool = borrowingPools[bd.endDate];
//        bd.endDate = _timestamp;
//        bd.principal = _principal;
//        bd.collateral = _collateral;
//        bd.apy = apy;
        uint interest = getBorrowInterest(params.tokenId, params.bpt, lendState);
        uint earlyRepaymentPenalty = params.isExtend ? 0 : ShrubView.calcEarlyRepaymentPenalty(params.tokenId, params.bpt, lendState, config);
        //console.log("interest: %s", interest);
        //console.log("bd.principal: %s", bd.principal);
        //console.log("msg.sender: %s has a balance of %s USDC", msg.sender, usdc.balanceOf(msg.sender));
        // Ensure that msg.sender has sufficient USDC
        require(params.usdc.balanceOf(params.repayer) >= bd.principal + interest, "Insufficient USDC funds");
        // Ensure that msg.sender has approved sufficient USDC - ERC20 contract can handle this
        // Transfer funds to Shrub
        params.usdc.transferFrom(
            params.repayer,
            address(this),
            bd.principal + interest + earlyRepaymentPenalty
        );
        // Burn the BPT - NOTE: it must be also removed from tokensByTimestamp - This is done in other contract
        //console.log("about to burn tokenId: %s", tokenId);
        params.bpt.burn(params.tokenId);
        // Update Borrowing Pool principal, collateral
        tempBorrowingPool.principal -= bd.principal;
        tempBorrowingPool.collateral -= bd.collateral;
        //console.log("borrowingPool with endDate: %s updated to principal: %s, collateral: %s", bd.endDate, tempBorrowingPool.principal, tempBorrowingPool.collateral);
        // Update Borrowing Pool poolShareAmount
        //console.log('aEthSnapshotBalance: %s', lendState.aEthSnapshotBalance);
        //console.log("bd.collateral: %s, bpTotalPoolShares: %s, aEthSnapshotBalance: %s", bd.collateral, lendState.bpTotalPoolShares, lendState.aEthSnapshotBalance);
//        uint deltaBpPoolShares = bd.collateral * lendState.bpTotalPoolShares / (lendState.aEthSnapshotBalance + newCollateralSinceSnapshot - claimedCollateralSinceSnapshot);
        uint deltaBpPoolShares = WadRayMath.wadDiv(
            WadRayMath.wadMul(bd.collateral, lendState.bpTotalPoolShares),
            lendState.aEthSnapshotBalance + lendState.newCollateralSinceSnapshot - lendState.claimedCollateralSinceSnapshot
        );
        //console.log('deltaBpPoolShares: %s', deltaBpPoolShares);
        //console.log('borrowing pool with endDate %s has poolShareAmount: %s', bd.endDate, tempBorrowingPool.poolShareAmount);
        //console.log("about to decrement above pool...");
        tempBorrowingPool.poolShareAmount -= deltaBpPoolShares;
        //console.log("poolShareAmount of borrowingPool with timestamp: %s decremented by %s, now %s", bd.endDate, deltaBpPoolShares, tempBorrowingPool.poolShareAmount);
//        //console.log("borrowingPool with endDate: %s updated to poolShareAmount: %s", bd.endDate, tempBorrowingPool.poolShareAmount);
        // Update bpTotalPoolShares
        lendState.bpTotalPoolShares -= deltaBpPoolShares;
        //console.log("bpTotalPoolShares updated to: %s", lendState.bpTotalPoolShares);
        lendState.claimedCollateralSinceSnapshot += bd.collateral;
        //console.log("claimedCollateralSinceSnapshot updated to: %s", lendState.claimedCollateralSinceSnapshot);
        freedCollateral = bd.collateral;
        // Write borrowing pool back to storage
        borrowingPools[bd.endDate] = tempBorrowingPool;
        // Emit event for tracking/analytics/subgraph
        emit LendingPlatformEvents.RepayBorrow(params.tokenId, bd.principal + interest, freedCollateral, params.beneficiary);
    }

    function repayBorrow(
        uint tokenId,
        address beneficiary,
        IMockAaveV3 wrappedTokenGateway,
        IERC20 usdc,
        IBorrowPositionToken bpt,
        DataTypes.LendState storage lendState,
        DataTypes.PlatformConfiguration storage config,
        mapping(uint40 => DataTypes.BorrowingPool) storage borrowingPools
    ) internal {
        // Convert collateral amount of aETH to ETH and Transfer ETH to the beneficiary
        uint freedCollateral = repayBorrowInternal(
            MethodParams.repayBorrowInternalParams({
                tokenId: tokenId,
                repayer: msg.sender,
                beneficiary: beneficiary,
                isExtend: false,
                usdc: usdc,
                bpt: bpt
            }),
            lendState,
            config,
            borrowingPools
        );
        // freedCollateral will always be greater than 0
        wrappedTokenGateway.withdrawETH(address(0), freedCollateral, beneficiary);
        //console.log("sending %s ETH to %s", freedCollateral, beneficiary);
    }

    function repayBorrowAETH(
        uint tokenId,
        address beneficiary,
        IAETH aeth,
        IERC20 usdc,
        IBorrowPositionToken bpt,
        DataTypes.LendState storage lendState,
        DataTypes.PlatformConfiguration storage config,
        mapping(uint40 => DataTypes.BorrowingPool) storage borrowingPools
    ) internal {
        // Convert collateral amount of aETH to ETH and Transfer ETH to the beneficiary
        uint freedCollateral = repayBorrowInternal(
            MethodParams.repayBorrowInternalParams({
                tokenId: tokenId,
                repayer: msg.sender,
                beneficiary: beneficiary,
                isExtend: false,
                usdc: usdc,
                bpt: bpt
            }),
            lendState,
            config,
            borrowingPools
        );
        aeth.transfer(beneficiary, freedCollateral);
        //console.log("sending %s aETH to %s", freedCollateral, beneficiary);
    }


/**
    * @notice Returns the current interest of a borrow
    * @dev returns 6 decimal USDC
    * @param tokenId uint256 - tokenId of the borrow position token representing the loan
    * @return interest - uint256 - current interest of the borrow (6 decimals)
*/
    function getBorrowInterest(
        uint tokenId,
        IBorrowPositionToken bpt,
        DataTypes.LendState storage lendState
    ) private view returns (uint interest) {
        interest = bpt.getInterest(tokenId, lendState.lastSnapshotDate);
    }

/**
    * @notice Returns the current debt of a borrow
    * @dev returns 6 decimal USDC
    * @param tokenId uint256 - tokenId of the borrow position token representing the loan
    * @return debt - uint256 - current total debt (principal + interest) of the borrow (6 decimals)
*/
    function getBorrowDebt(
        uint tokenId,
        IBorrowPositionToken bpt,
        DataTypes.LendState storage lendState
    ) private view returns (uint debt) {
        debt = bpt.debt(tokenId, lendState.lastSnapshotDate);
    }

}
