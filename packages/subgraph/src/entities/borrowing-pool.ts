import {Address, BigInt, ethereum} from "@graphprotocol/graph-ts";
import {BorrowingPool, Borrow} from "../../generated/schema";
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

export function addBorrowToPool(borrowingPool: BorrowingPool, borrow: Borrow): BorrowingPool {
    borrowingPool.totalBorrowedUsdc = borrowingPool.totalBorrowedUsdc.plus(borrow.principal);
    borrowingPool.totalCollateralEth = borrowingPool.totalCollateralEth.plus(borrow.collateral);
    borrowingPool.save();
    return borrowingPool;
}

export function removeBorrowFromPool(borrowingPool: BorrowingPool, borrow: Borrow): BorrowingPool {
    borrowingPool.totalBorrowedUsdc = borrowingPool.totalBorrowedUsdc.minus(borrow.principal);
    borrowingPool.totalCollateralEth = borrowingPool.totalCollateralEth.minus(borrow.collateral);
    borrowingPool.save();
    return borrowingPool;
}

export function partialRepayBorrowingPool(borrowingPool: BorrowingPool, principalReduction: BigInt): BorrowingPool {
    borrowingPool.totalBorrowedUsdc = borrowingPool.totalBorrowedUsdc.minus(principalReduction);
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
