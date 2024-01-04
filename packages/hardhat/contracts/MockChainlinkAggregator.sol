// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@chainlink/contracts/src/v0.8/tests/MockV3Aggregator.sol";

contract MockChainlinkAggregator is MockV3Aggregator {
    uint8 _decimals = 8;
    constructor(int256 _initialAnswer) MockV3Aggregator(_decimals, _initialAnswer) {}
}
