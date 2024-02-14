import {
    NewDeposit, NewLoan,
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
import {addLoanToPool, getBorrowingPool} from "./entities/borrowing-pool";
import {getLoan} from "./entities/loan";
import {Approval, OwnershipTransferred, Transfer} from "../generated/templates/PoolShareToken/PoolShareToken";
import {getLendPosition, incrementLendPosition} from "./entities/lend-position";


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
        // let lendPosition = getLendPosition(to, lendingPool);
        // incrementLendPosition(lendPosition, value);

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
