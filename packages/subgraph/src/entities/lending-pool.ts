import {LendingPool} from "../../generated/schema";
import {Address, BigInt, ethereum} from "@graphprotocol/graph-ts";
import {Zero} from "../constants";


export function getLendingPool(
    poolShareTokenAddress: Address,
): LendingPool {
    let id = poolShareTokenAddress.toHexString();
    let lendingPool = LendingPool.load(id);
    if (lendingPool === null) {
        throw new Error(`lendingPool with id ${id} does not exist`);
    }
    return lendingPool;
}

export function createLendingPool(
    timestamp: BigInt,
    poolShareTokenAddress: Address,
    block: ethereum.Block,
    transaction: ethereum.Transaction
): LendingPool {
    let id = poolShareTokenAddress.toHexString();
    let lendingPool = LendingPool.load(id);
    if (lendingPool !== null) {
        throw new Error(`lendingPool with id ${id} already exists`);
    }
    lendingPool = new LendingPool(id);
    lendingPool.timestamp = timestamp;
    lendingPool.created = block.timestamp.toI32();
    lendingPool.createdBlock = block.number.toI32();
    lendingPool.txid = transaction.hash;
    lendingPool.totalUsdc = Zero;
    lendingPool.totalEthYield = Zero;
    lendingPool.totalUsdcInterest = Zero;
    lendingPool.tokenSupply = Zero;
    lendingPool.save();
    return lendingPool;
}

export function lendingPoolDeposit(
    lendingPool: LendingPool,
    amount: BigInt
): LendingPool {
    lendingPool.totalUsdc = lendingPool.totalUsdc.plus(amount);
    lendingPool.save()
    return lendingPool;
}

export function lendingPoolIncrementTokenSupply(
    lendingPool: LendingPool,
    amount: BigInt
): LendingPool {
    lendingPool.tokenSupply = lendingPool.tokenSupply.plus(amount);
    lendingPool.save();
    return lendingPool;
}

export function lendingPoolUpdateYield(
    lendingPool: LendingPool,
    accumInterest: BigInt,
    accumYield: BigInt
): LendingPool {
    lendingPool.totalEthYield = accumYield;
    lendingPool.totalUsdcInterest = accumInterest;
    lendingPool.save();
    return lendingPool;
}



// type LendingPool @entity(immutable: true) {
//     "timestamp"
//     id: ID!
//     poolShareTokenAddress: Bytes!
//     txid: Bytes!
//     created: Int!
//     createdBlock: Int!
//     totalUsdc: Int!
//     usdcAvailable: Int!
//     totalEthYield: Int!
//     totalUsdcInterest: Int!
//     tokenSupply: Int!
// }
