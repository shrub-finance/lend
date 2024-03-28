// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./AETH.sol";
import "../interfaces/IAETH.sol";

import "hardhat/console.sol";

// Wrapped Token Gateway V3 - ETH - 0xD322A49006FC828F9B5B37Ab215F99B4E5caB19C
// Pool - ETH - 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2
// See: https://docs.aave.com/developers/periphery-contracts/wethgateway

contract MockAaveV3 is Ownable {
    IAETH public aeth;

    constructor(address aETH) {
        aeth = IAETH(aETH);
    }

    function depositETH(
        address,
        address onBehalfOf,
        uint16 referralCode
    ) external payable {
        // call the deposit method on aETH contract
        aeth.deposit{value: msg.value}(onBehalfOf);
    }

    function withdrawETH(
        address,
        uint256 amount,
        address onBehalfOf
    ) external {
        uint256 userBalance = aeth.balanceOf(msg.sender);
        uint256 amountToWithdraw = amount;
        // if amount is equal to uint(-1), the user wants to redeem everything
        if (amount == type(uint256).max) {
            amountToWithdraw = userBalance;
        }
        aeth.withdraw(msg.sender, amountToWithdraw, onBehalfOf);
    }

    /**
 * @dev transfer native Ether from the utility contract, for native Ether recovery in case of stuck Ether
   * due to selfdestructs or ether transfers to the pre-computed contract address before deployment.
   * @param to recipient of the transfer
   * @param amount amount to send
   */
    function emergencyEtherTransfer(address to, uint256 amount) external onlyOwner {
        _safeTransferETH(to, amount);
    }

    /**
 * @dev transfer ETH to an address, revert if it fails.
   * @param to recipient of the transfer
   * @param value the amount to send
   */
    function _safeTransferETH(address to, uint256 value) internal {
        (bool success, ) = to.call{value: value}(new bytes(0));
        require(success, 'ETH_TRANSFER_FAILED');
    }

    /**
 * @dev Only WETH contract is allowed to transfer ETH here. Prevent other addresses to send Ether to this contract.
   */
    receive() external payable {
//        require(msg.sender == address(WETH), 'Receive not allowed');
        revert('MockAaveV3: Receive not allowed');
    }

    /**
     * @dev Revert fallback calls
   */
    fallback() external payable {
        revert('MockAaveV3: Fallback not allowed');
    }
}
