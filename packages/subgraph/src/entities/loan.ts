import {Address, BigInt, ethereum, log} from "@graphprotocol/graph-ts";
import {Loan, User} from "../../generated/schema";
import {getUser} from "./user";

export function getLoan(
    tokenId: BigInt,
    owner: Address,
    apy: BigInt,
    amount: BigInt,
    collateral: BigInt,
    block: ethereum.Block
): Loan {
    let id = tokenId.toString();
    // let id = address.toHexString();
    // let user = User.load(owner);
    let loan = Loan.load(id);
    if (loan !== null) {
        return loan;
    }
    return createLoan(id, owner, apy, amount, collateral, block);
}

// Private Methods
function createLoan(
    id: string,
    owner: Address,
    apy: BigInt,
    amount: BigInt,
    collateral: BigInt,
    block: ethereum.Block
): Loan {
    let loan = Loan.load(id);
    if (loan !== null) {
        throw new Error(`loan with id ${id} already exists`);
    }
    let ownerUser = getUser(owner);
    loan = new Loan(id);
    loan.created = block.timestamp.toI32();
    loan.createdBlock = block.number.toI32();
    loan.owner = ownerUser.id;
    // loan.owner = owner.toHexString();
    loan.apy = apy.toI32();
    loan.ltv = 0;  // This is complicated and would need to be calculated after price changes at some interval - leaving as 0 for now
    loan.amount = amount;
    loan.collateral = collateral;
    loan.save();
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
