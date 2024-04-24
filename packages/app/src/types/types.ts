import { ethers } from 'ethers'


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
  updated?: number,
  __typename?: string,
};


type LendingPool = {
  id: string;
  timestamp: string;
  tokenSupply: string;
  totalEthYield: string;
  totalPrincipal: string;
  totalUsdcInterest: string;
  __typename: string;
};

  export type LendPosition = {
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
  lendPositions: LendPosition[];
};

export type UserFinancialDataAction =
  | { type: "SET_USER_DATA"; payload: { borrows: Borrow[]; lendPositions: LendPosition[] }; }
  | { type: "CLEAR_USER_DATA" }
  | { type: "ADD_LOAN"; payload: Borrow }
  | { type: "ADD_LEND_POSITION"; payload: LendPosition }
  | { type: "UPDATE_LEND_POSITION_STATUS"; payload: LendPosition }
  | { type: "UPDATE_LOAN_STATUS"; payload: Borrow };


