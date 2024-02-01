import {LendingPool, LendPosition} from "../../generated/schema";
import {Address, BigInt, ethereum} from "@graphprotocol/graph-ts";
import {Zero} from "../constants";
import {getLendingPool} from "./lending-pool";


export function mintTokens(
    lendPosition: LendPosition,
    amount: BigInt
): LendPosition {
    lendPosition.amount = lendPosition.amount.plus(amount);
    lendPosition.save();
    return lendPosition;
}

export function incrementLendPosition(
    lendPosition: LendPosition,
    amount: BigInt
): LendPosition {
    lendPosition.amount = lendPosition.amount.plus(amount);
    lendPosition.depositsUsdc = lendPosition.depositsUsdc.plus(amount);
    lendPosition.save();
    return lendPosition;
}

export function decrementLendPosition(
    lendPosition: LendPosition,
    amount: BigInt
): LendPosition {
    lendPosition.amount = lendPosition.amount.minus(amount);
    lendPosition.save();
    return lendPosition;
}

export function getId(
    user: Address,
    lendingPool: LendingPool
): string {
    return user.toHexString() + "-" + lendingPool.id;
}

export function getLendPosition(
    user: Address,
    lendingPool: LendingPool
): LendPosition {
    let id = getId(user, lendingPool);
    let lendPosition = LendPosition.load(id);
    if (lendPosition === null) {
        lendPosition = createLendPosition(user, lendingPool);
    }
    return lendPosition;
}

export function createLendPosition(
    user: Address,
    lendingPool: LendingPool
): LendPosition {
    let id = getId(user, lendingPool);
    let lendPosition = LendPosition.load(id);
    if (lendPosition != null) {
        throw new Error(`lendPosition with id ${id} already exists`);
    }
    lendPosition = new LendPosition(id);
    lendPosition.amount = Zero;
    lendPosition.lendingPool = lendingPool.id;
    lendPosition.user = user.toHexString();
    lendPosition.depositsUsdc = Zero;
    lendPosition.withdrawsUsdc = Zero;
    return lendPosition;
}

