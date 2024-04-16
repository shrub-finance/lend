// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/utils/Strings.sol";

import "../../tokenization/PoolShareToken.sol";

import {DataTypes} from '../types/DataTypes.sol';

import "hardhat/console.sol";

library AdminLogic {
    using Strings for uint256;

//    event PoolCreated(uint256 timestamp, address poolShareTokenAddress);

    function executeCreatePool(
        mapping(uint256 => DataTypes.LendingPool) storage _lendingPools,
        mapping(uint256 => uint256) storage _activePoolIndex,
        uint256[] storage _activePools,
        uint256 _timestamp
    ) external returns (address poolShareTokenAddress) {
        require(
            _lendingPools[_timestamp].poolShareToken == PoolShareToken(address(0)),
            "Pool already exists"
        );
        require(
            _timestamp > block.timestamp,
            "_timestamp must be in the future"
        );
        _lendingPools[_timestamp].poolShareToken = new PoolShareToken(
            string(abi.encodePacked("PoolShareToken_", _timestamp.toString())),
            string(abi.encodePacked("PST_", _timestamp.toString()))
        );
        _lendingPools[_timestamp].finalized = false;
        // Make sure to keep the pool sorted
        insertIntoSortedArr(_activePoolIndex, _activePools, _timestamp);
        poolShareTokenAddress = address(_lendingPools[_timestamp].poolShareToken);
//        console.log("executeCreatePool - poolsShareTokenAddress: %s", poolShareTokenAddress);
//        emit PoolCreated(_timestamp, poolShareTokenAddress);
    }

    function insertIntoSortedArr(
        mapping(uint256 => uint256) storage _activePoolIndex,
        uint256[] storage _activePools,
        uint newValue
    ) internal {
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
        mapping(uint256 => uint256) storage _activePoolIndex,
        uint256[] storage _activePools
    ) internal {
        console.log("running indexActivePools");
        for (uint i = 0; i < _activePools.length; i++) {
            _activePoolIndex[_activePools[i]] = i;
        }
    }

}
