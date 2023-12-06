// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;


import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import "hardhat/console.sol";

struct BorrowData {
    uint40 startDate;  // Max Date with uint40 is 2106 (83 years from now)
    uint40 endDate;
    uint256 initialPrincipal;
    uint256 collateral;
    uint32 apy;
    uint40 snapshotDate;
    uint256 snapshotDebt;
}

interface IBorrowPositionToken is IERC721 {
    function mint(address account, BorrowData calldata borrowData) external returns (uint);
    function debt(uint256 tokenId) external returns (uint);
    function interestSinceSnapshot(uint256 tokenId) external returns (uint256);
    function updateSnapshot(uint256 tokenId, uint newDebt) external;
    function getEndDate(uint tokenId) external returns (uint40);
}

uint256 constant SECONDS_IN_YEAR = 365 * 24 * 60 * 60;
uint256 constant APY_DECIMALS = 10 ** 6;

contract BorrowPositionToken is ERC721, Ownable {
    IERC20 public usdc;

    constructor(
        string memory name,
        string memory symbol,
        address usdcAddress
    ) ERC721(name, symbol) {
        usdc = IERC20(usdcAddress);
    }

    uint public currentIndex = 0;

    mapping(uint256 => BorrowData) borrowDatas;

    function mint(address account, BorrowData calldata borrowData) external onlyOwner returns (uint){
        currentIndex++;
//        borrowData.startDate = something from the transaction
        borrowDatas[currentIndex] = borrowData;
        borrowDatas[currentIndex].startDate = uint40(block.timestamp);
        borrowDatas[currentIndex].snapshotDate = uint40(block.timestamp);
        _mint(account, currentIndex);
        return currentIndex;
    }

    function exists(uint256 tokenId) internal view returns (bool) {
        return _exists(tokenId);
    }

    function getEndDate(uint tokenId) external returns (uint40) {
        // Check that this token exists
        require(_exists(tokenId), "token does not exist");
        return borrowDatas[tokenId].endDate;
    }

    // Returns the total owed on a loan
    function debt(uint256 tokenId) public returns (uint256) {
        // Check that this token exists
        require(_exists(tokenId), "token does not exist");
        // Safemath should ensure that there is not an underflow if the block.timestamp < snapshotDate
        BorrowData memory bd = borrowDatas[tokenId];
        return bd.snapshotDebt + interestSinceSnapshot(tokenId);
    }

    function updateSnapshot(uint256 tokenId, uint newDebt) external onlyOwner {
        // TODO: Maybe can skip this check?
        require(_exists(tokenId), "token does not exist");
        BorrowData storage bd = borrowDatas[tokenId];
        bd.snapshotDate = uint40(block.timestamp);
        bd.snapshotDebt = newDebt;
    }

    // Returns the usdc interest earned since the last adjustment (payment) to a BPT
    function interestSinceSnapshot(uint256 tokenId) public returns (uint256) {
        // Check that this token exists
        require(_exists(tokenId), "token does not exist");
        // Safemath should ensure that there is not an underflow if the block.timestamp < snapshotDate
        BorrowData memory bd = borrowDatas[tokenId];
        return bd.apy * bd.snapshotDebt * (block.timestamp - bd.snapshotDate) / (APY_DECIMALS * SECONDS_IN_YEAR);
    }

    function partialRepayLoan(uint256 tokenId, uint256 repaymentAmount) external {
        // Check that msg.sender owns the DPT
        require(ownerOf(tokenId) == msg.sender, "msg.sender does not own specified BPT");
        // Check that the user has sufficient funds
        require(usdc.balanceOf(msg.sender) >= repaymentAmount, "insuficient balance");
        // Check that funds are approved
        // Transfer USDC funds to Shrub
        // Burn the BPT ERC-721
        // Update BP Collateral and loans
        // Update BP pool share amount (aETH)
        // Redeem aETH on Aave for ETH on behalf of onBehalfOf (redeemer)
        // Emit event for tracking/analytics/subgraph
    }

    function getCurrentIndex() public view returns(uint) {
        return currentIndex;
    }
}
