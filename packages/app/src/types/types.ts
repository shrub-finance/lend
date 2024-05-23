import { ethers } from 'ethers'


export type PendingStatuses = "pending" | "confirmed" | "failed" | "extending" | "extended" |"withdrawing" | "withdrawn" |"repaying" | "repaid";

export type Borrow = {
  id?: string;
  status?: PendingStatuses;
  collateral?: ethers.BigNumber;
  created?: number;
  ltv?: string;
  originalPrincipal?: string;
  paid?: string;
  apy?: string;
  principal?: string;
  timestamp?: string;
  startDate?: number;
  updated?: number;
  __typename?: string;
  tempData : boolean;
};

export type BorrowObj = {
    id: ethers.BigNumber| string;
    startDate: Date;
    endDate: Date;
    created: Date;
    updated: Date;
    collateral: ethers.BigNumber;
    principal: ethers.BigNumber
    originalPrincipal: ethers.BigNumber;
    paid: ethers.BigNumber;
    ltv: ethers.BigNumber;
    apy: ethers.BigNumber;
    interest: ethers.BigNumber;
    debt: ethers.BigNumber;
    earlyRepaymentFee: ethers.BigNumber;
}

export type DepositObj = {
  id: string;
  // startDate: Date;
  endDate: Date;
  // updated: Date;
  depositsUsdc: ethers.BigNumber;
  withdrawsUsdc: ethers.BigNumber;
  // TODO: This should be coming through from subgraph
  // apy: ethers.BigNumber;
  lendingPoolTokenAddress: string;
  lendingPoolTokenAmount: ethers.BigNumber;
  positionEthYield: ethers.BigNumber;
  positionUsdcInterest: ethers.BigNumber;
  positionPrincipal: ethers.BigNumber;
}


type LendingPool = {
  id: string;
  timestamp: string;
  tokenSupply: string;
  totalEthYield: string;
  totalPrincipal: string;
  totalUsdcInterest: string;
  finalized?: boolean;
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
    amount?: number;
    tempData : boolean;
  };


export type UserFinancialDataState = {
  borrows: Borrow[]
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


