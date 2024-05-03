import {LendingPool, Deposit} from "../../generated/schema";
import {Address, BigInt, ethereum} from "@graphprotocol/graph-ts";
import {Zero} from "../constants";
import {getLendingPool} from "./lending-pool";


export function mintTokens(
    deposit: Deposit,
    amount: BigInt
): Deposit {
    deposit.amount = deposit.amount.plus(amount);
    deposit.save();
    return deposit;
}

export function incrementDeposit(
    deposit: Deposit,
    usdcAmount: BigInt,
    tokenAmount: BigInt
): Deposit {
    deposit.amount = deposit.amount.plus(tokenAmount);
    deposit.depositsUsdc = deposit.depositsUsdc.plus(usdcAmount);
    deposit.save();
    return deposit;
}

export function decrementDeposit(
    deposit: Deposit,
    amount: BigInt
): Deposit {
    deposit.amount = deposit.amount.minus(amount);
    deposit.save();
    return deposit;
}

export function getId(
    user: Address,
    lendingPool: LendingPool
): string {
    return user.toHexString() + "-" + lendingPool.id;
}

export function getDeposit(
    user: Address,
    lendingPool: LendingPool
): Deposit {
    let id = getId(user, lendingPool);
    let deposit = Deposit.load(id);
    if (deposit === null) {
        deposit = createDeposit(user, lendingPool);
    }
    return deposit;
}

export function createDeposit(
    user: Address,
    lendingPool: LendingPool
): Deposit {
    let id = getId(user, lendingPool);
    let deposit = Deposit.load(id);
    if (deposit != null) {
        throw new Error(`deposit with id ${id} already exists`);
    }
    deposit = new Deposit(id);
    deposit.amount = Zero;
    deposit.lendingPool = lendingPool.id;
    deposit.user = user.toHexString();
    deposit.depositsUsdc = Zero;
    deposit.withdrawsUsdc = Zero;
    deposit.withdrawsEth = Zero;
    return deposit;
}

// deposit = depositWithdraw(deposit, withdrawsUsdc, ethAmount, tokenAmount);
export function lendPostionWithdraw(
    deposit: Deposit,
    withdrawsUsdc: BigInt,
    withdrawsEth: BigInt,
    tokenAmount: BigInt
): void {
    deposit.amount = deposit.amount.minus(tokenAmount);
    deposit.withdrawsUsdc = deposit.withdrawsUsdc.plus(withdrawsUsdc);
    deposit.withdrawsEth = deposit.withdrawsEth.plus(withdrawsEth);
    deposit.save();
}
