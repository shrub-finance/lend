// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {BorrowInternalLogic} from './BorrowInternalLogic.sol';
import {DataTypes} from '../data-structures/DataTypes.sol';
import {MethodParams} from '../data-structures/MethodParams.sol';
import {HelpersLogic} from "../view/HelpersLogic.sol";
import {LendingPlatformEvents} from '../data-structures/LendingPlatformEvents.sol';
import {ShrubView} from '../view/ShrubView.sol';
import {WadRayMath} from "@aave/core-v3/contracts/protocol/libraries/math/WadRayMath.sol";
import {ShrubLendMath} from "../math/ShrubLendMath.sol";
import {Constants} from "../configuration/Constants.sol";

import "../../interfaces/IMockAaveV3.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../interfaces/IBorrowPositionToken.sol";
import "../../interfaces/IAETH.sol";

library BorrowLogic {

    function borrow(
        uint256 _principal, // Amount of USDC with 6 decimal places
        uint256 _collateral, // Amount of ETH collateral with 18 decimal places
        uint16 _ltv,
        uint40 _timestamp,
        uint256 ethPrice,
        IERC20 usdc,
        IBorrowPositionToken bpt,
        DataTypes.LendState storage lendState,
        IMockAaveV3 wrappedTokenGateway,
        uint40[] storage activePools,
        mapping(uint40 => DataTypes.BorrowingPool) storage borrowingPools,
        mapping(uint40 => DataTypes.LendingPool) storage lendingPools,
        mapping(uint40 => uint256) storage activePoolIndex
    ) internal {
        require(msg.value == _collateral, "Wrong amount of Ether provided.");

        wrappedTokenGateway.depositETH{value: _collateral}(
            Constants.AAVE_AETH_POOL,  // This is the address of the Aave-v3 pool - it is not used
            address(this),
            0
        );

        BorrowInternalLogic.borrowInternal(
            MethodParams.BorrowInternalParams({
                principal: _principal,
                originalPrincipal: _principal,
                collateral: _collateral,
                ltv: _ltv,
                timestamp: _timestamp,
                startDate: HelpersLogic.currentTimestamp(),
                beneficiary: msg.sender,
                borrower: msg.sender,
                ethPrice: ethPrice,
                usdc: usdc,
                bpt: bpt,
                lendState: lendState,
                activePools: activePools
            }),
            borrowingPools,
            lendingPools,
            activePoolIndex
        );
    }

}
