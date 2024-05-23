// FinancialDataContext.tsx
import React, {createContext, useReducer, useContext, ReactNode, useEffect} from 'react'
import { UserFinancialDataState, UserFinancialDataAction, Borrow, Deposit } from '../types/types'
import {fromEthDate} from "@shrub-lend/common";
import {useQuery} from "@apollo/client";
import {ACTIVE_LENDINGPOOLS_QUERY} from "../constants/queries";

const initialState: UserFinancialDataState = {
  userData: {},
  platformData: {
    activePoolTimestamps: []
  }
};

const FinancialDataContext = createContext<{ store: UserFinancialDataState; dispatch: React.Dispatch<UserFinancialDataAction>; }>({ store: initialState, dispatch: () => null });

const financialDataReducer = (store: UserFinancialDataState, action: UserFinancialDataAction): UserFinancialDataState => {
  // console.log('Dispatching action:', action.type);
  if (action.type === "SET_USER_DATA") {
    const { address, borrows, deposits } = action.payload;
    return {
      ...store,
      userData: {
        ...store.userData,
        [address]: {borrows, deposits}
      }
    }
  } else if (action.type === "CLEAR_USER_DATA") {
    return {
      ...store,
      userData: {},
    };
  } else if (action.type === "ADD_BORROW") {
    const { address, borrow } = action.payload;
    return {
      ...store,
      userData: {
        ...store.userData,
        [address]: {
          ...store.userData[address],
          borrows: [...store.userData[address].borrows, borrow]
        }
      }
    }
  } else if (action.type === "ADD_LEND_POSITION") {
    const { address, deposit } = action.payload;
    return {
      ...store,
      userData: {
        ...store.userData,
        [address]: {
          ...store.userData[address],
          deposits: [...store.userData[address].deposits, deposit]
        }
      }
    }
  } else if (action.type === "UPDATE_LEND_POSITION_STATUS") {
    const { address, id, status } = action.payload;
    return {
      ...store,
      userData: {
        ...store.userData,
        [address]: {
          ...store.userData[address],
          deposits: store.userData[address].deposits.map(deposit => {
            if (deposit.id === id) {
              return { ...deposit, status };
            }
            return deposit;
          })
        }
      }
    };
  } else if (action.type === "UPDATE_BORROW_STATUS") {
    const { address, id, status } = action.payload;
    return {
      ...store,
      userData: {
        ...store.userData,
        [address]: {
          ...store.userData[address],
          borrows: store.userData[address].borrows.map(borrow => {
            if (borrow.id === id) {
              return { ...borrow, status };
            }
            return borrow;
          })
        }
      }
    };
  } else if (action.type === "SET_ACTIVE_POOLS") {
    const { activePoolTimestamps } = action.payload;
    console.log(activePoolTimestamps);
    return {
      ...store,
      platformData: {
        activePoolTimestamps: activePoolTimestamps.sort((a,b) => a.getTime() - b.getTime())
      }
    };
  } else {
    return {...store};
  }
};

export const FinancialDataProvider: React.FC<{children: ReactNode; userData: UserFinancialDataState}> = ({ children, userData }) => {
  const [store, dispatch] = useReducer(financialDataReducer, initialState);
  const {
    loading: activeLendingPoolsLoading,
    error: activeLendingPoolsError,
    data: activeLendingPoolsData,
  } = useQuery(ACTIVE_LENDINGPOOLS_QUERY);

  useEffect(() => {
    if (!activeLendingPoolsData) {
      return;
    }
    const activePoolTimestamps = activeLendingPoolsData.lendingPools.map(lendingPool => fromEthDate(lendingPool.timestamp));
    dispatch({
      type: "SET_ACTIVE_POOLS",
      payload: { activePoolTimestamps }
    })
  }, [activeLendingPoolsData]);


  return (
    <FinancialDataContext.Provider value={{ store, dispatch }}>
      {children}
    </FinancialDataContext.Provider>
  );
};

export function getUserData(store: UserFinancialDataState, walletAddress: string): { deposits: Deposit[], borrows: Borrow[] } {
  if (!walletAddress || !store || !store.userData[walletAddress]) {
    return { deposits: [], borrows: [] };
  }
  return store.userData[walletAddress];
}

// Custom hook to use financial data context
export const useFinancialData = () => useContext(FinancialDataContext);
