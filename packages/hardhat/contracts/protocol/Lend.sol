// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

import "../tokenization/PoolShareToken.sol";
import "../tokenization/BorrowPositionToken.sol";
import "../dependencies/MockAaveV3.sol";
import "../dependencies/AETH.sol";
import "../configuration/PlatformConfig.sol";

import {USDCoin} from "../dependencies/USDCoin.sol";
import {DataTypes} from '../libraries/types/DataTypes.sol';
import {Configuration} from "../libraries/configuration/Configuration.sol";

import {PercentageMath} from "@aave/core-v3/contracts/protocol/libraries/math/PercentageMath.sol";
import {WadRayMath} from "@aave/core-v3/contracts/protocol/libraries/math/WadRayMath.sol";

// Libraries with functions
import {HelpersLogic} from "../libraries/logic/HelpersLogic.sol";
import {AdminLogic} from "../libraries/logic/AdminLogic.sol";
import {ShrubLendMath} from "../libraries/math/ShrubLendMath.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IBorrowPositionToken.sol";
import "../interfaces/IMockAaveV3.sol";

import "hardhat/console.sol";

contract LendingPlatform is Ownable, ReentrancyGuard, PlatformConfig {
//    using Strings for uint256;

    mapping(uint40 => DataTypes.LendingPool) public lendingPools; // where the uint256 key is a timestamp
    mapping(uint40 => DataTypes.BorrowingPool) public borrowingPools; // mapping of timestamp of loan endDate => BorrowingPool
    mapping(uint40 => uint256) public activePoolIndex; // mapping of timestamp => index of activePools

    uint40[] public activePools; // Sorted ascending list of timestamps of active pools
    uint40 lastSnapshotDate;
    uint aEthSnapshotBalance;
    uint newCollateralSinceSnapshot;
    uint claimedCollateralSinceSnapshot;
    uint MAX_LTV_FOR_EXTEND = 8000;
    uint LIQUIDATION_THRESHOLD = 8500;

    address shrubTreasury;

    event NewDeposit(uint40 timestamp, address poolShareTokenAddress, address depositor, uint256 amount, uint256 tokenAmount);
    event NewLoan(uint tokenId, uint40 timestamp, address borrower, uint256 collateral, uint256 principal, uint40 startDate, uint32 apy);
    event PartialRepayLoan(uint tokenId, uint repaymentAmount, uint principalReduction);
    event RepayLoan(uint tokenId, uint repaymentAmount, uint collateralReturned, address beneficiary);
    event Withdraw(address user, address poolShareTokenAddress, uint tokenAmount, uint ethAmount, uint usdcPrincipal, uint usdcInterest);
    event PoolCreated(uint40 timestamp, address poolShareTokenAddress);
    event LendingPoolYield(address poolShareTokenAddress, uint accumInterest, uint accumYield);
    event FinalizeLendingPool(address poolShareTokenAddress, uint shrubInterest, uint shrubYield);

    // Interfaces for USDC and aETH
    IERC20 public usdc;
    IERC20 public aeth;
    IBorrowPositionToken public bpt;
    IMockAaveV3 public wrappedTokenGateway;
    AggregatorV3Interface public chainlinkAggregator;  // Chainlink interface

    uint public bpTotalPoolShares; // Wad

    constructor(address[6] memory addresses) {
        usdc = IERC20(addresses[0]);
        bpt = IBorrowPositionToken(addresses[1]);
        wrappedTokenGateway = IMockAaveV3(addresses[2]);
        aeth = IAETH(addresses[3]);
        chainlinkAggregator = AggregatorV3Interface(addresses[4]);
        lastSnapshotDate = HelpersLogic.currentTimestamp();
        shrubTreasury = addresses[5];
    }

    // --- Admin Functions ---
    function createPool(uint40 _timestamp) public onlyOwner {
        address poolShareTokenAddress = AdminLogic.executeCreatePool(lendingPools, activePoolIndex, activePools, _timestamp);
        emit PoolCreated(_timestamp, poolShareTokenAddress);
    }

    function finalizeLendingPool(uint _timestamp) public onlyOwner {
        DataTypes.LendingPool storage lendingPool = lendingPools[_timestamp];
        require(lendingPool.poolShareToken != PoolShareToken(address(0)), "Pool does not exist");
        require(!lendingPool.finalized, "Pool already finalized");
        require(HelpersLogic.currentTimestamp() >= _timestamp + 6 * 60 * 60, "Must wait until six hours after endDate for finalization"); // Time must be greater than six hours since pool expiration
        // TODO: Insert extra logic for ensuring everything is funded
        lendingPool.finalized = true;
        // Send funds to Shrub
        aeth.transfer(shrubTreasury, lendingPool.shrubYield);
        usdc.transfer(shrubTreasury, lendingPool.shrubInterest);
        emit FinalizeLendingPool(address(lendingPool.poolShareToken), lendingPool.shrubInterest, lendingPool.shrubYield);
    }

    function takeSnapshot() public onlyOwner {
        uint aETHBalance = aeth.balanceOf(address(this));
        console.log("running takeSnapshot, platformAEthBalance: %s, aEthSnapshotBalance: %s, claimedCollateralSinceSnapshot: %s", aETHBalance, aEthSnapshotBalance, claimedCollateralSinceSnapshot);
        console.log("newCollateralSinceSnapshot: %s", newCollateralSinceSnapshot);
        console.log(
            "lastSnaphot: %s, now: %s, elapsed: %s",
            lastSnapshotDate,
            HelpersLogic.currentTimestamp(),
            HelpersLogic.currentTimestamp() - lastSnapshotDate
        );
//        Get the current balance of bpTotalPoolShares (it is local)
        // calculate the accumYield for all BP (current balance - snapshot balance)
        uint aEthYieldSinceLastSnapshot = aeth.balanceOf(address(this)) + claimedCollateralSinceSnapshot - newCollateralSinceSnapshot - aEthSnapshotBalance;
        console.log("aEthYieldSinceLastSnapshot: %s", aEthYieldSinceLastSnapshot);
        // An array of LendingPool to keep track of all of the increments in memory before a final write to the lending pool
        // The element of the array maps to the activePools timestamp
        DataTypes.LendingPool[] memory lendingPoolsTemp = new DataTypes.LendingPool[](activePools.length);
        for (uint i = 0; i < activePools.length; i++) {
            // Make copy of lending pools into memory
            lendingPoolsTemp[i] = lendingPools[activePools[i]];
        }

//        Calculate accumInterest for all BP
        for (uint i = 0; i < activePools.length; i++) {
            // Cleanup paid off BPTs
            bpt.cleanUpByTimestamp(uint40(activePools[i]));
            console.log("finished running cleanUpByTimestamp for %s", uint40(activePools[i]));
//            Find the BPTs related to these timestamps
//            bptsForPool is an array of tokenIds
            uint[] memory bptsForPool = bpt.getTokensByTimestamp(uint40(activePools[i]));
            uint accumInterestBP = 0;
//            # Loop through the BPTs in order to calculate their accumInterest
            for (uint j = 0; j < bptsForPool.length; j++) {
                console.log("in token loop - analyzing tokenId: %s", bptsForPool[j]);
                accumInterestBP +=  bpt.interestSinceTimestamp(bptsForPool[j], lastSnapshotDate);
            }
            // Determine the amount of aETH to distribute from this borrowing pool
            if (borrowingPools[activePools[i]].poolShareAmount == 0) {
                console.log("poolShareAmount in borrowing pool is 0 - skipping - %s", activePools[i]);
                continue;
            }
            console.log("bpTotalPoolShares - %s", bpTotalPoolShares);
            console.log(borrowingPools[activePools[i]].poolShareAmount);
            uint aEthYieldDistribution = WadRayMath.wadMul(
                aEthYieldSinceLastSnapshot,
                WadRayMath.wadDiv(borrowingPools[activePools[i]].poolShareAmount, bpTotalPoolShares)
            );
            // Loop through this and future Lending Pools to determine the contribution denominator
            uint contributionDenominator;
            for (uint j = i; j < activePools.length; j++) {
                contributionDenominator += lendingPools[activePools[j]].principal;
            }
            // distribute accumInterest and accumYield to LPs based on contribution principal
            console.log("contributionDenominator - %s", contributionDenominator);
            console.log("aEthYieldDistribution: %s", aEthYieldDistribution);
            console.log("accumInterestBP: %s", accumInterestBP);
            console.log("shrubFee: %s", PlatformConfig.shrubFee);
            for (uint j = i; j < activePools.length; j++) {
                console.log("in loop: lendingPool: %s, lendingPoolContribution: %s / %s", activePools[j], lendingPools[activePools[j]].principal, contributionDenominator);
                DataTypes.calcLPIncreasesResult memory res = calcLPIncreases(DataTypes.calcLPIncreasesParams({
                    aEthYieldDistribution: aEthYieldDistribution,
                    accumInterestBP: accumInterestBP,
                    lendingPoolPrincipal: lendingPools[activePools[j]].principal,
                    contributionDenominator: contributionDenominator
                }));
                lendingPoolsTemp[j].accumYield += res.deltaAccumYield;
                lendingPoolsTemp[j].shrubYield += res.deltaShrubYield;
                lendingPoolsTemp[j].accumInterest += res.deltaAccumInterest;
                lendingPoolsTemp[j].shrubInterest += res.deltaShrubInterest;
            }
        }
        // Loop through lendingPoolsIncrement and write all of the deltas to lendingPools storage
        for (uint j = 0; j < activePools.length; j++) {
            console.log("lendingPoolsTemp[j] - j: %s, accumInterest: %s, accumYield: %s", j, lendingPoolsTemp[j].accumInterest, lendingPoolsTemp[j].accumYield);
            console.log("lendingPools[activePools[j]] - j: %s, accumInterest: %s, accumYield: %s", j, lendingPools[activePools[j]].accumInterest, lendingPools[activePools[j]].accumYield);
            lendingPools[activePools[j]] = lendingPoolsTemp[j];
            console.log("emmitting: timestamp: %s, accumInterest: %s, accumYield: %s", activePools[j], lendingPools[activePools[j]].accumInterest, lendingPools[activePools[j]].accumYield);
            emit LendingPoolYield(
                address(lendingPools[activePools[j]].poolShareToken),
                lendingPools[activePools[j]].accumInterest,
                lendingPools[activePools[j]].accumYield
            );
        }
        // set the last snapshot date to now
        lastSnapshotDate = HelpersLogic.currentTimestamp();
        aEthSnapshotBalance = aeth.balanceOf(address(this));
        console.log("aEthSnapshotBalance set to: %s", aEthSnapshotBalance);
        console.log("lastSnapshotDate set to: %s", lastSnapshotDate);

        // zero out the tracking globals;
        newCollateralSinceSnapshot = 0;
        claimedCollateralSinceSnapshot = 0;
    }

    function calcLPIncreases(DataTypes.calcLPIncreasesParams memory params) internal returns (DataTypes.calcLPIncreasesResult memory) {
        console.log("running calcLPIncreases");
        uint lendingPoolRatio = WadRayMath.wadDiv(params.lendingPoolPrincipal, params.contributionDenominator);
        uint LPaEthDistribution = WadRayMath.wadMul(params.aEthYieldDistribution, lendingPoolRatio);
        uint LPinterestDistribution = WadRayMath.wadMul(ShrubLendMath.usdcToWad(params.accumInterestBP), lendingPoolRatio);
        console.log("lendingPoolRatio: %s, LPaEthDistribution: %s, LPinterestDistribution: %s", lendingPoolRatio, LPaEthDistribution, LPinterestDistribution);

        return DataTypes.calcLPIncreasesResult({
            deltaAccumYield : PercentageMath.percentMul(LPaEthDistribution, 10000 - PlatformConfig.shrubFee),
            deltaShrubYield : PercentageMath.percentMul(LPaEthDistribution, PlatformConfig.shrubFee),
            deltaAccumInterest : PercentageMath.percentMul(LPinterestDistribution, 10000 - PlatformConfig.shrubFee),
            deltaShrubInterest : PercentageMath.percentMul(LPinterestDistribution, PlatformConfig.shrubFee)
        });

//        res.deltaAccumYield = PercentageMath.percentMul(LPaEthDistribution, 10000 - PlatformConfig.shrubFee);
//        res.deltaShrubYield = PercentageMath.percentMul(LPaEthDistribution, PlatformConfig.shrubFee);
//        res.deltaAccumInterest = PercentageMath.percentMul(LPinterestDistribution, 10000 - PlatformConfig.shrubFee);
//        res.deltaShrubInterest = PercentageMath.percentMul(LPinterestDistribution, PlatformConfig.shrubFee);
//        return res;
    }

    function setShrubTreasury(address _address) public onlyOwner {
        shrubTreasury = _address;
    }


    // ---

/**
    * @notice Returns the USDC/ETH price as defined by chainlink
    * @dev Inverts the ETH/USDC returned from chainlink
    * @return USDC/ETH as a WAD
*/
    function getEthPrice() public view returns (uint256) {
        (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = chainlinkAggregator.latestRoundData();
        require(answer > 0, "ETH Price out of range");
        // Cast answer to uint256
        uint256 answerWad = uint256(answer);
        // Invert the answer
        return WadRayMath.wadDiv(WadRayMath.WAD, answerWad);
    }

/**
    * @notice Returns the USDC/ETH price as defined by chainlink
    * @dev Inverts the ETH/USDC returned from chainlink
    * @param ltv The ltv expressed as a percent (4 decimals - 10000 = 100%)
    * @param ethCollateral The amount of available ETH collateral (in Wad) to calculate the maxLoan for
    * @return maxLoanV the maximum USDC loan (expressed with 6 decimals)
*/
    function maxLoan(uint ltv, uint ethCollateral) validateLtv(ltv) public view returns (uint256 maxLoanV) {
        /// @dev USDC value of ethCollateral (in Wad)
        uint valueOfEth = WadRayMath.wadMul(ethCollateral, getEthPrice());
        uint maxLoanWad = PercentageMath.percentMul(valueOfEth, ltv);
        return maxLoanV = ShrubLendMath.wadToUsdc(maxLoanWad);
    }

/**
    * @notice Returns the ETH collateral required for a loan of specified amount and ltv
    * @dev
    * @param ltv The ltv expressed as a percent (4 decimals - 10000 = 100%)
    * @param usdcAmount the requested loan amount expressed with 6 decimals
    * @return collateralRequired the amount of ETH expressed in Wad required to colateralize this loan
*/
    function requiredCollateral(uint ltv, uint usdcAmount) validateExtendLtv(ltv) public view returns (uint256 collateralRequired) {
        uint valueOfEthRequired = PercentageMath.percentDiv(ShrubLendMath.usdcToWad(usdcAmount), ltv);
        collateralRequired = WadRayMath.wadDiv(valueOfEthRequired, getEthPrice());
    }

    function getDeficitForPeriod(
        uint _timestamp
    ) public validTimestamp(_timestamp) view returns (uint256 deficit) {
        console.log("Running getDeficitForPeriod");
        // NOTE: it is critical that activePools is sorted
        deficit = 0;
        // We only want to evaluate the buckets before per the formula:
        // D(i) = max(0, D(i-1) + BP(i-1) - LP(i-1)
        for (uint i = 0; i < activePoolIndex[_timestamp]; i++) {
//            if (pools[activePools[i]].totalLiquidity >= (deficit + totalLoans[activePools[i]])) {
            if (lendingPools[activePools[i]].principal >= (deficit + borrowingPools[activePools[i]].principal)) {
                deficit = 0;
            } else {
                // Important to do the addition first to prevent an underflow
//                deficit = (deficit + totalLoans[activePools[i]] - pools[activePools[i]].totalLiquidity);
                deficit = (deficit + borrowingPools[activePools[i]].principal - lendingPools[activePools[i]].principal);
            }
//            console.log(string(abi.encodePacked("deficit - ", deficit.toString())));
        }
    }

    function getAvailableForPeriod(uint _timestamp) public validTimestamp(_timestamp) view returns (uint avail) {
        // currentAndFutureLiquidity - Total amount of USDC provided to this pool and all future pools
        // currentAndFutureLoans - Total amount of outstanding USDC loans from this pool and all future pools
        // getDeficitForPeriod - Deficit in terms of loans in previous buckets being greater than the liquidity in those buckets (meaning it is not available for double use)
        console.log("Running getAvailableForPeriod");
        uint currentAndFutureLiquidity = 0;
        uint currentAndFutureLoans = 0;
        for (uint i = activePoolIndex[_timestamp]; i < activePools.length; i++) {
            currentAndFutureLiquidity += lendingPools[activePools[i]].principal;
//            currentAndFutureLoans += totalLoans[activePools[i]];
            currentAndFutureLoans += borrowingPools[activePools[i]].principal;
//            console.log(string(abi.encodePacked("currentAndFutureLiquidity - ", currentAndFutureLiquidity.toString())));
//            console.log(string(abi.encodePacked("currentAndFutureLoans - ", currentAndFutureLoans.toString())));
        }
        avail = currentAndFutureLiquidity - currentAndFutureLoans - getDeficitForPeriod(_timestamp);
    }

    function getTotalLiquidity(
        uint _timestamp
    ) public view returns (uint256 totalLiquidity) {
        console.log("Running getTotalLiquidity");
        for (uint i = 0; i < activePools.length; i++) {
            if (activePools[i] < _timestamp) {
                continue; // Don't count liquidity that is in a pool that has a timestamp before what it requested
            }
            totalLiquidity += lendingPools[activePools[i]].principal;
        }
        return totalLiquidity;
    }

    function getPool(
        uint256 _timestamp
    ) public view returns (DataTypes.PoolDetails memory) {
        DataTypes.LendingPool memory lendingPool = lendingPools[_timestamp];
        DataTypes.PoolDetails memory poolDetails;

        console.log("getPool - timestamp: %s, poolShareTokenAddress: %s, storage: %s",
            _timestamp,
            address(lendingPool.poolShareToken),
            address(lendingPools[_timestamp].poolShareToken)
        );

        poolDetails.lendPrincipal = lendingPool.principal;
        poolDetails.lendAccumInterest = lendingPools[_timestamp].accumInterest;
        poolDetails.lendAccumYield = lendingPools[_timestamp].accumYield;
        poolDetails.lendPoolShareTokenAddress = address(lendingPool.poolShareToken);
        poolDetails.lendPoolShareTokenTotalSupply = lendingPool.poolShareToken.totalSupply();
        poolDetails.lendShrubInterest = lendingPools[_timestamp].shrubInterest;
        poolDetails.lendShrubYield = lendingPools[_timestamp].shrubYield;

        poolDetails.borrowPrincipal = borrowingPools[_timestamp].principal;
        poolDetails.borrowCollateral = borrowingPools[_timestamp].collateral;
        poolDetails.borrowPoolShareAmount = borrowingPools[_timestamp].poolShareAmount;
        poolDetails.borrowTotalAccumInterest = borrowingPools[_timestamp].totalAccumInterest;
        poolDetails.borrowTotalAccumYield = borrowingPools[_timestamp].totalAccumYield;
        poolDetails.borrowTotalRepaid = borrowingPools[_timestamp].totalRepaid;

        return poolDetails;
    }

    // APY is returned with 6 decimals
    function validPool(uint256 _timestamp) internal view returns (bool) {
        // require that the timestamp be in the future
        // require that the pool has been created
        if (lendingPools[_timestamp].poolShareToken == PoolShareToken(address(0))) {
            return false;
        }
        if (_timestamp < HelpersLogic.currentTimestamp()) {
            return false;
        }
        return true;
    }

/**
    * @notice deposit funds into Shrub Lend platform
    * @dev USDC funds are locked in the shrub platform until the specified timestamp.
    * @dev depositor receives poolShareTokens representing their claim to the deposit pool (poolShareToken amounts are expressed in Wad)
    * @dev These funds are made available for borrowers to borrow in exchange for interest payments from the borrowers and yield from the ETH collateral that the borrowers put up
    * @param _timestamp the date until which the USDC deposit will be locked
    * @param _amount the amount of USDC (expressed with 6 decimals) which will be locked until the timestamp
*/
    function deposit(uint256 _timestamp, uint256 _amount) public nonReentrant {
        console.log("running deposit");
        require(_amount > 0, "Deposit amount must be greater than 0");
        require(validPool(_timestamp), "Invalid pool");

        // Transfer USDC from sender to this contract
        usdc.transferFrom(msg.sender, address(this), _amount);

        uint256 poolShareTokenAmount;
        uint256 amountWad = ShrubLendMath.usdcToWad(_amount);

        // Calculate total value of the pool in terms of USDC
        uint256 accumYieldValueInUsdc = WadRayMath.wadMul(
            lendingPools[_timestamp].accumYield,
            getEthPrice()
        );  // expressed in USDC (Wad)
        console.log(
            "lendingPool before values - principal: %s, accumInterest: %s, accumYieldValueInUsdc: %s",
            lendingPools[_timestamp].principal,
            lendingPools[_timestamp].accumInterest,
            accumYieldValueInUsdc
        );
        uint256 totalPoolValue = lendingPools[_timestamp].principal + lendingPools[_timestamp].accumInterest + accumYieldValueInUsdc;  // expressed in USDC (Wad)

        // If the pool does not exist or totalLiquidity is 0, user gets 1:1 poolShareTokens
        console.log("totalPoolValue, _amount, lpt.totalSupply(), poolShareTokenAmount");
        console.log(totalPoolValue);
        console.log(_amount);
        console.log(lendingPools[_timestamp].poolShareToken.totalSupply());
        if (totalPoolValue == 0) {
            poolShareTokenAmount = amountWad;
            console.log("PATH 1 - NEW");
        } else {
            // If the pool exists and has liquidity, calculate poolShareTokens based on the proportion of deposit to total pool value
            console.log("PATH 2 - ESTABLISHED");
            poolShareTokenAmount =
                WadRayMath.wadDiv(
                    WadRayMath.wadMul(
                        amountWad,
                        lendingPools[_timestamp].poolShareToken.totalSupply()
                    ),
                    totalPoolValue
                );
        }
        console.log(poolShareTokenAmount);
        lendingPools[_timestamp].principal += amountWad;
        lendingPools[_timestamp].poolShareToken.mint(msg.sender, poolShareTokenAmount);
        emit NewDeposit(
            _timestamp,
            address(lendingPools[_timestamp].poolShareToken),
            _msgSender(),
            _amount,
            poolShareTokenAmount
        );
    }

    function withdraw(
        uint256 _timestamp,
        uint256 _poolShareTokenAmount
    ) external nonReentrant {
        require(lendingPools[_timestamp].finalized, "Pool must be finalized before withdraw");
        withdrawUnchecked(_timestamp, _poolShareTokenAmount);
    }

    function withdrawUnchecked(
        uint256 _timestamp,
        uint256 _poolShareTokenAmount
    ) private returns (uint usdcWithdrawn, uint ethWithdrawn) {
        console.log("running withdrawUnchecked");
        DataTypes.LendingPool storage lendingPool = lendingPools[_timestamp];
//        require(lendingPool.finalized, "Pool must be finalized before withdraw");
        require(
            _poolShareTokenAmount > 0,
            "Withdrawal amount must be greater than 0"
        );
        require(
            lendingPool.poolShareToken.balanceOf(msg.sender) >= _poolShareTokenAmount,
            "Insufficient pool share tokens for withdrawal"
        );

        console.log("_poolShareTokenAmount - %s, poolShareToken.totalSupply - %s", _poolShareTokenAmount, lendingPool.poolShareToken.totalSupply());
//        console.log(lendingPool.poolShareToken.totalSupply());
        console.log("lendingPool - principal: %s, accumInterest: %s, accumYield: %s", lendingPool.principal, lendingPool.accumInterest, lendingPool.accumYield);
//        console.log(lendingPool.principal);
//        console.log(lendingPool.accumInterest);
//        console.log(lendingPool.accumYield);
        // Calculate the proportion of the pool that the user is withdrawing (use 8 decimals)
        uint256 withdrawalProportion = WadRayMath.wadDiv(
            _poolShareTokenAmount,
            lendingPool.poolShareToken.totalSupply()
        );
//        uint256 withdrawalProportion = _poolShareTokenAmount * 10 ** 8 /
//                                lendingPool.poolShareToken.totalSupply();
        console.log("withdrawlPropotion: %s", withdrawalProportion);

        // Calculate the corresponding USDC amount to withdraw
        uint256 usdcPrincipalAmount = ShrubLendMath.wadToUsdc(WadRayMath.wadMul(withdrawalProportion, lendingPool.principal));
        uint256 usdcInterestAmount = ShrubLendMath.wadToUsdc(WadRayMath.wadMul(withdrawalProportion, lendingPool.accumInterest));

        // Calculate the corresponding aETH interest to withdraw
        uint256 aethWithdrawalAmount = WadRayMath.wadMul(withdrawalProportion, lendingPool.accumYield);

        // Burn the pool share tokens
        lendingPool.poolShareToken.burn(msg.sender, _poolShareTokenAmount);

        // Update the total liquidity in the pool
        lendingPool.principal -= ShrubLendMath.usdcToWad(usdcPrincipalAmount);
        lendingPool.accumInterest -= ShrubLendMath.usdcToWad(usdcInterestAmount);

        // Transfer USDC and aETH to the user
        usdc.transfer(msg.sender, usdcInterestAmount + usdcPrincipalAmount);
        wrappedTokenGateway.withdrawETH(address(0), aethWithdrawalAmount, msg.sender);
        emit Withdraw(msg.sender, address(lendingPool.poolShareToken), _poolShareTokenAmount, aethWithdrawalAmount, usdcPrincipalAmount, usdcInterestAmount);
//        event Withdraw(address poolShareTokenAddress, uint tokenAmount, uint ethAmount, uint usdcAmount);
        return (usdcInterestAmount + usdcPrincipalAmount, aethWithdrawalAmount);
    }

    // This runs after the collateralProvider has sent aETH to Shrub
    function takeLoanInternal(
        DataTypes.TakeLoanInternalParams memory params
    ) internal {
        console.log("running takeLoanInternal");

        // Ensure that it is a valid pool
        require(validPool(params.timestamp), "Invalid pool");

        console.log("params.collateral: %s, requiredCollateral: %s", params.collateral, requiredCollateral(params.ltv, params.principal));
        console.log("params.ltv: %s, params.principal: %s", params.ltv, params.principal);
        require(
            params.collateral >= requiredCollateral(params.ltv, params.principal),
            "Insufficient collateral provided for specified ltv"
        );

        // Ensure the ltv is valid and calculate the apy
        uint32 apy = HelpersLogic.getAPYBasedOnLTV(params.ltv);

        // Check if the loan amount is less than or equal to the liquidity across pools
        uint totalAvailableLiquidity = getAvailableForPeriod(params.timestamp);

        require(
            params.principal <= totalAvailableLiquidity,
            "Insufficient liquidity across pools"
        );

        // Transfer the loan amount in USDC to the borrower
        usdc.transfer(params.beneficiary, params.principal);

        DataTypes.BorrowData memory bd;
        bd.startDate = params.startDate;
        bd.endDate = params.timestamp;
        bd.principal = params.principal;
        bd.collateral = params.collateral;
        bd.apy = apy;
        uint tokenId = bpt.mint(params.loanHolder, bd);
        console.log("bpt minted");
        console.log(tokenId);

        // Update borrowingPools
        borrowingPools[params.timestamp].principal += params.principal;
        borrowingPools[params.timestamp].collateral += params.collateral;
        uint deltaBpPoolShares;

        if (aEthSnapshotBalance == 0) {
            deltaBpPoolShares = params.collateral;
        } else {
            deltaBpPoolShares = WadRayMath.wadDiv(
                WadRayMath.wadMul(params.collateral, bpTotalPoolShares),
                aEthSnapshotBalance + newCollateralSinceSnapshot + claimedCollateralSinceSnapshot
            );
        }

        console.log("collateral: %s, bpTotalPoolShares: %s, aEthSnapshotBalance: %s", params.collateral, bpTotalPoolShares, aEthSnapshotBalance);
        console.log("deltaBpPoolShares: %s", deltaBpPoolShares);

        borrowingPools[params.timestamp].poolShareAmount += deltaBpPoolShares;
        console.log("poolShareAmount of borrowingPool with timestamp: %s incremented by %s, now %s", params.timestamp, deltaBpPoolShares, borrowingPools[params.timestamp].poolShareAmount);
        bpTotalPoolShares += deltaBpPoolShares;

        newCollateralSinceSnapshot += params.collateral;  // Keep track of the collateral since the last snapshot

//        console.log("-------");
//        console.log(tokenId);
//        console.log(_timestamp);
//        console.log(beneficiary);
//        console.log(_collateral);
//        console.log(_amount);
//        console.log(loan.APY);
//        console.log("-------");
        emit NewLoan(tokenId, params.timestamp, params.beneficiary, params.collateral, params.principal, params.startDate, apy);

    }

    function takeLoan(
        uint256 _principal, // Amount of USDC with 6 decimal places
        uint256 _collateral, // Amount of ETH collateral with 18 decimal places
        uint32 _ltv,
        uint40 _timestamp
    ) public payable validateLtv(_ltv) nonReentrant {
        console.log("running takeLoan");
        // Check that the sender has enough balance to send the amount
        require(msg.value == _collateral, "Wrong amount of Ether provided.");

        wrappedTokenGateway.depositETH{value: _collateral}(
            Constants.AAVE_AETH_POOL,  // This is the address of the Aave-v3 pool - it is not used
            address(this),
            0
        );

        takeLoanInternal(DataTypes.TakeLoanInternalParams({
            principal: _principal,
            collateral: _collateral,
            ltv: _ltv,
            timestamp: _timestamp,
            startDate: HelpersLogic.currentTimestamp(),
            beneficiary: msg.sender,
            loanHolder: msg.sender
        }));
    }

    function partialRepayLoan(uint256 tokenId, uint256 repaymentAmount) external onlyBptOwner(tokenId) {
        // Check that the user has sufficient funds
        require(usdc.balanceOf(msg.sender) >= repaymentAmount, "insufficient balance");
        // Check that the funds are less than the owed balance
//        uint debt = bpt.debt(tokenId);
//        require(repaymentAmount < , "repayment amount must be less than total debt");
//        uint interest = bpt.getInterest(tokenId);
//        require(repaymentAmount >= interest, "repayment amount must be at least the accumulated interest");
        // Check that funds are approved
        // NOTE: We are letting the ERC-20 contract handle this
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
        uint principalReduction = bpt.partialRepayLoan(tokenId, repaymentAmount, lastSnapshotDate, msg.sender);

        DataTypes.BorrowingPool storage borrowingPool = borrowingPools[bpt.getEndDate(tokenId)];
        borrowingPool.principal -= principalReduction;

        emit PartialRepayLoan(tokenId, repaymentAmount, principalReduction);
    }

    function repayLoanInternal(
        uint tokenId,
        address repayer,
        address beneficiary
    ) internal returns (uint freedCollateral) {
        console.log("Running repayLoanInternal");
        // Check that repayer owns the bpt
//        console.log("ownerOf(tokenId): %s, repayer: %s", bpt.ownerOf(tokenId), repayer);
        // Determine the principal, interest, and collateral of the debt
        DataTypes.BorrowData memory bd = bpt.getLoan(tokenId);
        DataTypes.BorrowingPool memory tempBorrowingPool = borrowingPools[bd.endDate];
//        bd.endDate = _timestamp;
//        bd.principal = _principal;
//        bd.collateral = _collateral;
//        bd.apy = apy;
        uint interest = bpt.getInterest(tokenId);
        console.log("interest: %s", interest);
        console.log("bd.principal: %s", bd.principal);
        console.log("msg.sender: %s has a balance of %s USDC", msg.sender, usdc.balanceOf(msg.sender));
        // Ensure that msg.sender has sufficient USDC
        require(usdc.balanceOf(repayer) >= bd.principal + interest, "Insufficient USDC funds");
        // Ensure that msg.sender has approved sufficient USDC - ERC20 contract can handle this
        // Transfer funds to Shrub
        usdc.transferFrom(
            repayer,
            address(this),
            bd.principal + interest
        );
        // Burn the BPT - NOTE: it must be also removed from tokensByTimestamp - This is done in other contract
        console.log("about to burn tokenId: %s", tokenId);
        bpt.burn(tokenId);
        // Update Borrowing Pool principal, collateral
        tempBorrowingPool.principal -= bd.principal;
        tempBorrowingPool.collateral -= bd.collateral;
        console.log("borrowingPool with endDate: %s updated to principal: %s, collateral: %s", bd.endDate, tempBorrowingPool.principal, tempBorrowingPool.collateral);
        // Update Borrowing Pool poolShareAmount
        console.log('aEthSnapshotBalance: %s', aEthSnapshotBalance);
        console.log("bd.collateral: %s, bpTotalPoolShares: %s, aEthSnapshotBalance: %s", bd.collateral, bpTotalPoolShares, aEthSnapshotBalance);
//        uint deltaBpPoolShares = bd.collateral * bpTotalPoolShares / (aEthSnapshotBalance + newCollateralSinceSnapshot - claimedCollateralSinceSnapshot);
        uint deltaBpPoolShares = WadRayMath.wadDiv(
            WadRayMath.wadMul(bd.collateral, bpTotalPoolShares),
            aEthSnapshotBalance + newCollateralSinceSnapshot - claimedCollateralSinceSnapshot
        );
        console.log('deltaBpPoolShares: %s', deltaBpPoolShares);
        console.log('borrowing pool with endDate %s has poolShareAmount: %s', bd.endDate, tempBorrowingPool.poolShareAmount);
        console.log("about to decrement above pool...");
        tempBorrowingPool.poolShareAmount -= deltaBpPoolShares;
        console.log("poolShareAmount of borrowingPool with timestamp: %s decremented by %s, now %s", bd.endDate, deltaBpPoolShares, tempBorrowingPool.poolShareAmount);
//        console.log("borrowingPool with endDate: %s updated to poolShareAmount: %s", bd.endDate, tempBorrowingPool.poolShareAmount);
        // Update bpTotalPoolShares
        bpTotalPoolShares -= deltaBpPoolShares;
        console.log("bpTotalPoolShares updated to: %s", bpTotalPoolShares);
        claimedCollateralSinceSnapshot += bd.collateral;
        console.log("claimedCollateralSinceSnapshot updated to: %s", claimedCollateralSinceSnapshot);
        freedCollateral = bd.collateral;
        // Write borrowing pool back to storage
        borrowingPools[bd.endDate] = tempBorrowingPool;
        // Emit event for tracking/analytics/subgraph
        emit RepayLoan(tokenId, bd.principal + interest, freedCollateral, beneficiary);
    }

    function repayLoan(
        uint tokenId,
        address beneficiary
    ) public onlyBptOwner(tokenId) nonReentrant {
        // Convert collateral amount of aETH to ETH and Transfer ETH to the beneficiary
        uint freedCollateral = repayLoanInternal(tokenId, msg.sender, beneficiary);
        wrappedTokenGateway.withdrawETH(address(0), freedCollateral, beneficiary);
        console.log("sending %s ETH to %s", freedCollateral, beneficiary);
    }

    function repayLoanAETH(
        uint tokenId,
        address beneficiary
    ) public onlyBptOwner(tokenId) nonReentrant {
        // Convert collateral amount of aETH to ETH and Transfer ETH to the beneficiary
        uint freedCollateral = repayLoanInternal(tokenId, msg.sender, beneficiary);
        aeth.transfer(beneficiary, freedCollateral);
        console.log("sending %s aETH to %s", freedCollateral, beneficiary);
    }

    function extendDeposit(
        uint currentTimestamp,
        uint newTimestamp,
        uint tokenAmount
    ) external {
        console.log("running extendDeposit");
        // Check that user owns this amount on poolShareTokens

        // Check that newTimestamp is after currentTimestamp
        require(newTimestamp > currentTimestamp, "newTimestamp must be greater than currentTimestamp");
        // essentially perform a withdraw - the poolShareTokens are burned - aETH is sent to user
        (uint usdcWithdrawn, uint ethWithdrawn) = withdrawUnchecked(currentTimestamp, tokenAmount);
        // essentially perform a deposit - USDC proceeds from the withdraw are deposited to the future timestamp
        deposit(newTimestamp, usdcWithdrawn);
    }

    function extendLoan(
        uint tokenId,
        uint40 newTimestamp,
        uint256 additionalCollateral, // Amount of new ETH collateral with - 18 decimals
        uint256 additionalRepayment, // Amount of new USDC to be used to repay the existing loan - 6 decimals
        uint32 _ltv
    ) external validateExtendLtv(_ltv) onlyBptOwner(tokenId) payable {
//        TODO: extendLoan should allow LTV that is within health factor


        console.log("running extendLoan");
        // Check that the additionalCollateral specified is correct
        require(msg.value == additionalCollateral, "Wrong amount of Ether provided.");
        // Check that the user holds at least additionalCollateral of USDC
        require(usdc.balanceOf(msg.sender) >= additionalRepayment, "Insufficient USDC balance");
        DataTypes.BorrowData memory bd = bpt.getLoan(tokenId);
        // Check that the newTimestamp is after the endDate of the token
        require(newTimestamp > bd.endDate, "newTimestamp must be greater than endDate of the loan");
        // Check that the additionalRepayment is less than the current debt of the loan
        uint debt = bpt.debt(tokenId);
        require(debt > additionalRepayment, "additionalRepayment must be less than the total debt of the loan");
        // Use the existing collateral and additionalCollateral to take a loan at the newTimestamp of the current loan debt minus additionalRepayment
        if (additionalCollateral > 0) {
            // Convert additionalCollateral to aETH and move to platform
            wrappedTokenGateway.depositETH{value: additionalCollateral}(
                Constants.AAVE_AETH_POOL,  // This is the address of the Aave-v3 pool - it is not used
                address(this),
                0
            );
        }
        uint newCollateral = bd.collateral + additionalCollateral;
        uint newPrincipal = bpt.debt(tokenId) - additionalRepayment;
        uint flashLoanAmount = 0;
        // User Receives a flash loan for the aETH collateral required to take the new loan
        console.log("extendLoan-before-flash-loan eth: %s usdc: %s aeth: %s", msg.sender.balance, usdc.balanceOf(msg.sender), aeth.balanceOf(msg.sender));
        console.log("1 - platform aETH balance: %s", aeth.balanceOf(address(this)));
        console.log("flash loan amount: %s", flashLoanAmount);
        if (newCollateral > aeth.balanceOf(msg.sender)) {
            flashLoanAmount = newCollateral - aeth.balanceOf(msg.sender);
            // Transfer USDC from this contract to sender as a flash loan
            aeth.transfer(msg.sender, flashLoanAmount);
        }
        console.log("2 - platform aETH balance: %s", aeth.balanceOf(address(this)));
        console.log("extendLoan-before-take-loan eth: %s usdc: %s aeth: %s", msg.sender.balance, usdc.balanceOf(msg.sender), aeth.balanceOf(msg.sender));
        aeth.transferFrom(msg.sender, address(this), newCollateral);
        console.log("3 - platform aETH balance: %s", aeth.balanceOf(address(this)));
//        takeLoanInternal(newPrincipal, newCollateral, _ltv, newTimestamp, uint40(lastSnapshotDate), msg.sender, msg.sender);
        takeLoanInternal(DataTypes.TakeLoanInternalParams({
            principal: newPrincipal,
            collateral: newCollateral,
            ltv: _ltv,
            timestamp: newTimestamp,
            startDate: uint40(lastSnapshotDate),
            beneficiary: msg.sender,
            loanHolder: msg.sender
        }));
        console.log("4 - platform aETH balance: %s", aeth.balanceOf(address(this)));
//        takeLoan{value: newCollateral}(newPrincipal, newCollateral, _ltv, newTimestamp);
        console.log("extendLoan-before-repay-loan eth: %s usdc: %s aeth: %s", msg.sender.balance, usdc.balanceOf(msg.sender), aeth.balanceOf(msg.sender));
        uint freedCollateral = repayLoanInternal(tokenId, msg.sender, msg.sender);
        console.log("5 - platform aETH balance: %s", aeth.balanceOf(address(this)));
        console.log("msg.sender: %s, freedCollateral: %s, sender-aETH-balance: %s",
            msg.sender,
            freedCollateral,
            aeth.balanceOf(msg.sender)
        );
        aeth.transfer(msg.sender, freedCollateral);
        console.log("6 - platform aETH balance: %s", aeth.balanceOf(address(this)));
        console.log("extendLoan-before-repay-flash-loan eth: %s usdc: %s aeth: %s", msg.sender.balance, usdc.balanceOf(msg.sender), aeth.balanceOf(msg.sender));
        if (flashLoanAmount > 0) {
            // Transfer USDC from sender to Shrub to repay flash loan
            console.log("about to send %s from %s with %s allowance", flashLoanAmount, msg.sender, aeth.allowance(msg.sender, address(this)));
            aeth.transferFrom(msg.sender, address(this), flashLoanAmount);
        }
        console.log("7 - platform aETH balance: %s", aeth.balanceOf(address(this)));
    }

//    function forceExtendBorrow(uint tokenId, uint claim) external {
//        DataTypes.BorrowData memory loanDetails = bpt.getLoan(tokenId);
//        address borrower = bpt.ownerOf(tokenId);
//        require(claim > 0 && claim < 4, "invalid claim");
//        uint availabilityTime = claim == 1 ? Configuration.FORCED_EXTENSION_1 :
//            claim == 2 ? Configuration.FORCED_EXTENSION_2 :
//            Configuration.FORCED_EXTENSION_3;
//        require(HelpersLogic.currentTimestamp() > loanDetails.endDate + availabilityTime ,"loan is not eligible for extension");
//        // TODO: For now bonus is 1% of collatertal - update this later to be eth value of the appropriate percent of the debt
//        uint bonusPecentage = 100;
//        // The caller will be rewarded with some amount of the users' collateral. This will be based on the size of the debt to be refinanced
//        uint bonus = PercentageMath.percentMul(loanDetails.collateral, bonusPecentage);
//        // flash loan if necessary for collateral
//        // take new loan on behalf of the holder - collateral is same as previous loan minus bonus
//        takeLoanInternal(DataTypes.TakeLoanInternalParams({
//            principal: loanDetails.principal,
//            collateral: loanDetails.collateral - bonus,
//        // TODO: ltv should be calculated to be the smallest valid
//            ltv: 50,
//            timestamp: getNextActivePool(loanDetails.endDate),
//            startDate: uint40(lastSnapshotDate),
//            beneficiary: msg.sender,
//            loanHolder: borrower
//        }));
//        // repay previous loan and collect collateral
//
//        repayLoanInternal(
////            uint tokenId,
////            address repayer,
////            address beneficiary
//            tokenId,
//            msg.sender,
//            msg.sender
//        );
//    }

/**
    * @notice Returns the timestamp of the earliest lending pool after the given timestamp
    * @dev
    * @param _timestamp uint256 - timestamp that the returned timestamp must be greater than
    * @return timestamp of the earliest lending pool after given timestamp (expressed as uint256)
*/
    function getNextActivePool(uint40 timestamp) validTimestamp(timestamp) internal returns (uint) {
        uint currentIndex = activePoolIndex[timestamp];
        require(currentIndex + 1 < activePools.length, "No next activePool");
        return activePools[currentIndex + 1];
    }

    function bytesToString(bytes memory data) public pure returns(string memory) {
        bytes memory alphabet = "0123456789abcdef";

        bytes memory str = new bytes(2 + data.length * 2);
        str[0] = "0";
        str[1] = "x";
        for (uint i = 0; i < data.length; i++) {
            str[2+i*2] = alphabet[uint(uint8(data[i] >> 4))];
            str[3+i*2] = alphabet[uint(uint8(data[i] & 0x0f))];
        }
        return string(str);
    }

    modifier onlyBptOwner(uint _tokenId) {
        require(bpt.ownerOf(_tokenId) == msg.sender, "call may only be made by owner of bpt");
        _;
    }

    modifier validateLtv(uint ltv) {
        console.log("validateLtv: %s", ltv);
        require(ltv == 2000 || ltv == 2500 || ltv == 3300 || ltv == 5000, "Invalid LTV");
        _;
    }

    modifier validateExtendLtv(uint ltv) {
        console.log("validateExtendLtv: %s", ltv);
        require(ltv == MAX_LTV_FOR_EXTEND || ltv == 2000 || ltv == 2500 || ltv == 3300 || ltv == 5000, "Invalid LTV");
        _;
    }

    modifier validTimestamp(uint _timestamp) { // Modifier
        console.log("running validTimestamp modifier");
//        console.log(_timestamp);
//        console.log(activePoolIndex[_timestamp]);
//        console.log("activePools");
//        console.log("---");
//        for(uint i = 0; i < activePools.length; i++) {
//            console.log(activePools[i]);
//        }
//        console.log("---");
        require(
            activePoolIndex[_timestamp] != 0 || activePools[0] == _timestamp,
            "Invalid timestamp"
        );
        _;
    }

    fallback() external {
        // This will log the call data in your local Hardhat Network console
        console.log(bytesToString(msg.data));
    }
}
