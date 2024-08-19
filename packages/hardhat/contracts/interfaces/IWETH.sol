// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

// From Sepolia 0x2D5ee574e710219a521449679A4A7f2B43f046ad

interface IWETH {
    function deposit() external payable;
    function withdraw(uint wad) external;
    function totalSupply() external view returns (uint);
    function approve(address guy, uint wad) external returns (bool);
    function transfer(address dst, uint wad) external returns (bool);
    function transferFrom(address src, address dst, uint wad) external returns (bool);
    function balanceOf(address src) external view returns (uint);
}
