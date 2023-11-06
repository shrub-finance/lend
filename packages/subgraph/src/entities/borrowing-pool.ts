import {Address, BigInt, ethereum} from "@graphprotocol/graph-ts";
import {BorrowingPool, Loan} from "../../generated/schema";
import {Zero} from "../constants";

export function getBorrowingPool(
    timestamp: BigInt,
    block: ethereum.Block
): BorrowingPool {
    let id = timestamp.toString();
    let borrowingPool = BorrowingPool.load(id);
    if (borrowingPool !== null) {
        return borrowingPool;
    }
    return createBorrowingPool(timestamp, block);
}

export function addLoanToPool(borrowingPool: BorrowingPool, loan: Loan): BorrowingPool {
    borrowingPool.totalBorrowedUsdc = borrowingPool.totalBorrowedUsdc.plus(loan.amount);
    borrowingPool.totalCollateralEth = borrowingPool.totalCollateralEth.plus(loan.collateral);
    borrowingPool.save();
    return borrowingPool;
}

// Private Methods
function createBorrowingPool(
    timestamp: BigInt,
    block: ethereum.Block,
): BorrowingPool {
    let id = timestamp.toString();
    let borrowingPool = BorrowingPool.load(id);
    if (borrowingPool !== null) {
        throw new Error(`borrowingPool with id ${id} already exists`);
    }
    borrowingPool = new BorrowingPool(id);
    borrowingPool.created = block.timestamp.toI32();
    borrowingPool.createdBlock = block.number.toI32();
    borrowingPool.totalCollateralEth = Zero;
    borrowingPool.totalBorrowedUsdc = Zero;
    borrowingPool.save();
    return borrowingPool;
}




// type BorrowingPool @entity {
//     "timestamp"
//     id: ID!
//     created: Int!
//     createdBlock: Int!
//     totalCollateralEth: BigInt!
//     totalBorrowedUsdc: BigInt!
// }
