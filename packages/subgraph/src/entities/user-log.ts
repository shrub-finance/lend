import {BigInt, ethereum, log} from "@graphprotocol/graph-ts";
import {Borrow, Deposit, User, UserLog} from "../../generated/schema";
import {Zero} from "../constants";

function getId(tx: ethereum.Transaction): string {
  return `${tx.hash.toHexString()}-${tx.index.toString()}`;
}

export function createLogDeposit(
  user: User,
  principal: BigInt,
  interest: BigInt,
  tokenAmount: BigInt,
  deposit: Deposit,
  tx: ethereum.Transaction,
  block: ethereum.Block,
): void {
  let userLog = new UserLog(getId(tx));
  userLog.type = 'Deposit';
  userLog.user = user.id;
  userLog.timestamp = block.timestamp;
  userLog.block = block.number;
  userLog.principal = principal;
  userLog.interest = interest;
  userLog.tokenAmount = tokenAmount;
  userLog.deposit = deposit.id;
  userLog.save();
}

export function createLogBorrow(
  user: User,
  principal: BigInt,
  collateral: BigInt,
  borrow: Borrow,
  tx: ethereum.Transaction,
  block: ethereum.Block,
): void {
  let userLog = new UserLog(getId(tx));
  userLog.type = 'Borrow';
  userLog.user = user.id;
  userLog.timestamp = block.timestamp;
  userLog.block = block.number;
  userLog.principal = principal;
  userLog.collateral = collateral;
  userLog.borrow = borrow.id;
  userLog.save();
}

export function createLogPartialRepayBorrow(
  user: User,
  repaymentAmount: BigInt,
  principalReduction: BigInt,
  borrow: Borrow,
  tx: ethereum.Transaction,
  block: ethereum.Block,
): void {
  let userLog = new UserLog(getId(tx));
  userLog.type = 'PartialRepayBorrow';
  userLog.user = user.id;
  userLog.timestamp = block.timestamp;
  userLog.block = block.number;
  userLog.interest = repaymentAmount.minus(principalReduction);
  userLog.principal = principalReduction;
  userLog.collateral = Zero;
  userLog.borrow = borrow.id;
  userLog.save();
}

export function createLogRepayBorrow(
  user: User,
  beneficiary: User,
  repaymentAmount: BigInt,
  principalPaid: BigInt,
  collateralReturned: BigInt,
  borrow: Borrow,
  tx: ethereum.Transaction,
  block: ethereum.Block,
): void {
  let userLog = new UserLog(getId(tx));
  userLog.type = 'RepayBorrow';
  userLog.user = user.id;
  userLog.beneficiary = beneficiary.id;
  userLog.timestamp = block.timestamp;
  userLog.block = block.number;
  userLog.interest = repaymentAmount.minus(principalPaid);
  userLog.principal = principalPaid;
  userLog.collateral = collateralReturned;
  userLog.borrow = borrow.id;
  userLog.save();
}

export function createLogWithdraw(
  user: User,
  principal: BigInt,
  interest: BigInt,
  tokenAmount: BigInt,
  ethYield: BigInt,
  deposit: Deposit,
  tx: ethereum.Transaction,
  block: ethereum.Block,
): void {
  let userLog = new UserLog(getId(tx));
  userLog.type = 'Withdraw';
  userLog.user = user.id;
  userLog.timestamp = block.timestamp;
  userLog.block = block.number;
  userLog.principal = principal;
  userLog.interest = interest;
  userLog.tokenAmount = tokenAmount;
  userLog.ethYield = ethYield;
  userLog.deposit = deposit.id;
  userLog.save();
}
