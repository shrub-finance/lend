import {
    FinalizeLendingPool,
    LendingPoolYield,
    NewDeposit, NewLoan, PartialRepayLoan,
    PoolCreated, RepayLoan, Withdraw
} from "../generated/Contract/LendingPlatform"
import { log } from '@graphprotocol/graph-ts'
import {
    createLendingPool,
    getLendingPool,
    lendingPoolDeposit, lendingPoolFinalize,
    lendingPoolIncrementTokenSupply, lendingPoolUpdateYield, lendingPoolWithdraw
} from "./entities/lending-pool";
import {getUser} from "./entities/user";
import {
    addLoanToPool,
    getBorrowingPool,
    partialRepayBorrowingPool,
    removeLoanFromPool
} from "./entities/borrowing-pool";
import {getLoan, getLoanByTokenId, partialRepayLoan, repayLoan} from "./entities/loan";
import {PoolShareToken} from "../generated/templates";
import {getLendPosition, incrementLendPosition, lendPostionWithdraw} from "./entities/lend-position";


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
    log.info("NewDeposit: timestamp: {}, depositor: {}, amount: {}, tokenAmount: {}", [
        event.params.timestamp.toString(),
        event.params.depositor.toHexString(),
        event.params.amount.toString(),
        event.params.tokenAmount.toString()
    ]);
    let depositor = event.params.depositor;
    let amount = event.params.amount;
    let timestamp = event.params.timestamp;
    let poolShareTokenAddress = event.params.poolShareTokenAddress;
    let tokenAmount = event.params.tokenAmount;
    // event NewDeposit(uint256 timestamp, address depositor, uint256 amount);
    // Create User
    getUser(depositor);
    // Update Lending Pool with new USDC amounts
        // totalUsdc
        // usdcAvailable
        // tokenSupply
    let lendingPool = getLendingPool(poolShareTokenAddress);
    lendingPoolDeposit(lendingPool, amount);

    // Logic for handling the lendPosition part
    // Increment the totalSupply of tokens for the lendingPool
    lendingPoolIncrementTokenSupply(lendingPool, tokenAmount);
    // // Increment the number of tokens for the to
    let lendPosition = getLendPosition(depositor, lendingPool);
    incrementLendPosition(lendPosition, amount, tokenAmount);
}

export function handleNewLoan(event: NewLoan): void {
    // event NewLoan(uint timestamp, address borrower, uint256 collateral, uint256 amount, uint256 apy);
    log.info("NewLoan: tokenid: {}, timestamp: {}, borrower: {}, collateral: {}, principal: {}, apy: {}", [
        event.params.tokenId.toString(),
        event.params.timestamp.toString(),
        event.params.borrower.toHexString(),
        event.params.collateral.toString(),
        event.params.principal.toString(),
        event.params.apy.toString()
    ])
    // get the user for depositor
    getUser(event.params.borrower);
    // get/create the borrowing pool
    let borrowingPool = getBorrowingPool(event.params.timestamp, event.block);
    // create a new loan
    let loan = getLoan(
        event.params.tokenId,
        event.params.borrower,
        event.params.apy,
        event.params.principal,
        event.params.collateral,
        event.params.timestamp,
        event.block
    )
    // create a new loanposition
    // TODO: What was the point of loan-position again?
    // update the borrowing pool with the loan
    addLoanToPool(borrowingPool, loan);
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
}

export function handlePartialRepayLoan(event: PartialRepayLoan): void {
    // event PartialRepayLoan(uint tokenId, uint repaymentAmount, uint principalReduction);
    let tokenId = event.params.tokenId;
    let repaymentAmount = event.params.repaymentAmount;
    let principalReduction = event.params.principalReduction;
    log.info("partialRepayLoan: tokenId: {}, repaymentAmount: {}, principalReduction: {}",[
        tokenId.toString(),
        repaymentAmount.toString(),
        principalReduction.toString()
    ]);

    let loan = getLoanByTokenId(tokenId);
    let borrowingPool = getBorrowingPool(loan.timestamp, event.block);
    partialRepayBorrowingPool(borrowingPool, principalReduction);
    partialRepayLoan(tokenId, repaymentAmount, principalReduction, event.block);
}

export function handleRepayLoan(event: RepayLoan): void {
    // event RepayLoan(uint tokenId, uint repaymentAmount, uint collateralReturned, address beneficiary);
    let tokenId = event.params.tokenId;
    let repaymentAmount = event.params.repaymentAmount;
    let collateralReturned = event.params.collateralReturned;
    let beneficiary = event.params.beneficiary;
    log.info("handleRepayLoan: tokenId: {}. repaymentAmount: {}, collateralReturned, beneficiary: {}", [
        tokenId.toString(),
        repaymentAmount.toString(),
        collateralReturned.toString(),
        beneficiary.toHexString()
    ]);

    let loan = getLoanByTokenId(tokenId);
    let borrowingPool = getBorrowingPool(loan.timestamp, event.block);
    removeLoanFromPool(borrowingPool, loan);
    repayLoan(tokenId, repaymentAmount, collateralReturned, beneficiary, event.block);
}

export function handleWithdraw(event: Withdraw): void {
// #    event Withdraw(address poolShareTokenAddress, uint tokenAmount, uint ethAmount, uint usdcAmount);
    let userAddress = event.params.user;
    let poolShareTokenAddress = event.params.poolShareTokenAddress;
    let tokenAmount = event.params.tokenAmount;
    let ethAmount = event.params.ethAmount;
    let usdcPrincipal = event.params.usdcPrincipal;
    let usdcInterest = event.params.usdcInterest;
    log.info("handleRepayLoan: user: {}, poolShareTokenAddress: {}, tokenAmount: {}, ethAmount, usdcPrincipal: {}, usdcInterest: {}", [
        userAddress.toHexString(),
        poolShareTokenAddress.toHexString(),
        tokenAmount.toString(),
        ethAmount.toString(),
        usdcPrincipal.toString(),
        usdcInterest.toString()
    ]);

    // Update Lending Pool
    let lendingPool = getLendingPool(poolShareTokenAddress);
    lendingPool = lendingPoolWithdraw(lendingPool, usdcPrincipal, usdcInterest, ethAmount, tokenAmount);
    // Update Lend Position
    let lendPosition = getLendPosition(userAddress, lendingPool);
    let withdrawsUsdc = usdcPrincipal.plus(usdcInterest);
    lendPostionWithdraw(lendPosition, withdrawsUsdc, ethAmount, tokenAmount);
}

export function handleFinalizeLendingPool(event: FinalizeLendingPool): void {
// #    event FinalizeLendingPool(address poolShareTokenAddress, uint shrubInterest, uint shrubYield);
    let poolShareTokenAddress = event.params.poolShareTokenAddress;
    let shrubInterest = event.params.shrubInterest;
    let shrubYield = event.params.shrubYield;
    log.info("handleRepayLoan: poolShareTokenAddress: {}. shrubInterest: {}, shrubYield", [
        poolShareTokenAddress.toHexString(),
        shrubInterest.toString(),
        shrubYield.toString()
    ]);
    let lendingPool = getLendingPool(poolShareTokenAddress);
    lendingPoolFinalize(lendingPool, shrubInterest, shrubYield);
}
