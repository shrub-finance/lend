// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {BorrowInternalLogic} from './BorrowInternalLogic.sol';
import {DataTypes} from '../data-structures/DataTypes.sol';
import {MethodParams} from '../data-structures/MethodParams.sol';
import {HelpersLogic} from "../view/HelpersLogic.sol";
import {Constants} from "../configuration/Constants.sol";
import {AaveAdapter} from '../adapters/AaveAdapter.sol';
import {CompoundAdapter} from '../adapters/CompoundAdapter.sol';

import "../../interfaces/IMockAaveV3.sol";
import "../../interfaces/IComet.sol";
import "../../interfaces/IWETH.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../interfaces/IBorrowPositionToken.sol";

import "hardhat/console.sol";

library BorrowLogic {

    function borrow(
        MethodParams.borrowParams memory params,
        DataTypes.LendState storage lendState,
        mapping(uint40 => DataTypes.BorrowingPool) storage borrowingPools,
        mapping(uint40 => DataTypes.LendingPool) storage lendingPools,
        mapping(uint40 => uint256) storage activePoolIndex
//        uint256 principal, // Amount of USDC with 6 decimal places
//        uint256 collateral, // Amount of ETH collateral with 18 decimal places
//        uint16 ltv,
//        uint40 timestamp,
//        uint256 ethPrice,
//        IERC20 usdc,
//        IBorrowPositionToken bpt,
//        DataTypes.LendState storage lendState,
//        IMockAaveV3 wrappedTokenGateway,
//        uint40[] storage activePools,
//        mapping(uint40 => DataTypes.BorrowingPool) storage borrowingPools,
//        mapping(uint40 => DataTypes.LendingPool) storage lendingPools,
//        mapping(uint40 => uint256) storage activePoolIndex,
//        IComet comp,
//        IWETH weth
    ) internal {
//        console.log("msg.sender - %s", msg.sender);
//        console.log("msg.value - %s", msg.value);
        require(msg.value == params.collateral, "Wrong amount of Ether provided.");
//        console.log("_principal: %s, _collateral: %s, _ltv: %s", _principal, _collateral, _ltv);
//        console.log("_timestamp: %s, ethPrice: %s", _timestamp, ethPrice);

        CompoundAdapter.depositEth(params.cweth, params.weth);
//        AaveAdapter.depositEth(wrappedTokenGateway);
//        wrappedTokenGateway.depositETH{value: _collateral}(
//            Constants.AAVE_AETH_POOL,  // This is the address of the Aave-v3 pool - it is not used
//            address(this),
//            0
//        );

        BorrowInternalLogic.borrowInternal(
            MethodParams.BorrowInternalParams({
                principal: params.principal,
                originalPrincipal: params.principal,
                collateral: params.collateral,
                ltv: params.ltv,
                timestamp: params.timestamp,
                startDate: HelpersLogic.currentTimestamp(),
                beneficiary: msg.sender,
                borrower: msg.sender,
                ethPrice: params.ethPrice,
                usdc: params.usdc,
                bpt: params.bpt,
                activePools: params.activePools
            }),
            lendState,
            borrowingPools,
            lendingPools,
            activePoolIndex
        );
    }

}
