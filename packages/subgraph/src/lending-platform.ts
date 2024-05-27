import {
    FinalizeLendingPool,
    LendingPoolYield,
    NewDeposit, NewBorrow, PartialRepayBorrow,
    PoolCreated, RepayBorrow, Withdraw
} from "../generated/Contract/LendingPlatform"
import { log } from '@graphprotocol/graph-ts'
import {
    createLendingPool,
    getLendingPool,
    lendingPoolDeposit, lendingPoolFinalize,
    lendingPoolIncrementTokenSupply, lendingPoolUpdateYield, lendingPoolWithdraw
} from "./entities/lending-pool";
import {getUser, getUserById} from "./entities/user";
import {
    addBorrowToPool,
    getBorrowingPool,
    partialRepayBorrowingPool,
    removeBorrowFromPool
} from "./entities/borrowing-pool";
import {getBorrow, getBorrowByTokenId, partialRepayBorrow, repayBorrow} from "./entities/borrow";
import {PoolShareToken} from "../generated/templates";
import {getDeposit, incrementDeposit, lendPostionWithdraw} from "./entities/deposit";
import {UsdcToWadRatio} from "./constants";
import {updateLastSnapshotDate} from "./entities/global-data";
import {
  createLogBorrow,
  createLogDeposit,
  createLogPartialRepayBorrow,
  createLogRepayBorrow, createLogWithdraw
} from "./entities/user-log";


export function handlePoolCreated(event: PoolCreated): void {
    log.info("PoolCreated",[]);
    createLendingPool(
        event.params.timestamp,
        event.params.poolShareTokenAddress,
        event.block,
        event.transaction
    );
    PoolShareToken.create(event.params.poolShareTokenAddress);
}

export function handleNewDeposit(event: NewDeposit): void {
    log.info("NewDeposit: depositor: {}, principalAmount: {}, interestAmount: {}, tokenAmount: {}, poolShareTokenAddress: {}", [
        event.params.depositor.toHexString(),
        event.params.principalAmount.toString(),
        event.params.interestAmount.toString(),
        event.params.tokenAmount.toString(),
        event.params.poolShareTokenAddress.toHexString()
    ]);
    let depositor = event.params.depositor;
    let principalAmount = event.params.principalAmount.times(UsdcToWadRatio);
    let interestAmount = event.params.interestAmount.times(UsdcToWadRatio);
    let poolShareTokenAddress = event.params.poolShareTokenAddress;
    let tokenAmount = event.params.tokenAmount;
    // event NewDeposit(uint256 timestamp, address depositor, uint256 amount);
    // Create User
    let user = getUser(depositor);
    // Update Lending Pool with new USDC amounts
    let lendingPool = getLendingPool(poolShareTokenAddress);
    lendingPoolDeposit(lendingPool, principalAmount, interestAmount);

    // Logic for handling the deposit part
    // Increment the totalSupply of tokens for the lendingPool
    lendingPoolIncrementTokenSupply(lendingPool, tokenAmount);
    // // Increment the number of tokens for the to
    let deposit = getDeposit(depositor, lendingPool);
    incrementDeposit(deposit, principalAmount.plus(interestAmount), tokenAmount);
    createLogDeposit(user, principalAmount, interestAmount, tokenAmount, deposit, event.transaction, event.block);
}

export function handleNewBorrow(event: NewBorrow): void {
    log.info("NewBorrow: tokenid: {}, timestamp: {}, borrower: {}, collateral: {}, principal: {}, startDate: {}, apy: {}", [
        event.params.tokenId.toString(),
        event.params.timestamp.toString(),
        event.params.borrower.toHexString(),
        event.params.collateral.toString(),
        event.params.principal.toString(),
        event.params.startDate.toString(),
        event.params.apy.toString()
    ])
    // get the user for depositor
    let user = getUser(event.params.borrower);
    // get/create the borrowing pool
    let borrowingPool = getBorrowingPool(event.params.timestamp, event.block);
    // create a new borrow
    let principal = event.params.principal.times(UsdcToWadRatio);
    let collateral = event.params.collateral;
    let borrow = getBorrow(
        event.params.tokenId,
        event.params.borrower,
        event.params.apy,
        principal,
        collateral,
        event.params.timestamp,
        event.params.startDate,
        event.block
    )
    // create a new borrowposition
    // TODO: What was the point of borrow-position again?
    // update the borrowing pool with the borrow
    addBorrowToPool(borrowingPool, borrow);
    createLogBorrow(user, principal, collateral, borrow, event.transaction, event.block);
}

export function handleLendingPoolYield(event: LendingPoolYield): void {
    let poolShareTokenAddress = event.params.poolShareTokenAddress;
    let accumInterest = event.params.accumInterest;
    let accumYield = event.params.accumYield;
    log.info("LendingPoolYield: poolShareTokenAddress: {}, accumInterest: {}, accumYield: {}",[
        poolShareTokenAddress.toHexString(),
        accumInterest.toString(),
        accumYield.toString()
    ]);
    let lendingPool = getLendingPool(poolShareTokenAddress);
    lendingPoolUpdateYield(lendingPool, accumInterest, accumYield)
    updateLastSnapshotDate(event.block.timestamp);
}

export function handlePartialRepayBorrow(event: PartialRepayBorrow): void {
    // event PartialRepayBorrow(uint tokenId, uint repaymentAmount, uint principalReduction);
    log.info("handlePartialRepayBorrow: tokenId: {}, repaymentAmount: {}, principalReduction: {}",[
        event.params.tokenId.toString(),
        event.params.repaymentAmount.toString(),
        event.params.principalReduction.toString()
    ]);
    let tokenId = event.params.tokenId;
    let repaymentAmount = event.params.repaymentAmount.times(UsdcToWadRatio);
    let principalReduction = event.params.principalReduction.times(UsdcToWadRatio);

    let borrow = getBorrowByTokenId(tokenId);
    let borrowingPool = getBorrowingPool(borrow.timestamp, event.block);
    let user = getUserById(borrow.user);
    partialRepayBorrowingPool(borrowingPool, principalReduction);
    partialRepayBorrow(tokenId, repaymentAmount, principalReduction, event.block);
    createLogPartialRepayBorrow(user, repaymentAmount, principalReduction, borrow, event.transaction, event.block);
}

export function handleRepayBorrow(event: RepayBorrow): void {
    // event RepayBorrow(uint tokenId, uint repaymentAmount, uint collateralReturned, address beneficiary);
    log.info("handleRepayBorrow: tokenId: {}. repaymentAmount: {}, collateralReturned, beneficiary: {}", [
        event.params.tokenId.toString(),
        event.params.repaymentAmount.toString(),
        event.params.collateralReturned.toString(),
        event.params.beneficiary.toHexString()
    ]);
    let tokenId = event.params.tokenId;
    let repaymentAmount = event.params.repaymentAmount.times(UsdcToWadRatio);
    let collateralReturned = event.params.collateralReturned;
    let beneficiary = event.params.beneficiary;

    let borrow = getBorrowByTokenId(tokenId);
    let principalPaid = borrow.principal;
    let borrowingPool = getBorrowingPool(borrow.timestamp, event.block);
    let user = getUserById(borrow.user);
    let beneficiaryUser = getUser(beneficiary);
    removeBorrowFromPool(borrowingPool, borrow);
    repayBorrow(tokenId, repaymentAmount, collateralReturned, beneficiary, event.block);
    createLogRepayBorrow(user, beneficiaryUser, repaymentAmount, principalPaid, collateralReturned, borrow, event.transaction, event.block);
}

export function handleWithdraw(event: Withdraw): void {
// #    event Withdraw(address poolShareTokenAddress, uint tokenAmount, uint ethAmount, uint usdcAmount);
    log.info("handleWithdraw: user: {}, poolShareTokenAddress: {}, tokenAmount: {}, ethAmount, usdcPrincipal: {}, usdcInterest: {}", [
        event.params.user.toHexString(),
        event.params.poolShareTokenAddress.toHexString(),
        event.params.tokenAmount.toString(),
        event.params.ethAmount.toString(),
        event.params.usdcPrincipal.toString(),
        event.params.usdcInterest.toString()
    ]);
    let userAddress = event.params.user;
    let poolShareTokenAddress = event.params.poolShareTokenAddress;
    let tokenAmount = event.params.tokenAmount;
    let ethAmount = event.params.ethAmount;
    let usdcPrincipal = event.params.usdcPrincipal.times(UsdcToWadRatio);
    let usdcInterest = event.params.usdcInterest.times(UsdcToWadRatio);

    let user = getUser(userAddress);

    // Update Lending Pool
    let lendingPool = getLendingPool(poolShareTokenAddress);
    lendingPool = lendingPoolWithdraw(lendingPool, usdcPrincipal, usdcInterest, ethAmount, tokenAmount);
    // Update Lend Position
    let deposit = getDeposit(userAddress, lendingPool);
    let withdrawsUsdc = usdcPrincipal.plus(usdcInterest);
    lendPostionWithdraw(deposit, withdrawsUsdc, ethAmount, tokenAmount);
    createLogWithdraw(user, usdcPrincipal, usdcInterest, tokenAmount, ethAmount, deposit, event.transaction, event.block);
}

export function handleFinalizeLendingPool(event: FinalizeLendingPool): void {
// #    event FinalizeLendingPool(address poolShareTokenAddress, uint shrubInterest, uint shrubYield);
    log.info("handleFinalizeLendingPool: poolShareTokenAddress: {}. shrubInterest: {}, shrubYield", [
        event.params.poolShareTokenAddress.toHexString(),
        event.params.shrubInterest.toString(),
        event.params.shrubYield.toString()
    ]);
    let poolShareTokenAddress = event.params.poolShareTokenAddress;
    let shrubInterest = event.params.shrubInterest.times(UsdcToWadRatio);
    let shrubYield = event.params.shrubYield;
    let lendingPool = getLendingPool(poolShareTokenAddress);
    lendingPoolFinalize(lendingPool, shrubInterest, shrubYield);
}
