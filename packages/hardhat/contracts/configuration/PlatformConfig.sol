// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";
import {Constants} from '../libraries/configuration/Constants.sol';
import {DataTypes} from '../libraries/data-structures/DataTypes.sol';

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

    



contract PlatformConfig is Ownable {
    DataTypes.PlatformConfiguration public config;
    constructor() {
        config.REVERSE_SORTED_VALID_LTV = [5000, 3300, 2500, 2000, 0];
        config.LTV_TO_APY[8000] = DataTypes.InterestValue({apy: 800, isValid: false});  // This is for the sake of the MAX_LTV_FOR_EXTEND
        config.LTV_TO_APY[5000] = DataTypes.InterestValue({apy: 800, isValid: true});
        config.LTV_TO_APY[3300] = DataTypes.InterestValue({apy: 500, isValid: true});
        config.LTV_TO_APY[2500] = DataTypes.InterestValue({apy: 100, isValid: true});
        config.LTV_TO_APY[2000] = DataTypes.InterestValue({apy: 0, isValid: true});
        config.MAX_LTV_FOR_EXTEND = 8000;
        config.LIQUIDATION_THRESHOLD = 8500;
        config.LIQUIDATION_BONUS = 1000;
        config.EARLY_REPAYMENT_THRESHOLD = Constants.DAY * 30;
        config.EARLY_REPAYMENT_APY = 500;
        config.SHRUB_INTEREST_FEE = 10;
        config.SHRUB_YIELD_FEE = 10;
        config.DEPOSIT_CUTOFF_THRESHOLD = Constants.DAY;
        config.END_OF_LOAN_PHASES[0] = DataTypes.EndOfLoanParams({bonus: 100, liquidationEligible: false, shrubLiquidationEligible: false, duration: 0});
        config.END_OF_LOAN_PHASES[1] = DataTypes.EndOfLoanParams({bonus: 200, liquidationEligible: false, shrubLiquidationEligible: false, duration: 45 * Constants.MINUTE});
        config.END_OF_LOAN_PHASES[2] = DataTypes.EndOfLoanParams({bonus: 300, liquidationEligible: false, shrubLiquidationEligible: false, duration: 1 * Constants.HOUR + 30 * Constants.MINUTE});
        config.END_OF_LOAN_PHASES[3] = DataTypes.EndOfLoanParams({bonus: 400, liquidationEligible: true, shrubLiquidationEligible: false, duration: 2 * Constants.HOUR + 15 * Constants.MINUTE});
        config.END_OF_LOAN_PHASES[4] = DataTypes.EndOfLoanParams({bonus: 500, liquidationEligible: true, shrubLiquidationEligible: false, duration: 3 * Constants.HOUR});
        config.END_OF_LOAN_PHASES[5] = DataTypes.EndOfLoanParams({bonus: 600, liquidationEligible: true, shrubLiquidationEligible: false, duration: 4 * Constants.HOUR});
        config.END_OF_LOAN_PHASES[6] = DataTypes.EndOfLoanParams({bonus: 600, liquidationEligible: true, shrubLiquidationEligible: true, duration: 5 * Constants.HOUR});

        // TODO: emit some events that push configuration to subgraph
    }

}
