// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;


import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import "hardhat/console.sol";

struct BorrowData {
    uint40 startDate;  // Max Date with uint40 is 2106 (83 years from now)
    uint40 endDate;
    uint256 principal;
    uint256 collateral;
    uint32 apy;
}

interface IBorrowPositionToken is IERC721 {
    function mint(address account, BorrowData calldata borrowData) external returns (uint);
    function debt(uint256 tokenId) external returns (uint);
//    function interest(uint256 tokenId) external returns (uint256);
    function interestSinceTimestamp(uint256 tokenId, uint timestamp) external returns (uint256);
//    function updateSnapshot(uint256 tokenId, uint newDebt) external;
    function getEndDate(uint tokenId) external returns (uint40);
    function getCollateral(uint tokenId) external returns (uint256);
    function burn(uint256 tokenId) external;
    function getTokensByTimestamp(uint40 _timestamp) external returns (uint[] calldata);
    function getLoan(uint tokenId) external returns (BorrowData memory);
}

uint256 constant SECONDS_IN_YEAR = 365 * 24 * 60 * 60;
uint256 constant APY_DECIMALS = 10 ** 6;



// TODO: Index BPT by endDate so that we can find all of the loans for a timestamp
// NOTE: BPTs will not be indexed by owner as we can rely on external services to find this and we don't need this functionality in the smart contract itself

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
    mapping(uint40 => uint256[]) public tokensByTimestamp;  // mapping of the timestamp to tokenIds with that endDate

    modifier checkExists(uint tokenId) {
        require(_exists(tokenId), "token does not exist");
        _;
    }

    function mint(address account, BorrowData calldata borrowData) external onlyOwner returns (uint){
        currentIndex++;
//        borrowData.startDate = something from the transaction
        borrowDatas[currentIndex] = borrowData;
        borrowDatas[currentIndex].startDate = uint40(block.timestamp);
        _mint(account, currentIndex);
        tokensByTimestamp[borrowData.endDate].push(currentIndex);
        return currentIndex;
    }

    function exists(uint256 tokenId) internal view returns (bool) {
        return _exists(tokenId);
    }

    function getEndDate(uint tokenId) external view checkExists(tokenId) returns (uint40) {
        return borrowDatas[tokenId].endDate;
    }

    function getTokensByTimestamp(uint40 _timestamp) external view returns (uint[] memory) {
        return tokensByTimestamp[_timestamp];
    }

    function getCollateral(uint tokenId) external view checkExists(tokenId) returns (uint256) {
        return borrowDatas[tokenId].collateral;
    }

    function getLoan(uint tokenId) external view checkExists(tokenId) returns (BorrowData memory) {
        return borrowDatas[tokenId];
    }

    // Returns the total owed on a loan
    function debt(uint256 tokenId, uint256 timestamp) public view checkExists(tokenId) returns (uint256) {
        // Safemath should ensure that there is not an underflow if the block.timestamp < snapshotDate
        BorrowData memory bd = borrowDatas[tokenId];
        return bd.principal + interestSinceTimestamp(tokenId, timestamp);
    }

//    function updateSnapshot(uint256 tokenId, uint newDebt) checkExists(tokenId) external onlyOwner {
//        BorrowData storage bd = borrowDatas[tokenId];
//        bd.snapshotDate = uint40(block.timestamp);
//        bd.snapshotDebt = newDebt;
//    }

    function burn(uint256 tokenId) external checkExists(tokenId) onlyOwner {
        _burn(tokenId);
        // Cleanup the borrowData associated with this token
        BorrowData storage bd = borrowDatas[tokenId];
        bd.collateral = 0;
        bd.principal = 0;
    }

    // Returns the usdc interest earned since the last adjustment (payment) to a BPT
    function interestSinceTimestamp(uint256 tokenId, uint timestamp) public view checkExists(tokenId) returns (uint256) {
        // Safemath should ensure that there is not an underflow if the block.timestamp < snapshotDate
        BorrowData memory bd = borrowDatas[tokenId];
        return bd.apy * bd.principal * (block.timestamp - timestamp) / (APY_DECIMALS * SECONDS_IN_YEAR);
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
