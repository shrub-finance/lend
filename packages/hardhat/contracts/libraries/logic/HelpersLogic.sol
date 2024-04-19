// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/utils/Strings.sol";

library HelpersLogic {

    using Strings for uint256;

/**
    * @notice Calculate APY from an LTV value
    * @dev
    * @param _ltv expressed as a percentage
    * @return apy interest for a loan with a given ltv expressed as percentage
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

/**
    * @notice Returns current block timestamp
    * @dev Returns the current block timestamp as a uint40 which is consistant with the typing of all timestamps in application
    * @return timestamp - current timestamp expressed as a uint40
*/
    function currentTimestamp() public view returns (uint40 timestamp) {
        timestamp = uint40(block.timestamp);
    }

    function timestampToString(uint40 timestamp) public view returns (string memory) {
        return uint256(timestamp).toString();
    }
}
