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
import {DataTypes} from '../libraries/data-structures/DataTypes.sol';
import {MethodParams} from '../libraries/data-structures/MethodParams.sol';
import {MethodResults} from '../libraries/data-structures/MethodResults.sol';
import {LendingPlatformEvents} from '../libraries/data-structures/LendingPlatformEvents.sol';
import {Configuration} from "../libraries/configuration/Configuration.sol";
import {Constants} from "../libraries/configuration/Constants.sol";

import {PercentageMath} from "@aave/core-v3/contracts/protocol/libraries/math/PercentageMath.sol";
import {WadRayMath} from "@aave/core-v3/contracts/protocol/libraries/math/WadRayMath.sol";

// Libraries with functions
import {HelpersLogic} from "../libraries/view/HelpersLogic.sol";
import {ShrubView} from "../libraries/view/ShrubView.sol";
import {AdminLogic} from "../libraries/logic/AdminLogic.sol";
import {DepositLogic} from "../libraries/logic/DepositLogic.sol";
import {BorrowLogic} from "../libraries/logic/BorrowLogic.sol";
import {ShrubLendMath} from "../libraries/math/ShrubLendMath.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IBorrowPositionToken.sol";
import "../interfaces/IMockAaveV3.sol";
import "../interfaces/IAETH.sol";

import "hardhat/console.sol";

contract LendingPlatform is Ownable, ReentrancyGuard, PlatformConfig{

    // Declaring Events here so they get in the ABI
    // TODO: Find a way to not have to do this as they are all defined in the LendingPlatformEvents Library
    event NewDeposit(address poolShareTokenAddress, address depositor, uint256 principalAmount, uint256 interestAmount, uint256 tokenAmount);
    event NewBorrow(uint tokenId, uint40 timestamp, address borrower, uint256 collateral, uint256 principal, uint40 startDate, uint16 apy);
    event PartialRepayBorrow(uint tokenId, uint repaymentAmount, uint principalReduction);
    event RepayBorrow(uint tokenId, uint repaymentAmount, uint collateralReturned, address beneficiary);
    event Withdraw(address user, address poolShareTokenAddress, uint tokenAmount, uint ethAmount, uint usdcPrincipal, uint usdcInterest);
    event PoolCreated(uint40 timestamp, address poolShareTokenAddress);
    event LendingPoolYield(address poolShareTokenAddress, uint accumInterest, uint accumYield);
    event FinalizeLendingPool(address poolShareTokenAddress, uint shrubInterest, uint shrubYield);

    mapping(uint40 => DataTypes.LendingPool) public lendingPools; // where the uint256 key is a timestamp
    mapping(uint40 => DataTypes.BorrowingPool) public borrowingPools; // mapping of timestamp of borrow endDate => BorrowingPool
    mapping(uint40 => uint256) public activePoolIndex; // mapping of timestamp => index of activePools

    DataTypes.LendState public lendState;

    uint40[] public activePools; // Sorted ascending list of timestamps of active pools
    // uint40 lastSnapshotDate;
    // uint aEthSnapshotBalance;
    // uint newCollateralSinceSnapshot;
    // uint claimedCollateralSinceSnapshot;

    address shrubTreasury;

    // Interfaces for USDC and aETH
    IERC20 public usdc;
    IAETH public aeth;
    IBorrowPositionToken public bpt;
    IMockAaveV3 public wrappedTokenGateway;
    AggregatorV3Interface public chainlinkAggregator;  // Chainlink interface

    // uint public bpTotalPoolShares; // Wad

    constructor(address[6] memory addresses) {
        usdc = IERC20(addresses[0]);
        bpt = IBorrowPositionToken(addresses[1]);
        wrappedTokenGateway = IMockAaveV3(addresses[2]);
        aeth = IAETH(addresses[3]);
        chainlinkAggregator = AggregatorV3Interface(addresses[4]);
        lendState.lastSnapshotDate = HelpersLogic.currentTimestamp();
        shrubTreasury = addresses[5];
    }

    // --- Admin Functions ---
    function createPool(uint40 _timestamp) public onlyOwner {
        AdminLogic.executeCreatePool(lendingPools, activePoolIndex, activePools, _timestamp);
    }

    function finalizeLendingPool(uint40 _timestamp) public onlyOwner {
        AdminLogic.finalizeLendingPool(lendingPools, _timestamp, shrubTreasury, aeth, usdc);
    }

    function takeSnapshot() public onlyOwner {
        AdminLogic.takeSnapshot(
            MethodParams.takeSnapshotParams({
                activePools: activePools,
                aeth: aeth,
                bpt: bpt,
                shrubTreasury: shrubTreasury,
                usdc: usdc,
                shrubInterestFee: PlatformConfig.config.SHRUB_INTEREST_FEE,  // Percentage of interest paid by the borrower that is allocated to Shrub Treasury (percentage)
                shrubYieldFee: PlatformConfig.config.SHRUB_YIELD_FEE  // Percentage of yield earned on aETH collateral that is allocated to Shrub Treasury (percentage)
            }),
            lendingPools,
            borrowingPools,
            lendState
        );
    }

//     function takeSnapshot() public onlyOwner {
//         uint aETHBalance = aeth.balanceOf(address(this));
//         //console.log("running takeSnapshot, platformAEthBalance: %s, aEthSnapshotBalance: %s, claimedCollateralSinceSnapshot: %s", aETHBalance, aEthSnapshotBalance, claimedCollateralSinceSnapshot);
//         //console.log("newCollateralSinceSnapshot: %s", newCollateralSinceSnapshot);
//         //console.log(
//             "lastSnaphot: %s, now: %s, elapsed: %s",
//             lastSnapshotDate,
//             HelpersLogic.currentTimestamp(),
//             HelpersLogic.currentTimestamp() - lastSnapshotDate
//         );
// //        Get the current balance of bpTotalPoolShares (it is local)
//         // calculate the accumYield for all BP (current balance - snapshot balance)
//         uint aEthYieldSinceLastSnapshot = aeth.balanceOf(address(this)) + claimedCollateralSinceSnapshot - newCollateralSinceSnapshot - aEthSnapshotBalance;
//         //console.log("aEthYieldSinceLastSnapshot: %s", aEthYieldSinceLastSnapshot);
//         // An array of LendingPool to keep track of all of the increments in memory before a final write to the lending pool
//         // The element of the array maps to the activePools timestamp
//         DataTypes.LendingPool[] memory lendingPoolsTemp = new DataTypes.LendingPool[](activePools.length);
//         for (uint i = 0; i < activePools.length; i++) {
//             // Make copy of lending pools into memory
//             lendingPoolsTemp[i] = lendingPools[activePools[i]];
//         }

// //        Calculate accumInterest for all BP
//         for (uint i = 0; i < activePools.length; i++) {
//             // Cleanup paid off BPTs
//             // TODO: This should return the earlyRepaymentPenalty that was incurred by these pools
//             uint earlyRepaymentPenalties = bpt.cleanUpByTimestamp(activePools[i]);
//             //console.log("finished running cleanUpByTimestamp for %s", activePools[i]);
// //            Find the BPTs related to these timestamps
// //            bptsForPool is an array of tokenIds
//             uint[] memory bptsForPool = bpt.getTokensByTimestamp(activePools[i]);
//             uint accumInterestBP = earlyRepaymentPenalties;
// //            # Loop through the BPTs in order to calculate their accumInterest
//             for (uint j = 0; j < bptsForPool.length; j++) {
//                 //console.log("in token loop - analyzing tokenId: %s", bptsForPool[j]);
//                 accumInterestBP +=  bpt.interestSinceTimestamp(bptsForPool[j], lastSnapshotDate);
//             }
//             // Determine the amount of aETH to distribute from this borrowing pool
//             if (borrowingPools[activePools[i]].poolShareAmount == 0) {
//                 //console.log("poolShareAmount in borrowing pool is 0 - skipping - %s", activePools[i]);
//                 continue;
//             }
//             //console.log("bpTotalPoolShares - %s", bpTotalPoolShares);
//             //console.log(borrowingPools[activePools[i]].poolShareAmount);
//             uint aEthYieldDistribution = WadRayMath.wadMul(
//                 aEthYieldSinceLastSnapshot,
//                 WadRayMath.wadDiv(borrowingPools[activePools[i]].poolShareAmount, bpTotalPoolShares)
//             );
//             // Loop through this and future Lending Pools to determine the contribution denominator
//             uint contributionDenominator;
//             for (uint j = i; j < activePools.length; j++) {
//                 contributionDenominator += lendingPools[activePools[j]].principal;
//             }
//             // distribute accumInterest and accumYield to LPs based on contribution principal
//             //console.log("contributionDenominator - %s", contributionDenominator);
//             //console.log("aEthYieldDistribution: %s", aEthYieldDistribution);
//             //console.log("accumInterestBP: %s", accumInterestBP);
//             //console.log("shrubYieldFee: %s", PlatformConfig.config.SHRUB_YIELD_FEE);
//             //console.log("shrubInterestFee: %s", PlatformConfig.config.SHRUB_INTEREST_FEE);
//             for (uint j = i; j < activePools.length; j++) {
//                 //console.log("in loop: lendingPool: %s, lendingPoolContribution: %s / %s", activePools[j], lendingPools[activePools[j]].principal, contributionDenominator);
//                 MethodResults.calcLPIncreasesResult memory res = calcLPIncreases(MethodParams.calcLPIncreasesParams({
//                     aEthYieldDistribution: aEthYieldDistribution,
//                     accumInterestBP: accumInterestBP,
//                     lendingPoolPrincipal: lendingPools[activePools[j]].principal,
//                     contributionDenominator: contributionDenominator
//                 }));
//                 lendingPoolsTemp[j].accumYield += res.deltaAccumYield;
//                 lendingPoolsTemp[j].shrubYield += res.deltaShrubYield;
//                 lendingPoolsTemp[j].accumInterest += res.deltaAccumInterest;
//                 lendingPoolsTemp[j].shrubInterest += res.deltaShrubInterest;
//             }
//         }
//         // Loop through lendingPoolsIncrement and write all of the deltas to lendingPools storage
//         for (uint j = 0; j < activePools.length; j++) {
//             //console.log("lendingPoolsTemp[j] - j: %s, accumInterest: %s, accumYield: %s", j, lendingPoolsTemp[j].accumInterest, lendingPoolsTemp[j].accumYield);
//             //console.log("lendingPools[activePools[j]] - j: %s, accumInterest: %s, accumYield: %s", j, lendingPools[activePools[j]].accumInterest, lendingPools[activePools[j]].accumYield);
//             lendingPools[activePools[j]] = lendingPoolsTemp[j];
//             //console.log("emmitting: timestamp: %s, accumInterest: %s, accumYield: %s", activePools[j], lendingPools[activePools[j]].accumInterest, lendingPools[activePools[j]].accumYield);
//             emit LendingPlatformEvents.LendingPoolYield(
//                 address(lendingPools[activePools[j]].poolShareToken),
//                 lendingPools[activePools[j]].accumInterest,
//                 lendingPools[activePools[j]].accumYield
//             );
//         }
//         // set the last snapshot date to now
//         lastSnapshotDate = HelpersLogic.currentTimestamp();
//         aEthSnapshotBalance = aeth.balanceOf(address(this));
//         //console.log("aEthSnapshotBalance set to: %s", aEthSnapshotBalance);
//         //console.log("lastSnapshotDate set to: %s", lastSnapshotDate);

//         // zero out the tracking globals;
//         newCollateralSinceSnapshot = 0;
//         claimedCollateralSinceSnapshot = 0;
//     }

    function calcLPIncreases(MethodParams.calcLPIncreasesParams memory params) internal view returns (MethodResults.calcLPIncreasesResult memory) {
        //console.log("running calcLPIncreases");
        uint lendingPoolRatio = WadRayMath.wadDiv(params.lendingPoolPrincipal, params.contributionDenominator);
        uint LPaEthDistribution = WadRayMath.wadMul(params.aEthYieldDistribution, lendingPoolRatio);
        uint LPinterestDistribution = WadRayMath.wadMul(ShrubLendMath.usdcToWad(params.accumInterestBP), lendingPoolRatio);
        //console.log("lendingPoolRatio: %s, LPaEthDistribution: %s, LPinterestDistribution: %s", lendingPoolRatio, LPaEthDistribution, LPinterestDistribution);

        return MethodResults.calcLPIncreasesResult({
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




    function getTotalLiquidity(
        uint40 _timestamp
    ) public view returns (uint256 totalLiquidity) {
        //console.log("Running getTotalLiquidity");
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

        //console.log("getPool - timestamp: %s, poolShareTokenAddress: %s, storage: %s",
        //     _timestamp,
        //     address(lendingPool.poolShareToken),
        //     address(lendingPools[_timestamp].poolShareToken)
        // );

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

    // function validPool(uint40 _timestamp) internal view returns (bool) {
    //     // require that the timestamp be in the future
    //     // require that the pool has been created
    //     if (lendingPools[_timestamp].poolShareToken == PoolShareToken(address(0))) {
    //         return false;
    //     }
    //     // TODO: This needs to incorportate an offset time before closing that is set in PlatformConfig
    //     if (_timestamp < HelpersLogic.currentTimestamp()) {
    //         return false;
    //     }
    //     return true;
    // }


    // DepositLogicLibrary


/**
    * @notice deposit funds into Shrub Lend platform
    * @dev USDC funds are locked in the shrub platform until the specified timestamp.
    * @dev depositor receives poolShareTokens representing their claim to the deposit pool (poolShareToken amounts are expressed in Wad)
    * @dev These funds are made available for borrowers to borrow in exchange for interest payments from the borrowers and yield from the ETH collateral that the borrowers put up
    * @param _timestamp the date until which the USDC deposit will be locked
    * @param _amount the amount of USDC (expressed with 6 decimals) which will be locked until the timestamp
*/
    function deposit(uint40 _timestamp, uint256 _amount) validPool(_timestamp) external nonReentrant {
        DepositLogic.deposit(
            _timestamp,
            _amount,
            lendingPools,
            getEthPrice(),
            usdc
        );
    }

    function extendDeposit(
        uint40 currentTimestamp,
        uint40 newTimestamp,
        uint tokenAmount
    ) external {
        DepositLogic.extendDeposit(
            currentTimestamp,
            newTimestamp,
            tokenAmount,
            getEthPrice(),
            lendingPools,
            wrappedTokenGateway
        );
    }

    function withdraw(
        uint40 _timestamp,
        uint256 _poolShareTokenAmount
    ) external nonReentrant {
        DepositLogic.withdraw(
            _timestamp,
            _poolShareTokenAmount,
            lendingPools,
            usdc,
            wrappedTokenGateway
        );
    }

    function borrow(
        uint256 _principal, // Amount of USDC with 6 decimal places
        uint256 _collateral, // Amount of ETH collateral with 18 decimal places
        uint16 _ltv,
        uint40 _timestamp
    ) public payable validateLtv(_ltv) nonReentrant {
        BorrowLogic.borrow(
            _principal, // Amount of USDC with 6 decimal places
            _collateral, // Amount of ETH collateral with 18 decimal places
            _ltv,
            _timestamp,
            getEthPrice(),
            usdc,
            bpt,
            lendState,
            wrappedTokenGateway,
            activePools,
            borrowingPools,
            lendingPools,
            activePoolIndex
        );
    }

    function partialRepayBorrow(uint256 tokenId, uint256 repaymentAmount) external onlyBptOwner(tokenId) {
    }

    function repayBorrow(
        uint tokenId,
        address beneficiary
    ) public onlyBptOwner(tokenId) nonReentrant {
    }

    function repayBorrowAETH(
        uint tokenId,
        address beneficiary
    ) public onlyBptOwner(tokenId) nonReentrant {
    }

    function extendBorrow(
        uint tokenId,
        uint40 newTimestamp,
        uint256 additionalCollateral, // Amount of new ETH collateral with - 18 decimals
        uint256 additionalRepayment, // Amount of new USDC to be used to repay the existing borrow - 6 decimals
        uint16 _ltv
    ) external validateExtendLtv(_ltv) onlyBptOwner(tokenId) payable {
    }

/**
    * @notice Called by liquidator to force the extension of an expired borrow.
    * @dev Bonuses and durations for the liquidationPhase are specified in Configuration
    * @param tokenId uint256 - tokenId of the borrow position token representing the loan
    * @param liquidationPhase uint256 - liquidation phase. Must be between 0 and 2. Higher values have greater bonuses. increasing values become eligible as more time since the endDate elapses
*/
    function forceExtendBorrow(uint tokenId, uint liquidationPhase) external {
    }

/**
    * @notice Called by liquidator to force the liquidation of an expired borrow.
    * @dev Bonuses and durations for the liquidationPhase are specified in Configuration
    * @dev Liquidator repays loan and is compensated with an equivelant amount of collateral at a discount specified by the bonus in the liquidationPhase
    * @param tokenId uint256 - tokenId of the borrow position token representing the loan
    * @param liquidationPhase uint256 - liquidation phase. Must be between 3 and 5. Higher values have greater bonuses. increasing values become eligible as more time since the endDate elapses
*/
    function forceLiquidation(uint tokenId, uint liquidationPhase) external {
        //console.log("Running forceLiquidation - tokenId: %s, liquidationPhase: %s", tokenId, liquidationPhase);
        DataTypes.BorrowData memory loanDetails = bpt.getBorrow(tokenId);
        uint debt = getBorrowDebt(tokenId);
        address borrower = bpt.ownerOf(tokenId);
//        require(liquidationPhase > 2 && liquidationPhase < 6, "invalid claim");
        require(PlatformConfig.config.END_OF_LOAN_PHASES[liquidationPhase].liquidationEligible, "liquidation not allowed in this phase");
        uint availabilityTime = PlatformConfig.config.END_OF_LOAN_PHASES[liquidationPhase].duration;
        //console.log(
        //     "currentTimestamp: %s, loan endDate: %s, availabilityTime: %s",
        //     HelpersLogic.currentTimestamp(),
        //     loanDetails.endDate,
        //     availabilityTime
        // );
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
        //console.log("Running shrubLiquidation - tokenId: %s, liquidationPhase: %s", tokenId, liquidationPhase);
        DataTypes.BorrowData memory loanDetails = bpt.getBorrow(tokenId);
        uint debt = getBorrowDebt(tokenId);
        address borrower = bpt.ownerOf(tokenId);
        require(PlatformConfig.config.END_OF_LOAN_PHASES[liquidationPhase].shrubLiquidationEligible, "shrub liquidation not allowed in this phase");
        uint availabilityTime = PlatformConfig.config.END_OF_LOAN_PHASES[liquidationPhase].duration;
        //console.log(
        //     "currentTimestamp: %s, loan endDate: %s, availabilityTime: %s",
        //     HelpersLogic.currentTimestamp(),
        //     loanDetails.endDate,
        //     availabilityTime
        // );
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
        //console.log("Running borrowLiquidation - tokenId: %s, percentage: %s", tokenId, percentage);
        require(percentage == 5000, "Invalid Percentage");
        require(ShrubView.getLtv(tokenId, getEthPrice(), bpt, lendState) > PlatformConfig.config.LIQUIDATION_THRESHOLD, "borrow not eligible for liquidation");
        DataTypes.BorrowData memory loanDetails = bpt.getBorrow(tokenId);
        uint debt = getBorrowDebt(tokenId);
        uint interest = ShrubView.getBorrowInterest(tokenId, bpt, lendState);
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
            ShrubView.calcLtv(newPrincipal, 0, newCollateral, ethPrice) < PlatformConfig.config.LIQUIDATION_THRESHOLD,
            "Liquidation insufficient to make borrow healthy"
        );

        // Liquidator repays loan with usdc amount equal to the debt
        usdc.transferFrom(msg.sender, address(this), usdcToPay);
        bpt.liquidateBorrowData(tokenId, newPrincipal, newCollateral);
        // Liquidator is sent collateral that they bought : principle * ethPrice * (1 - bonus)
        aeth.transfer(msg.sender, aethToReceive);
    }


/**
    * @notice Returns the current debt of a borrow
    * @dev returns 6 decimal USDC
    * @param tokenId uint256 - tokenId of the borrow position token representing the loan
    * @return debt - uint256 - current total debt (principal + interest) of the borrow (6 decimals)
*/
    function getBorrowDebt(uint tokenId) public view returns (uint debt) {
        debt = bpt.debt(tokenId, lendState.lastSnapshotDate);
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

    modifier validPool(uint40 _timestamp) {
        require(lendingPools[_timestamp].poolShareToken != PoolShareToken(address(0)), "Pool does not exist for specified timestamp");
        require(_timestamp >= HelpersLogic.currentTimestamp(), "Specified timestamp is in the past");
        _;
    }

    modifier onlyBptOwner(uint _tokenId) {
        require(bpt.ownerOf(_tokenId) == msg.sender, "call may only be made by owner of bpt");
        _;
    }

    modifier validateLtv(uint16 ltv) {
        //console.log("validateLtv: %s", ltv);
        require(PlatformConfig.config.LTV_TO_APY[ltv].isValid);
        _;
    }

    modifier validateExtendLtv(uint16 ltv) {
        //console.log("validateExtendLtv: %s", ltv);
        require(
            PlatformConfig.config.LTV_TO_APY[ltv].isValid ||
            ltv == PlatformConfig.config.MAX_LTV_FOR_EXTEND
        );
        _;
    }

    modifier validTimestamp(uint40 _timestamp) { // Modifier
        //console.log("running validTimestamp modifier");
//        //console.log(_timestamp);
//        //console.log(activePoolIndex[_timestamp]);
//        //console.log("activePools");
//        //console.log("---");
//        for(uint i = 0; i < activePools.length; i++) {
//            //console.log(activePools[i]);
//        }
//        //console.log("---");
        require(
            activePoolIndex[_timestamp] != 0 || activePools[0] == _timestamp,
            "Invalid timestamp"
        );
        _;
    }

    fallback() external {
        // This will log the call data in your local Hardhat Network console
        //console.log(bytesToString(msg.data));
    }
}
