// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "./PoolShareToken.sol";
import "./BorrowPositionToken.sol";
import "./MockAaveV3.sol";
import "./AETH.sol";

import "hardhat/console.sol";

contract LendingPlatform is Ownable, ReentrancyGuard {
    // using SafeERC20 for IERC20;
    using Strings for uint256;

    struct Pool {
        uint256 totalLiquidity;
        uint256 aaveInterestSnapshot;
        PoolShareToken poolShareToken;
        mapping(address => Loan) loans;
        mapping(address => uint256) deposits;
    }

    struct PoolDetails {
        uint256 totalLiquidity;
        uint256 aaveInterestSnapshot;
        address poolShareTokenAddress;
        uint256 totalLoans;
    }

    struct Loan {
        uint amount; // The loan amount
        uint collateral; // The collateral for the loan, presumably in ETH
        uint aaveCollateral; // The equivalent amount of aETH (Aave's interest-bearing token for ETH)
        uint32 LTV; // The Loan-to-Value ratio
        uint32 APY; // The Annual Percentage Yield
        PoolContribution[] contributingPools; // Array of PoolContributions representing each contributing pool and its liquidity contribution.
    }

    struct BorrowingPool {
        uint loans; // Total amount of USDC that has been borrowed in this buckets' loans
        uint collateral; // The total amount of ETH collateral deposited for loans in this bucket
        uint poolShareAmount; // Relative claim of the total platform aETH for this bucket. Used to calculate yield for lending pools
    }

    struct PoolContribution {
        uint poolTimestamp; // The pools timestamp.
        uint liquidityContribution; // The liquidity contribution from the pool at the time of the loan. Integer value as a proportion of 10 ** 8
    }

    mapping(uint256 => Pool) public pools; // where the uint256 key is a timestamp

    // TODO: This mapping should be superceded with borrowingPools
//    mapping(uint256 => uint256) public totalLoans; // mapping of totalLoans for each duration based on the timestamp - it only counts if a loan is specifically for that timestamp
    mapping(uint256 => BorrowingPool) public borrowingPools; // mapping of timestamp of loan endDate => BorrowingPool

    mapping(uint256 => uint256) public activePoolIndex; // mapping of timestamp => index of activePools

    uint256[] public activePools; // List of active pools

    event PoolCreated(uint256 timestamp, address poolShareTokenAddress);
    event NewDeposit(uint256 timestamp, address depositor, uint256 amount);
    event NewLoan(uint tokenId, uint timestamp, address borrower, uint256 collateral, uint256 amount, uint256 apy);
    event PartialRepayLoan(uint tokenId, uint repaymentAmount);
    event RepayLoan(uint tokenId, uint repaymentAmount, uint collateralReturned, address beneficiary);

    // Interfaces for USDC and aETH
    IERC20 public usdc;
    IBorrowPositionToken public bpt;
    IAETH public aeth;
    IMockAaveV3 public wrappedTokenGateway;

    uint private bpTotalPoolShares;

    // ETH price with 8 decimal places
    uint public ethPrice = 2000 * 10 ** 8;

    constructor(
        address usdcAddress,
        address bptAddress,
        address wrappedTokenGatewayAddress,
        address aETHAddress
    ) {
        usdc = IERC20(usdcAddress);
        bpt = IBorrowPositionToken(bptAddress);
        wrappedTokenGateway = IMockAaveV3(wrappedTokenGatewayAddress);
        aeth = IAETH(aETHAddress);
    }

    function insertIntoSortedArr(uint[] storage arr, uint newValue) internal {
        if (arr.length == 0) {
            arr.push(newValue);
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
        for(uint i = arr.length - 2; i > 0; i++) {
            if (arr[i - 1] < newValue) {
                arr[i] = newValue;
                indexActivePools(arr);
                return;
            }
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
//        return 2000 * 10 ** 8;
        // 8 decimals ($1852.11030001)
        return 185211030001;
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
        uint valueOfEthRequied = usdcLoanValue * 10 ** 22 / ltv; // time 10 ** 2 to convert to percentage and 10 ** 12 to convert to 8 decimals
        return valueOfEthRequied / getEthPrice();
    }

    // Get the latest USD price of aETH
    // TODO: Hook this up with chainlink
    // There are 8 decimal places
    function getLatestAethPrice() internal view returns (uint256) {
        return 2000 * 10 ** 8;
    }

    // Get earned interest from aETH
    // TODO: Hook this up with Aave v3 API
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
            if (pools[activePools[i]].totalLiquidity >= (deficit + borrowingPools[activePools[i]].loans)) {
                deficit = 0;
            } else {
                // Important to do the addition first to prevent an underflow
//                deficit = (deficit + totalLoans[activePools[i]] - pools[activePools[i]].totalLiquidity);
                deficit = (deficit + borrowingPools[activePools[i]].loans - pools[activePools[i]].totalLiquidity);
            }
            console.log(string(abi.encodePacked("deficit - ", deficit.toString())));
        }
    }

    function getAvailableForPeriod(uint _timestamp) public validTimestamp(_timestamp) view returns (uint avail) {
        console.log("Running getAvailableForPeriod");
        uint currentAndFutureLiquidity = 0;
        uint currentAndFutureLoans = 0;
        for (uint i = activePoolIndex[_timestamp]; i < activePools.length; i++) {
            currentAndFutureLiquidity += pools[activePools[i]].totalLiquidity;
//            currentAndFutureLoans += totalLoans[activePools[i]];
            currentAndFutureLoans += borrowingPools[activePools[i]].loans;
            console.log(string(abi.encodePacked("currentAndFutureLiquidity - ", currentAndFutureLiquidity.toString())));
            console.log(string(abi.encodePacked("currentAndFutureLoans - ", currentAndFutureLoans.toString())));
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
            totalLiquidity += pools[activePools[i]].totalLiquidity;
        }
        return totalLiquidity;
    }

    function getPool(
        uint256 _timestamp
    ) public view returns (PoolDetails memory) {
        Pool storage pool = pools[_timestamp];
        PoolDetails memory poolDetails;

        poolDetails.totalLiquidity = pool.totalLiquidity;
        poolDetails.aaveInterestSnapshot = pool.aaveInterestSnapshot;
        poolDetails.poolShareTokenAddress = address(pool.poolShareToken);
//        poolDetails.totalLoans = totalLoans[_timestamp];
        poolDetails.totalLoans = borrowingPools[_timestamp].loans;

        return poolDetails;
    }

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
        if (pools[_timestamp].poolShareToken == PoolShareToken(address(0))) {
            return false;
        }
        if (_timestamp < block.timestamp) {
            return false;
        }
        return true;
    }

    function getLoan(
        address borrower,
        uint256 timestamp
    ) public view returns (Loan memory) {
        return pools[timestamp].loans[borrower];
    }

    function createPool(uint256 _timestamp) public onlyOwner {
        require(
            pools[_timestamp].poolShareToken == PoolShareToken(address(0)),
            "Pool already exists"
        );
        // console.log(_timestamp);
        // console.log(block.timestamp);
        require(
            _timestamp > block.timestamp,
            "_timestamp must be in the future"
        );
        pools[_timestamp].poolShareToken = new PoolShareToken(
            string(abi.encodePacked("PoolShareToken_", _timestamp.toString())),
            string(abi.encodePacked("PST_", _timestamp.toString()))
        );
        // Make sure to keep the pool sorted
        insertIntoSortedArr(activePools, _timestamp);
        emit PoolCreated(_timestamp, address(pools[_timestamp].poolShareToken));
    }

    function getUsdcAddress() public view returns (address) {
        return address(usdc);
    }

    function deposit(uint256 _timestamp, uint256 _amount) public nonReentrant {
        require(_amount > 0, "Deposit amount must be greater than 0");
        require(
            pools[_timestamp].poolShareToken != PoolShareToken(address(0)),
            "Pool does not exist"
        );

        // Transfer USDC from sender to this contract
        usdc.transferFrom(msg.sender, address(this), _amount);

        uint256 poolShareTokenAmount;

        // Calculate total value of the pool in terms of USDC
        uint256 aethInterest = getAethInterest();
        uint256 aethInterestValueInUsdc = aethInterest * getLatestAethPrice();
        uint256 totalPoolValue = pools[_timestamp].totalLiquidity +
            aethInterestValueInUsdc;

        // If the pool does not exist or totalLiquidity is 0, user gets 1:1 poolShareTokens
        if (totalPoolValue == 0) {
            poolShareTokenAmount = _amount;
        } else {
            // If the pool exists and has liquidity, calculate poolShareTokens based on the proportion of deposit to total pool value
            poolShareTokenAmount =
                (_amount * pools[_timestamp].poolShareToken.totalSupply()) /
                totalPoolValue;
        }
        pools[_timestamp].totalLiquidity += _amount;
        pools[_timestamp].deposits[msg.sender] += _amount;
        pools[_timestamp].poolShareToken.mint(msg.sender, poolShareTokenAmount);
        emit NewDeposit(
            _timestamp,
            _msgSender(),
            _amount
        );
    }

    function withdraw(
        uint256 _timestamp,
        uint256 _poolShareTokenAmount
    ) public nonReentrant {
        Pool storage pool = pools[_timestamp];
        require(
            _poolShareTokenAmount > 0,
            "Withdrawal amount must be greater than 0"
        );
        require(
            pool.poolShareToken.balanceOf(msg.sender) >= _poolShareTokenAmount,
            "Insufficient pool share tokens for withdrawal"
        );

        // Calculate the proportion of the pool that the user is withdrawing
        uint256 withdrawalProportion = _poolShareTokenAmount /
            pool.poolShareToken.totalSupply();

        // Calculate the corresponding USDC amount to withdraw
        uint256 usdcWithdrawalAmount = withdrawalProportion *
            pool.totalLiquidity;
        require(
            usdcWithdrawalAmount <= pool.totalLiquidity,
            "Not enough liquidity in the pool for withdrawal"
        );

        // Calculate the corresponding aETH interest to withdraw
        uint256 aethInterest = getAethInterest();
        uint256 aethWithdrawalAmount = withdrawalProportion * aethInterest;

        // Burn the pool share tokens
        pool.poolShareToken.burn(msg.sender, _poolShareTokenAmount);

        // Update the total liquidity in the pool
        pool.totalLiquidity -= usdcWithdrawalAmount;

        // Transfer USDC and aETH to the user
        usdc.transfer(msg.sender, usdcWithdrawalAmount);
        aeth.transfer(msg.sender, aethWithdrawalAmount);
    }

    function takeLoan(
        uint256 _amount, // Amount of USDC with 6 decimal places
        uint256 _collateral, // Amount of ETH collateral with 18 decimal places
        uint32 _ltv,
        uint40 _timestamp
    ) public payable nonReentrant {
        console.log("running takeLoan");
        // Check that the sender has enough balance to send the amount
        require(msg.value == _collateral, "Wrong amount of Ether provided.");

        // Ensure that it is a valid pool
        require(validPool(_timestamp), "Not a valid pool");

//        uint a = _amount * 10 ** (18 + 8 - 6 + 2);
//        uint b = getEthPrice() * _collateral;
//
//        console.log(a);
//        console.log(b);

        // Ensure that the calculated ltv of the loan is less than or equal to the specified ltv
        // ethPrice 8 decimals
        // _collateral 18 decimals
        // _amount 6 decimals
        uint ltvCalc = (_amount * 10 ** (18 + 8 - 6 + 2)) /
            (getEthPrice() * _collateral);
        require(
            ltvCalc <= _ltv,
            "Insufficient collateral provided for specified ltv"
        );

        // Check if the loan amount is less than or equal to the liquidity across pools
        uint totalAvailableLiquidity = getAvailableForPeriod(_timestamp);

        console.log("---");
        console.log(_amount);
        console.log(totalAvailableLiquidity);


        require(
            _amount <= totalAvailableLiquidity,
            "Insufficient liquidity across pools"
        );

        // Reject if a loan already exists in this slot
        require(
            pools[_timestamp].loans[msg.sender].amount == 0,
            "Loan already exists in this slot"
        );

        wrappedTokenGateway.depositETH{value: _collateral}(
            0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2,  // This is the address of the Aave-v3 pool - it is not used
            address(this),
            0
        );


        // Create loan
        Loan storage loan = pools[_timestamp].loans[msg.sender];
        loan.amount = _amount;
        loan.collateral = _collateral;
        loan.aaveCollateral = 0;
        loan.LTV = _ltv;
        loan.APY = getAPYBasedOnLTV(_ltv);

        uint totalLiquidity = getTotalLiquidity(_timestamp);

        console.log(totalLiquidity);

        // Loop through the active pools and determine the contribution of each
        for (uint i = 0; i < activePools.length; i++) {
            if (activePools[i] < _timestamp) {
                continue; // Don't count liquidity that is in a pool that has a timestamp before what it requested
            }
            if (pools[activePools[i]].totalLiquidity <= 0) {
                continue; // Skip if the pool has no liquidity
            }
            PoolContribution memory contribution;
            contribution.poolTimestamp = activePools[i];
            // liquidityContribution has 8 decimals
            // console.log(pools[activePools[i]].totalLiquidity);
            // console.log(totalLiquidity);
            contribution.liquidityContribution =
                (pools[activePools[i]].totalLiquidity * 10 ** 8) /
                totalLiquidity;
            // console.log(contribution.liquidityContribution);
            loan.contributingPools.push(contribution);
        }

        // Update borrowingPools
        borrowingPools[_timestamp].loans += _amount;

        // Update totalLoans mapping
        // Replaced with borrowingPools
//        totalLoans[_timestamp] += _amount;

        // Transfer the loan amount in USDC to the borrower
        usdc.transfer(msg.sender, _amount);

        BorrowData memory bd;
        bd.endDate = _timestamp;
        bd.initialPrincipal = _amount;
        bd.snapshotDebt = _amount;
        bd.collateral = _collateral;
        bd.apy = getAPYBasedOnLTV(_ltv);
        uint tokenId = bpt.mint(msg.sender, bd);

        console.log("-------");
        console.log(tokenId);
        console.log(_timestamp);
        console.log(msg.sender);
        console.log(_collateral);
        console.log(_amount);
        console.log(loan.APY);
        console.log("-------");
        emit NewLoan(tokenId, _timestamp, msg.sender, _collateral, _amount, loan.APY);

    }

    function partialRepayLoan(uint256 tokenId, uint256 repaymentAmount) external {
        // Check that msg.sender owns the DPT
        require(bpt.ownerOf(tokenId) == msg.sender, "msg.sender does not own specified BPT");
        // Check that the user has sufficient funds
        require(usdc.balanceOf(msg.sender) >= repaymentAmount, "insufficient balance");
        // Check that the funds are less than the owed balance
        uint debt = bpt.debt(tokenId);
        require(repaymentAmount < debt, "repayment amount must be less than total debt");
        // Check that funds are approved
        // NOTE: We are letting the ERC-20 contract handle this
        // Transfer USDC funds to Shrub
        usdc.transferFrom(
            msg.sender,
            address(this),
            repaymentAmount
        );
        // Update BPT Collateral and loans
        bpt.updateSnapshot(tokenId, debt - repaymentAmount);
        // Update BP Collateral and loans
        borrowingPools[bpt.getEndDate(tokenId)].loans -= repaymentAmount;
        // Update BP pool share amount (aETH)
        // Emit event for tracking/analytics/subgraph
        emit PartialRepayLoan(tokenId, repaymentAmount);
    }

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
        BorrowingPool memory borrowingPool = borrowingPools[bpt.getEndDate(tokenId)];
        borrowingPool.loans -= debt;
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
        console.log(_timestamp);
        console.log(activePoolIndex[_timestamp]);
        console.log("activePools");
        console.log("---");
        for(uint i = 0; i < activePools.length; i++) {
            console.log(activePools[i]);
        }
        console.log("---");
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
