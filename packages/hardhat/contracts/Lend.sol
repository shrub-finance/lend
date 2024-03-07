// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

import "./PoolShareToken.sol";
import "./BorrowPositionToken.sol";
import "./MockAaveV3.sol";
import "./AETH.sol";

import "hardhat/console.sol";
import {USDCoin} from "./USDCoin.sol";

contract LendingPlatform is Ownable, ReentrancyGuard {
    // using SafeERC20 for IERC20;
    using Strings for uint256;

    struct LendingPool {
        // uint40 endDate
        uint256 principal; // Total amount of USDC that has been contributed to the LP
        uint256 accumInterest; // The amount of USDC interest earned
        uint256 accumYield; // The amount of aETH earned through Aave
        uint256 shrubInterest; // Interest allocated for Shrub Treasury
        uint256 shrubYield; // Yield allocated for Shrub Treasury
//        uint256 aaveInterestSnapshot;
        PoolShareToken poolShareToken;
        bool finalized; // If the pool is finalized and eligible for withdraws
    }

    struct BorrowingPool {
        uint principal; // Total amount of USDC that has been borrowed in this buckets' loans
        uint collateral; // The total amount of ETH collateral deposited for loans in this bucket
        uint poolShareAmount; // Relative claim of the total platform aETH for this bucket. Used to calculate yield for lending pools
        uint totalAccumInterest; // Tracking accumulator for use in case of loan default
        uint totalAccumYield; // Tracking accumulator for use in case of loan default
        uint totalRepaid; // Tracking accumulator for use in case of loan default - tracks USDC paid back
    }

    struct PoolDetails {
        uint256 totalLiquidity;
//        uint256 aaveInterestSnapshot;
        address poolShareTokenAddress;
        uint256 totalLoans;
    }

//    struct Loan {
//        uint principal; // The loan amount (6 decimals)
//        uint collateral; // The collateral for the loan, presumably in ETH (18 decimals)
//        uint32 LTV; // The Loan-to-Value ratio - (valid values: 20, 25, 33, 50)
//        uint32 APY; // The Annual Percentage Yield (6 decimals)
////        PoolContribution[] contributingPools; // Array of PoolContributions representing each contributing pool and its liquidity contribution.
//    }

    struct ChainlinkResponse {
        uint80 roundId;
        int256 answer;
        uint256 startedAt;
        uint256 updatedAt;
        uint80 answeredInRound;
    }

    struct PoolContribution {
        uint poolTimestamp; // The pools timestamp.
        uint liquidityContribution; // The liquidity contribution from the pool at the time of the loan. Integer value as a proportion of 10 ** 8
    }

    mapping(uint256 => LendingPool) public lendingPools; // where the uint256 key is a timestamp
    mapping(uint256 => BorrowingPool) public borrowingPools; // mapping of timestamp of loan endDate => BorrowingPool
    mapping(uint256 => uint256) public activePoolIndex; // mapping of timestamp => index of activePools

    uint256[] public activePools; // Sorted ascending list of timestamps of active pools
    uint lastSnapshotDate;
    uint aEthSnapshotBalance;
    uint newCollateralSinceSnapshot;
    uint claimedCollateralSinceSnapshot;

    address shrubTreasury;

    event PoolCreated(uint256 timestamp, address poolShareTokenAddress);
    event NewDeposit(uint256 timestamp, address poolShareTokenAddress, address depositor, uint256 amount, uint256 tokenAmount);
    event NewLoan(uint tokenId, uint timestamp, address borrower, uint256 collateral, uint256 principal, uint32 apy);
    event PartialRepayLoan(uint tokenId, uint repaymentAmount, uint principalReduction);
    event RepayLoan(uint tokenId, uint repaymentAmount, uint collateralReturned, address beneficiary);
    event LendingPoolYield(address poolShareTokenAddress, uint accumInterest, uint accumYield);
    event Withdraw(address user, address poolShareTokenAddress, uint tokenAmount, uint ethAmount, uint usdcPrincipal, uint usdcInterest);
    event FinalizeLendingPool(address poolShareTokenAddress, uint shrubInterest, uint shrubYield);

    // Interfaces for USDC and aETH
    IERC20 public usdc;
    IBorrowPositionToken public bpt;
    IAETH public aeth;
    IMockAaveV3 public wrappedTokenGateway;
    AggregatorV3Interface public chainlinkAggregator;  // Chainlink interface

    uint private bpTotalPoolShares;

    // ETH price with 8 decimal places
//    uint public ethPrice = 2000 * 10 ** 8;
    constructor(address[6] memory addresses) {
        usdc = IERC20(addresses[0]);
        bpt = IBorrowPositionToken(addresses[1]);
        wrappedTokenGateway = IMockAaveV3(addresses[2]);
        aeth = IAETH(addresses[3]);
        chainlinkAggregator = AggregatorV3Interface(addresses[4]);
        lastSnapshotDate = block.timestamp;
        shrubTreasury = addresses[5];
    }

    function insertIntoSortedArr(uint[] storage arr, uint newValue) internal {
        if (arr.length == 0) {
            arr.push(newValue);
            // No need to run indexActivePools as the index would be 0 (which it is by default)
            return;
        }
        // First handle the last element of the array
        if (arr[arr.length - 1] < newValue) {
            arr.push(newValue);
            indexActivePools(arr);
            return;
        } else {
            arr.push(arr[arr.length - 1]);
            if (arr.length == 2) {
                arr[0] = newValue;
                indexActivePools(arr);
                return;
            }
        }
        for(uint i = arr.length - 2; i > 0; i--) {
            if (arr[i - 1] < newValue) {
                arr[i] = newValue;
                indexActivePools(arr);
                return;
            }
            console.log(i);
            arr[i] = arr[i - 1];
        }
        arr[0] = newValue;
        indexActivePools(arr);
    }

    function indexActivePools(uint[] memory arr) internal {
        console.log("running indexActivePools");
        for (uint i = 0; i < arr.length; i++) {
            activePoolIndex[activePools[i]] = i;
        }
    }

    function getEthPrice() public view returns (uint256) {
        // Returns an 8 decimal version of USDC / ETH
//        return 2000 * 10 ** 8;
        // 8 decimals ($1852.11030001)
//        return 185211030001;
        (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = chainlinkAggregator.latestRoundData();
        require(answer > 0, "ETH Price out of range");
        return uint256(10 ** 26 / answer);  // 18 decimals in answer - want 8 decimals remaining
    }

    function maxLoan(uint ltv, uint ethCollateral) public view returns (uint256) {
        // ethCollateral - 18 decimals
        // getEthPrice - 8 decimals
        require(ltv == 20 || ltv == 25 || ltv == 33 || ltv == 50, "Invalid LTV");
        uint valueOfEth = ethCollateral * getEthPrice(); // value of eth in usd with 26 decimals
        uint maxLoanV = valueOfEth * ltv / 10 ** 22; // remove 20 decimals to get back to 6 decimals of USDC
        return maxLoanV;
    }

    function requiredCollateral(uint ltv, uint usdcLoanValue) public view returns (uint256) {
        // returns collateral required in wei
        // usdcLoanValue 6 decimals
        // suppliment by adding 22 (6 + 22 - 2 - 8 = 18)
        // ltv 2 decimal
        // getEthPrice 8 decimal
        // return 18 decimals
        require(ltv == 20 || ltv == 25 || ltv == 33 || ltv == 50, "Invalid LTV");
        uint valueOfEthRequied = usdcLoanValue * 10 ** 22 / ltv; // time 10 ** 2 to convert to percentage and 10 ** 20 to convert to 26 decimals (needed because divide by 8 decimal value next step)
        return valueOfEthRequied / getEthPrice();
    }

    // Get earned interest from aETH
    // TODO: figure out what AethInterest should even be and then write the method
    function getAethInterest() internal view returns (uint256) {
        return 0;
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

    function getLendingPool(
        uint256 _timestamp
    ) public view returns (PoolDetails memory) {
        LendingPool memory lendingPool = lendingPools[_timestamp];
        PoolDetails memory poolDetails;

        poolDetails.totalLiquidity = lendingPool.principal;
//        poolDetails.aaveInterestSnapshot = lendingPool.aaveInterestSnapshot;
        poolDetails.poolShareTokenAddress = address(lendingPool.poolShareToken);
//        poolDetails.totalLoans = totalLoans[_timestamp];
        poolDetails.totalLoans = borrowingPools[_timestamp].principal;

        return poolDetails;
    }

    // APY is returned with 6 decimals
    function getAPYBasedOnLTV(uint32 _ltv) public pure returns (uint32) {
        if (_ltv == 20) {
            return 0;
        } else if (_ltv == 25) {
            return 1 * 10 ** 6;
        } else if (_ltv == 33) {
            return 5 * 10 ** 6;
        } else if (_ltv == 50) {
            return 8 * 10 ** 6;
        } else {
            revert("Invalid LTV");
        }
    }

    function validPool(uint256 _timestamp) internal view returns (bool) {
        // require that the timestamp be in the future
        // require that the pool has been created
        if (lendingPools[_timestamp].poolShareToken == PoolShareToken(address(0))) {
            return false;
        }
        if (_timestamp < block.timestamp) {
            return false;
        }
        return true;
    }

    // NEW: I don't think that this is necessary - We can find all loans for a user via the BPT. We can maintain an ownership index there
//    function getLoan(
//        address borrower,
//        uint256 timestamp
//    ) public view returns (Loan memory) {
//        // Use LTV == 0 as a proxy for the loan not existing
//        require(borrowingPools[timestamp].loans[borrower].LTV != 0, "loan does not exist");
//        return borrowingPools[timestamp].loans[borrower];
//    }

    function createPool(uint256 _timestamp) public onlyOwner {
        require(
            lendingPools[_timestamp].poolShareToken == PoolShareToken(address(0)),
            "Pool already exists"
        );
        // console.log(_timestamp);
        // console.log(block.timestamp);
        require(
            _timestamp > block.timestamp,
            "_timestamp must be in the future"
        );
        lendingPools[_timestamp].poolShareToken = new PoolShareToken(
            string(abi.encodePacked("PoolShareToken_", _timestamp.toString())),
            string(abi.encodePacked("PST_", _timestamp.toString()))
        );
        lendingPools[_timestamp].finalized = false;
        // Make sure to keep the pool sorted
        insertIntoSortedArr(activePools, _timestamp);
        emit PoolCreated(_timestamp, address(lendingPools[_timestamp].poolShareToken));
    }

    function finalizeLendingPool(uint _timestamp) public onlyOwner {
        LendingPool storage lendingPool = lendingPools[_timestamp];
        require(lendingPool.poolShareToken != PoolShareToken(address(0)), "Pool does not exist");
        require(!lendingPool.finalized, "Pool already finalized");
        require(block.timestamp >= _timestamp + 6 * 60 * 60, "Must wait until six hours after endDate for finalization"); // Time must be greater than six hours since pool expiration
        // TODO: Insert extra logic for ensuring everything is funded
        lendingPool.finalized = true;
        // Send funds to Shrub
        aeth.transfer(shrubTreasury, lendingPool.shrubYield);
        usdc.transfer(shrubTreasury, lendingPool.shrubInterest);
        emit FinalizeLendingPool(address(lendingPool.poolShareToken), lendingPool.shrubInterest, lendingPool.shrubYield);
    }

    function getUsdcAddress() public view returns (address) {
        return address(usdc);
    }

    function deposit(uint256 _timestamp, uint256 _amount) public nonReentrant {
        console.log("running deposit");
        require(_amount > 0, "Deposit amount must be greater than 0");
        require(validPool(_timestamp), "Invalid pool");

        // Transfer USDC from sender to this contract
        usdc.transferFrom(msg.sender, address(this), _amount);

        uint256 poolShareTokenAmount;

        // Calculate total value of the pool in terms of USDC
        uint256 aethInterest = getAethInterest();
        uint256 aethInterestValueInUsdc = aethInterest * getEthPrice();
        uint256 totalPoolValue = lendingPools[_timestamp].principal + lendingPools[_timestamp].accumInterest + aethInterestValueInUsdc;

        // If the pool does not exist or totalLiquidity is 0, user gets 1:1 poolShareTokens
        console.log("totalPoolValue, _amount, lpt.totalSupply(), poolShareTokenAmount");
        console.log(totalPoolValue);
        console.log(_amount);
        console.log(lendingPools[_timestamp].poolShareToken.totalSupply());
        if (totalPoolValue == 0) {
            poolShareTokenAmount = _amount * 10 ** 12;
            console.log("PATH 1 - NEW");
        } else {
            // If the pool exists and has liquidity, calculate poolShareTokens based on the proportion of deposit to total pool value
            console.log("PATH 2 - ESTABLISHED");
            poolShareTokenAmount =
                (_amount * lendingPools[_timestamp].poolShareToken.totalSupply()) /
                totalPoolValue;
            // Times 10 ** 12 to adjust the decimals of USDC 6 to 18 for the poolShareToken
        }
        console.log(poolShareTokenAmount);
        lendingPools[_timestamp].principal += _amount;
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
    ) public nonReentrant {
        console.log("running withdraw");
        LendingPool memory lendingPool = lendingPools[_timestamp];
        require(lendingPool.finalized, "Pool must be finalized before withdraw");
        require(
            _poolShareTokenAmount > 0,
            "Withdrawal amount must be greater than 0"
        );
        require(
            lendingPool.poolShareToken.balanceOf(msg.sender) >= _poolShareTokenAmount,
            "Insufficient pool share tokens for withdrawal"
        );

        console.log(_poolShareTokenAmount);
        console.log(lendingPool.poolShareToken.totalSupply());
        console.log(lendingPool.principal);
        console.log(lendingPool.accumInterest);
        console.log(lendingPool.accumYield);
        // Calculate the proportion of the pool that the user is withdrawing (use 8 decimals)
        uint256 withdrawalProportion = _poolShareTokenAmount * 10 ** 8 /
            lendingPool.poolShareToken.totalSupply();
        console.log(withdrawalProportion);

        // Calculate the corresponding USDC amount to withdraw
        uint256 usdcPrincipalAmount = withdrawalProportion * lendingPool.principal / 10 ** 8;
        uint256 usdcInterestAmount = withdrawalProportion * lendingPool.accumInterest / 10 ** 8;

        // Calculate the corresponding aETH interest to withdraw
        uint256 aethWithdrawalAmount = withdrawalProportion * lendingPool.accumYield / 10 ** 8;

        // Burn the pool share tokens
        lendingPool.poolShareToken.burn(msg.sender, _poolShareTokenAmount);

        // Update the total liquidity in the pool
        lendingPool.principal -= usdcPrincipalAmount;
        lendingPool.accumInterest -= usdcInterestAmount;

        // Transfer USDC and aETH to the user
        usdc.transfer(msg.sender, usdcInterestAmount + usdcPrincipalAmount);
        wrappedTokenGateway.withdrawETH(address(0), aethWithdrawalAmount, msg.sender);
        emit Withdraw(msg.sender, address(lendingPool.poolShareToken), _poolShareTokenAmount, aethWithdrawalAmount, usdcPrincipalAmount, usdcInterestAmount);
//        event Withdraw(address poolShareTokenAddress, uint tokenAmount, uint ethAmount, uint usdcAmount);
    }

    function takeLoan(
        uint256 _principal, // Amount of USDC with 6 decimal places
        uint256 _collateral, // Amount of ETH collateral with 18 decimal places
        uint32 _ltv,
        uint40 _timestamp
    ) public payable nonReentrant {
        console.log("running takeLoan");
        // Check that the sender has enough balance to send the amount
        require(msg.value == _collateral, "Wrong amount of Ether provided.");

        // Ensure that it is a valid pool
        require(validPool(_timestamp), "Invalid pool");

//        uint a = _amount * 10 ** (18 + 8 - 6 + 2);
//        uint b = getEthPrice() * _collateral;
//
//        console.log(a);
//        console.log(b);

        // Ensure that the calculated ltv of the loan is less than or equal to the specified ltv
        // ethPrice 8 decimals
        // _collateral 18 decimals
        // _amount 6 decimals
//        uint ltvCalc = (_principal * 10 ** (18 + 8 - 6 + 2)) / (getEthPrice() * _collateral);
        require(
            (_principal * 10 ** (18 + 8 - 6 + 2)) / (getEthPrice() * _collateral) <= _ltv, // ltvCalc
            "Insufficient collateral provided for specified ltv"
        );

        // Ensure the ltv is valid and calculate the apy
        uint32 apy = getAPYBasedOnLTV(_ltv);

        // Check if the loan amount is less than or equal to the liquidity across pools
        uint totalAvailableLiquidity = getAvailableForPeriod(_timestamp);

//        console.log("---");
//        console.log(_amount);
//        console.log(totalAvailableLiquidity);


        require(
            _principal <= totalAvailableLiquidity,
            "Insufficient liquidity across pools"
        );

        // Reject if a loan already exists in this slot
//        require(
//            borrowingPools[_timestamp].loans[msg.sender].principal == 0,
//            "Loan already exists in this slot"
//        );
        uint aethGlobalBalance = aeth.balanceOf(address(this));

        wrappedTokenGateway.depositETH{value: _collateral}(
            0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2,  // This is the address of the Aave-v3 pool - it is not used
            address(this),
            0
        );

        // Create loan
//        Loan storage loan = borrowingPools[_timestamp].loans[msg.sender];
//        loan.principal = _principal;
//        loan.collateral = _collateral;
//        loan.LTV = _ltv;
//        loan.APY = apy;

        uint totalLiquidity = getTotalLiquidity(_timestamp);

//        console.log(totalLiquidity);

        // Loop through the active pools and determine the contribution of each
//        for (uint i = 0; i < activePools.length; i++) {
//            if (activePools[i] < _timestamp) {
//                continue; // Don't count liquidity that is in a pool that has a timestamp before what it requested
//            }
//            if (pools[activePools[i]].totalLiquidity <= 0) {
//                continue; // Skip if the pool has no liquidity
//            }
//            PoolContribution memory contribution;
//            contribution.poolTimestamp = activePools[i];
//            // liquidityContribution has 8 decimals
//            // console.log(pools[activePools[i]].totalLiquidity);
//            // console.log(totalLiquidity);
//            contribution.liquidityContribution =
//                (pools[activePools[i]].totalLiquidity * 10 ** 8) /
//                totalLiquidity;
//            // console.log(contribution.liquidityContribution);
//            loan.contributingPools.push(contribution);
//        }


        // Update totalLoans mapping
        // Replaced with borrowingPools
//        totalLoans[_timestamp] += _amount;

        // Transfer the loan amount in USDC to the borrower
        usdc.transfer(msg.sender, _principal);

        BorrowData memory bd;
        bd.endDate = _timestamp;
        bd.principal = _principal;
        bd.collateral = _collateral;
        bd.apy = apy;
        uint tokenId = bpt.mint(msg.sender, bd);
        console.log("bpt minted");
        console.log(tokenId);

        // Update borrowingPools
        borrowingPools[_timestamp].principal += _principal;
        borrowingPools[_timestamp].collateral += _collateral;
        uint deltaBpPoolShares;



        if (aEthSnapshotBalance == 0) {
            deltaBpPoolShares = _collateral;
        } else {
            deltaBpPoolShares = _collateral * bpTotalPoolShares / aEthSnapshotBalance;
        }

        console.log("calcparams");
        console.log(_collateral);
        console.log(bpTotalPoolShares);
        console.log(aEthSnapshotBalance);
        console.log(deltaBpPoolShares);

        borrowingPools[_timestamp].poolShareAmount += deltaBpPoolShares;
        bpTotalPoolShares += deltaBpPoolShares;

        newCollateralSinceSnapshot += _collateral;  // Keep track of the collateral since the last snapshot

//        console.log("-------");
//        console.log(tokenId);
//        console.log(_timestamp);
//        console.log(msg.sender);
//        console.log(_collateral);
//        console.log(_amount);
//        console.log(loan.APY);
//        console.log("-------");
        emit NewLoan(tokenId, _timestamp, msg.sender, _collateral, _principal, apy);

    }

    function partialRepayLoan(uint256 tokenId, uint256 repaymentAmount) external {
        // Check that msg.sender owns the DPT
//        require(bpt.ownerOf(tokenId) == msg.sender, "msg.sender does not own specified BPT");
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

        BorrowingPool storage borrowingPool = borrowingPools[bpt.getEndDate(tokenId)];
        borrowingPool.principal -= principalReduction;

        emit PartialRepayLoan(tokenId, repaymentAmount, principalReduction);
    }

    function repayLoan(
        uint tokenId,
        address beneficiary
    ) external {
        // Check that msg.sender owns the bpt
        // Determine the principal, interest, and collateral of the debt
        BorrowData memory bd = bpt.getLoan(tokenId);
//        bd.endDate = _timestamp;
//        bd.principal = _principal;
//        bd.collateral = _collateral;
//        bd.apy = apy;
        uint interest = bpt.getInterest(tokenId);
        // Ensure that msg.sender has sufficient USDC
        require(usdc.balanceOf(msg.sender) >= bd.principal + interest);
        // Ensure that msg.sender has approved sufficient USDC - ERC20 contract can handle this
        // Transfer funds to Shrub
        usdc.transferFrom(
            msg.sender,
            address(this),
            bd.principal + interest
        );
        // Burn the BPT - NOTE: it must be also removed from tokensByTimestamp - This is done in other contract
        bpt.burn(tokenId);
        // Update Borrowing Pool principal, collateral
        borrowingPools[bd.endDate].principal -= bd.principal;
        borrowingPools[bd.endDate].collateral -= bd.collateral;
        // Update Borrowing Pool poolShareAmount
        console.log('aEthSnapshotBalance');
        console.log(aEthSnapshotBalance);
        uint deltaBpPoolShares = bd.collateral * bpTotalPoolShares / aEthSnapshotBalance;
        borrowingPools[bd.endDate].poolShareAmount -= deltaBpPoolShares;
        // Update bpTotalPoolShares
        bpTotalPoolShares -= deltaBpPoolShares;
        // Convert collateral amount of aETH to ETH and Transfer ETH to the beneficiary
        wrappedTokenGateway.withdrawETH(address(0), bd.collateral, beneficiary);
        claimedCollateralSinceSnapshot += bd.collateral;
        // Emit event for tracking/analytics/subgraph
        emit RepayLoan(tokenId, bd.principal + interest, bd.collateral, beneficiary);
    }

    /*
    // No need to specify amount - the full amount will be transferred needed to repay the loan
    function repayLoan(
        uint tokenId, // tokenId of the ERC-721 DPT
        address beneficiary  // Address of the recipient of the collateral
    ) external {
        // Check that msg.sender owns the DPT
        require(bpt.ownerOf(tokenId) == msg.sender, "msg.sender does not own specified BPT");
        // Check that the user has sufficient funds
        uint debt = bpt.debt(tokenId);
        require(usdc.balanceOf(msg.sender) >= debt, "insufficient balance");
        // Check that funds are approved
        // NOTE: let the ERC-20 contract handle this
        // Transfer USDC funds to Shrub
        usdc.transferFrom(
            msg.sender,
            address(this),
            debt
        );
        uint collateral = bpt.getCollateral(tokenId);
        // Update BP Collateral and loans
        BorrowingPool storage borrowingPool = borrowingPools[bpt.getEndDate(tokenId)];
        borrowingPool.principal -= debt;
        borrowingPool.collateral -= collateral;
//        borrowingPool.poolShareAmount
        // Update BP pool share amount (aETH)
        // Burn the BPT ERC-721
        bpt.burn(tokenId);
        // Redeem aETH on Aave for ETH on behalf of onBehalfOf (redeemer)
        wrappedTokenGateway.withdrawETH(address(0), collateral, beneficiary);
        // Emit event for tracking/analytics/subgraph
        emit RepayLoan(tokenId, debt, collateral, beneficiary);
    }
    */

    function takeSnapshot() public onlyOwner {
        console.log("running takeSnapshot");
//        Get the current balance of bpTotalPoolShares (it is local)
        // calculate the accumYield for all BP (current balance - snapshot balance)
        console.log(aeth.balanceOf(address(this)));
        console.log(aEthSnapshotBalance);
        console.log("---");
        uint aEthYieldSinceLastSnapshot = aeth.balanceOf(address(this)) + claimedCollateralSinceSnapshot - newCollateralSinceSnapshot - aEthSnapshotBalance;
//        Calculate accumInterest for all BP
        for (uint i = 0; i < activePools.length; i++) {
            // Cleanup paid off BPTs
            bpt.cleanUpByTimestamp(uint40(activePools[i]));
//            Find the BPTs related to these timestamps
//            bptsForPool is an array of tokenIds
            uint[] memory bptsForPool = bpt.getTokensByTimestamp(uint40(activePools[i]));
            uint accumInterestBP = 0;
//            # Loop through the BPTs in order to calculate their accumInterest
            for (uint j = 0; j < bptsForPool.length; j++) {
                accumInterestBP +=  bpt.interestSinceTimestamp(j, lastSnapshotDate);
            }
            // Determine the amount of aETH to distribute from this borrowing pool
            if (borrowingPools[activePools[i]].poolShareAmount == 0) {
                console.log("poolShareAmount in borrowing pool is 0 - skipping - %s", activePools[i]);
//                console.log("poolShareAmount in borrowing pool 0 - skipping");
                continue;
            }
            console.log("bpTotalPoolShares");
            console.log(bpTotalPoolShares);
            console.log(borrowingPools[activePools[i]].poolShareAmount);
            uint aEthYieldDistribution = aEthYieldSinceLastSnapshot * borrowingPools[activePools[i]].poolShareAmount / bpTotalPoolShares;
            // Loop through this and future Lending Pools to determine the contribution denominator
            uint contributionDenominator;
            for (uint j = i; j < activePools.length; j++) {
                contributionDenominator += lendingPools[activePools[j]].principal;
            }
            console.log("contributionDenominator");
            console.log(contributionDenominator);
            // distribute accumInterest and accumYield to LPs based on contribution principal
            for (uint j = i; j < activePools.length; j++) {
                lendingPools[activePools[j]].accumYield += aEthYieldDistribution * lendingPools[activePools[j]].principal / contributionDenominator;
                lendingPools[activePools[j]].accumInterest += accumInterestBP * lendingPools[activePools[j]].principal / contributionDenominator;
                emit LendingPoolYield(
                    address(lendingPools[activePools[j]].poolShareToken),
                    lendingPools[activePools[j]].accumInterest,
                    lendingPools[activePools[j]].accumYield
                );
            }

        }
        console.log("i for loop concluded");
        // set the last snapshot date to now
        lastSnapshotDate = block.timestamp;
        aEthSnapshotBalance = aeth.balanceOf(address(this));

        // zero out the tracking globals;
        newCollateralSinceSnapshot = 0;
        claimedCollateralSinceSnapshot = 0;
    }

    function setShrubTreasury(address _address) public onlyOwner {
        shrubTreasury = _address;
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
