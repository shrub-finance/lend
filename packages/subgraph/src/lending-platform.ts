import {
    NewDeposit, NewLoan,
    PoolCreated
} from "../generated/Contract/LendingPlatform"
import { log } from '@graphprotocol/graph-ts'
import {createLendingPool, lendingPoolDeposit} from "./entities/lending-pool";
import {getUser} from "./entities/user";
import {getBorrowingPool} from "./entities/borrowing-pool";


export function handlePoolCreated(event: PoolCreated): void {
    log.info("PoolCreated",[]);
    createLendingPool(
        event.params.timestamp,
        event.params.poolShareTokenAddress,
        event.block,
        event.transaction
    );
}

export function handleNewDeposit(event: NewDeposit): void {
    log.info("NewDeposit: timestamp: {}, depositor: {}, amount: {}", [
        event.params.timestamp.toString(),
        event.params.depositor.toHexString(),
        event.params.amount.toString()
    ]);
    // event NewDeposit(uint256 timestamp, address depositor, uint256 amount);
    // Create User
    getUser(event.params.depositor);
    // Update Lending Pool with new USDC amounts
        // totalUsdc
        // usdcAvailable
        // tokenSupply
    lendingPoolDeposit(event.params.timestamp, event.params.amount);
    // Create/Update LendPosition
}

export function handleNewLoan(event: NewLoan): void {
    // event NewLoan(uint timestamp, address borrower, uint256 collateral, uint256 amount, uint256 apy);
    log.info("NewLoan: timestamp: {}, borrower: {}, collateral: {}, apy: {}", [
        event.params.timestamp.toString(),
        event.params.borrower.toHexString(),
        event.params.collateral.toString(),
        event.params.amount.toString(),
        event.params.apy.toString()
    ])
    // get the user for depositor
    getUser(event.params.borrower);
    // get/create the borrowing pool
    let borrowingPool = getBorrowingPool(event.params.timestamp, event.block);
    // create a new loan
    // create a new loanposition
    // update the borrowing pool with the loan

}
