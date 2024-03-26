// types.ts
export type PendingStatuses = "confirming" | "confirmed" | "failed";

export type Loan = {
  
  
};

export type LendPosition = {
  

};

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


