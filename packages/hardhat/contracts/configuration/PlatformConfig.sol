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

    struct InterestValue {
        uint16 apy;
        bool isValid;
    }

    struct PlatformConfiguration {
        // LTV to APY mapping
        uint16[5] REVERSE_SORTED_VALID_LTV; // ARRAY of valid LTV sorted in reverse order (percentage)
        mapping(uint16 => InterestValue) LTV_TO_APY; // LTV (percentage) => InterestValue(apy (percentage), isValid (bool))
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
    constructor() {
        config.REVERSE_SORTED_VALID_LTV = [5000, 3300, 2500, 2000, 0];
        config.LTV_TO_APY[8000] = InterestValue({apy: 800, isValid: false});  // This is for the sake of the MAX_LTV_FOR_EXTEND
        config.LTV_TO_APY[5000] = InterestValue({apy: 800, isValid: true});
        config.LTV_TO_APY[3300] = InterestValue({apy: 500, isValid: true});
        config.LTV_TO_APY[2500] = InterestValue({apy: 100, isValid: true});
        config.LTV_TO_APY[2000] = InterestValue({apy: 0, isValid: true});
        config.MAX_LTV_FOR_EXTEND = 8000;
        config.LIQUIDATION_THRESHOLD = 8500;
        config.LIQUIDATION_BONUS = 1000;
        config.SHRUB_INTEREST_FEE = 10;
        config.SHRUB_YIELD_FEE = 10;
        config.DEPOSIT_CUTOFF_THRESHOLD = Constants.DAY;
        config.END_OF_LOAN_PHASES[0] = EndOfLoanParams({bonus: 100, liquidationEligible: false, duration: 0});
        config.END_OF_LOAN_PHASES[1] = EndOfLoanParams({bonus: 200, liquidationEligible: false, duration: 45 * Constants.MINUTE});
        config.END_OF_LOAN_PHASES[2] = EndOfLoanParams({bonus: 300, liquidationEligible: false, duration: 1 * Constants.HOUR + 30 * Constants.MINUTE});
        config.END_OF_LOAN_PHASES[3] = EndOfLoanParams({bonus: 400, liquidationEligible: true, duration: 2 * Constants.HOUR + 15 * Constants.MINUTE});
        config.END_OF_LOAN_PHASES[4] = EndOfLoanParams({bonus: 500, liquidationEligible: true, duration: 3 * Constants.HOUR});
        config.END_OF_LOAN_PHASES[5] = EndOfLoanParams({bonus: 600, liquidationEligible: true, duration: 4 * Constants.HOUR});
        config.END_OF_LOAN_PHASES[6] = EndOfLoanParams({bonus: 600, liquidationEligible: true, duration: 5 * Constants.HOUR});
    }

    function calculateSmallestValidLtv(uint16 ltv, bool isExtend) internal view returns (uint16) {

        uint16 smallestValid = 0; // Initialize to 0 or a suitable default value
        bool found = false;

        // Iterate through the array to find the smallest value >= value
        for (uint i = 0; i < config.REVERSE_SORTED_VALID_LTV.length; i++) {
            if (config.REVERSE_SORTED_VALID_LTV[i] >= ltv) {
                smallestValid = config.REVERSE_SORTED_VALID_LTV[i];
                found = true;
            } else {
                require(found || isExtend && ltv <= config.MAX_LTV_FOR_EXTEND, "Invalid ltv");
                if (found) {
                    return smallestValid;
                }
                return config.MAX_LTV_FOR_EXTEND;
            }
        }
    }
}
