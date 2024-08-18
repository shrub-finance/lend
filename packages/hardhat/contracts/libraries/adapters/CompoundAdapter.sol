// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import {Constants} from "../configuration/Constants.sol";
import "../../interfaces/IComet.sol";
import "../../interfaces/IWETH.sol";

library CompoundAdapter {

    function depositEth(
        IComet comp,
        IWETH weth
    ) internal {
        weth.deposit{value: msg.value}();
        comp.supply(address(weth), msg.value);
//        weth = IWETH(0x2D5ee574e710219a521449679A4A7f2B43f046ad);
//        _wrappedTokenGateway.depositETH{value: msg.value}(
//            Constants.AAVE_AETH_POOL,  // This is the address of the Aave-v3 pool - it is not used
//            address(this),
//            0
//        );
    }

    function withdrawEth(
        uint amount,
        address beneficiary,
        IComet comp,
        IWETH weth
    ) internal {
        comp.withdraw(address(weth), amount);
        weth.withdraw(amount);
        weth.transfer(beneficiary, amount);
//        _wrappedTokenGateway.withdrawETH(address(0), amount, beneficiary);
    }

}
