// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {ShrubLendMath} from "../math/ShrubLendMath.sol";
import {DataTypes} from '../data-structures/DataTypes.sol';
import {WadRayMath} from "@aave/core-v3/contracts/protocol/libraries/math/WadRayMath.sol";
import {PercentageMath} from "@aave/core-v3/contracts/protocol/libraries/math/PercentageMath.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../interfaces/IBorrowPositionToken.sol";

library ShrubView {
/**
    * @notice Returns the ETH collateral required for a borrow of specified amount and ltv
    * @dev
    * @param ltv The ltv expressed as a percent (4 decimals - 10000 = 100%)
    * @param usdcAmount the requested borrow amount expressed with 6 decimals
    * @return collateralRequired the amount of ETH expressed in Wad required to colateralize this borrow
*/
    function requiredCollateral(uint16 ltv, uint usdcAmount, uint ethPrice) public pure returns (uint256 collateralRequired) {
        uint valueOfEthRequired = PercentageMath.percentDiv(ShrubLendMath.usdcToWad(usdcAmount), uint256(ltv));
        collateralRequired = WadRayMath.wadDiv(valueOfEthRequired, ethPrice);
    }


    function getAvailableForPeriod(
        uint40 _timestamp,
        mapping(uint40 => DataTypes.LendingPool) storage lendingPools,
        mapping(uint40 => DataTypes.BorrowingPool) storage borrowingPools,
        mapping(uint40 => uint256) storage activePoolIndex,
        uint40[] calldata activePools
    ) public view returns (uint avail) {
        // currentAndFutureLiquidity - Total amount of USDC provided to this pool and all future pools
        // currentAndFutureBorrows - Total amount of outstanding USDC borrows from this pool and all future pools
        // getDeficitForPeriod - Deficit in terms of borrows in previous buckets being greater than the liquidity in those buckets (meaning it is not available for double use)
        //console.log("Running getAvailableForPeriod");
        uint currentAndFutureLiquidity = 0;
        uint currentAndFutureBorrows = 0;
        for (uint i = activePoolIndex[_timestamp]; i < activePools.length; i++) {
            currentAndFutureLiquidity += lendingPools[activePools[i]].principal;
            currentAndFutureBorrows += borrowingPools[activePools[i]].principal;
        }
        avail = currentAndFutureLiquidity - currentAndFutureBorrows - getDeficitForPeriod(_timestamp, lendingPools, borrowingPools, activePoolIndex, activePools);
    }

    function getDeficitForPeriod(
        uint40 _timestamp,
        mapping(uint40 => DataTypes.LendingPool) storage lendingPools,
        mapping(uint40 => DataTypes.BorrowingPool) storage borrowingPools,
        mapping(uint40 => uint256) storage activePoolIndex,
        uint40[] calldata activePools
    ) private view returns (uint256 deficit) {
        // NOTE: it is critical that activePools is sorted
        deficit = 0;
        // We only want to evaluate the buckets before per the formula:
        // D(i) = max(0, D(i-1) + BP(i-1) - LP(i-1)
        for (uint i = 0; i < activePoolIndex[_timestamp]; i++) {
            if (lendingPools[activePools[i]].principal >= (deficit + borrowingPools[activePools[i]].principal)) {
                deficit = 0;
            } else {
                // Important to do the addition first to prevent an underflow
                deficit = (deficit + borrowingPools[activePools[i]].principal - lendingPools[activePools[i]].principal);
            }
        }
    }

    function usdcToEth(uint usdcAmount, uint ethPrice) internal pure returns (uint256 ethAmount) {
        ethAmount = WadRayMath.wadDiv(
            ShrubLendMath.usdcToWad(usdcAmount),
            ethPrice
        );
    }

    function calculateSmallestValidLtv(
        uint16 ltv,
        bool isExtend,
        DataTypes.PlatformConfiguration storage config
    ) public view returns (uint16) {

        uint16 smallestValid = 0; // Initialize to 0 or a suitable default value
        bool found = false;

        // Iterate through the array to find the smallest value >= value
        for (uint i = 0; i < config.REVERSE_SORTED_VALID_LTV.length; i++) {
            if (config.REVERSE_SORTED_VALID_LTV[i] < ltv) {
                continue;
            }
            smallestValid = config.REVERSE_SORTED_VALID_LTV[i];
            found = true;
        }
        require(found || isExtend && ltv <= config.MAX_LTV_FOR_EXTEND, "Invalid ltv");
        if (found) {
            return smallestValid;
        }
        return config.MAX_LTV_FOR_EXTEND;
    }

/**
    * @notice Returns the ltv based on principal, interest, collateral, and ethPrice
    * @dev encapsulates the math required to calculate LTV
    * @param principal - USDC principal of loan (6 decimals)
    * @param interest - USDC interest of loan (6 decimals)
    * @param collateral - ETH collateral (Wad)
    * @param ethPrice - USDC/ETH exchange rate (Wad)
    * @return ltv - loan to value of loan (expressed as percentage)
*/
    function calcLtv(uint principal, uint interest, uint collateral, uint ethPrice) internal pure returns (uint16 ltv) {
        uint usdcWad = ShrubLendMath.usdcToWad(principal + interest);
        uint collateralValue = WadRayMath.wadMul(collateral, ethPrice);
        uint percentageWad = WadRayMath.wadDiv(usdcWad, collateralValue);
        ltv = ShrubLendMath.wadToPercentage(percentageWad);
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
    ) public view returns (uint interest) {
        interest = bpt.getInterest(tokenId, lendState.lastSnapshotDate);
    }

/**
    * @notice Returns the current calculated ltv of a loan
    * @dev makes use of getEthPrice
    * @param tokenId - the tokenId of the Borrow Position Token of the loan
    * @return ltv - loan to value of loan (expressed as percentage)
*/
    function getLtv(
        uint tokenId,
        uint ethPrice,
        IBorrowPositionToken bpt,
        DataTypes.LendState storage lendState
    ) public view returns (uint16 ltv) {
        DataTypes.BorrowData memory bd = bpt.getBorrow(tokenId);
        ltv = calcLtv(bd.principal, getBorrowInterest(tokenId, bpt, lendState), bd.collateral, ethPrice);
    }


/**
    * @notice Returns the timestamp of the earliest lending pool after the given timestamp
    * @dev
    * @param _timestamp uint40 - timestamp that the returned timestamp must be greater than
    * @return nextActivePoolTimestamp - timestamp of the earliest lending pool after given timestamp (expressed as uint40)
*/
    function getNextActivePool(
        uint40 timestamp,
        uint40[] calldata activePools,
        mapping(uint40 => uint256) storage activePoolIndex
    ) view internal returns (uint40 nextActivePoolTimestamp) {
        require(activePoolIndex[timestamp] != 0 || activePools[0] == timestamp, "Invalid timestamp");
        uint currentIndex = activePoolIndex[timestamp];
        require(currentIndex + 1 < activePools.length, "No next activePool");
        nextActivePoolTimestamp = activePools[currentIndex + 1];
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
    ) view internal returns (uint debt) {
        debt = bpt.debt(tokenId, lendState.lastSnapshotDate);
    }

}