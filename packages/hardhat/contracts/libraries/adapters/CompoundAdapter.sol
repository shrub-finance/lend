// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import {Constants} from "../configuration/Constants.sol";
import "../../interfaces/IComet.sol";
import "../../interfaces/IWETH.sol";

import "hardhat/console.sol";

library CompoundAdapter {

    function depositEth(
        IComet cweth,
        IWETH weth
    ) internal {
        weth.deposit{value: msg.value}();
        cweth.supply(address(weth), msg.value);
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
        IComet cweth,
        IWETH weth
    ) internal {
//        console.log("running CompoundAdapter.withdrawEth");
//        console.log("6");
        cweth.withdraw(address(weth), amount);
//        console.log("7");
//        console.log("amount: %n", amount);
//        console.log("weth balance: %n", weth.balanceOf(address(this)));
        weth.withdraw(amount);
//        console.log("8");
//        weth.transfer(beneficiary, amount);
        payable(beneficiary).transfer(amount);
//        console.log("9");
//        _wrappedTokenGateway.withdrawETH(address(0), amount, beneficiary);
    }

}
