import {
    NewDeposit, NewBorrow,
    PoolCreated
} from "../generated/Contract/LendingPlatform"
import {Address, log} from '@graphprotocol/graph-ts'
import {
    createLendingPool,
    getLendingPool,
    lendingPoolDeposit,
    lendingPoolIncrementTokenSupply
} from "./entities/lending-pool";
import {getUser} from "./entities/user";
import {addBorrowToPool, getBorrowingPool} from "./entities/borrowing-pool";
import {getBorrow} from "./entities/borrow";
import {Approval, OwnershipTransferred, Transfer} from "../generated/templates/PoolShareToken/PoolShareToken";
import {getDeposit, incrementDeposit} from "./entities/deposit";


export function handleTransfer(event: Transfer): void {
    log.info("Transfer", []);
    let from = event.params.from;
    let to = event.params.to;
    let value = event.params.value;
    let poolShareTokenAddress = event.address;
    if (from == Address.zero()) {
        // Mint Case
        log.info("MINT EVENT: Address of token {}", [event.address.toHexString()])
        // NOTE: This is all handled now in handleNewDeposit so just return

        // Increment the totalSupply of tokens for the lendingPool
        // let lendingPool = getLendingPool(poolShareTokenAddress);
        // lendingPoolIncrementTokenSupply(lendingPool, value);
        // // Increment the number of tokens for the to
        // let deposit = getDeposit(to, lendingPool);
        // incrementDeposit(deposit, value);

        return;
    } if (to == Address.zero()) {
        // Burn Case
        // TODO: Write Logic for this
    }
    // Transfer Case
    // TODO: Write Logic for this
}

export function handleApproval(event: Approval): void {
    log.info("Approval", []);
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
    log.info("OwnershipTransferred", []);
}
