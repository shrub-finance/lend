import {GlobalData} from "../../generated/schema";
import {BigInt} from "@graphprotocol/graph-ts";
import {Zero} from "../constants";

export function getGlobalData(): GlobalData {
    let id = '1';
    let globalData = GlobalData.load(id);
    if (globalData === null) {
      globalData = new GlobalData(id);
      globalData.lastSnapshotDate = Zero;
      globalData.save();
    }
    return globalData;
}

export function updateLastSnapshotDate(lastSnapshotDate: BigInt): void {
  const globalData = getGlobalData();
  if (globalData.lastSnapshotDate >= lastSnapshotDate) {
    return;
  }
  globalData.lastSnapshotDate = lastSnapshotDate;
  globalData.save();
}
