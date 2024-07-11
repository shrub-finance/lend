// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import {WadRayMath} from "@aave/core-v3/contracts/protocol/libraries/math/WadRayMath.sol";

library PriceFeedLogic {
/**
    * @notice Returns the USDC/ETH price as defined by chainlink
    * @dev Inverts the ETH/USDC returned from chainlink
    * @return USDC/ETH as a WAD
*/
    function getEthPriceSingleSource(AggregatorV3Interface ethUsdcPriceFeed) external view returns (uint256) {
        (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = ethUsdcPriceFeed.latestRoundData();
        require(answer > 0, "ETH Price out of range");
        // Cast answer to uint256
        uint256 answerWad = uint256(answer);
        // Invert the answer
        return WadRayMath.wadDiv(WadRayMath.WAD, answerWad);
    }

    function getEthPriceDoubleSource(AggregatorV3Interface usdEthPriceFeed, AggregatorV3Interface usdUsdcPriceFeed) external view returns (uint256) {
        ( , int256 usdEthPrice, , , ) = usdEthPriceFeed.latestRoundData();
        ( , int256 usdcUsdPrice, , , ) = usdUsdcPriceFeed.latestRoundData();

        // Both of these price feeds have 8 decimals

        require(usdEthPrice > 0 && usdcUsdPrice > 0, "ETH Price out of range");
        // Cast answer to uint256 and correct decimals
        uint256 usdEthPriceWad = uint256(usdEthPrice) * 1e10;
        uint256 usdcUsdPriceWad = uint256(usdcUsdPrice) * 1e10;
        // USD/ETH * USDC/USD  ==> USDC/ETH
        return WadRayMath.wadMul(usdEthPriceWad, usdcUsdPriceWad);
    }
}
