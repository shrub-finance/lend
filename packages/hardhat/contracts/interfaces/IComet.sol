// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

// From Sepolia 0x2943ac1216979aD8dB76D9147F64E61adc126e96
// https://github.com/compound-finance/comet/blob/main/contracts/Comet.sol
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


interface IComet is IERC20 {
    function supply(address asset, uint amount) external;
    function supplyTo(address dst, address asset, uint amount) external;
    function supplyFrom(address from, address dst, address asset, uint amount) external;
    function withdraw(address asset, uint amount) external;
    function withdrawTo(address to, address asset, uint amount) external;
    function withdrawFrom(address src, address to, address asset, uint amount) external;
}
