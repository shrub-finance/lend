// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;


import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import "hardhat/console.sol";
import {DataTypes} from '../libraries/types/DataTypes.sol';
import {Constants} from '../libraries/configuration/Constants.sol';


interface IBorrowPositionToken is IERC721 {
    function mint(address account, DataTypes.BorrowData calldata borrowData) external returns (uint);
    function debt(uint256 tokenId) external returns (uint);
//    function interest(uint256 tokenId) external returns (uint256);
    function interestSinceTimestamp(uint256 tokenId, uint timestamp) external returns (uint256);
//    function updateSnapshot(uint256 tokenId, uint newDebt) external;
    function getEndDate(uint tokenId) external returns (uint40);
    function getCollateral(uint tokenId) external returns (uint256);
    function getStartDate(uint tokenId) external view returns (uint256);
    function burn(uint256 tokenId) external;
    function getTokensByTimestamp(uint40 _timestamp) external returns (uint[] calldata);
    function getLoan(uint tokenId) external returns (DataTypes.BorrowData memory);
    function getInterest(uint tokenId) external view returns (uint256);
    function partialRepayLoan(uint256 tokenId, uint256 repaymentAmount, uint lastSnapshotDate, address sender) external returns(uint principalReduction);
    function cleanUpByTimestamp(uint40 timestamp) external;
}




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

    mapping(uint256 => DataTypes.BorrowData) borrowDatas;
    mapping(uint40 => uint256[]) public tokensByTimestamp;  // mapping of the timestamp to tokenIds with that endDate
    mapping(uint40 => uint256[]) public removedTokens; // Tracking of takens that have been burned (keyed by endDate) - this will be used during the snapshot to clean up

    modifier checkExists(uint tokenId) {
        console.log("running checkExists for tokenId: %s - result: %s", tokenId, _exists(tokenId));
        require(_exists(tokenId), "token does not exist");
        _;
    }

    function mint(address account, DataTypes.BorrowData calldata borrowData) external onlyOwner returns (uint){
//        borrowData.startDate = something from the transaction
        borrowDatas[currentIndex] = borrowData;
//        if (!borrowData.startDate) {
//            borrowDatas[currentIndex].startDate = uint40(block.timestamp);
//        }
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

    function getLoan(uint tokenId) external view checkExists(tokenId) returns (DataTypes.BorrowData memory) {
        return borrowDatas[tokenId];
    }

    // Returns the total owed on a loan
    function debt(uint256 tokenId) public view checkExists(tokenId) returns (uint256) {
        // Safemath should ensure that there is not an underflow if the block.timestamp < snapshotDate
        console.log("running bd.debt - (tokenId, bd.startDate, timestamp)");
//        DataTypes.BorrowData memory bd = borrowDatas[tokenId];
        console.log(tokenId);
//        console.log(bd.startDate);
//        console.log(timestamp);
//        if (bd.startDate > timestamp) {
//            console.log("startDate greater than timestamp");
//            console.log(bd.startDate);
//            return bd.principal + interestSinceTimestamp(tokenId, bd.startDate);
//        }
        return borrowDatas[tokenId].principal + interestSinceTimestamp(tokenId, borrowDatas[tokenId].startDate);
    }

//    function updateSnapshot(uint256 tokenId, uint newDebt) checkExists(tokenId) external onlyOwner {
//        DataTypes.BorrowData storage bd = borrowDatas[tokenId];
//        bd.snapshotDate = uint40(block.timestamp);
//        bd.snapshotDebt = newDebt;
//    }

    function burn(uint256 tokenId) external checkExists(tokenId) onlyOwner {
        console.log("running burn for tokenId: %s", tokenId);
        // because most loans will be paid off at the end - we have intentionally decided to not clean up from
        // tokensByTimestamp on the burning of the bpt. Rather, this will be handled during the snapshot
        removedTokens[borrowDatas[tokenId].endDate].push(tokenId);
        console.log("list of removedTokens for timestamp: %s", borrowDatas[tokenId].endDate);
        for(uint i = 0; i < removedTokens[borrowDatas[tokenId].endDate].length; i++) {
            console.log(removedTokens[borrowDatas[tokenId].endDate][i]);
        }
        console.log("end of list of removed tokens");
        // Cleanup the borrowData associated with this token
        delete borrowDatas[tokenId];
        _burn(tokenId);
    }

    function cleanUpByTimestamp(uint40 timestamp) external onlyOwner {
        // Cleanup tokensByTimestamp as this isn't done during the burn
        console.log("running cleanUpByTimestamp for timestamp: %s", timestamp);
        for (uint i = 0; i < tokensByTimestamp[timestamp].length; i++) {
            for (uint j = 0; j < removedTokens[timestamp].length; j++) {
                console.log("i: %s, j: %s", i, j);
                console.log("tokenByTimestamp[i]: %s, removedTokens[j]: %s", tokensByTimestamp[timestamp][i], removedTokens[timestamp][j]);
                if (tokensByTimestamp[timestamp][i] == removedTokens[timestamp][j]) {
                    console.log("Match - removing");
                    // First remove from tokensByTimestamp
                    uint lastIndex = tokensByTimestamp[timestamp].length - 1;
                    console.log("lastIndex: %s", lastIndex);
                    if (i != lastIndex) {
                        tokensByTimestamp[timestamp][i] = tokensByTimestamp[timestamp][lastIndex];
                    }
                    tokensByTimestamp[timestamp].pop();
                    console.log("list of tokensByTimestamp for timestamp %s", timestamp);
                    for(uint k = 0; k < tokensByTimestamp[timestamp].length; k++) {
                        console.log(tokensByTimestamp[timestamp][k]);
                    }
                    console.log("end of list");
                    // If there is only 1 left, that means that we just got it and now we can return
                    if (removedTokens[timestamp].length == 1) {
                        delete removedTokens[timestamp];
                        return;
                    }
                    // Then remove from removedTokens
                    uint lastIndex2 = removedTokens[timestamp].length - 1;
                    if (j != lastIndex2) {
                        removedTokens[timestamp][j] = removedTokens[timestamp][lastIndex2];
                    }
                    removedTokens[timestamp].pop();
                }
            }
        }
    }

    function interestSinceTimestampsUnchecked(uint256 tokenId, uint256 timestampStart, uint256 timestampEnd) internal view returns (uint256) {
        DataTypes.BorrowData memory bd = borrowDatas[tokenId];
        console.log("Running interestSinceTimestampUnchecked");
        console.log(tokenId);
        console.log(bd.startDate);
        console.log(bd.apy);
        console.log(bd.principal);
        console.log(Constants.APY_DECIMALS);
        console.log(Constants.SECONDS_IN_YEAR);
        console.log("---");

        return bd.apy * bd.principal * (timestampEnd - timestampStart) / (Constants.APY_DECIMALS * Constants.SECONDS_IN_YEAR);
    }

    // Returns the usdc interest earned since the last adjustment (payment) to a BPT
    function interestSinceTimestamp(uint256 tokenId, uint timestamp) public view checkExists(tokenId) returns (uint256) {
        console.log("running interestSinceTimestamp");
//        console.log("running interestSinceTimestamp - (tokenId, bd.startDate, timestamp, block.timestamp, apy, principal, apydecimals, secondsinyear)");
        DataTypes.BorrowData memory bd = borrowDatas[tokenId];
//        console.log(tokenId);
//        console.log(bd.startDate);
//        console.log(timestamp);
//        console.log(block.timestamp);
//        console.log(bd.apy);
//        console.log(bd.principal);
//        console.log(Constants.APY_DECIMALS);
//        console.log(Constants.SECONDS_IN_YEAR);

        // Safemath should ensure that there is not an underflow if the block.timestamp < snapshotDate
        if (bd.apy == 0) {
            return 0;
        }
        if (bd.startDate > timestamp) {
            console.log("bpt created after start date - using startDate in place of timestamp");
            console.log("interestSinceTimestamp for tokenId: %s, timestamp: %s - %s", tokenId, timestamp, bd.apy * bd.principal * (block.timestamp - bd.startDate) / (Constants.APY_DECIMALS * Constants.SECONDS_IN_YEAR));
            return bd.apy * bd.principal * (block.timestamp - bd.startDate) / (Constants.APY_DECIMALS * Constants.SECONDS_IN_YEAR);
        }
        console.log("interestSinceTimestamp for tokenId: %s, timestamp: %s - %s", tokenId, timestamp, bd.apy * bd.principal * (block.timestamp - timestamp) / (Constants.APY_DECIMALS * Constants.SECONDS_IN_YEAR));
        return bd.apy * bd.principal * (block.timestamp - timestamp) / (Constants.APY_DECIMALS * Constants.SECONDS_IN_YEAR);
    }

    function partialRepayLoan(uint256 tokenId, uint256 repaymentAmount, uint lastSnapshotDate, address sender) onlyOwner external returns(uint principalReduction) {
        console.log("Running partialRepayLoan - tokenId, lastSnapshotDate, repaymentAmount, msg.sender");
        console.log(tokenId);
        console.log(lastSnapshotDate);
        console.log(repaymentAmount);
        console.log(msg.sender);
        // Check that msg.sender owns the DPT
        require(ownerOf(tokenId) == sender, "msg.sender does not own specified BPT");
        // Check that repaymentAmount is less than the total debt;
        DataTypes.BorrowData storage bd = borrowDatas[tokenId];
        uint interest = interestSinceTimestampsUnchecked(tokenId, bd.startDate, lastSnapshotDate);
        require(repaymentAmount < bd.principal + interest, "partial repayment amount must be less than total debt");
        require(repaymentAmount >= interest, "repayment amount must be at least the accumulated interest");

//        newPrincipal = bd.principal + interest - repaymentAmount;
        principalReduction = repaymentAmount - interest;

        // Make updates to BorrowPositionToken
        bd.startDate = uint40(block.timestamp);
        bd.principal -= principalReduction;
    }

    function repayLoan(uint256 tokenId, address sender) onlyOwner external returns (uint, uint) {
        console.log("Running repayLoan");
        // Check that msg.sender owns the DPT
        require(ownerOf(tokenId) == sender, "msg.sender does not own specified BPT");
        // burn the token
        _burn(tokenId);
        return (borrowDatas[tokenId].principal, borrowDatas[tokenId].collateral);
    }

    function getCurrentIndex() public view returns(uint) {
        return currentIndex;
    }

}
