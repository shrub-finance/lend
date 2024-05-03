// FinancialDataContext.tsx
import React, {createContext, useReducer, useContext, ReactNode, useEffect} from 'react'
import { UserFinancialDataState, UserFinancialDataAction, Borrow, Deposit } from '../types/types'

const initialState: UserFinancialDataState = {
  borrows: [],
  deposits: [],
};

const FinancialDataContext = createContext<{ store: UserFinancialDataState; dispatch: React.Dispatch<UserFinancialDataAction>; }>({ store: initialState, dispatch: () => null });

const financialDataReducer = (store: UserFinancialDataState, action: UserFinancialDataAction): UserFinancialDataState => {
  // console.log('Dispatching action:', action.type);
  switch (action.type) {
    case "SET_USER_DATA":
      const newBorrows = action.payload.borrows.filter((newBorrow) =>
        !store.borrows.some((existingBorrow) => existingBorrow.id === newBorrow.id));
      // Place new borrows at the beginning
      const mergedBorrows = [...newBorrows, ...store.borrows];
      const newDeposits = action.payload.deposits.filter((newPosition) =>
        !store.deposits.some((existingPosition) => existingPosition.id === newPosition.id));
      // Place new lend positions at the beginning
      const mergedDeposits = [...newDeposits, ...store.deposits];

      return {
        ...store,
        borrows: mergedBorrows,
        deposits: mergedDeposits,
      };
    case "CLEAR_USER_DATA":
      return { ...initialState };
    case "ADD_LOAN":
      const updatedBorrow = { ...store, borrows: [action.payload, ...store.borrows] };
      return updatedBorrow;
    case "ADD_LEND_POSITION":
      const updatedDeposits: { borrows: Borrow[]; deposits: (Deposit | Deposit)[] } = { ...store, deposits: [action.payload, ...store.deposits] };
      return updatedDeposits;
    case "UPDATE_LEND_POSITION_STATUS":
      // console.log("Updating lend position status", action.payload); // Log the action payload before the update
      const updatedState = {
        ...store,
        deposits: store.deposits.map(position => {
          if (position.id === action.payload.id) {
            // console.log("Found position to update", position); // Log the position being updated
            return { ...position, status: action.payload.status };
          }
          return position;
        }),
      };
      // console.log("Updated lend positions", updatedState.deposits); // Log the updated lend positions array
      return updatedState;
    case "UPDATE_LOAN_STATUS":
      const updatedBorrowState = {
        ...store,
        borrows: store.borrows.map(borrow => {
          if (borrow.id === action.payload.id) {
            return { ...borrow, status: action.payload.status };
          }
          return borrow;
        }),
      };
      return updatedBorrowState;

    default:
      return store;
  }
};

export const FinancialDataProvider: React.FC<{children: ReactNode; userData: UserFinancialDataState}> = ({ children, userData }) => {
  const [store, dispatch] = useReducer(financialDataReducer, initialState);

  // Initialize the store with user data
useEffect(() => {
  // Only initialize the store with userData if borrows and deposits are empty
  if (store.borrows.length === 0 && store.deposits.length === 0) {
    dispatch({ type: "SET_USER_DATA", payload: userData });
  }
  }, [userData]);


  return (
    <FinancialDataContext.Provider value={{ store, dispatch }}>
      {children}
    </FinancialDataContext.Provider>
  );
};

// Custom hook to use financial data context
export const useFinancialData = () => useContext(FinancialDataContext);
