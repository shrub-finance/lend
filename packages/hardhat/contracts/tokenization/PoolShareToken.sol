// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "hardhat/console.sol";

contract PoolShareToken is ERC20, Ownable {
    using SafeERC20 for IERC20;

    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function mint(address account, uint256 _amount) public onlyOwner {
        _mint(account, _amount);
    }

    function burn(address account, uint256 _amount) public onlyOwner {
        _burn(account, _amount);
    }
}
