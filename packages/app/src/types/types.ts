import { ethers } from 'ethers'


export type PendingStatuses = "pending" | "confirmed" | "failed";

export type Loan = {
  id?: string,
  status?: PendingStatuses,
  collateral?: ethers.BigNumber,
  created?: number,
  ltv?: string,
  originalPrincipal?: string,
  paid?: string,
  apy?: string,
  principal?: string,
  timestamp?: number,
  updated?: number,
  __typename?: string,
};

export type LendPosition = {};

export type UserFinancialDataState = {
  loans: Loan[];
  lendPositions: LendPosition[];
};

export type UserFinancialDataAction =
  | {
      type: "SET_USER_DATA";
      payload: { loans: Loan[]; lendPositions: LendPosition[] };
    }
  | { type: "CLEAR_USER_DATA" }
  | { type: "ADD_LOAN"; payload: Loan }
  | { type: "ADD_LEND_POSITION"; payload: LendPosition }
  | { type: "UPDATE_LEND_POSITION_STATUS"; payload: LendPosition }
  | { type: "UPDATE_LOAN_STATUS"; payload: Loan };


