// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./AETH.sol";

import "hardhat/console.sol";

// Wrapped Token Gateway V3 - ETH - 0xD322A49006FC828F9B5B37Ab215F99B4E5caB19C
// Pool - ETH - 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2
// See: https://docs.aave.com/developers/periphery-contracts/wethgateway



interface IMockAaveV3 {

    function depositETH(
        address pool,
        address onBehalfOf,
        uint16 referralCode
    ) external payable;

    function withdrawETH(
        address pool,
        uint256 amount,
        address onBehalfOf
    ) external;


    /**
 * @notice Supplies an `amount` of underlying asset into the reserve, receiving in return overlying aTokens.
   * - E.g. User supplies 100 USDC and gets in return 100 aUSDC
   * @param asset The address of the underlying asset to supply
   * @param amount The amount to be supplied
   * @param onBehalfOf The address that will receive the aTokens, same as msg.sender if the user
   *   wants to receive them on his own wallet, or a different address if the beneficiary of aTokens
   *   is a different wallet
   * @param referralCode Code used to register the integrator originating the operation, for potential rewards.
   *   0 if the action is executed directly by the user, without any middle-man
   */
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;

    /**
     * @notice Supply with transfer approval of asset to be supplied done via permit function
   * see: https://eips.ethereum.org/EIPS/eip-2612 and https://eips.ethereum.org/EIPS/eip-713
   * @param asset The address of the underlying asset to supply
   * @param amount The amount to be supplied
   * @param onBehalfOf The address that will receive the aTokens, same as msg.sender if the user
   *   wants to receive them on his own wallet, or a different address if the beneficiary of aTokens
   *   is a different wallet
   * @param deadline The deadline timestamp that the permit is valid
   * @param referralCode Code used to register the integrator originating the operation, for potential rewards.
   *   0 if the action is executed directly by the user, without any middle-man
   * @param permitV The V parameter of ERC712 permit sig
   * @param permitR The R parameter of ERC712 permit sig
   * @param permitS The S parameter of ERC712 permit sig
   */
    function supplyWithPermit(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode,
        uint256 deadline,
        uint8 permitV,
        bytes32 permitR,
        bytes32 permitS
    ) external;

    /**
     * @notice Withdraws an `amount` of underlying asset from the reserve, burning the equivalent aTokens owned
   * E.g. User has 100 aUSDC, calls withdraw() and receives 100 USDC, burning the 100 aUSDC
   * @param asset The address of the underlying asset to withdraw
   * @param amount The underlying amount to be withdrawn
   *   - Send the value type(uint256).max in order to withdraw the whole aToken balance
   * @param to The address that will receive the underlying, same as msg.sender if the user
   *   wants to receive it on his own wallet, or a different address if the beneficiary is a
   *   different wallet
   * @return The final amount withdrawn
   */
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

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
