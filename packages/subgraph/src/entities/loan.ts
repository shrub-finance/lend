import {Address, BigInt, ethereum, log} from "@graphprotocol/graph-ts";
import {Loan, User} from "../../generated/schema";
import {getUser} from "./user";
import {Zero} from "../constants";

export function getLoan(
    tokenId: BigInt,
    user: Address,
    apy: BigInt,
    amount: BigInt,
    collateral: BigInt,
    timestamp: BigInt,
    block: ethereum.Block
): Loan {
    let id = tokenId.toString();
    // let id = address.toHexString();
    // let user = User.load(owner);
    let loan = Loan.load(id);
    if (loan !== null) {
        return loan;
    }
    return createLoan(id, user, apy, amount, collateral, timestamp, block);
}

// Private Methods
function createLoan(
    id: string,
    user: Address,
    apy: BigInt,
    amount: BigInt,
    collateral: BigInt,
    timestamp: BigInt,
    block: ethereum.Block
): Loan {
    let loan = Loan.load(id);
    if (loan !== null) {
        throw new Error(`loan with id ${id} already exists`);
    }
    let userObj = getUser(user);
    loan = new Loan(id);
    loan.timestamp = timestamp;
    loan.created = block.timestamp.toI32();
    loan.updated = block.timestamp.toI32();
    loan.createdBlock = block.number.toI32();
    loan.updatedBlock = block.number.toI32();
    loan.user = userObj.id;
    // loan.owner = owner.toHexString();
    loan.apy = apy;
    loan.ltv = Zero;  // This is complicated and would need to be calculated after price changes at some interval - leaving as 0 for now
    loan.amount = amount;
    loan.collateral = collateral;
    loan.save();
    return loan;
}

export function partialRepayLoan(
    tokenId: BigInt,
    principalReduction: BigInt,
    block: ethereum.Block
): Loan {
    let id = tokenId.toString();
    let loan = Loan.load(id);
    if (loan == null) {
        throw new Error(`Loan with id ${id} not found`);
    }
    loan.amount = loan.amount.minus(principalReduction);
    loan.updated = block.timestamp.toI32();
    loan.updatedBlock = block.number.toI32();
    loan.save()
    return loan;
}


// type Loan @entity(immutable: true) {
//     id: ID!
//     created: Int!
//     createdBlock: Int!
//     amount: BigInt!
//     collateral: BigInt!
//     ltv: Int!
//     apy: Int!
//     owner: User
// }
