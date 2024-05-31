// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "../../tokenization/PoolShareToken.sol";

import {DataTypes} from '../data-structures/DataTypes.sol';
import {HelpersLogic} from "./HelpersLogic.sol";
import {ShrubLendMath} from "../math/ShrubLendMath.sol";
import {LendingPlatformEvents} from '../data-structures/LendingPlatformEvents.sol';

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../interfaces/IAETH.sol";


import "hardhat/console.sol";

library AdminLogic {

//    event PoolCreated(uint256 timestamp, address poolShareTokenAddress);

    function executeCreatePool(
        mapping(uint40 => DataTypes.LendingPool) storage _lendingPools,
        mapping(uint40 => uint256) storage _activePoolIndex,
        uint40[] storage _activePools,
        uint40 _timestamp
    ) external returns (address poolShareTokenAddress) {
        console.log("Running AdminLogic.executeCreatePool");
        require(
            _lendingPools[_timestamp].poolShareToken == PoolShareToken(address(0)),
            "Pool already exists"
        );
        require(
            _timestamp > HelpersLogic.currentTimestamp(),
            "_timestamp must be in the future"
        );
        _lendingPools[_timestamp].poolShareToken = new PoolShareToken(
            string(abi.encodePacked("PoolShareToken_", HelpersLogic.timestampToString(_timestamp))),
            string(abi.encodePacked("PST_", HelpersLogic.timestampToString(_timestamp)))
        );
        _lendingPools[_timestamp].finalized = false;
        // Make sure to keep the pool sorted
        insertIntoSortedArr(_activePoolIndex, _activePools, _timestamp);
        poolShareTokenAddress = address(_lendingPools[_timestamp].poolShareToken);
        emit LendingPlatformEvents.PoolCreated(_timestamp, poolShareTokenAddress);
    }

    function insertIntoSortedArr(
        mapping(uint40 => uint256) storage _activePoolIndex,
        uint40[] storage _activePools,
        uint40 newValue
    ) internal {
        console.log("Running AdminLogic.insertIntoSortedArr");
        if (_activePools.length == 0) {
            _activePools.push(newValue);
            // No need to run indexActivePools as the index would be 0 (which it is by default)
            return;
        }
        // First handle the last element of the _activePoolsay
        if (_activePools[_activePools.length - 1] < newValue) {
            _activePools.push(newValue);
            indexActivePools(_activePoolIndex, _activePools);
            return;
        } else {
            _activePools.push(_activePools[_activePools.length - 1]);
            if (_activePools.length == 2) {
                _activePools[0] = newValue;
                indexActivePools(_activePoolIndex, _activePools);
                return;
            }
        }
        for(uint i = _activePools.length - 2; i > 0; i--) {
            if (_activePools[i - 1] < newValue) {
                _activePools[i] = newValue;
                indexActivePools(_activePoolIndex, _activePools);
                return;
            }
            console.log(i);
            _activePools[i] = _activePools[i - 1];
        }
        _activePools[0] = newValue;
        indexActivePools(_activePoolIndex, _activePools);
    }

    function indexActivePools(
        mapping(uint40 => uint256) storage _activePoolIndex,
        uint40[] storage _activePools
    ) internal {
        console.log("Running AdminLogic.indexActivePools");
        for (uint i = 0; i < _activePools.length; i++) {
            _activePoolIndex[_activePools[i]] = i;
        }
    }

    function finalizeLendingPool(
        mapping(uint40 => DataTypes.LendingPool) storage lendingPools,
        uint40 _timestamp,
        address shrubTreasury,
        IAETH aeth,
        IERC20 usdc
    ) external {
        DataTypes.LendingPool storage lendingPool = lendingPools[_timestamp];
        require(lendingPool.poolShareToken != PoolShareToken(address(0)), "Pool does not exist");
        require(!lendingPool.finalized, "Pool already finalized");
        require(HelpersLogic.currentTimestamp() >= _timestamp + 6 * 60 * 60, "Must wait until six hours after endDate for finalization"); // Time must be greater than six hours since pool expiration
        // TODO: Insert extra logic for ensuring everything is funded
        lendingPool.finalized = true;
        // Send funds to Shrub
        console.log("timestamp: %s, shrubYield: %s, shrubInterest: %s", _timestamp, lendingPool.shrubYield, lendingPool.shrubInterest);
        aeth.transfer(shrubTreasury, lendingPool.shrubYield);
        usdc.transfer(shrubTreasury, ShrubLendMath.wadToUsdc(lendingPool.shrubInterest));
        emit LendingPlatformEvents.FinalizeLendingPool(address(lendingPool.poolShareToken), lendingPool.shrubInterest, lendingPool.shrubYield);
    }

}
