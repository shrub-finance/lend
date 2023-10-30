import {Address} from "@graphprotocol/graph-ts";
import {User} from "../../generated/schema";


export function getUser(
    address: Address
): User {
    let id = address.toHexString();
    let user = User.load(id);
    if (user !== null) {
        return user;
    }
    return createUser(id);
}

// Private Methods
function createUser(
    id: string,
): User {
    let user = User.load(id);
    if (user !== null) {
        throw new Error(`user with id ${id} already exists`);
    }
    user = new User(id);
    user.save();
    return user;
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
