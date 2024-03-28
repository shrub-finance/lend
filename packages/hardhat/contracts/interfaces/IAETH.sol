// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IAETH is IERC20 {
    function deposit(address onBehalfOf) external payable;
    function withdraw(address from, uint256 amountToWithdraw, address onBehalfOf) external;
    function emergencyEtherTransfer(address to, uint256 amount) external;
}
