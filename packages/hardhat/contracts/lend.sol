// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "hardhat/console.sol";

// Assume an interface for aETH
interface IAave is IERC20 {
    function balanceOf(address account) external view returns (uint256);
}

contract PoolShareToken is ERC20, Ownable {
    using SafeERC20 for IERC20;

    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function mint(address account, uint256 _amount) public onlyOwner {
        _mint(account, _amount);
    }

    function burn(address account, uint256 _amount) public onlyOwner {
        _burn(account, _amount);
    }
}

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
        uint LTV; // The Loan-to-Value ratio
        uint APY; // The Annual Percentage Yield
        PoolContribution[] contributingPools; // Array of PoolContributions representing each contributing pool and its liquidity contribution.
    }

    struct PoolContribution {
        uint poolTimestamp; // The pools timestamp.
        uint liquidityContribution; // The liquidity contribution from the pool at the time of the loan. Integer value as a proportion of 10 ** 8
    }

    mapping(uint256 => Pool) public pools; // where the uint256 key is a timestamp
    mapping(uint256 => uint256) public totalLoans; // mapping of totalLoans for each duration based on the timestamp

    uint256[] public activePools; // List of active pools

    event poolCreated(uint256 timestamp, address poolShareTokenAddress);

    // Interfaces for USDC and aETH
    IERC20 public usdc;
    IAave public aeth;

    // ETH price with 8 decimal places
    uint public ethPrice = 2000 * 10 ** 8;

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
        uint maxLoan = valueOfEth * ltv / 10 ** 22; // remove 20 decimals to get back to 6 decimals of USDC
        return maxLoan;
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

    // Get the available liquidity for loans across all pools
//    function getTotalAvailableLiquidity(
//        uint _timestamp
//    ) public view returns (uint256 totalLiquidity) {
//        console.log("Running getTotalAvailableLiquidity");
//        for (uint i = 0; i < activePools.length; i++) {
//            if (activePools[i] < _timestamp) {
//                continue; // Don't count liquidity that is in a pool that has a timestamp before what it requested
//            }
//            console.log(pools[activePools[i]].totalLiquidity);
//            console.log(totalLoans[activePools[i]]);
//            totalLiquidity += (pools[activePools[i]].totalLiquidity -
//                totalLoans[activePools[i]]);
//        }
//        return totalLiquidity;
//    }

    function getTotalLiquidityConsumed(
        uint _timestamp
    ) public view returns (uint256 totalLiquidityConsumed) {
        console.log("Running getTotalLiquidityConsumed");
        for (uint i = 0; i < activePools.length; i++) {
            if (activePools[i] < _timestamp) {
                continue; // Don't count liquidity that is in a pool that has a timestamp before what it requested
            }
            console.log(totalLoans[activePools[i]]);
            totalLiquidityConsumed += totalLoans[activePools[i]];
        }
        return totalLiquidityConsumed;
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

    // TODO: hook up with AAve API to deposit ETH and receive aETH
    function convertEthToAeth(uint256 _amount) internal returns (uint256) {
        return 1;
    }

    function getPool(
        uint256 _timestamp
    ) public view returns (PoolDetails memory) {
        Pool storage pool = pools[_timestamp];
        PoolDetails memory poolDetails;

        poolDetails.totalLiquidity = pool.totalLiquidity;
        poolDetails.aaveInterestSnapshot = pool.aaveInterestSnapshot;
        poolDetails.poolShareTokenAddress = address(pool.poolShareToken);
        poolDetails.totalLoans = totalLoans[_timestamp];

        return poolDetails;
    }

    function getAPYBasedOnLTV(uint _ltv) public pure returns (uint) {
        if (_ltv == 20) {
            return 0;
        } else if (_ltv == 25) {
            return 1;
        } else if (_ltv == 33) {
            return 5;
        } else if (_ltv == 50) {
            return 8;
        } else {
            revert("Invalid LTV");
        }
    }

    constructor(address usdcAddress) {
        usdc = IERC20(usdcAddress);
    }

    function validPool(uint256 _timestamp) internal returns (bool) {
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
        activePools.push(_timestamp);
        emit poolCreated(_timestamp, address(pools[_timestamp].poolShareToken));
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
        uint256 _ltv,
        uint256 _timestamp
    ) public payable nonReentrant {
        console.log("running takeLoan");
        // Check that the sender has enough balance to send the amount
        require(msg.value == _collateral, "Wrong amount of Ether provided.");

        // Ensure that it is a valid pool
        require(validPool(_timestamp), "Not a valid pool");

        uint a = _amount * 10 ** (18 + 8 - 6 + 2);
        uint b = getEthPrice() * _collateral;

        console.log(a);
        console.log(b);

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
        uint256 totalAvailableLiquidity = getTotalLiquidity(_timestamp) - getTotalLiquidityConsumed(_timestamp);

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

        // Convert collateral to aETH
        uint256 aETHAmount = convertEthToAeth(_collateral);

        // Create loan
        Loan storage loan = pools[_timestamp].loans[msg.sender];
        loan.amount = _amount;
        loan.collateral = _collateral;
        loan.aaveCollateral = aETHAmount;
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

        // Update totalLoans mapping
        totalLoans[_timestamp] += _amount;

        // Transfer the loan amount in USDC to the borrower
        usdc.transfer(msg.sender, _amount);
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
        console.log(bytesToString(msg.data));
    }
}
