// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;


import {DataTypes} from '../data-structures/DataTypes.sol';
import {MethodParams} from '../data-structures/MethodParams.sol';

import {HelpersLogic} from "../view/HelpersLogic.sol";
import {ShrubView} from '../view/ShrubView.sol';

import {PercentageMath} from "@aave/core-v3/contracts/protocol/libraries/math/PercentageMath.sol";
import {WadRayMath} from "@aave/core-v3/contracts/protocol/libraries/math/WadRayMath.sol";
import {ShrubLendMath} from "../math/ShrubLendMath.sol";

// ERC-20 Interfaces
import "../../interfaces/IBorrowPositionToken.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../interfaces/IAETH.sol";

library LiquidationLogic {
/**
    * @notice Called by liquidator to force the liquidation of an expired borrow.
    * @dev Bonuses and durations for the liquidationPhase are specified in Configuration
    * @dev Liquidator repays loan and is compensated with an equivelant amount of collateral at a discount specified by the bonus in the liquidationPhase
    * @param tokenId uint256 - tokenId of the borrow position token representing the loan
    * @param liquidationPhase uint256 - liquidation phase. Must be between 3 and 5. Higher values have greater bonuses. increasing values become eligible as more time since the endDate elapses
*/
    function forceLiquidation(
        uint tokenId,
        uint liquidationPhase,
        uint ethPrice,
        IBorrowPositionToken bpt,
        IAETH aeth,
        IERC20 usdc,
        DataTypes.PlatformConfiguration storage config,
        DataTypes.LendState storage lendState
    ) internal {
        //console.log("Running forceLiquidation - tokenId: %s, liquidationPhase: %s", tokenId, liquidationPhase);
        DataTypes.BorrowData memory loanDetails = bpt.getBorrow(tokenId);
        uint debt = ShrubView.getBorrowDebt(tokenId, bpt, lendState);
        require(config.END_OF_LOAN_PHASES[liquidationPhase].liquidationEligible, "liquidation not allowed in this phase");
        uint availabilityTime = config.END_OF_LOAN_PHASES[liquidationPhase].duration;
        require(HelpersLogic.currentTimestamp() > loanDetails.endDate + availabilityTime ,"loan is not eligible for liquidation");
        uint bonusPecentage = config.END_OF_LOAN_PHASES[liquidationPhase].bonus;
        // The caller will be rewarded with some amount of the users' collateral. This will be based on the size of the debt to be refinanced
        uint bonusUsdc = PercentageMath.percentMul(
            debt,
            10000 + bonusPecentage
        );
        uint bonus = ShrubView.usdcToEth(bonusUsdc, ethPrice);

        // Liquidator repays loan with usdc amount equal to the debt
        usdc.transferFrom(msg.sender, address(this), debt);
        // BPT borrowData is updated so that:
        // - principal = 0
        // - collateral -= bonus
        bpt.fullLiquidateBorrowData(tokenId, bonus);
        // Liquidator is sent collateral that they bought : principle * ethPrice * (1 - bonus)
        aeth.transfer(msg.sender, bonus);
    }


/**
    * @notice Called by shrub to force the liquidation of an expired borrow - when no other liquidator stepped in.
    * @dev setup so that it can be called by chainlink automation
    * @dev shrub repays loan and is compensated with an equivelant amount of collateral at a discount specified by the bonus in the liquidationPhase
*/
    function shrubLiquidation(
        MethodParams.shrubLiquidationParams memory params,
        DataTypes.PlatformConfiguration storage config,
        DataTypes.LendState storage lendState
    ) external {
        DataTypes.BorrowData memory loanDetails = params.bpt.getBorrow(params.tokenId);
        uint debt = ShrubView.getBorrowDebt(params.tokenId, params.bpt, lendState);
        require(config.END_OF_LOAN_PHASES[params.liquidationPhase].shrubLiquidationEligible, "shrub liquidation not allowed in this phase");
        uint availabilityTime = config.END_OF_LOAN_PHASES[params.liquidationPhase].duration;
        require(HelpersLogic.currentTimestamp() > loanDetails.endDate + availabilityTime ,"loan is not eligible for liquidation");
        uint bonusPecentage = config.END_OF_LOAN_PHASES[params.liquidationPhase].bonus;
        // The caller will be rewarded with some amount of the users' collateral. This will be based on the size of the debt to be refinanced
        uint bonusUsdc = PercentageMath.percentMul(
            debt,
            10000 + bonusPecentage
        );
        uint bonus = ShrubView.usdcToEth(bonusUsdc, params.ethPrice);

        // Liquidator repays loan with usdc amount equal to the debt
        params.usdc.transferFrom(params.shrubTreasury, address(this), debt);
        // BPT borrowData is updated so that:
        // - principal = 0
        // - collateral -= bonus
        params.bpt.fullLiquidateBorrowData(params.tokenId, bonus);
        // Liquidator is sent collateral that they bought : principle * ethPrice * (1 - bonus)
        params.aeth.transfer(params.shrubTreasury, bonus);
    }

/**
    * @notice Called by shrub to force the liquidation of an expired borrow - when no other liquidator stepped in.
    * @dev setup so that it can be called by chainlink automation
    * @dev shrub repays loan and is compensated with an equivelant amount of collateral at a discount specified by the bonus in the liquidationPhase
*/
    function borrowLiquidation(
        MethodParams.borrowLiquidationParams memory params,
        DataTypes.PlatformConfiguration storage config,
        DataTypes.LendState storage lendState
    ) external {
        //console.log("Running borrowLiquidation - tokenId: %s, percentage: %s", tokenId, percentage);
        require(params.percentage == 5000, "Invalid Percentage");
        require(ShrubView.getLtv(params.tokenId, params.ethPrice, params.bpt, lendState) > config.LIQUIDATION_THRESHOLD, "borrow not eligible for liquidation");
        DataTypes.BorrowData memory loanDetails = params.bpt.getBorrow(params.tokenId);
        uint debt = ShrubView.getBorrowDebt(params.tokenId, params.bpt, lendState);
        uint interest = ShrubView.getBorrowInterest(params.tokenId, params.bpt, lendState);
        // TODO: for now limit the percentage to 50% - later make it so that if this would not resolve the safety factor issue that the loan may be paid off 100%
        uint usdcToPay = PercentageMath.percentMul(debt, params.percentage);
        uint aethToReceive = PercentageMath.percentMul(
            WadRayMath.wadDiv(
                ShrubLendMath.usdcToWad(usdcToPay),
                params.ethPrice
            ),
            10000 + config.LIQUIDATION_BONUS
        );
        uint newPrincipal = loanDetails.principal + interest - usdcToPay;
        uint newCollateral = loanDetails.collateral - aethToReceive;
        require(
            ShrubView.calcLtv(newPrincipal, 0, newCollateral, params.ethPrice) < config.LIQUIDATION_THRESHOLD,
            "Liquidation insufficient to make borrow healthy"
        );

        // Liquidator repays loan with usdc amount equal to the debt
        params.usdc.transferFrom(msg.sender, address(this), usdcToPay);
        params.bpt.liquidateBorrowData(params.tokenId, newPrincipal, newCollateral);
        // Liquidator is sent collateral that they bought : principle * ethPrice * (1 - bonus)
        params.aeth.transfer(msg.sender, aethToReceive);
    }

}
