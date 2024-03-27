// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@chainlink/contracts/src/v0.8/tests/MockV3Aggregator.sol";

contract MockChainlinkAggregator is MockV3Aggregator {
    string internal _description;

    constructor(uint8 _decimals, int256 _initialAnswer, string memory descriptionInit) MockV3Aggregator(_decimals, _initialAnswer) {
        _description = descriptionInit;
    }
//    function description() external view override returns (string memory) {
//        return _description;
//    }
}
