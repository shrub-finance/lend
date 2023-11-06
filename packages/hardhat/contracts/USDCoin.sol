// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import "hardhat/console.sol";


contract USDCoin is ERC20, ERC165 {
    constructor(uint256 initialSupply) ERC20("USD Coin", "USDC") {
        _mint(msg.sender, initialSupply * 10 ** decimals());
    }

    function decimals() public view virtual override returns (uint8) {
        return 6;
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        console.logBytes4(interfaceId);
        console.logBytes4(type(IERC20).interfaceId);
        console.log(super.supportsInterface(interfaceId));
        console.log(interfaceId == type(IERC20).interfaceId || super.supportsInterface(interfaceId));
        return interfaceId == type(IERC20).interfaceId || super.supportsInterface(interfaceId);
    }

//    function name() public view virtual override returns (string memory) {
//        return "USD Coin";
//    }





    function bytesToString(bytes memory data) public pure returns(string memory) {
    bytes memory alphabet = "0123456789abcdef";

    bytes memory str = new bytes(2 + data.length * 2);
    str[0] = "0";
    str[1] = "x";
    for (uint i = 0; i < data.length; i++) {
        str[2+i*2] = alphabet[uint(uint8(data[i] >> 4))];
        str[3+i*2] = alphabet[uint(uint8(data[i] & 0x0f))];
    }
    return string(str);
}

        fallback() external {
        // This will log the call data in your local Hardhat Network console
        console.log(bytesToString(msg.data));
    }
}
