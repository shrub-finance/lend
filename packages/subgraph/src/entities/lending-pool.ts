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
    lendingPool.finalized = false;
    lendingPool.totalPrincipal = Zero;
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
    lendingPool.totalPrincipal = lendingPool.totalPrincipal.plus(amount);
    lendingPool.save()
    return lendingPool;
}

export function lendingPoolWithdraw(
    lendingPool: LendingPool,
    principal: BigInt,
    interest: BigInt,
    ethAmount: BigInt,
    tokenAmount: BigInt,
): LendingPool {
    lendingPool.totalPrincipal = lendingPool.totalPrincipal.minus(principal);
    lendingPool.totalUsdcInterest = lendingPool.totalUsdcInterest.minus(interest);
    lendingPool.totalEthYield = lendingPool.totalEthYield.minus(ethAmount);
    lendingPool.tokenSupply = lendingPool.tokenSupply.minus(tokenAmount);
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

export function lendingPoolFinalize(
    lendingPool: LendingPool,
    shrubInterest: BigInt,
    shrubYield: BigInt
): LendingPool {
    lendingPool.finalEthYield = lendingPool.totalEthYield;
    lendingPool.finalUsdcInterest = lendingPool.totalUsdcInterest;
    lendingPool.finalPrincipal = lendingPool.totalPrincipal;
    lendingPool.finalized = true;
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
