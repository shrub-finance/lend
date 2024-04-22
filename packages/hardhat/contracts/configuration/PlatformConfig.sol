// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";
import {Constants} from '../libraries/configuration/Constants.sol';

// LTV to APY mapping
// uint MAX_LTV_FOR_EXTEND = 8000;
// uint LIQUIDATION_THRESHOLD = 8500;
// Force extend timings and bonuses
// Liquidation timings and bonuses
// Safety factor liquidation threshold
// Safety factor liquidation bonus
// Creation of new pools?
// validateLtv
// validateExtendLtv
// shrubFee (profit sharing percentage)
// Cutoff date for new lending capital
//

struct EndOfLoanParams {
    uint16 bonus; // Percentage of borrow debt that liquidator gets to keep as a reward (out of the collateral) (percentage)
    uint40 duration; // Time after the endDate of the loan this phase becomes eligible
    bool liquidationEligible; // If liquidation is a option - if false, only ForceExtendBorrow may be called
}

struct PlatformConfiguration {
    // LTV to APY mapping
    uint16[5] REVERSE_SORTED_VALID_LTV; // ARRAY of valid LTV sorted in reverse order (percentage)
    uint16 MAX_LTV_FOR_EXTEND; // Highest possible LTV for ExtendBorrow or ForceExtendBorrow (percentage)
    uint16 LIQUIDATION_THRESHOLD; // LTV at which a borrow becomes eligible for liquidation (percentage)
    uint16 LIQUIDATION_BONUS; // Bonus for liquidator performing liquidation in terms of percentage of the debt for a borrow (percentage)
    EndOfLoanParams[7] END_OF_LOAN_PHASES;
    uint16 SHRUB_INTEREST_FEE;  // Percentage of interest paid by the borrower that is allocated to Shrub Treasury (percentage)
    uint16 SHRUB_YIELD_FEE;  // Percentage of yield earned on aETH collateral that is allocated to Shrub Treasury (percentage)
    uint40 DEPOSIT_CUTOFF_THRESHOLD;  // Deposits to a Lending Pool must be made at least this much time before the endDate (duration seconds)
}

contract PlatformConfig is Ownable {
    PlatformConfiguration public config;
    uint256 public shrubFee = 10;
    mapping(uint16 => uint16) public LTV_TO_APY; // LTV (percentage) => APY (percentage)
    constructor() {
        PlatformConfiguration memory tempConfig = PlatformConfiguration({
            MAX_LTV_FOR_EXTEND: 8000,
            LIQUIDATION_THRESHOLD: 8500,
            LIQUIDATION_BONUS: 1000,
            SHRUB_INTEREST_FEE : 10,
            SHRUB_YIELD_FEE : 10,
            DEPOSIT_CUTOFF_THRESHOLD : Constants.DAY,
            END_OF_LOAN_PHASES : [
                EndOfLoanParams({ bonus: 100, liquidationEligible: false, duration: 0 }),
                EndOfLoanParams({ bonus: 200, liquidationEligible: false, duration: 45 * Constants.MINUTE }),
                EndOfLoanParams({ bonus: 300, liquidationEligible: false, duration: 1 * Constants.HOUR + 30 * Constants.MINUTE }),
                EndOfLoanParams({ bonus: 400, liquidationEligible: true, duration: 2 * Constants.HOUR + 15 * Constants.MINUTE }),
                EndOfLoanParams({ bonus: 500, liquidationEligible: true, duration: 3 * Constants.HOUR }),
                EndOfLoanParams({ bonus: 600, liquidationEligible: true, duration: 4 * Constants.HOUR }),
                EndOfLoanParams({ bonus: 600, liquidationEligible: true, duration: 5 * Constants.HOUR })
            ]
        });
    }
//    uint public constant FORCED_EXTENSION_1 = 0;
//    uint public constant FORCED_EXTENSION_2 = 45 * Constants.MINUTE;
//    uint public constant FORCED_EXTENSION_3 = 1 * Constants.HOUR + 30 * Constants.MINUTE;
//    uint public constant FORCED_LIQUIDATION_4 = 2 * Constants.HOUR + 15 * Constants.MINUTE;
//    uint public constant FORCED_LIQUIDATION_5 = 3 * Constants.HOUR;
//    uint public constant FORCED_LIQUIDATION_6 = 4 * Constants.HOUR;
//    uint public constant SHRUB_LIQUIDATION = 5 * Constants.HOUR;

}
