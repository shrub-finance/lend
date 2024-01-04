// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

interface IMockChainlinkAggregator {
    function setLatestPrice(int256 _price) external;
    function latestRoundData() external view;
}

contract MockChainlinkAggregator is Ownable {
    int256 private price;

    constructor(int initialPrice) {
        price = initialPrice;
    }

    function setLatestPrice(int256 _price) onlyOwner public {
        price = _price;
    }

    function latestRoundData()
    public
    view
    returns (
        uint80 /* roundId */,
        int256 answer,
        uint256 /* startedAt */,
        uint256 /* updatedAt */,
        uint80 /* answeredInRound */
    )
    {
        return (0, price, 0, 0, 0);
    }
}
