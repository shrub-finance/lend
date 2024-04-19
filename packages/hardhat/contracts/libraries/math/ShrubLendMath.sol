// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/**
 * @title Math library
 * @author Shrub Finance
 * @notice Provides functions to perform calculations with Wad and Ray units
 * @dev
 */
library ShrubLendMath {
    uint256 internal constant USDC_WAD_RATIO = 1e12;

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
   * @return b = a converted to 6 decimals, rounded half up to the nearest unit
   */
    function wadToUsdc(uint256 a) internal pure returns (uint256 b) {
        assembly {
            b := div(a, USDC_WAD_RATIO)
            let remainder := mod(a, USDC_WAD_RATIO)
            if iszero(lt(remainder, div(USDC_WAD_RATIO, 2))) {
                b := add(b, 1)
            }
        }
    }
}
