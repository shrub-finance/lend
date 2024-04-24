// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Constants} from './Constants.sol';

library Configuration {
    // Times after the endDate of a borrow that the following actions are available
    uint public constant FORCED_EXTENSION_1 = 0;
    uint public constant FORCED_EXTENSION_2 = 45 * Constants.MINUTE;
    uint public constant FORCED_EXTENSION_3 = 1 * Constants.HOUR + 30 * Constants.MINUTE;
    uint public constant FORCED_LIQUIDATION_4 = 2 * Constants.HOUR + 15 * Constants.MINUTE;
    uint public constant FORCED_LIQUIDATION_5 = 3 * Constants.HOUR;
    uint public constant FORCED_LIQUIDATION_6 = 4 * Constants.HOUR;
    uint public constant SHRUB_LIQUIDATION = 5 * Constants.HOUR;
}
