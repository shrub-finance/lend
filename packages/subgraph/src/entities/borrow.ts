import {Address, BigInt, ethereum, log} from "@graphprotocol/graph-ts";
import {Borrow, User} from "../../generated/schema";
import {getUser} from "./user";
import {Zero} from "../constants";

export function getBorrowByTokenId(
    tokenId: BigInt
): Borrow {
    let id = tokenId.toString();
    let borrow = Borrow.load(id);
    if (borrow == null) {
        throw new Error(`No borrow found with tokenId ${tokenId}`);
    }
    return borrow;
}

export function getBorrow(
    tokenId: BigInt,
    user: Address,
    apy: i32,
    principal: BigInt,
    collateral: BigInt,
    timestamp: BigInt,
    startDate: BigInt,
    block: ethereum.Block
): Borrow {
    let id = tokenId.toString();
    // let id = address.toHexString();
    // let user = User.load(owner);
    let borrow = Borrow.load(id);
    if (borrow !== null) {
        return borrow;
    }
    return createBorrow(id, user, apy, principal, collateral, timestamp, startDate, block);
}

// Private Methods
function createBorrow(
    id: string,
    user: Address,
    apy: i32,
    principal: BigInt,
    collateral: BigInt,
    timestamp: BigInt,
    startDate: BigInt,
    block: ethereum.Block
): Borrow {
    let borrow = Borrow.load(id);
    if (borrow !== null) {
        throw new Error(`borrow with id ${id} already exists`);
    }
    let userObj = getUser(user);
    borrow = new Borrow(id);
    borrow.active = true;
    borrow.timestamp = timestamp;
    borrow.created = block.timestamp.toI32();
    borrow.updated = block.timestamp.toI32();
    borrow.createdBlock = block.number.toI32();
    borrow.updatedBlock = block.number.toI32();
    borrow.user = userObj.id;
    // borrow.owner = owner.toHexString();
    borrow.apy = apy;
    borrow.ltv = 0;  // This is complicated and would need to be calculated after price changes at some interval - leaving as 0 for now
    borrow.principal = principal;
    borrow.originalPrincipal = principal;
    borrow.paid = Zero;
    borrow.collateral = collateral;
    borrow.collateralReturned = Zero;
    borrow.startDate = startDate;
    borrow.save();
    return borrow;
}

export function partialRepayBorrow(
    tokenId: BigInt,
    repaymentAmount: BigInt,
    principalReduction: BigInt,
    block: ethereum.Block
): Borrow {
    let id = tokenId.toString();
    let borrow = Borrow.load(id);
    if (borrow == null) {
        throw new Error(`Borrow with id ${id} not found`);
    }
    borrow.principal = borrow.principal.minus(principalReduction);
    borrow.updated = block.timestamp.toI32();
    borrow.updatedBlock = block.number.toI32();
    borrow.paid = borrow.paid.plus(repaymentAmount)
    borrow.save()
    return borrow;
}

export function repayBorrow(
    tokenId: BigInt,
    repaymentAmount: BigInt,
    collateralReturned: BigInt,
    beneficiary: Address,
    block: ethereum.Block
): Borrow {
    let id = tokenId.toString();
    let borrow = Borrow.load(id);
    if (borrow == null) {
        throw new Error(`Borrow with id ${id} not found`);
    }
    // TODO: Write this logic
    let beneficiaryObj = getUser(beneficiary);
    borrow.principal = Zero;
    borrow.updated = block.timestamp.toI32();
    borrow.updatedBlock = block.number.toI32();
    borrow.closed = block.timestamp.toI32();
    borrow.closedBlock = block.number.toI32();
    borrow.paid = borrow.paid.plus(repaymentAmount)
    borrow.active = false;
    borrow.collateralReturned = borrow.collateralReturned.plus(collateralReturned);
    borrow.beneficiary = beneficiaryObj.id;
    borrow.save()
    return borrow;
}

// type Borrow @entity(immutable: true) {
//     id: ID!
//     created: Int!
//     createdBlock: Int!
//     principal: BigInt!
//     collateral: BigInt!
//     ltv: Int!
//     apy: Int!
//     owner: User
// }
