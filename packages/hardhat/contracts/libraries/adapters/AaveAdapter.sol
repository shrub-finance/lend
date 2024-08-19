// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import {Constants} from "../configuration/Constants.sol";
import "../../interfaces/IMockAaveV3.sol";

library AaveAdapter {

    function depositEth(
        IMockAaveV3 _wrappedTokenGateway
    ) internal {
        _wrappedTokenGateway.depositETH{value: msg.value}(
            Constants.AAVE_AETH_POOL,  // This is the address of the Aave-v3 pool - it is not used
            address(this),
            0
        );
    }

    function withdrawEth(
        uint amount,
        address beneficiary,
        IMockAaveV3 _wrappedTokenGateway
    ) internal {
        _wrappedTokenGateway.withdrawETH(address(0), amount, beneficiary);
    }

}
