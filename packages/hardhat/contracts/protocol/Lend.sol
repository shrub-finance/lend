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
import "../interfaces/IAETH.sol";

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
    mapping(uint40 => DataTypes.BorrowingPool) public borrowingPools; // mapping of timestamp of borrow endDate => BorrowingPool
    mapping(uint40 => uint256) public activePoolIndex; // mapping of timestamp => index of activePools

    uint40[] public activePools; // Sorted ascending list of timestamps of active pools
    uint40 lastSnapshotDate;
    uint aEthSnapshotBalance;
    uint newCollateralSinceSnapshot;
    uint claimedCollateralSinceSnapshot;

    address shrubTreasury;

    event NewDeposit(address poolShareTokenAddress, address depositor, uint256 principalAmount, uint256 interestAmount, uint256 tokenAmount);
    event NewBorrow(uint tokenId, uint40 timestamp, address borrower, uint256 collateral, uint256 principal, uint40 startDate, uint16 apy);
    event PartialRepayBorrow(uint tokenId, uint repaymentAmount, uint principalReduction);
    event RepayBorrow(uint tokenId, uint repaymentAmount, uint collateralReturned, address beneficiary);
    event Withdraw(address user, address poolShareTokenAddress, uint tokenAmount, uint ethAmount, uint usdcPrincipal, uint usdcInterest);
    event PoolCreated(uint40 timestamp, address poolShareTokenAddress);
    event LendingPoolYield(address poolShareTokenAddress, uint accumInterest, uint accumYield);
    event FinalizeLendingPool(address poolShareTokenAddress, uint shrubInterest, uint shrubYield);

    // Interfaces for USDC and aETH
    IERC20 public usdc;
    IAETH public aeth;
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

    function finalizeLendingPool(uint40 _timestamp) public onlyOwner {
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
            bpt.cleanUpByTimestamp(activePools[i]);
            console.log("finished running cleanUpByTimestamp for %s", activePools[i]);
//            Find the BPTs related to these timestamps
//            bptsForPool is an array of tokenIds
            uint[] memory bptsForPool = bpt.getTokensByTimestamp(activePools[i]);
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
            console.log("shrubYieldFee: %s", PlatformConfig.config.SHRUB_YIELD_FEE);
            console.log("shrubInterestFee: %s", PlatformConfig.config.SHRUB_INTEREST_FEE);
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
            deltaAccumYield : PercentageMath.percentMul(LPaEthDistribution, 10000 - PlatformConfig.config.SHRUB_YIELD_FEE),
            deltaShrubYield : PercentageMath.percentMul(LPaEthDistribution, PlatformConfig.config.SHRUB_YIELD_FEE),
            deltaAccumInterest : PercentageMath.percentMul(LPinterestDistribution, 10000 - PlatformConfig.config.SHRUB_INTEREST_FEE),
            deltaShrubInterest : PercentageMath.percentMul(LPinterestDistribution, PlatformConfig.config.SHRUB_INTEREST_FEE)
        });
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
    * @param ethCollateral The amount of available ETH collateral (in Wad) to calculate the maxBorrow for
    * @return maxBorrowV the maximum USDC that can be borrowed (expressed with 6 decimals)
*/
    function maxBorrow(uint16 ltv, uint ethCollateral) validateLtv(ltv) public view returns (uint256 maxBorrowV) {
        /// @dev USDC value of ethCollateral (in Wad)
        uint valueOfEth = WadRayMath.wadMul(ethCollateral, getEthPrice());
        uint maxBorrowWad = PercentageMath.percentMul(valueOfEth, uint256(ltv));
        return maxBorrowV = ShrubLendMath.wadToUsdc(maxBorrowWad);
    }

/**
    * @notice Returns the ETH collateral required for a borrow of specified amount and ltv
    * @dev
    * @param ltv The ltv expressed as a percent (4 decimals - 10000 = 100%)
    * @param usdcAmount the requested borrow amount expressed with 6 decimals
    * @return collateralRequired the amount of ETH expressed in Wad required to colateralize this borrow
*/
    function requiredCollateral(uint16 ltv, uint usdcAmount) validateExtendLtv(ltv) public view returns (uint256 collateralRequired) {
        uint valueOfEthRequired = PercentageMath.percentDiv(ShrubLendMath.usdcToWad(usdcAmount), uint256(ltv));
        collateralRequired = WadRayMath.wadDiv(valueOfEthRequired, getEthPrice());
    }

/**
    * @notice Returns the amount of ETH that is worth a given amount of USDC
    * @dev
    * @param usdcAmount the amount of USDC to convert to an amount of ETH (expressed with 6 decimals)
    * @return ethAmount the amount of ETH expressed in Wad
*/
    function usdcToEth(uint usdcAmount) private view returns (uint256 ethAmount) {
        ethAmount = WadRayMath.wadDiv(
            ShrubLendMath.usdcToWad(usdcAmount),
            getEthPrice()
        );
    }

/**
    * @notice Returns the current calculated ltv of a loan
    * @dev makes use of getEthPrice
    * @param tokenId - the tokenId of the Borrow Position Token of the loan
    * @return ltv - loan to value of loan (expressed as percentage)
*/
    function getLtv(uint tokenId) public view returns (uint16 ltv) {
        DataTypes.BorrowData memory bd = bpt.getBorrow(tokenId);
        ltv = calcLtv(bd.principal, getBorrowInterest(tokenId), bd.collateral, getEthPrice());
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
    function calcLtv(uint principal, uint interest, uint collateral, uint ethPrice) private pure returns (uint16 ltv) {
        uint usdcWad = ShrubLendMath.usdcToWad(principal + interest);
        uint collateralValue = WadRayMath.wadMul(collateral, ethPrice);
        uint percentageWad = WadRayMath.wadDiv(usdcWad, collateralValue);
        ltv = ShrubLendMath.wadToPercentage(percentageWad);
    }

    function getDeficitForPeriod(
        uint40 _timestamp
    ) public validTimestamp(_timestamp) view returns (uint256 deficit) {
        console.log("Running getDeficitForPeriod");
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
//            console.log(string(abi.encodePacked("deficit - ", deficit.toString())));
        }
    }

    function getAvailableForPeriod(uint40 _timestamp) public validTimestamp(_timestamp) view returns (uint avail) {
        // currentAndFutureLiquidity - Total amount of USDC provided to this pool and all future pools
        // currentAndFutureBorrows - Total amount of outstanding USDC borrows from this pool and all future pools
        // getDeficitForPeriod - Deficit in terms of borrows in previous buckets being greater than the liquidity in those buckets (meaning it is not available for double use)
        console.log("Running getAvailableForPeriod");
        uint currentAndFutureLiquidity = 0;
        uint currentAndFutureBorrows = 0;
        for (uint i = activePoolIndex[_timestamp]; i < activePools.length; i++) {
            currentAndFutureLiquidity += lendingPools[activePools[i]].principal;
            currentAndFutureBorrows += borrowingPools[activePools[i]].principal;
        }
        avail = currentAndFutureLiquidity - currentAndFutureBorrows - getDeficitForPeriod(_timestamp);
    }

    function getTotalLiquidity(
        uint40 _timestamp
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
        uint40 _timestamp
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

    function validPool(uint40 _timestamp) internal view returns (bool) {
        // require that the timestamp be in the future
        // require that the pool has been created
        if (lendingPools[_timestamp].poolShareToken == PoolShareToken(address(0))) {
            return false;
        }
        // TODO: This needs to incorportate an offset time before closing that is set in PlatformConfig
        if (_timestamp < HelpersLogic.currentTimestamp()) {
            return false;
        }
        return true;
    }


/**
    * @notice internal logic to deposit funds into Shrub Lend platform
    * @dev depositInternal runs all the calculations and the lendingPool modifications - calling functions are responsible for transfers
    * @param timestamp - uint256 - the date until which the USDC deposit will be locked
    * @param principalWad - uint256 - the amount of USDC (in Wad) which will be locked until the timestamp
    * @param interestWad - uint256 - the amount of USDC (in Wad) which will be moved to the interest component of the lending Pool
    * @return poolShareTokenAmount - uint256 - amount of poolShareTokens that were minted related to the deposit
*/
    function depositInternal(uint40 timestamp, uint256 principalWad, uint256 interestWad) internal returns (uint256 poolShareTokenAmount){
        console.log("running depositInternal: timestamp: %s, principalWad: %s, interestWad: %s", timestamp, principalWad, interestWad);
        require(validPool(timestamp), "Invalid pool");

        // Transfers happen in calling functions

//        uint256 poolShareTokenAmount;
//        uint256 principalWad = ShrubLendMath.usdcToWad(principalAmount);
//        uint256 interestWad = ShrubLendMath.usdcToWad(interestAmount);

        DataTypes.LendingPool memory lendingPool = lendingPools[timestamp];

        // Calculate total value of the pool in terms of USDC
        uint256 accumYieldValueInUsdc = WadRayMath.wadMul(
            lendingPool.accumYield,
            getEthPrice()
        );  // expressed in USDC (Wad)
        console.log(
            "lendingPool before values - principal: %s, accumInterest: %s, accumYieldValueInUsdc: %s",
            lendingPool.principal,
            lendingPool.accumInterest,
            accumYieldValueInUsdc
        );
        uint256 totalPoolValue = lendingPool.principal + lendingPool.accumInterest + accumYieldValueInUsdc;  // expressed in USDC (Wad)

        // If the pool does not exist or totalLiquidity is 0, user gets 1:1 poolShareTokens
        console.log(
            "totalPoolValue: %s, lpt.totalSupply(): %s",
            totalPoolValue,
            lendingPool.poolShareToken.totalSupply()
        );
        if (totalPoolValue == 0) {
            poolShareTokenAmount = principalWad + interestWad;
            console.log("PATH 1 - NEW");
        } else {
            // If the pool exists and has liquidity, calculate poolShareTokens based on the proportion of deposit to total pool value
            console.log("PATH 2 - ESTABLISHED");
            poolShareTokenAmount =
                WadRayMath.wadDiv(
                    WadRayMath.wadMul(
                        principalWad + interestWad,
                        lendingPool.poolShareToken.totalSupply()
                    ),
                    totalPoolValue
                );
        }
        console.log("poolShareTokenAmount: %s", poolShareTokenAmount);
        lendingPool.principal += principalWad;
        lendingPool.accumInterest += interestWad;
        lendingPool.poolShareToken.mint(msg.sender, poolShareTokenAmount);

        // commit changes to storage
        lendingPools[timestamp] = lendingPool;
    }

/**
    * @notice deposit funds into Shrub Lend platform
    * @dev USDC funds are locked in the shrub platform until the specified timestamp.
    * @dev depositor receives poolShareTokens representing their claim to the deposit pool (poolShareToken amounts are expressed in Wad)
    * @dev These funds are made available for borrowers to borrow in exchange for interest payments from the borrowers and yield from the ETH collateral that the borrowers put up
    * @param _timestamp the date until which the USDC deposit will be locked
    * @param _amount the amount of USDC (expressed with 6 decimals) which will be locked until the timestamp
*/
    function deposit(uint40 _timestamp, uint256 _amount) public nonReentrant {
        console.log("running deposit");
        require(_amount > 0, "Deposit amount must be greater than 0");
        require(validPool(_timestamp), "Invalid pool");

        // Transfer USDC from sender to this contract
        usdc.transferFrom(msg.sender, address(this), _amount);

        uint256 principalWad = ShrubLendMath.usdcToWad(_amount);
        uint256 poolShareTokenAmount = depositInternal(_timestamp, principalWad, 0);

        emit NewDeposit(
            address(lendingPools[_timestamp].poolShareToken),
            msg.sender,
            _amount,
            0,
            poolShareTokenAmount
        );
    }

    function withdraw(
        uint40 _timestamp,
        uint256 _poolShareTokenAmount
    ) external nonReentrant {
        console.log("running withdraw - _timestamp: %s, _poolShareTokenAmount: %s", _timestamp, _poolShareTokenAmount);
        require(lendingPools[_timestamp].finalized, "Pool must be finalized before withdraw");
        (uint usdcWithdrawn, uint usdcInterest, uint ethWithdrawn) = withdrawUnchecked(_timestamp, _poolShareTokenAmount);
        console.log("usdcWithdrawn: %s, usdcInterest: %s, ethWithdrawn: %s", usdcWithdrawn, usdcInterest, ethWithdrawn);
        usdc.transfer(msg.sender, usdcInterest + usdcWithdrawn);
        wrappedTokenGateway.withdrawETH(address(0), ethWithdrawn, msg.sender);
    }

    function withdrawUnchecked(
        uint40 _timestamp,
        uint256 _poolShareTokenAmount
    ) private returns (uint usdcWithdrawn, uint usdcInterest, uint ethWithdrawn) {
        console.log("running withdrawUnchecked");
        DataTypes.LendingPool memory lendingPool = lendingPools[_timestamp];
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
        console.log("usdcPrincipalAmount: %s", usdcPrincipalAmount);
        uint256 usdcInterestAmount = ShrubLendMath.wadToUsdc(WadRayMath.wadMul(withdrawalProportion, lendingPool.accumInterest));
        console.log("usdcInterestAmount: %s", usdcInterestAmount);

        // Calculate the corresponding aETH interest to withdraw
        uint256 aethWithdrawalAmount = WadRayMath.wadMul(withdrawalProportion, lendingPool.accumYield);
        console.log("aethWithdrawalAmount: %s", aethWithdrawalAmount);

        // Burn the pool share tokens
        lendingPool.poolShareToken.burn(msg.sender, _poolShareTokenAmount);

        // Update the lending pool amounts
        lendingPool.principal -= ShrubLendMath.usdcToWad(usdcPrincipalAmount);
        lendingPool.accumInterest -= ShrubLendMath.usdcToWad(usdcInterestAmount);
        lendingPool.accumYield -= aethWithdrawalAmount;

        // Save lendingPool to storage
        lendingPools[_timestamp] = lendingPool;

        // Transfer USDC principal and aETH yield to the user
        // Actual transfer to happen in calling function
//        wrappedTokenGateway.withdrawETH(address(0), aethWithdrawalAmount, msg.sender);
        emit Withdraw(msg.sender, address(lendingPool.poolShareToken), _poolShareTokenAmount, aethWithdrawalAmount, usdcPrincipalAmount, usdcInterestAmount);
//        event Withdraw(address poolShareTokenAddress, uint tokenAmount, uint ethAmount, uint usdcAmount);
        return (usdcPrincipalAmount, usdcInterestAmount, aethWithdrawalAmount);
    }

    // This runs after the collateralProvider has sent aETH to Shrub
/**
    * @notice Internal function called to record all changes related to borrowing - run after sending collateral
    * @dev The following checks are made: validPool, sufficientCollateral, availableLiquidity
    * @dev USDC is transferred to the beneficiary in the amount of principal
    * @param params DataTypes.TakeLoanInternalParams
*/
    function borrowInternal(
        DataTypes.BorrowInternalParams memory params
    ) internal {
        console.log("running borrowInternal");

        // Ensure that it is a valid pool
        require(validPool(params.timestamp), "Invalid pool");

        console.log("params.collateral: %s, requiredCollateral: %s", params.collateral, requiredCollateral(params.ltv, params.principal));
        console.log("params.ltv: %s, params.principal: %s", params.ltv, params.principal);
        require(
            params.collateral >= requiredCollateral(params.ltv, params.principal),
            "Insufficient collateral provided for specified ltv"
        );

        // Ensure the ltv is valid and calculate the apy
        uint16 apy = HelpersLogic.getAPYBasedOnLTV(params.ltv);

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
        bd.originalPrincipal = params.originalPrincipal;
        bd.collateral = params.collateral;
        bd.apy = apy;
        uint tokenId = bpt.mint(params.borrower, bd);
        console.log("bpt minted");
        console.log(tokenId);

        // Update borrowingPools
        borrowingPools[params.timestamp].principal += params.principal;
        borrowingPools[params.timestamp].collateral += params.collateral;
        uint deltaBpPoolShares;

        console.log("collateral: %s, bpTotalPoolShares: %s, aEthSnapshotBalance: %s", params.collateral, bpTotalPoolShares, aEthSnapshotBalance);
        console.log("aEthSnapshotBalance: %s, newCollateralSinceSnapshot: %s, claimedCollateralSinceSnapshot: %s", aEthSnapshotBalance, newCollateralSinceSnapshot, claimedCollateralSinceSnapshot);

        if (aEthSnapshotBalance == 0) {
            deltaBpPoolShares = params.collateral;
        } else {
            deltaBpPoolShares = WadRayMath.wadDiv(
                WadRayMath.wadMul(params.collateral, bpTotalPoolShares),
                aEthSnapshotBalance + newCollateralSinceSnapshot - claimedCollateralSinceSnapshot
            );
        }

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
        emit NewBorrow(tokenId, params.timestamp, params.beneficiary, params.collateral, params.principal, params.startDate, apy);

    }

    function borrow(
        uint256 _principal, // Amount of USDC with 6 decimal places
        uint256 _collateral, // Amount of ETH collateral with 18 decimal places
        uint16 _ltv,
        uint40 _timestamp
    ) public payable validateLtv(_ltv) nonReentrant {
        console.log("running borrow");
        // Check that the sender has enough balance to send the amount
        require(msg.value == _collateral, "Wrong amount of Ether provided.");

        wrappedTokenGateway.depositETH{value: _collateral}(
            Constants.AAVE_AETH_POOL,  // This is the address of the Aave-v3 pool - it is not used
            address(this),
            0
        );

        borrowInternal(DataTypes.BorrowInternalParams({
            principal: _principal,
            originalPrincipal: _principal,
            collateral: _collateral,
            ltv: _ltv,
            timestamp: _timestamp,
            startDate: HelpersLogic.currentTimestamp(),
            beneficiary: msg.sender,
            borrower: msg.sender
        }));
    }

    function partialRepayBorrow(uint256 tokenId, uint256 repaymentAmount) external onlyBptOwner(tokenId) {
        // Check that the user has sufficient funds
        require(usdc.balanceOf(msg.sender) >= repaymentAmount, "insufficient balance");
        // Check that the funds are less than the owed balance
        require(repaymentAmount < getBorrowDebt(tokenId), "repayment amount must be less than total debt");
        require(repaymentAmount >= getBorrowInterest(tokenId), "repayment amount must be at least the accumulated interest");
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
        uint principalReduction = bpt.partialRepayBorrow(tokenId, repaymentAmount, lastSnapshotDate, msg.sender);

        DataTypes.BorrowingPool storage borrowingPool = borrowingPools[bpt.getEndDate(tokenId)];
        borrowingPool.principal -= principalReduction;

        emit PartialRepayBorrow(tokenId, repaymentAmount, principalReduction);
    }

/**
    * @notice internal function to repay a borrow
    * @dev takes USDC payment to repay loan (debt+penalty), burns BPT, and updates accounting
    * @dev collateral must be handled by calling functions
    * @param tokenId - uint256 - tokenId of the BPT
    * @param repayer - address - address of the account repaying the borrow
    * @param beneficiary - address - address of the account to receive the collateral (only used for event)
    * @param isExtend - bool - whether calling function is an extend - if it is there is no earlyRepaymentPenalty
    * @return freedCollateral - uint256 - amount of collateral that is unlocked by this repayment
*/
    function repayBorrowInternal(
        uint tokenId,
        address repayer,
        address beneficiary,
        bool isExtend
    ) internal returns (uint freedCollateral) {
        console.log("Running repayBorrowInternal");
        // Check that repayer owns the bpt
//        console.log("ownerOf(tokenId): %s, repayer: %s", bpt.ownerOf(tokenId), repayer);
        // Determine the principal, interest, and collateral of the debt
        DataTypes.BorrowData memory bd = bpt.getBorrow(tokenId);
        DataTypes.BorrowingPool memory tempBorrowingPool = borrowingPools[bd.endDate];
//        bd.endDate = _timestamp;
//        bd.principal = _principal;
//        bd.collateral = _collateral;
//        bd.apy = apy;
        uint interest = getBorrowInterest(tokenId);
        uint earlyRepaymentPenalty = isExtend ? 0 : calcEarlyRepaymentPenalty(tokenId);
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
            bd.principal + interest + earlyRepaymentPenalty
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
        emit RepayBorrow(tokenId, bd.principal + interest, freedCollateral, beneficiary);
    }

    function repayBorrow(
        uint tokenId,
        address beneficiary
    ) public onlyBptOwner(tokenId) nonReentrant {
        // Convert collateral amount of aETH to ETH and Transfer ETH to the beneficiary
        uint freedCollateral = repayBorrowInternal(tokenId, msg.sender, beneficiary, false);
        wrappedTokenGateway.withdrawETH(address(0), freedCollateral, beneficiary);
        console.log("sending %s ETH to %s", freedCollateral, beneficiary);
    }

    function repayBorrowAETH(
        uint tokenId,
        address beneficiary
    ) public onlyBptOwner(tokenId) nonReentrant {
        // Convert collateral amount of aETH to ETH and Transfer ETH to the beneficiary
        uint freedCollateral = repayBorrowInternal(tokenId, msg.sender, beneficiary, false);
        aeth.transfer(beneficiary, freedCollateral);
        console.log("sending %s aETH to %s", freedCollateral, beneficiary);
    }

/**
    * @notice Calculates the current earlyRepaymentPenalty in USDC for a borrow based on the lastSnapshotDate
    * @dev USDC is transferred to the beneficiary in the amount of principal
    * @dev EARLY_REPAYMENT_THRESHOLD and EARLY_REPAYMENT_APY from config are used in calculation
    * @param tokenId - uint256 - tokenId of the BPT
    * @return penalty - uint256 - amount of USDC (if any) owed as a penalty to fully repay a borrow
*/
    function calcEarlyRepaymentPenalty(uint tokenId) public view returns (uint penalty) {
        DataTypes.BorrowData memory bd = bpt.getBorrow(tokenId);
        if (lastSnapshotDate + config.EARLY_REPAYMENT_THRESHOLD >= bd.endDate) {
            return 0;
        }
        penalty = PercentageMath.percentMul(
            bd.originalPrincipal * (bd.endDate - lastSnapshotDate - config.EARLY_REPAYMENT_THRESHOLD),
            config.EARLY_REPAYMENT_APY
        ) / Constants.YEAR;
    }

    function extendDeposit(
        uint40 currentTimestamp,
        uint40 newTimestamp,
        uint tokenAmount
    ) external {
        console.log("running extendDeposit");
        // Check that user owns this amount on poolShareTokens

        // Check that newTimestamp is after currentTimestamp
        require(newTimestamp > currentTimestamp, "newTimestamp must be greater than currentTimestamp");
        // essentially perform a withdraw - the poolShareTokens are burned - aETH is sent to user
        (uint usdcWithdrawn, uint usdcInterest, uint ethWithdrawn) = withdrawUnchecked(currentTimestamp, tokenAmount);
        // essentially perform a deposit - USDC proceeds from the withdraw are deposited to the future timestamp
        uint256 principalWad = ShrubLendMath.usdcToWad(usdcWithdrawn);
        uint256 interestWad = ShrubLendMath.usdcToWad(usdcInterest);
        uint256 poolShareTokenAmount = depositInternal(newTimestamp, principalWad, interestWad);
        // Send ETH Yield to user
        wrappedTokenGateway.withdrawETH(address(0), ethWithdrawn, msg.sender);
//        event NewDeposit(address poolShareTokenAddress, address depositor, uint256 principalAmount, uint256 interestAmount, uint256 tokenAmount);
        emit NewDeposit(
            address(lendingPools[newTimestamp].poolShareToken),
            msg.sender,
            usdcWithdrawn,
            usdcInterest,
            poolShareTokenAmount
        );
    }

    function extendBorrow(
        uint tokenId,
        uint40 newTimestamp,
        uint256 additionalCollateral, // Amount of new ETH collateral with - 18 decimals
        uint256 additionalRepayment, // Amount of new USDC to be used to repay the existing borrow - 6 decimals
        uint16 _ltv
    ) external validateExtendLtv(_ltv) onlyBptOwner(tokenId) payable {
//        TODO: extendBorrow should allow LTV that is within health factor


        console.log("running extendBorrow: params: tokenId: %s, newTimestamp: %s, additionalCollateral: %s", tokenId, newTimestamp, additionalCollateral);
        console.log("additionalRepayment: %s, _ltv: %s", additionalRepayment, _ltv);
        // Check that the additionalCollateral specified is correct
        require(msg.value == additionalCollateral, "Wrong amount of Ether provided.");
        // Check that the user holds at least additionalCollateral of USDC
        require(usdc.balanceOf(msg.sender) >= additionalRepayment, "Insufficient USDC balance");
        DataTypes.BorrowData memory bd = bpt.getBorrow(tokenId);
        // Check that the newTimestamp is after the endDate of the token
        require(newTimestamp > bd.endDate, "newTimestamp must be greater than endDate of the borrow");
        // Check that the additionalRepayment is less than the current debt of the loan
        uint debt = getBorrowDebt(tokenId);
        require(debt > additionalRepayment, "additionalRepayment must be less than the total debt of the borrow");
        // Use the existing collateral and additionalCollateral to take a loan at the newTimestamp of the current loan debt minus additionalRepayment
        if (additionalCollateral > 0) {
            // Convert additionalCollateral to aETH and move to platform
            aeth.deposit{value: additionalCollateral}(msg.sender);
        }
        uint newCollateral = bd.collateral + additionalCollateral;
        uint newPrincipal = getBorrowDebt(tokenId) - additionalRepayment;
        uint flashLoanAmount = 0;
        // User Receives a flash loan for the aETH collateral required to take the new loan
        console.log("extendBorrow-before-flash-loan eth: %s usdc: %s aeth: %s", msg.sender.balance, usdc.balanceOf(msg.sender), aeth.balanceOf(msg.sender));
        console.log("1 - platform aETH balance: %s", aeth.balanceOf(address(this)));
        if (newCollateral > aeth.balanceOf(msg.sender)) {
            flashLoanAmount = newCollateral - aeth.balanceOf(msg.sender);
            // Transfer aETH from this contract to sender as a flash loan
            aeth.transfer(msg.sender, flashLoanAmount);
        }
        console.log("flash loan amount: %s", flashLoanAmount);
        console.log("2 - platform aETH balance: %s", aeth.balanceOf(address(this)));
        console.log("extendBorrow-before-take-loan eth: %s usdc: %s aeth: %s", msg.sender.balance, usdc.balanceOf(msg.sender), aeth.balanceOf(msg.sender));
        console.log("newCollateral: %s", newCollateral);
        aeth.transferFrom(msg.sender, address(this), newCollateral);
        console.log("3 - platform aETH balance: %s", aeth.balanceOf(address(this)));
//        borrowInternal(newPrincipal, newCollateral, _ltv, newTimestamp, uint40(lastSnapshotDate), msg.sender, msg.sender);
        borrowInternal(DataTypes.BorrowInternalParams({
            principal: newPrincipal,
            originalPrincipal: bd.originalPrincipal,
            collateral: newCollateral,
            ltv: _ltv,
            timestamp: newTimestamp,
            startDate: lastSnapshotDate,
            beneficiary: msg.sender,
            borrower: msg.sender
        }));
        console.log("4 - platform aETH balance: %s", aeth.balanceOf(address(this)));
//        borrow{value: newCollateral}(newPrincipal, newCollateral, _ltv, newTimestamp);
        console.log("extendBorrow-before-repay-loan eth: %s usdc: %s aeth: %s", msg.sender.balance, usdc.balanceOf(msg.sender), aeth.balanceOf(msg.sender));
        uint freedCollateral = repayBorrowInternal(tokenId, msg.sender, msg.sender, true);
        console.log("5 - platform aETH balance: %s", aeth.balanceOf(address(this)));
        console.log("msg.sender: %s, freedCollateral: %s, sender-aETH-balance: %s",
            msg.sender,
            freedCollateral,
            aeth.balanceOf(msg.sender)
        );
        aeth.transfer(msg.sender, freedCollateral);
        console.log("6 - platform aETH balance: %s", aeth.balanceOf(address(this)));
        console.log("extendBorrow-before-repay-flash-loan eth: %s usdc: %s aeth: %s", msg.sender.balance, usdc.balanceOf(msg.sender), aeth.balanceOf(msg.sender));
        if (flashLoanAmount > 0) {
            // Transfer USDC from sender to Shrub to repay flash loan
            console.log("about to send %s from %s with %s allowance", flashLoanAmount, msg.sender, aeth.allowance(msg.sender, address(this)));
            aeth.transferFrom(msg.sender, address(this), flashLoanAmount);
        }
        console.log("7 - platform aETH balance: %s", aeth.balanceOf(address(this)));
    }

/**
    * @notice Called by liquidator to force the extension of an expired borrow.
    * @dev Bonuses and durations for the liquidationPhase are specified in Configuration
    * @param tokenId uint256 - tokenId of the borrow position token representing the loan
    * @param liquidationPhase uint256 - liquidation phase. Must be between 0 and 2. Higher values have greater bonuses. increasing values become eligible as more time since the endDate elapses
*/
    function forceExtendBorrow(uint tokenId, uint liquidationPhase) external {
        console.log("Running forceExtendBorrow - tokenId: %s, liquidationPhase: %s", tokenId, liquidationPhase);
        DataTypes.BorrowData memory loanDetails = bpt.getBorrow(tokenId);
        uint debt = getBorrowDebt(tokenId);
        address borrower = bpt.ownerOf(tokenId);
//        require(liquidationPhase < 3, "invalid claim");
        uint availabilityTime = PlatformConfig.config.END_OF_LOAN_PHASES[liquidationPhase].duration;
        console.log(
            "currentTimestamp: %s, loan endDate: %s, availabilityTime: %s",
            HelpersLogic.currentTimestamp(),
            loanDetails.endDate,
            availabilityTime
        );
        require(HelpersLogic.currentTimestamp() > loanDetails.endDate + availabilityTime ,"loan is not eligible for extension");
        uint bonusPecentage = PlatformConfig.config.END_OF_LOAN_PHASES[liquidationPhase].bonus;
        // The caller will be rewarded with some amount of the users' collateral. This will be based on the size of the debt to be refinanced
        uint bonusUsdc = PercentageMath.percentMul(
            debt,
            bonusPecentage
        );
        uint bonus = usdcToEth(bonusUsdc);
//        uint bonus = PercentageMath.percentMul(loanDetails.collateral, bonusPecentage);
        // flash loan if necessary for collateral
        // take new loan on behalf of the holder - collateral is same as previous loan minus bonus
        uint newCollateral = loanDetails.collateral - bonus;
        uint flashLoanAmount = 0;
        if (newCollateral > aeth.balanceOf(msg.sender)) {
            flashLoanAmount = newCollateral - aeth.balanceOf(msg.sender);
            // Transfer aETH from this contract to sender as a flash loan
            aeth.transfer(msg.sender, flashLoanAmount);
        }
        aeth.transferFrom(msg.sender, address(this), newCollateral);
        borrowInternal(DataTypes.BorrowInternalParams({
            principal: debt,
            originalPrincipal: loanDetails.originalPrincipal,
            collateral: newCollateral,
            ltv: calculateSmallestValidLtv(getLtv(tokenId), true),
            timestamp: getNextActivePool(loanDetails.endDate),
            startDate: lastSnapshotDate,
            beneficiary: msg.sender,
            borrower: borrower
        }));
        // repay previous loan and collect collateral
        // TODO: Platform is retaining the aETH - some should be flowing to the liquidator

        uint freedCollateral = repayBorrowInternal(
            tokenId,
            msg.sender,
            msg.sender,
            true
        );
        aeth.transfer(msg.sender, freedCollateral);
        if (flashLoanAmount > 0) {
            // Transfer aETH from sender to Shrub to repay flash loan
            console.log("about to send %s from %s with %s allowance", flashLoanAmount, msg.sender, aeth.allowance(msg.sender, address(this)));
            aeth.transferFrom(msg.sender, address(this), flashLoanAmount);
        }
    }

/**
    * @notice Called by liquidator to force the liquidation of an expired borrow.
    * @dev Bonuses and durations for the liquidationPhase are specified in Configuration
    * @dev Liquidator repays loan and is compensated with an equivelant amount of collateral at a discount specified by the bonus in the liquidationPhase
    * @param tokenId uint256 - tokenId of the borrow position token representing the loan
    * @param liquidationPhase uint256 - liquidation phase. Must be between 3 and 5. Higher values have greater bonuses. increasing values become eligible as more time since the endDate elapses
*/
    function forceLiquidation(uint tokenId, uint liquidationPhase) external {
        console.log("Running forceLiquidation - tokenId: %s, liquidationPhase: %s", tokenId, liquidationPhase);
        DataTypes.BorrowData memory loanDetails = bpt.getBorrow(tokenId);
        uint debt = getBorrowDebt(tokenId);
        address borrower = bpt.ownerOf(tokenId);
//        require(liquidationPhase > 2 && liquidationPhase < 6, "invalid claim");
        require(PlatformConfig.config.END_OF_LOAN_PHASES[liquidationPhase].liquidationEligible, "liquidation not allowed in this phase");
        uint availabilityTime = PlatformConfig.config.END_OF_LOAN_PHASES[liquidationPhase].duration;
        console.log(
            "currentTimestamp: %s, loan endDate: %s, availabilityTime: %s",
            HelpersLogic.currentTimestamp(),
            loanDetails.endDate,
            availabilityTime
        );
        require(HelpersLogic.currentTimestamp() > loanDetails.endDate + availabilityTime ,"loan is not eligible for liquidation");
        uint bonusPecentage = PlatformConfig.config.END_OF_LOAN_PHASES[liquidationPhase].bonus;
        // The caller will be rewarded with some amount of the users' collateral. This will be based on the size of the debt to be refinanced
        uint bonusUsdc = PercentageMath.percentMul(
            debt,
            10000 + bonusPecentage
        );
        uint bonus = usdcToEth(bonusUsdc);

        // Liquidator repays loan with usdc amount equal to the debt
        usdc.transferFrom(msg.sender, address(this), debt);
        // BPT borrowData is updated so that:
        // - principal = 0
        // - collateral -= bonus
        bpt.fullLiquidateBorrowData(tokenId, bonus);
        // Liquidator is sent collateral that they bought : principle * ethPrice * (1 - bonus)
        aeth.transfer(msg.sender, bonus);
    }


/**
    * @notice Called by shrub to force the liquidation of an expired borrow - when no other liquidator stepped in.
    * @dev setup so that it can be called by chainlink automation
    * @dev shrub repays loan and is compensated with an equivelant amount of collateral at a discount specified by the bonus in the liquidationPhase
    * @param tokenId uint256 - tokenId of the borrow position token representing the loan
*/
    function shrubLiquidation(uint tokenId, uint liquidationPhase) external {
        console.log("Running shrubLiquidation - tokenId: %s, liquidationPhase: %s", tokenId, liquidationPhase);
        DataTypes.BorrowData memory loanDetails = bpt.getBorrow(tokenId);
        uint debt = getBorrowDebt(tokenId);
        address borrower = bpt.ownerOf(tokenId);
        require(PlatformConfig.config.END_OF_LOAN_PHASES[liquidationPhase].shrubLiquidationEligible, "shrub liquidation not allowed in this phase");
        uint availabilityTime = PlatformConfig.config.END_OF_LOAN_PHASES[liquidationPhase].duration;
        console.log(
            "currentTimestamp: %s, loan endDate: %s, availabilityTime: %s",
            HelpersLogic.currentTimestamp(),
            loanDetails.endDate,
            availabilityTime
        );
        require(HelpersLogic.currentTimestamp() > loanDetails.endDate + availabilityTime ,"loan is not eligible for liquidation");
        uint bonusPecentage = PlatformConfig.config.END_OF_LOAN_PHASES[liquidationPhase].bonus;
        // The caller will be rewarded with some amount of the users' collateral. This will be based on the size of the debt to be refinanced
        uint bonusUsdc = PercentageMath.percentMul(
            debt,
            10000 + bonusPecentage
        );
        uint bonus = usdcToEth(bonusUsdc);

        // Liquidator repays loan with usdc amount equal to the debt
        usdc.transferFrom(shrubTreasury, address(this), debt);
        // BPT borrowData is updated so that:
        // - principal = 0
        // - collateral -= bonus
        bpt.fullLiquidateBorrowData(tokenId, bonus);
        // Liquidator is sent collateral that they bought : principle * ethPrice * (1 - bonus)
        aeth.transfer(shrubTreasury, bonus);
    }

/**
    * @notice Called by shrub to force the liquidation of an expired borrow - when no other liquidator stepped in.
    * @dev setup so that it can be called by chainlink automation
    * @dev shrub repays loan and is compensated with an equivelant amount of collateral at a discount specified by the bonus in the liquidationPhase
    * @param tokenId uint256 - tokenId of the borrow position token representing the loan
*/
    function borrowLiquidation(uint tokenId, uint percentage) external {
        console.log("Running borrowLiquidation - tokenId: %s, percentage: %s", tokenId, percentage);
        require(percentage == 5000, "Invalid Percentage");
        require(getLtv(tokenId) > PlatformConfig.config.LIQUIDATION_THRESHOLD, "borrow not eligible for liquidation");
        DataTypes.BorrowData memory loanDetails = bpt.getBorrow(tokenId);
        uint debt = getBorrowDebt(tokenId);
        uint interest = getBorrowInterest(tokenId);
        uint ethPrice = getEthPrice();
        address borrower = bpt.ownerOf(tokenId);
        // TODO: for now limit the percentage to 50% - later make it so that if this would not resolve the safety factor issue that the loan may be paid off 100%
        uint usdcToPay = PercentageMath.percentMul(debt, percentage);
        // usdcAmount / ethPrice * (1 + bonusPecentage)
        uint aethToReceive = PercentageMath.percentMul(
            WadRayMath.wadDiv(
                ShrubLendMath.usdcToWad(usdcToPay),
                ethPrice
            ),
            10000 + PlatformConfig.config.LIQUIDATION_BONUS
        );
        uint newPrincipal = loanDetails.principal + interest - usdcToPay;
        uint newCollateral = loanDetails.collateral - aethToReceive;
        require(
            calcLtv(newPrincipal, 0, newCollateral, ethPrice) < PlatformConfig.config.LIQUIDATION_THRESHOLD,
            "Liquidation insufficient to make borrow healthy"
        );

        // Liquidator repays loan with usdc amount equal to the debt
        usdc.transferFrom(msg.sender, address(this), usdcToPay);
        bpt.liquidateBorrowData(tokenId, newPrincipal, newCollateral);
        // Liquidator is sent collateral that they bought : principle * ethPrice * (1 - bonus)
        aeth.transfer(msg.sender, aethToReceive);
    }

/**
    * @notice Returns the current interest of a borrow
    * @dev returns 6 decimal USDC
    * @param tokenId uint256 - tokenId of the borrow position token representing the loan
    * @return interest - uint256 - current interest of the borrow (6 decimals)
*/
    function getBorrowInterest(uint tokenId) public view returns (uint interest) {
        interest = bpt.getInterest(tokenId, lastSnapshotDate);
    }

/**
    * @notice Returns the current debt of a borrow
    * @dev returns 6 decimal USDC
    * @param tokenId uint256 - tokenId of the borrow position token representing the loan
    * @return debt - uint256 - current total debt (principal + interest) of the borrow (6 decimals)
*/
    function getBorrowDebt(uint tokenId) public view returns (uint debt) {
        debt = bpt.debt(tokenId, lastSnapshotDate);
    }

/**
    * @notice Returns the timestamp of the earliest lending pool after the given timestamp
    * @dev
    * @param _timestamp uint40 - timestamp that the returned timestamp must be greater than
    * @return nextActivePoolTimestamp - timestamp of the earliest lending pool after given timestamp (expressed as uint40)
*/
    function getNextActivePool(uint40 timestamp) validTimestamp(timestamp) internal returns (uint40 nextActivePoolTimestamp) {
        uint currentIndex = activePoolIndex[timestamp];
        require(currentIndex + 1 < activePools.length, "No next activePool");
        nextActivePoolTimestamp = activePools[currentIndex + 1];
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

    modifier validateLtv(uint16 ltv) {
        console.log("validateLtv: %s", ltv);
        require(PlatformConfig.config.LTV_TO_APY[ltv].isValid);
        _;
    }

    modifier validateExtendLtv(uint16 ltv) {
        console.log("validateExtendLtv: %s", ltv);
        require(
            PlatformConfig.config.LTV_TO_APY[ltv].isValid ||
            ltv == PlatformConfig.config.MAX_LTV_FOR_EXTEND
        );
        _;
    }

    modifier validTimestamp(uint40 _timestamp) { // Modifier
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
