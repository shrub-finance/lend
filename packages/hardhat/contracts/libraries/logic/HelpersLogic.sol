// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

library HelpersLogic {
    function getAPYBasedOnLTV(uint32 _ltv) public pure returns (uint32) {
        if (_ltv == 20) {
            return 0;
        } else if (_ltv == 25) {
            return 1 * 10 ** 6;
        } else if (_ltv == 33) {
            return 5 * 10 ** 6;
        } else if (_ltv == 50) {
            return 8 * 10 ** 6;
        } else {
            revert("Invalid LTV");
        }
    }
}
