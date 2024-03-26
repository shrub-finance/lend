// FinancialDataContext.tsx
import React, {createContext, useReducer, useContext, ReactNode, useEffect} from 'react'
import { UserFinancialDataState, UserFinancialDataAction, Loan, LendPosition } from '../types/types'

const initialState: UserFinancialDataState = {
  loans: [],
  lendPositions: [],
};

const FinancialDataContext = createContext<{ state: UserFinancialDataState; dispatch: React.Dispatch<UserFinancialDataAction>; }>({ state: initialState, dispatch: () => null });

const financialDataReducer = (state: UserFinancialDataState, action: UserFinancialDataAction): UserFinancialDataState => {
  // console.log('Dispatching action:', action.type);
  switch (action.type) {
    case "SET_USER_DATA":
      const newLoans = action.payload.loans.filter((newLoan) =>
        !state.loans.some((existingLoan) => existingLoan.id === newLoan.id));
      // Place new loans at the beginning
      const mergedLoans = [...newLoans, ...state.loans];
      const newLendPositions = action.payload.lendPositions.filter((newPosition) =>
        !state.lendPositions.some((existingPosition) => existingPosition.id === newPosition.id));
      // Place new lend positions at the beginning
      const mergedLendPositions = [...newLendPositions, ...state.lendPositions];

      return {
        ...state,
        loans: mergedLoans,
        lendPositions: mergedLendPositions,
      };
    case "CLEAR_USER_DATA":
      return { ...initialState };
    case "ADD_LOAN":
      const updatedLoan = { ...state, loans: [action.payload, ...state.loans] };
      return updatedLoan;
    case "ADD_LEND_POSITION":
      const updatedLendPositions: { loans: Loan[]; lendPositions: (LendPosition | LendPosition)[] } = { ...state, lendPositions: [action.payload, ...state.lendPositions] };
      return updatedLendPositions;
    case "UPDATE_LEND_POSITION_STATUS":
      // console.log("Updating lend position status", action.payload); // Log the action payload before the update
      const updatedState = {
        ...state,
        lendPositions: state.lendPositions.map(position => {
          if (position.id === action.payload.id) {
            // console.log("Found position to update", position); // Log the position being updated
            return { ...position, status: action.payload.status };
          }
          return position;
        }),
      };
      // console.log("Updated lend positions", updatedState.lendPositions); // Log the updated lend positions array
      return updatedState;
    case "UPDATE_LOAN_STATUS":
      const updatedLoanState = {
        ...state,
        loans: state.loans.map(loan => {
          if (loan.id === action.payload.id) {
            return { ...loan, status: action.payload.status };
          }
          return loan;
        }),
      };
      return updatedLoanState;

    default:
      return state;
  }
};

export const FinancialDataProvider: React.FC<{children: ReactNode; userData: UserFinancialDataState}> = ({ children, userData }) => {
  const [state, dispatch] = useReducer(financialDataReducer, initialState);

  // Initialize the store with user data
useEffect(() => {
  // Only initialize the state with userData if loans and lendPositions are empty
  if (state.loans.length === 0 && state.lendPositions.length === 0) {
    dispatch({ type: "SET_USER_DATA", payload: userData });
  }
  }, [userData]);


  return (
    <FinancialDataContext.Provider value={{ state, dispatch }}>
      {children}
    </FinancialDataContext.Provider>
  );
};

// Custom hook to use financial data context
export const useFinancialData = () => useContext(FinancialDataContext);
