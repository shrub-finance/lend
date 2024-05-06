// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {DataTypes} from '../libraries/types/DataTypes.sol';

interface IBorrowPositionToken is IERC721 {
    function mint(address account, DataTypes.BorrowData calldata borrowData) external returns (uint);
    function debt(uint256 tokenId) external returns (uint);
//    function interest(uint256 tokenId) external returns (uint256);
    function interestSinceTimestamp(uint tokenId, uint40 timestamp) external returns (uint256);
//    function updateSnapshot(uint256 tokenId, uint newDebt) external;
    function getEndDate(uint tokenId) external returns (uint40);
    function getCollateral(uint tokenId) external returns (uint256);
    function getStartDate(uint tokenId) external view returns (uint40);
    function burn(uint256 tokenId) external;
    function getTokensByTimestamp(uint40 _timestamp) external returns (uint[] calldata);
    function getBorrow(uint tokenId) external view returns (DataTypes.BorrowData memory);
    function getInterest(uint tokenId) external view returns (uint256);
    function partialRepayBorrow(uint256 tokenId, uint256 repaymentAmount, uint40 lastSnapshotDate, address sender) external returns(uint principalReduction);
    function cleanUpByTimestamp(uint40 timestamp) external;
    function fullLiquidateBorrowData(uint256 tokenId, uint256 bonus) external;
}
