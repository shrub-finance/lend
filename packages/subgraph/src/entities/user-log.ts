import {Address, BigInt, ethereum, log} from "@graphprotocol/graph-ts";
import {Borrow, Deposit, User, UserLog} from "../../generated/schema";
import {Zero} from "../constants";

// type Log @entity {
//   "txid-logIndex"
//   id: ID!
//   timestamp: Int!
//   block: Int!
//   type: String!
//   user: User!
//   amount: Int
//   collateral: Int
//   lendingPool: LendingPool
//   borrowingPool: BorrowingPool
//   deposit: Deposit
//   borrow: Borrow
// }

function getId(tx: ethereum.Transaction): string {
  return `${tx.hash.toHexString()}-${tx.index.toString()}`;
}

export function createLogDeposit(
  user: User,
  principal: BigInt,
  interest: BigInt,
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
