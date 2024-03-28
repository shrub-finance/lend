// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";

contract PlatformConfig is Ownable {
    uint256 public shrubFee = 10;
}
