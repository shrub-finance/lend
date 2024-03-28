// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

library Constants {
    uint256 public constant SECONDS_IN_YEAR = 365 * 24 * 60 * 60;
    uint256 public constant APY_DECIMALS = 10 ** 8; // APY is represented with 6 decimals - this is 8 to account for adjustment of percentage to decimal (APY of 5% would be represented with 5000000)
    address public constant AAVE_AETH_POOL = 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2;
}
