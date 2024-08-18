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
import {RepayLogic} from "../libraries/logic/RepayLogic.sol";
import {ExtendLogic} from "../libraries/logic/ExtendLogic.sol";
import {LiquidationLogic} from "../libraries/logic/LiquidationLogic.sol";
import {PriceFeedLogic} from "../libraries/logic/PriceFeedLogic.sol";
import {ShrubLendMath} from "../libraries/math/ShrubLendMath.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IBorrowPositionToken.sol";
import "../interfaces/IMockAaveV3.sol";
import "../interfaces/IAETH.sol";
import "../interfaces/IWETH.sol";
import "../interfaces/IComet.sol";

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

    address shrubTreasury;

    // Interfaces for USDC and aETH
    IERC20 public usdc;
    IAETH public aeth;
    IBorrowPositionToken public bpt;
    IMockAaveV3 public wrappedTokenGateway;
    AggregatorV3Interface public ethUsdcPriceFeed;  // Chainlink interface
    AggregatorV3Interface public usdEthPriceFeed;  // Chainlink interface
    AggregatorV3Interface public usdUsdcPriceFeed;  // Chainlink interface
    IWETH public weth;  // Compound V3 WETH
    IComet public cweth;  // Compount V3

    // uint public bpTotalPoolShares; // Wad

    constructor(address[10] memory addresses) {
        usdc = IERC20(addresses[0]);
        bpt = IBorrowPositionToken(addresses[1]);
        wrappedTokenGateway = IMockAaveV3(addresses[2]);
        aeth = IAETH(addresses[3]);
        ethUsdcPriceFeed = AggregatorV3Interface(addresses[4]);
        shrubTreasury = addresses[5];
        usdEthPriceFeed = AggregatorV3Interface(addresses[6]);
        usdUsdcPriceFeed = AggregatorV3Interface(addresses[7]);
        weth = IWETH(addresses[8]);
        cweth = IComet(addresses[9]);
        lendState.lastSnapshotDate = HelpersLogic.currentTimestamp();

        aeth.approve(address(wrappedTokenGateway), type(uint256).max);
        weth.approve(address(cweth), type(uint256).max);
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
        if (address(ethUsdcPriceFeed) != address(0)) {
            return PriceFeedLogic.getEthPriceSingleSource(ethUsdcPriceFeed);
        }
        return PriceFeedLogic.getEthPriceDoubleSource(usdEthPriceFeed, usdUsdcPriceFeed);
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

    function getLendState() external view returns (DataTypes.LendState memory) {
        return lendState;
    }

    function getLtv(uint tokenId) external view returns (uint16 ltv) {
        ltv = ShrubView.getLtv(tokenId, getEthPrice(), bpt, lendState);
    }

    function getBorrowInterest(uint tokenId) external view returns (uint interest) {
        interest = ShrubView.getBorrowInterest(tokenId, bpt, lendState);
    }

    function requiredCollateral(uint16 ltv, uint usdcAmount) external view returns (uint256 collateralRequired) {
        collateralRequired = ShrubView.requiredCollateral(ltv, usdcAmount, getEthPrice());
    }

    function getPool(
        uint40 _timestamp
    ) public view returns (DataTypes.PoolDetails memory) {
        DataTypes.LendingPool memory lendingPool = lendingPools[_timestamp];
        DataTypes.PoolDetails memory poolDetails;

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

    // --------------------- DepositLogicLibrary ---------------------

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

    // --------------------- BorrowLogicLibrary ---------------------

    function borrow(
        uint256 _principal, // Amount of USDC with 6 decimal places
        uint256 _collateral, // Amount of ETH collateral with 18 decimal places
        uint16 _ltv,
        uint40 _timestamp
    ) public payable validateLtv(_ltv) nonReentrant {

//        struct borrowParams {
//        uint256 principal; // Amount of USDC with 6 decimal places
//        uint256 collateral; // Amount of ETH collateral with 18 decimal places
//        uint16 ltv;
//        uint40 timestamp;
//        uint256 ethPrice;
//        uint40[] activePools; // Sorted ascending list of timestamps of active pools
//        IERC20 usdc;
//        IBorrowPositionToken bpt;
//        IMockAaveV3 wrappedTokenGateway;
//        IComet comp;
//        IWETH weth;
//        }
//        MethodParams.borrowParams memory params,
//        DataTypes.LendState storage lendState,
//        mapping(uint40 => DataTypes.BorrowingPool) storage borrowingPools,
//    mapping(uint40 => DataTypes.LendingPool) storage lendingPools,
//    mapping(uint40 => uint256) storage activePoolIndex



        BorrowLogic.borrow(
            MethodParams.borrowParams({
                principal: _principal,
                collateral: _collateral,
                ltv: _ltv,
                timestamp: _timestamp,
                ethPrice: getEthPrice(),
                activePools: activePools,
                usdc: usdc,
                bpt: bpt,
                wrappedTokenGateway: wrappedTokenGateway,
                comp: cweth,
                weth: weth
//        uint256 principal; // Amount of USDC with 6 decimal places
//        uint256 collateral; // Amount of ETH collateral with 18 decimal places
//        uint16 ltv;
//        uint40 timestamp;
//        uint256 ethPrice;
//        uint40[] activePools; // Sorted ascending list of timestamps of active pools
//        IERC20 usdc;
//        IBorrowPositionToken bpt;
//        IMockAaveV3 wrappedTokenGateway;
//        IComet comp;
//        IWETH weth;


            }),
            lendState,
            borrowingPools,
            lendingPools,
            activePoolIndex
        );
    }

    // --------------------- RepayLogicLibrary ---------------------

    function partialRepayBorrow(uint256 tokenId, uint256 repaymentAmount) external onlyBptOwner(tokenId) {
        RepayLogic.partialRepayBorrow(
            tokenId,
            repaymentAmount,
            usdc,
            bpt,
            lendState,
            borrowingPools
        );
    }

    function repayBorrow(
        uint tokenId,
        address beneficiary
    ) public onlyBptOwner(tokenId) nonReentrant {
        RepayLogic.repayBorrow(
            tokenId,
            beneficiary,
            wrappedTokenGateway,
            usdc,
            bpt,
            lendState,
            PlatformConfig.config,
            borrowingPools
        );
    }

    function repayBorrowAETH(
        uint tokenId,
        address beneficiary
    ) public onlyBptOwner(tokenId) nonReentrant {
        RepayLogic.repayBorrowAETH(
            tokenId,
            beneficiary,
            aeth,
            usdc,
            bpt,
            lendState,
            PlatformConfig.config,
            borrowingPools
        );
    }

    // --------------------- ExtendLogicLibrary ---------------------

    function extendBorrow(
        uint tokenId,
        uint40 newTimestamp,
        uint256 additionalCollateral, // Amount of new ETH collateral with - 18 decimals
        uint256 additionalRepayment, // Amount of new USDC to be used to repay the existing borrow - 6 decimals
        uint16 ltv
    ) external validateExtendLtv(ltv) onlyBptOwner(tokenId) payable {
        ExtendLogic.extendBorrow(
            MethodParams.extendBorrowParams({
                tokenId: tokenId,
                newTimestamp: newTimestamp,
                additionalCollateral: additionalCollateral,
                additionalRepayment: additionalRepayment,
                ltv: ltv,
                ethPrice: getEthPrice(),
                usdc: usdc,
                bpt: bpt,
                aeth: aeth
            }),
            lendState,
            PlatformConfig.config,
            activePools,
            borrowingPools,
            lendingPools,
            activePoolIndex
        );
    }

/**
    * @notice Called by liquidator to force the extension of an expired borrow.
    * @dev Bonuses and durations for the liquidationPhase are specified in Configuration
    * @param tokenId uint256 - tokenId of the borrow position token representing the loan
    * @param liquidationPhase uint256 - liquidation phase. Must be between 0 and 2. Higher values have greater bonuses. increasing values become eligible as more time since the endDate elapses
*/
    function forceExtendBorrow(uint tokenId, uint liquidationPhase) external {
        ExtendLogic.forceExtendBorrow(
            MethodParams.forceExtendBorrowParams({
                tokenId: tokenId,
                liquidationPhase: liquidationPhase,
                ethPrice: getEthPrice(),
                bpt: bpt,
                aeth: aeth,
                usdc: usdc
            }),
            PlatformConfig.config,
            lendState,
            activePools,
            activePoolIndex,
            borrowingPools,
            lendingPools
        );
    }

    // --------------------- LiquidationLogicLibrary ---------------------

/**
    * @notice Called by liquidator to force the liquidation of an expired borrow.
    * @dev Bonuses and durations for the liquidationPhase are specified in Configuration
    * @dev Liquidator repays loan and is compensated with an equivelant amount of collateral at a discount specified by the bonus in the liquidationPhase
    * @param tokenId uint256 - tokenId of the borrow position token representing the loan
    * @param liquidationPhase uint256 - liquidation phase. Must be between 3 and 5. Higher values have greater bonuses. increasing values become eligible as more time since the endDate elapses
*/
    function forceLiquidation(uint tokenId, uint liquidationPhase) external {
        LiquidationLogic.forceLiquidation(
            tokenId,
            liquidationPhase,
            getEthPrice(),
            bpt,
            aeth,
            usdc,
            PlatformConfig.config,
            lendState
        );
    }


/**
    * @notice Called by shrub to force the liquidation of an expired borrow - when no other liquidator stepped in.
    * @dev setup so that it can be called by chainlink automation
    * @dev shrub repays loan and is compensated with an equivelant amount of collateral at a discount specified by the bonus in the liquidationPhase
    * @param tokenId uint256 - tokenId of the borrow position token representing the loan
*/
    function shrubLiquidation(uint tokenId, uint liquidationPhase) external {
        LiquidationLogic.shrubLiquidation(
            MethodParams.shrubLiquidationParams({
                tokenId: tokenId,
                liquidationPhase: liquidationPhase,
                ethPrice: getEthPrice(),
                shrubTreasury: shrubTreasury,
                bpt: bpt,
                aeth: aeth,
                usdc: usdc
            }),
            PlatformConfig.config,
            lendState
        );
    }

/**
    * @notice Called by shrub to force the liquidation of an expired borrow - when no other liquidator stepped in.
    * @dev setup so that it can be called by chainlink automation
    * @dev shrub repays loan and is compensated with an equivelant amount of collateral at a discount specified by the bonus in the liquidationPhase
    * @param tokenId uint256 - tokenId of the borrow position token representing the loan
*/
    function borrowLiquidation(uint tokenId, uint percentage) external {
        LiquidationLogic.borrowLiquidation(
            MethodParams.borrowLiquidationParams({
                tokenId: tokenId,
                percentage: percentage,
                ethPrice: getEthPrice(),
                bpt: bpt,
                aeth: aeth,
                usdc: usdc
            }),
            PlatformConfig.config,
            lendState
        );
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

    function calcEarlyRepaymentPenalty(uint tokenId) external view returns (uint) {
        return ShrubView.calcEarlyRepaymentPenalty(tokenId, bpt, lendState, PlatformConfig.config);
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

    fallback() external {
        // This will log the call data in your local Hardhat Network console
        //console.log(bytesToString(msg.data));
    }
}
