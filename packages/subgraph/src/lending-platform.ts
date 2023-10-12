import {
    poolCreated as poolCreatedEvent
} from "../generated/Contract/LendingPlatform"
import { Pool } from "../generated/schema"
import { log } from '@graphprotocol/graph-ts'


export function handlePoolCreated(event: poolCreatedEvent): void {
    log.info("PoolCreated",[]);
    let poolShareTokenAddress = event.params.poolShareTokenAddress;
    let timestamp = event.params.timestamp;
    let pool = new Pool(poolShareTokenAddress.toHexString());
    pool.created = event.block.timestamp.toI32();
    pool.createdBlock = event.block.number.toI32();
    pool.txid = event.transaction.hash
    pool.save();
}
