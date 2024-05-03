// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {WadRayMath} from "@aave/core-v3/contracts/protocol/libraries/math/WadRayMath.sol";
import {Constants} from '../configuration/Constants.sol';

/**
 * @title Math library
 * @author Shrub Finance
 * @notice Provides functions to perform calculations with Wad and Ray units
 * @dev
 */
library ShrubLendMath {
    uint256 internal constant USDC_WAD_RATIO = 1e12;
    uint256 internal constant PERCENTAGE_WAD_RATIO = 1e14;

    /**
    * @dev Casts 6 decimals (6 decimals) up to Wad
    * @param a Amount of USDC with 6 decimals
    * @return b = a converted to Wad
    */
    function usdcToWad(uint256 a) internal pure returns (uint256 b) {
        // to avoid overflow, b/USDC_WAD_RATIO == a
        assembly {
            b := mul(a, USDC_WAD_RATIO)

            if iszero(eq(div(b, USDC_WAD_RATIO), a)) {
                revert(0, 0)
            }
        }
    }

   /**
   * @dev Casts wad down to 6 decimal (USDC)
   * @dev assembly optimized for improved gas savings, see https://twitter.com/transmissions11/status/1451131036377571328
   * @param a Wad
   * @return b = a converted to 6 decimals, rounded down
   */
    function wadToUsdc(uint256 a) internal pure returns (uint256 b) {
        assembly {
            b := div(a, USDC_WAD_RATIO)
        }
    }

    /**
   * @dev Casts wad down to a percentage (4 decimal)
   * @dev assembly optimized for improved gas savings, see https://twitter.com/transmissions11/status/1451131036377571328
   * @param a Wad
   * @return b = a converted to 4 decimals, rounded half up to the nearest unit
   */
    function wadToPercentage(uint256 a) internal pure returns (uint16 b) {
        assembly {
            b := div(a, PERCENTAGE_WAD_RATIO)
            let remainder := mod(a, PERCENTAGE_WAD_RATIO)
            if iszero(lt(remainder, div(PERCENTAGE_WAD_RATIO, 2))) {
                b := add(b, 1)
            }
        }
        b = uint16(b);
    }

    /**
    * @dev Converts a time duration (in seconds) to be expressed in Ray where 1 YEAR = 1 Ray
   * @param duration uint40 duration in seconds
   * @return b = duration converted to Ray
   */
    function durationToRay(uint40 duration) internal pure returns (uint256 b) {
//        uint numerator = WadRayMath.RAY * uint(duration);
//        unit denominator = WadRayMath.RAY * Constants.YEAR();
        b = WadRayMath.rayDiv(
            WadRayMath.RAY * uint(duration),
            WadRayMath.RAY * Constants.YEAR
        );
    }
}
