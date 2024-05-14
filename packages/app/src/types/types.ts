import { ethers } from 'ethers'
import {et} from "date-fns/locale";


export type PendingStatuses = "pending" | "confirmed" | "failed" | "extending" | "extended";

export type Borrow = {
  id?: string,
  status?: PendingStatuses,
  collateral?: ethers.BigNumber,
  created?: number,
  ltv?: string,
  originalPrincipal?: string,
  paid?: string,
  apy?: string,
  principal?: string,
  timestamp?: string,
  startDate?: number,
  updated?: number,
  __typename?: string,
};

export type BorrowObj = {
    id: ethers.BigNumber,
    startDate: Date,
    endDate: Date,
    created: Date,
    updated: Date,
    collateral: ethers.BigNumber,
    principal: ethers.BigNumber
    originalPrincipal: ethers.BigNumber,
    paid: ethers.BigNumber,
    ltv: ethers.BigNumber,
    apy: ethers.BigNumber,
    interest: ethers.BigNumber,
    debt: ethers.BigNumber,
}


type LendingPool = {
  id: string;
  timestamp: string;
  tokenSupply: string;
  totalEthYield: string;
  totalPrincipal: string;
  totalUsdcInterest: string;
  __typename: string;
};

  export type Deposit = {
    id?: string;
    status?: PendingStatuses;
    depositsUsdc?: string;
    withdrawsUsdc?: string;
    apy?: string;
    currentBalanceOverride?: string;
    interestEarnedOverride?: string;
    lendingPool?: LendingPool;
    timestamp?: number;
    updated?: number;
    amount?:number;
  };


export type UserFinancialDataState = {
  borrows: Borrow[];
  deposits: Deposit[];
  activePoolTimestamps: Date[]
};

export type UserFinancialDataAction =
  | { type: "SET_USER_DATA"; payload: { borrows: Borrow[]; deposits: Deposit[] }; }
  | { type: "CLEAR_USER_DATA" }
  | { type: "ADD_BORROW"; payload: Borrow }
  | { type: "ADD_LEND_POSITION"; payload: Deposit }
  | { type: "UPDATE_LEND_POSITION_STATUS"; payload: Deposit }
  | { type: "UPDATE_BORROW_STATUS"; payload: Borrow }
  | { type: "SET_ACTIVE_POOLS"; payload: Date[] };


