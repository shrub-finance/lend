// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "hardhat/console.sol";

interface IAETH is IERC20 {
    function deposit(address onBehalfOf) external payable;
    function withdraw(uint256 amountToWithdraw, address sender, address onBehalfOf) external;
    function emergencyEtherTransfer(address to, uint256 amount) external;
}

contract AETH is ERC20, Ownable {
    using SafeERC20 for IERC20;

    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function deposit(address onBehalfOf) external payable {
        _mint(onBehalfOf, msg.value);
    }

    function withdraw(uint256 amountToWithdraw, address onBehalfOf) external {
        _burn(msg.sender, amountToWithdraw);
        _safeTransferETH(onBehalfOf, amountToWithdraw);
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
        revert('Receive not allowed');
    }

    /**
     * @dev Revert fallback calls
   */
    fallback() external payable {
        revert('Fallback not allowed');
    }

}
