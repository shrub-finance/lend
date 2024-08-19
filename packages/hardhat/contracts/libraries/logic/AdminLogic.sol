// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "../../tokenization/PoolShareToken.sol";

import {DataTypes} from '../data-structures/DataTypes.sol';
import {MethodParams} from '../data-structures/MethodParams.sol';
import {MethodResults} from '../data-structures/MethodResults.sol';

import "../../configuration/PlatformConfig.sol";
import {HelpersLogic} from "../view/HelpersLogic.sol";
import {ShrubLendMath} from "../math/ShrubLendMath.sol";
import {LendingPlatformEvents} from '../data-structures/LendingPlatformEvents.sol';

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../interfaces/IAETH.sol";
import "../../interfaces/IComet.sol";

import {WadRayMath} from "@aave/core-v3/contracts/protocol/libraries/math/WadRayMath.sol";
import {PercentageMath} from "@aave/core-v3/contracts/protocol/libraries/math/PercentageMath.sol";


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
        IERC20 usdc,
        IComet cweth
    ) external {
        DataTypes.LendingPool storage lendingPool = lendingPools[_timestamp];
        require(lendingPool.poolShareToken != PoolShareToken(address(0)), "Pool does not exist");
        require(!lendingPool.finalized, "Pool already finalized");
        require(HelpersLogic.currentTimestamp() >= _timestamp + 6 * 60 * 60, "Must wait until six hours after endDate for finalization"); // Time must be greater than six hours since pool expiration
        // TODO: Insert extra logic for ensuring everything is funded
        lendingPool.finalized = true;
        // Send funds to Shrub
        console.log("timestamp: %s, shrubYield: %s, shrubInterest: %s", _timestamp, lendingPool.shrubYield, lendingPool.shrubInterest);
        // TODO make this flexible for aave/compound
        cweth.transfer(shrubTreasury, lendingPool.shrubYield);
//        aeth.transfer(shrubTreasury, lendingPool.shrubYield);
        usdc.transfer(shrubTreasury, ShrubLendMath.wadToUsdc(lendingPool.shrubInterest));
        emit LendingPlatformEvents.FinalizeLendingPool(address(lendingPool.poolShareToken), lendingPool.shrubInterest, lendingPool.shrubYield);
    }


//    struct takeSnapshotParams {
//        mapping(uint40 => DataTypes.LendingPool) lendingPools;
//        mapping(uint40 => DataTypes.BorrowingPool) borrowingPools;
//        uint40[] activePools;
//        mapping(uint40 => uint256) activePoolIndex;
//        uint bpTotalPoolShares;
//        IAETH aeth;
//        IBorrowPositionToken bpt;
//        address shrubTreasury;
//        IERC20 usdc;
//        uint40 lastSnapshotDate;
//        uint aEthSnapshotBalance;
//        uint newCollateralSinceSnapshot;
//        uint claimedCollateralSinceSnapshot;
//    }


        // console.log("aEthSnapshotBalance set to: %s", aEthSnapshotBalance);
        // console.log("lastSnapshotDate set to: %s", lastSnapshotDate);

        // zero out the tracking globals;
        // newCollateralSinceSnapshot = 0;
        // claimedCollateralSinceSnapshot = 0;

    // DataTypes.LendState public lendState;

    struct takeSnapshotLocalVars {
        uint aEthYieldSinceLastSnapshot;
        uint accumInterestBP;
        uint aEthYieldDistribution;
        uint contributionDenominator;
    }


    function takeSnapshot(
        MethodParams.takeSnapshotParams memory params,
        mapping(uint40 => DataTypes.LendingPool) storage lendingPools,
        mapping(uint40 => DataTypes.BorrowingPool) storage borrowingPools,
        DataTypes.LendState storage lendState
    ) external {
        takeSnapshotLocalVars memory vars;
        // uint aETHBalance = params.aeth.balanceOf(address(this));
        console.log("running takeSnapshot, aEthSnapshotBalance: %s, claimedCollateralSinceSnapshot: %s", lendState.aEthSnapshotBalance, lendState.claimedCollateralSinceSnapshot);
        console.log("newCollateralSinceSnapshot: %s", lendState.newCollateralSinceSnapshot);
        console.log(
            "lastSnaphot: %s, now: %s, elapsed: %s",
            lendState.lastSnapshotDate,
            HelpersLogic.currentTimestamp(),
            HelpersLogic.currentTimestamp() - lendState.lastSnapshotDate
        );
//        Get the current balance of bpTotalPoolShares (it is local)
        // calculate the accumYield for all BP (current balance - snapshot balance)
        // TODO: Make this flex for aave/compound
//        vars.aEthYieldSinceLastSnapshot = params.aeth.balanceOf(address(this)) + lendState.claimedCollateralSinceSnapshot - lendState.newCollateralSinceSnapshot - lendState.aEthSnapshotBalance;
        vars.aEthYieldSinceLastSnapshot = params.cweth.balanceOf(address(this)) + lendState.claimedCollateralSinceSnapshot - lendState.newCollateralSinceSnapshot - lendState.aEthSnapshotBalance;
        console.log("aEthYieldSinceLastSnapshot: %s", vars.aEthYieldSinceLastSnapshot);
        // An array of LendingPool to keep track of all of the increments in memory before a final write to the lending pool
        // The element of the array maps to the activePools timestamp
        DataTypes.LendingPool[] memory lendingPoolsTemp = new DataTypes.LendingPool[](params.activePools.length);
        for (uint i = 0; i < params.activePools.length; i++) {
            // Make copy of lending pools into memory
            lendingPoolsTemp[i] = lendingPools[params.activePools[i]];
        }

//        Calculate accumInterest for all BP
        for (uint i = 0; i < params.activePools.length; i++) {
            // Cleanup paid off BPTs
            // TODO: This should return the earlyRepaymentPenalty that was incurred by these pools
            // Initialize accumInterestBP to include the earlyRepaymentPenalty returned from cleanUpByTimestamp
            vars.accumInterestBP = params.bpt.cleanUpByTimestamp(params.activePools[i]);
            console.log("finished running cleanUpByTimestamp for %s", params.activePools[i]);
//            Find the BPTs related to these timestamps
//            bptsForPool is an array of tokenIds
            uint[] memory bptsForPool = params.bpt.getTokensByTimestamp(params.activePools[i]);
//            # Loop through the BPTs in order to calculate their accumInterest
            for (uint j = 0; j < bptsForPool.length; j++) {
                console.log("in token loop - analyzing tokenId: %s", bptsForPool[j]);
                vars.accumInterestBP += params.bpt.interestSinceTimestamp(bptsForPool[j], lendState.lastSnapshotDate);
            }
            // Determine the amount of aETH to distribute from this borrowing pool
            if (borrowingPools[params.activePools[i]].poolShareAmount == 0) {
                console.log("poolShareAmount in borrowing pool is 0 - skipping - %s", params.activePools[i]);
                continue;
            }
            console.log("bpTotalPoolShares - %s", lendState.bpTotalPoolShares);
            console.log(borrowingPools[params.activePools[i]].poolShareAmount);
            vars.aEthYieldDistribution = WadRayMath.wadMul(
                vars.aEthYieldSinceLastSnapshot,
                WadRayMath.wadDiv(borrowingPools[params.activePools[i]].poolShareAmount, lendState.bpTotalPoolShares)
            );
            // Loop through this and future Lending Pools to determine the contribution denominator
            vars.contributionDenominator = 0;
            for (uint j = i; j < params.activePools.length; j++) {
                vars.contributionDenominator += lendingPools[params.activePools[j]].principal;
            }
            // distribute accumInterest and accumYield to LPs based on contribution principal
            console.log("contributionDenominator - %s", vars.contributionDenominator);
            console.log("aEthYieldDistribution: %s", vars.aEthYieldDistribution);
            console.log("accumInterestBP: %s", vars.accumInterestBP);
            console.log("shrubYieldFee: %s", params.shrubYieldFee);
            console.log("shrubInterestFee: %s", params.shrubInterestFee);
            for (uint j = i; j < params.activePools.length; j++) {
                console.log("in loop: lendingPool: %s, lendingPoolContribution: %s / %s", params.activePools[j], lendingPools[params.activePools[j]].principal, vars.contributionDenominator);
                MethodResults.calcLPIncreasesResult memory res = calcLPIncreases(MethodParams.calcLPIncreasesParams({
                    aEthYieldDistribution: vars.aEthYieldDistribution,
                    accumInterestBP: vars.accumInterestBP,
                    lendingPoolPrincipal: lendingPools[params.activePools[j]].principal,
                    contributionDenominator: vars.contributionDenominator,
                    shrubInterestFee: params.shrubInterestFee,
                    shrubYieldFee: params.shrubYieldFee
                }));
                lendingPoolsTemp[j].accumYield += res.deltaAccumYield;
                lendingPoolsTemp[j].shrubYield += res.deltaShrubYield;
                lendingPoolsTemp[j].accumInterest += res.deltaAccumInterest;
                lendingPoolsTemp[j].shrubInterest += res.deltaShrubInterest;
            }
        }
        // Loop through lendingPoolsIncrement and write all of the deltas to lendingPools storage
        for (uint j = 0; j < params.activePools.length; j++) {
            console.log("lendingPoolsTemp[j] - j: %s, accumInterest: %s, accumYield: %s", j, lendingPoolsTemp[j].accumInterest, lendingPoolsTemp[j].accumYield);
            console.log("lendingPools[activePools[j]] - j: %s, accumInterest: %s, accumYield: %s", j, lendingPools[params.activePools[j]].accumInterest, lendingPools[params.activePools[j]].accumYield);
            lendingPools[params.activePools[j]] = lendingPoolsTemp[j];
            console.log("emmitting: timestamp: %s, accumInterest: %s, accumYield: %s", params.activePools[j], lendingPools[params.activePools[j]].accumInterest, lendingPools[params.activePools[j]].accumYield);
            emit LendingPlatformEvents.LendingPoolYield(
                address(lendingPools[params.activePools[j]].poolShareToken),
                lendingPools[params.activePools[j]].accumInterest,
                lendingPools[params.activePools[j]].accumYield
            );
        }
        // set the last snapshot date to now
        lendState.lastSnapshotDate = HelpersLogic.currentTimestamp();
        // TODO: Make this flex for compound/aave
        lendState.aEthSnapshotBalance = params.cweth.balanceOf(address(this));
//        lendState.aEthSnapshotBalance = params.aeth.balanceOf(address(this));
        console.log("aEthSnapshotBalance set to: %s", lendState.aEthSnapshotBalance);
        console.log("lastSnapshotDate set to: %s", lendState.lastSnapshotDate);

        // zero out the tracking globals;
        lendState.newCollateralSinceSnapshot = 0;
        lendState.claimedCollateralSinceSnapshot = 0;
    }


    function calcLPIncreases(MethodParams.calcLPIncreasesParams memory params) internal pure returns (MethodResults.calcLPIncreasesResult memory) {
        console.log("running calcLPIncreases");
        uint lendingPoolRatio = WadRayMath.wadDiv(params.lendingPoolPrincipal, params.contributionDenominator);
        uint LPaEthDistribution = WadRayMath.wadMul(params.aEthYieldDistribution, lendingPoolRatio);
        uint LPinterestDistribution = WadRayMath.wadMul(ShrubLendMath.usdcToWad(params.accumInterestBP), lendingPoolRatio);
        console.log("lendingPoolRatio: %s, LPaEthDistribution: %s, LPinterestDistribution: %s", lendingPoolRatio, LPaEthDistribution, LPinterestDistribution);

        return MethodResults.calcLPIncreasesResult({
            deltaAccumYield : PercentageMath.percentMul(LPaEthDistribution, 10000 - params.shrubYieldFee),
            deltaShrubYield : PercentageMath.percentMul(LPaEthDistribution, params.shrubYieldFee),
            deltaAccumInterest : PercentageMath.percentMul(LPinterestDistribution, 10000 - params.shrubInterestFee),
            deltaShrubInterest : PercentageMath.percentMul(LPinterestDistribution, params.shrubInterestFee)
        });
    }
}
