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
    function getStartDate(uint tokenId) external view returns (uint256);
    function burn(uint256 tokenId) external;
    function getTokensByTimestamp(uint40 _timestamp) external returns (uint[] calldata);
    function getLoan(uint tokenId) external returns (BorrowData memory);
    function getInterest(uint tokenId) external view returns (uint256);
    function partialRepayLoan(uint256 tokenId, uint256 repaymentAmount, uint lastSnapshotDate) external returns(uint principalReduction);
}

uint256 constant SECONDS_IN_YEAR = 365 * 24 * 60 * 60;
uint256 constant APY_DECIMALS = 10 ** 8; // APY is represented with 6 decimals - this is 8 to account for adjustment of percentage to decimal (APY of 5% would be represented with 5000000)



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
        console.log("checkExists");
        console.log(tokenId);
        require(_exists(tokenId), "token does not exist");
        _;
    }

    function mint(address account, BorrowData calldata borrowData) external onlyOwner returns (uint){
//        borrowData.startDate = something from the transaction
        borrowDatas[currentIndex] = borrowData;
        borrowDatas[currentIndex].startDate = uint40(block.timestamp);
        _mint(account, currentIndex);
        tokensByTimestamp[borrowData.endDate].push(currentIndex);
        currentIndex++;
        return currentIndex - 1;
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

    function getInterest(uint tokenId) external view checkExists(tokenId) returns (uint256) {
        return interestSinceTimestamp(tokenId, borrowDatas[tokenId].startDate);
    }

    function getStartDate(uint tokenId) external view checkExists(tokenId) returns (uint256) {
        return borrowDatas[tokenId].startDate;
    }

    function getLoan(uint tokenId) external view checkExists(tokenId) returns (BorrowData memory) {
        return borrowDatas[tokenId];
    }

    // Returns the total owed on a loan
    function debt(uint256 tokenId, uint256 timestamp) public view checkExists(tokenId) returns (uint256) {
        // Safemath should ensure that there is not an underflow if the block.timestamp < snapshotDate
        console.log("running bd.debt - (tokenId, bd.startDate, timestamp)");
        BorrowData memory bd = borrowDatas[tokenId];
        console.log(tokenId);
        console.log(bd.startDate);
        console.log(timestamp);
        if (bd.startDate > timestamp) {
            console.log("startDate greater than timestamp");
            console.log(bd.startDate);
            return bd.principal + interestSinceTimestamp(tokenId, bd.startDate);
        }
        return bd.principal + interestSinceTimestamp(tokenId, timestamp);
        console.log("--- end debt logs---");
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

    function interestSinceTimestampsUnchecked(uint256 tokenId, uint256 timestampStart, uint256 timestampEnd) internal view returns (uint256) {
        BorrowData memory bd = borrowDatas[tokenId];
        console.log("Running interestSinceTimestampUnchecked");
        console.log(tokenId);
        console.log(bd.startDate);
        console.log(bd.apy);
        console.log(bd.principal);
        console.log(APY_DECIMALS);
        console.log(SECONDS_IN_YEAR);
        console.log("---");

        return bd.apy * bd.principal * (timestampEnd - timestampStart) / (APY_DECIMALS * SECONDS_IN_YEAR);
    }

    // Returns the usdc interest earned since the last adjustment (payment) to a BPT
    function interestSinceTimestamp(uint256 tokenId, uint timestamp) public view checkExists(tokenId) returns (uint256) {
        console.log("running interestSinceTimestamp - (tokenId, bd.startDate, timestamp, block.timestamp, apy, principal, apydecimals, secondsinyear)");
        BorrowData memory bd = borrowDatas[tokenId];
        console.log(tokenId);
        console.log(bd.startDate);
        console.log(timestamp);
        console.log(block.timestamp);
        console.log(bd.apy);
        console.log(bd.principal);
        console.log(APY_DECIMALS);
        console.log(SECONDS_IN_YEAR);
        console.log("---");

        // Safemath should ensure that there is not an underflow if the block.timestamp < snapshotDate
        if (bd.startDate > timestamp) {
            console.log("bpt created after start date - using startDate in place of timestamp");
            console.log(bd.apy * bd.principal * (block.timestamp - bd.startDate) / (APY_DECIMALS * SECONDS_IN_YEAR));
            return bd.apy * bd.principal * (block.timestamp - bd.startDate) / (APY_DECIMALS * SECONDS_IN_YEAR);
        }
        console.log(bd.apy * bd.principal * (block.timestamp - timestamp) / (APY_DECIMALS * SECONDS_IN_YEAR));
        return bd.apy * bd.principal * (block.timestamp - timestamp) / (APY_DECIMALS * SECONDS_IN_YEAR);
    }

    function partialRepayLoan(uint256 tokenId, uint256 repaymentAmount, uint lastSnapshotDate) onlyOwner external returns(uint principalReduction) {
        // Check that msg.sender owns the DPT
        require(ownerOf(tokenId) == msg.sender, "msg.sender does not own specified BPT");
        // Check that the user has sufficient funds
        require(usdc.balanceOf(msg.sender) >= repaymentAmount, "insuficient balance");
        // Check that repaymentAmount is less than the total debt;
        BorrowData storage bd = borrowDatas[tokenId];
        uint interest = interestSinceTimestampsUnchecked(tokenId, bd.startDate, lastSnapshotDate);
        require(repaymentAmount < bd.principal + interest, "partial repayment amount must be less than total debt");
        require(repaymentAmount >= interest, "repayment amount must be at least the accumulated interest");

//        newPrincipal = bd.principal + interest - repaymentAmount;
        principalReduction = repaymentAmount - interest;

        // Make updates to BorrowPositionToken
        bd.startDate = uint40(block.timestamp);
        bd.principal -= principalReduction;
    }

    function getCurrentIndex() public view returns(uint) {
        return currentIndex;
    }

}
