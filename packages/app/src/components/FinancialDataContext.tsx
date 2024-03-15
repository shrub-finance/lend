// FinancialDataContext.tsx
import React, {createContext, useReducer, useContext, ReactNode, useEffect} from 'react';
import { UserFinancialDataState, UserFinancialDataAction } from '../types/types';

const initialState: UserFinancialDataState = {
  loans: [],
  lendPositions: [],
};

const FinancialDataContext = createContext<{ state: UserFinancialDataState; dispatch: React.Dispatch<UserFinancialDataAction>; }>({ state: initialState, dispatch: () => null });

const financialDataReducer = (state: UserFinancialDataState, action: UserFinancialDataAction): UserFinancialDataState => {
  // console.log('Dispatching action:', action.type);
  switch (action.type) {
    case "SET_USER_DATA":
      // Filter out loans from the subgraph that are already present in the state
      const newLoans = action.payload.loans.filter((newLoan) =>
        !state.loans.some((existingLoan) => existingLoan.id === newLoan.id));
      // Place new loans at the beginning of the loans array
      const mergedLoans = [...newLoans, ...state.loans];
      //filter out lend positions that are already present in the state
      const newLendPositions = action.payload.lendPositions.filter((newPosition) =>
        !state.lendPositions.some((existingPosition) => existingPosition.id === newPosition.id));
      // Place new lend positions at the beginning of the lendPositions array
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
      const updatedLendPositions = { ...state, lendPositions: [action.payload, ...state.lendPositions] };
      return updatedLendPositions;
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
