// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {DataTypes} from '../data-structures/DataTypes.sol';
import {ShrubLendMath} from "../math/ShrubLendMath.sol";
import {LendingPlatformEvents} from '../data-structures/LendingPlatformEvents.sol';
import {WadRayMath} from "@aave/core-v3/contracts/protocol/libraries/math/WadRayMath.sol";

import "../../interfaces/IMockAaveV3.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

library DepositLogic {


/**
    * @notice internal logic to deposit funds into Shrub Lend platform
    * @dev depositInternal runs all the calculations and the lendingPool modifications - calling functions are responsible for transfers
    * @param timestamp - uint256 - the date until which the USDC deposit will be locked
    * @param principalWad - uint256 - the amount of USDC (in Wad) which will be locked until the timestamp
    * @param interestWad - uint256 - the amount of USDC (in Wad) which will be moved to the interest component of the lending Pool
    * @return poolShareTokenAmount - uint256 - amount of poolShareTokens that were minted related to the deposit
*/
    function depositInternal(
        uint40 timestamp,
        uint256 principalWad,
        uint256 interestWad,
        mapping(uint40 => DataTypes.LendingPool) storage _lendingPools,
        uint256 ethPrice
    ) private returns (uint256 poolShareTokenAmount){
        //console.log("running depositInternal: timestamp: %s, principalWad: %s, interestWad: %s", timestamp, principalWad, interestWad);
        // Transfers happen in calling functions
        DataTypes.LendingPool memory lendingPool = _lendingPools[timestamp];

        // Calculate total value of the pool in terms of USDC
        uint256 accumYieldValueInUsdc = WadRayMath.wadMul(
            lendingPool.accumYield,
            ethPrice
        );
        uint256 totalPoolValue = lendingPool.principal + lendingPool.accumInterest + accumYieldValueInUsdc;  // expressed in USDC (Wad)
        if (totalPoolValue == 0) {
            poolShareTokenAmount = principalWad + interestWad;
        } else {
            poolShareTokenAmount =
                WadRayMath.wadDiv(
                    WadRayMath.wadMul(
                        principalWad + interestWad,
                        lendingPool.poolShareToken.totalSupply()
                    ),
                    totalPoolValue
                );
        }
        lendingPool.principal += principalWad;
        lendingPool.accumInterest += interestWad;
        lendingPool.poolShareToken.mint(msg.sender, poolShareTokenAmount);

        // commit changes to storage
        _lendingPools[timestamp] = lendingPool;
    }


    function withdrawUnchecked(
        uint40 _timestamp,
        uint256 _poolShareTokenAmount,
        mapping(uint40 => DataTypes.LendingPool) storage _lendingPools
    ) private returns (uint usdcWithdrawn, uint usdcInterest, uint ethWithdrawn) {
        //console.log("running withdrawUnchecked");
        DataTypes.LendingPool memory lendingPool = _lendingPools[_timestamp];
//        require(lendingPool.finalized, "Pool must be finalized before withdraw");
        require(
            _poolShareTokenAmount > 0,
            "Withdrawal amount must be greater than 0"
        );
        require(
            lendingPool.poolShareToken.balanceOf(msg.sender) >= _poolShareTokenAmount,
            "Insufficient pool share tokens for withdrawal"
        );

        //console.log("_poolShareTokenAmount - %s, poolShareToken.totalSupply - %s", _poolShareTokenAmount, lendingPool.poolShareToken.totalSupply());
//        //console.log(lendingPool.poolShareToken.totalSupply());
        //console.log("lendingPool - principal: %s, accumInterest: %s, accumYield: %s", lendingPool.principal, lendingPool.accumInterest, lendingPool.accumYield);
//        //console.log(lendingPool.principal);
//        //console.log(lendingPool.accumInterest);
//        //console.log(lendingPool.accumYield);
        // Calculate the proportion of the pool that the user is withdrawing (use 8 decimals)
        uint256 withdrawalProportion = WadRayMath.wadDiv(
            _poolShareTokenAmount,
            lendingPool.poolShareToken.totalSupply()
        );
//        uint256 withdrawalProportion = _poolShareTokenAmount * 10 ** 8 /
//                                lendingPool.poolShareToken.totalSupply();
        //console.log("withdrawlPropotion: %s", withdrawalProportion);

        // Calculate the corresponding USDC amount to withdraw
        uint256 usdcPrincipalAmount = ShrubLendMath.wadToUsdc(WadRayMath.wadMul(withdrawalProportion, lendingPool.principal));
        //console.log("usdcPrincipalAmount: %s", usdcPrincipalAmount);
        uint256 usdcInterestAmount = ShrubLendMath.wadToUsdc(WadRayMath.wadMul(withdrawalProportion, lendingPool.accumInterest));
        //console.log("usdcInterestAmount: %s", usdcInterestAmount);

        // Calculate the corresponding aETH interest to withdraw
        uint256 aethWithdrawalAmount = WadRayMath.wadMul(withdrawalProportion, lendingPool.accumYield);
        //console.log("aethWithdrawalAmount: %s", aethWithdrawalAmount);

        // Burn the pool share tokens
        lendingPool.poolShareToken.burn(msg.sender, _poolShareTokenAmount);

        // Update the lending pool amounts
        lendingPool.principal -= ShrubLendMath.usdcToWad(usdcPrincipalAmount);
        lendingPool.accumInterest -= ShrubLendMath.usdcToWad(usdcInterestAmount);
        lendingPool.accumYield -= aethWithdrawalAmount;

        // Save lendingPool to storage
        _lendingPools[_timestamp] = lendingPool;

        // Transfer USDC principal and aETH yield to the user
        // Actual transfer to happen in calling function
//        wrappedTokenGateway.withdrawETH(address(0), aethWithdrawalAmount, msg.sender);
        emit LendingPlatformEvents.Withdraw(msg.sender, address(lendingPool.poolShareToken), _poolShareTokenAmount, aethWithdrawalAmount, usdcPrincipalAmount, usdcInterestAmount);
//        event Withdraw(address poolShareTokenAddress, uint tokenAmount, uint ethAmount, uint usdcAmount);
        return (usdcPrincipalAmount, usdcInterestAmount, aethWithdrawalAmount);
    }


/**
    * @notice deposit funds into Shrub Lend platform
    * @dev USDC funds are locked in the shrub platform until the specified timestamp.
    * @dev depositor receives poolShareTokens representing their claim to the deposit pool (poolShareToken amounts are expressed in Wad)
    * @dev These funds are made available for borrowers to borrow in exchange for interest payments from the borrowers and yield from the ETH collateral that the borrowers put up
    * @param _timestamp the date until which the USDC deposit will be locked
    * @param _amount the amount of USDC (expressed with 6 decimals) which will be locked until the timestamp
*/
    function deposit(
        uint40 _timestamp,
        uint256 _amount,
        mapping(uint40 => DataTypes.LendingPool) storage _lendingPools,
        uint256 _ethPrice,
        IERC20 usdc
    ) external {
        require(_amount > 0, "Deposit amount must be greater than 0");

        // Transfer USDC from sender to this contract
        usdc.transferFrom(msg.sender, address(this), _amount);

        uint256 principalWad = ShrubLendMath.usdcToWad(_amount);
        uint256 poolShareTokenAmount = depositInternal(_timestamp, principalWad, 0, _lendingPools, _ethPrice);

        emit LendingPlatformEvents.NewDeposit(
            address(_lendingPools[_timestamp].poolShareToken),
            msg.sender,
            _amount,
            0,
            poolShareTokenAmount
        );
    }

    function extendDeposit(
        uint40 currentTimestamp,
        uint40 newTimestamp,
        uint tokenAmount,
        uint ethPrice,
        mapping(uint40 => DataTypes.LendingPool) storage _lendingPools,
        IMockAaveV3 _wrappedTokenGateway
    ) internal {
        //console.log("running extendDeposit");
        // Check that user owns this amount on poolShareTokens

        // Check that newTimestamp is after currentTimestamp
        require(newTimestamp > currentTimestamp, "newTimestamp must be greater than currentTimestamp");
        // essentially perform a withdraw - the poolShareTokens are burned - aETH is sent to user
        (uint usdcWithdrawn, uint usdcInterest, uint ethWithdrawn) = withdrawUnchecked(currentTimestamp, tokenAmount, _lendingPools);
        // essentially perform a deposit - USDC proceeds from the withdraw are deposited to the future timestamp
        uint256 principalWad = ShrubLendMath.usdcToWad(usdcWithdrawn);
        uint256 interestWad = ShrubLendMath.usdcToWad(usdcInterest);
        uint256 poolShareTokenAmount = depositInternal(newTimestamp, principalWad, interestWad, _lendingPools, ethPrice);
        // Send ETH Yield to user
        _wrappedTokenGateway.withdrawETH(address(0), ethWithdrawn, msg.sender);
//        event NewDeposit(address poolShareTokenAddress, address depositor, uint256 principalAmount, uint256 interestAmount, uint256 tokenAmount);
        emit LendingPlatformEvents.NewDeposit(
            address(_lendingPools[newTimestamp].poolShareToken),
            msg.sender,
            usdcWithdrawn,
            usdcInterest,
            poolShareTokenAmount
        );
    }

    function withdraw(
        uint40 _timestamp,
        uint256 _poolShareTokenAmount,
        mapping(uint40 => DataTypes.LendingPool) storage _lendingPools,
        IERC20 usdc,
        IMockAaveV3 _wrappedTokenGateway
    ) internal {
        //console.log("running withdraw - _timestamp: %s, _poolShareTokenAmount: %s", _timestamp, _poolShareTokenAmount);
        require(_lendingPools[_timestamp].finalized, "Pool must be finalized before withdraw");
        (uint usdcWithdrawn, uint usdcInterest, uint ethWithdrawn) = withdrawUnchecked(_timestamp, _poolShareTokenAmount, _lendingPools);
        //console.log("usdcWithdrawn: %s, usdcInterest: %s, ethWithdrawn: %s", usdcWithdrawn, usdcInterest, ethWithdrawn);
        usdc.transfer(msg.sender, usdcInterest + usdcWithdrawn);
        _wrappedTokenGateway.withdrawETH(address(0), ethWithdrawn, msg.sender);
    }

}
