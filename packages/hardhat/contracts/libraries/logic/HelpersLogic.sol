// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

library HelpersLogic {
/**
    * @notice Calculate APY from an LTV value
    * @dev
    * @param _ltv expressed as a percentage
    * @return apy interest for a borrow with a given ltv expressed as percentage
*/
    function getAPYBasedOnLTV(uint32 _ltv) public pure returns (uint32 apy) {
        if (_ltv == 2000) {
            apy = 0;
        } else if (_ltv == 2500) {
            apy = 0.01e4;
        } else if (_ltv == 3300) {
            apy = 0.05e4;
        } else if (_ltv == 5000) {
            apy = 0.08e4;
        } else if (_ltv == 8000) {
            apy = 0.08e4;
        }else {
            revert("getAPYBasedOnLTV - Invalid LTV");
        }
    }
}
