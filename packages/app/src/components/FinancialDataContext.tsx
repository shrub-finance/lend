// FinancialDataContext.tsx
import React, {createContext, useReducer, useContext, ReactNode, useEffect} from 'react'
import { UserFinancialDataState, UserFinancialDataAction, Borrow, Deposit } from '../types/types'
import {fromEthDate} from "@shrub-lend/common";
import {useLazyQuery, useQuery} from "@apollo/client";
import {ACTIVE_LENDINGPOOLS_QUERY, USER_POSITIONS_QUERY} from "../constants/queries";
import {useAddress} from "@thirdweb-dev/react";

const initialState: UserFinancialDataState = {
  userData: {},
  platformData: {
    activePoolTimestamps: []
  }
};

const FinancialDataContext = createContext<{ store: UserFinancialDataState; dispatch: React.Dispatch<UserFinancialDataAction>; }>({ store: initialState, dispatch: () => null });

const financialDataReducer = (store: UserFinancialDataState, action: UserFinancialDataAction): UserFinancialDataState => {
  // console.log(`Dispatching Action:
  //   type: ${action.type}
  //   payload: ${action.type !== "CLEAR_USER_DATA" ? JSON.stringify(action.payload,null, 2) : ""}`
  // );
  if (action.type === "CLEAR_USER_DATA") {
    return {
      ...store,
      userData: {},
    };
  }
  if (action.type === "SET_ACTIVE_POOLS") {
    const { activePoolTimestamps } = action.payload;
    console.log(activePoolTimestamps);
    return {
      ...store,
      platformData: {
        activePoolTimestamps: activePoolTimestamps.sort((a,b) => a.getTime() - b.getTime())
      }
    };
  }
  if (action.type === "SET_USER_DATA") {
    const { address, borrows, deposits } = action.payload;
    return {
      ...store,
      userData: {
        ...store.userData,
        [address]: {borrows, deposits}
      }
    }
  }
  if (action.type === "ADD_BORROW") {
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
  }
  if (action.type === "ADD_LEND_POSITION") {
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
  }
  if (action.type === "UPDATE_LEND_POSITION_STATUS") {
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
  }
  if (action.type === "UPDATE_BORROW_STATUS") {
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
    // console.log(activePoolTimestamps);
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

export const FinancialDataProvider: React.FC<{children: ReactNode}> = ({ children}) => {
  const [store, dispatch] = useReducer(financialDataReducer, initialState);
  const walletAddress = useAddress();
  const {
    loading: activeLendingPoolsLoading,
    error: activeLendingPoolsError,
    data: activeLendingPoolsData,
  } = useQuery(ACTIVE_LENDINGPOOLS_QUERY);
  const [
    getUserPositions,
    {
      loading: userPositionsDataLoading,
      error: userPositionsDataError,
      data: userPositionsData,
      startPolling: userPositionsDataStartPolling,
      stopPolling: userPositionsDataStopPolling,
    },
  ] = useLazyQuery(USER_POSITIONS_QUERY, {
    variables: {
      user: walletAddress && walletAddress.toLowerCase(),
    },
  });

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

  useEffect(() => {
    if (!walletAddress) {
      return;
    }
    getUserPositions();
  }, [walletAddress]);

  useEffect(() => {
    // Once data is loaded, update the store
    console.log("running setUserData dispatch useEffect");
    console.log(`
    userPositionsDataLoading: ${userPositionsDataLoading}
    userPositionsData: ${userPositionsData}
    dispatch: ${dispatch}`);
    if (!userPositionsDataLoading && userPositionsData && userPositionsData.user) {
      const { borrows, deposits } = userPositionsData.user;

      const userData = getUserData(store, walletAddress);
      if (userData.borrows.length || userData.deposits.length) {
        console.log(`userData already exists for address ${walletAddress}, skipping SET_USER_DATA`);
        return;
      }
      dispatch({
        type: "SET_USER_DATA",
        payload: {
          address: walletAddress,
          borrows,
          deposits
        },
      });
    }
  }, [userPositionsData]);

  useEffect(() => {
    if (!userPositionsDataError) {
      return;
    }
    console.error(userPositionsDataError)
  }, [userPositionsDataError]);

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
