// types.ts
export type PendingStatuses = "confirming" | "confirmed" | "failed";

export type Loan = {
  id: string;
  // Add more properties as per your Loan object structure
};

export type LendPosition = {
  lendingPoolId: string;
  // Add more properties as per your LendPosition object structure
};

export type UserFinancialDataState = {
  loans: Loan[];
  lendPositions: LendPosition[];
};

export type UserFinancialDataAction =
  | { type: "SET_USER_DATA"; payload: { loans: Loan[]; lendPositions: LendPosition[]; } }
  | { type: "CLEAR_USER_DATA" }
  | { type: "ADD_LOAN"; payload: Loan }; // Adding ADD_LOAN action type


