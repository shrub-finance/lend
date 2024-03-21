import {FC, useEffect, useState} from "react"
import {useAddress, useBalance, useContract, useContractRead, useContractWrite, Web3Button} from "@thirdweb-dev/react"
import {lendingPlatformAbi, lendingPlatformAddress, usdcAbi, usdcAddress} from "../../utils/contracts"
import {fromEthDate, truncateEthAddress} from "../../utils/ethMethods"
import {BigNumber, ethers} from "ethers"
import {router} from "next/client"
import {handleErrorMessagesFactory} from "../../utils/handleErrorMessages"
import Image from "next/image";
import {useRouter} from "next/router"
import { useFinancialData } from '../../components/FinancialDataContext'
import { useLazyQuery } from '@apollo/client'
import {ACTIVE_LENDINGPOOLS_QUERY} from '../../constants/queries'
import { LendingPlatform } from '@shrub-lend/hardhat/typechain-types'


interface LendSummaryViewProps {
  timestamp: number;
  estimatedAPY: string;
  lendAmount: string;
  onBackLend: () => void;
}

export const LendSummaryView: FC<LendSummaryViewProps> = ({onBackLend, timestamp, estimatedAPY, lendAmount}) => {

  const router = useRouter();
  const {state, dispatch} = useFinancialData();
  const handleViewDash = () => {
    router.push('/dashboard');
  };
  const [
    getActiveLendingPools,
    {
      loading: activeLendingPoolsLoading,
      error: activeLendingPoolsError,
      data: activeLendingPoolsData,
      startPolling: activeLendingPoolsStartPolling,
      stopPolling: activeLendingPoolsStopPolling,
    },
  ] = useLazyQuery(ACTIVE_LENDINGPOOLS_QUERY);

  const [localError, setLocalError] = useState("");
  const handleErrorMessages = handleErrorMessagesFactory(setLocalError);
  const [lendActionInitiated, setLendActionInitiated] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const {data: usdcBalanceData, isLoading: usdcBalanceDataIsLoading} = useBalance(usdcAddress);
  const walletAddress = useAddress();
  const {
    contract: usdc,
    isLoading: usdcIsLoading,
    error: usdcError
  } = useContract(usdcAddress, usdcAbi);
  const {
    contract: lendingPlatform,
    isLoading: lendingPlatformIsLoading,
    error: lendingPlatformError
  } = useContract(lendingPlatformAddress, lendingPlatformAbi);
  const {
    mutateAsync: mutateAsyncDeposit,
    isLoading: isLoadingTakeDeposit,
    error: errorDeposit
  } = useContractWrite(
    lendingPlatform,
    "deposit",
  );
  const {
    mutateAsync: mutateAsyncApprove,
    isLoading: isLoadingApprove,
    error: errorApprove
  } = useContractWrite(
    usdc,
    "approve",
  );
  const {
    data: allowance,
    isLoading: isLoadingAllowance,
    error: errorAllowance
  } = useContractRead(usdc, "allowance", [walletAddress, lendingPlatformAddress]);


  // Calculate the end date by adding the number of months to the current date
  const currentDate = new Date();
  const endDate = fromEthDate(timestamp);

  useEffect(() => {
    // console.log("running walletAddress useEffect");
    if (!walletAddress) {
      return;
    }
    getActiveLendingPools();
  }, [walletAddress]);

  useEffect(() => {
    // console.log("running userPositionsDataLoading useEffect");
    if (activeLendingPoolsLoading) {
      return;
    }
  }, [activeLendingPoolsLoading]);

  const latestLendPosition = state?.lendPositions?.reduce((latest, current) =>
    current.updated > latest.updated ? current : latest, state?.lendPositions[0] || {});


  return (
    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col">
        <div className="mt-6 self-start">
          {localError && (
            <div
              className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400 flex items-center"
              role="alert"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current shrink-0 h-6 w-6 mr-2"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>{localError}</span>
            </div>
          )}

          {!lendActionInitiated && (
            <h1 className=" text-4xl font-medium ">
              <button
                onClick={onBackLend}
                className="w-[56px] h-[40px] bg-gray-100 rounded-full dark:bg-gray-600"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="26"
                  height="26"
                  fill="none"
                  className="w-6 grow-0 order-0 flex-none ml-[16px] mt-[4px]"
                >
                  <path
                    d="M20 12H4M4 12L10 18M4 12L10 6"
                    stroke="black"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              Confirm Details
            </h1>
          )}
        </div>

        <div className="relative group mt-4 w-full">
          <div className="absolute -inset-1 shadow-shrub border rounded-3xl "></div>
          <div className="flex flex-col ">
            <div className="card w-full text-left">
              <div className="card-body ">
                {(!lendActionInitiated || latestLendPosition?.status === "pending") && (
                  <div>
                    <p className="text-lg font-bold pb-2">Lend amount</p>
                    <div className="w-full text-xl font-semibold flex flex-row">
                      <span className="text-4xl  font-medium text-left w-[500px]">
                        {lendAmount} USDC
                      </span>
                      <Image
                        src="/usdc-logo.svg"
                        className="w-10 inline align-baseline"
                        alt={"usdc logo"}
                        width={10}
                        height={10}
                      />
                    </div>
                  </div>
                )}

                {lendActionInitiated && (
                  <>
                    {latestLendPosition?.status === "failed" && <p className="text-lg font-bold pb-2 text-left">
                      Deposit Unsuccessful
                    </p>}
                    {latestLendPosition?.status === "confirmed" && <p className="text-lg font-bold pb-2 text-left">
                      Deposit Successful
                    </p>}

                      {/*{latestLendPosition?.status === "pending" && (*/}
                      {/*  <div class="flex w-[230px] h-[230px] items-center justify-center rounded-full bg-gradient-to-tr from-shrub-green to-shrub-green-50 animate-spin">*/}
                      {/*    <div class="w-[205px] h-[205px] rounded-full bg-white"></div>*/}
                      {/*  </div>*/}
                      {/*)}*/}

                      {latestLendPosition?.status === "confirmed" && (
                        <div className="p-20">
                          <div role="status" className="w-[250px] h-[250px] m-[20px]">
                            <img src="/checkmark.svg" alt="Loading" className="w-full h-full" />
                            <span className="sr-only">Loading...</span>
                          </div>
                        </div>

                      )}
                      {latestLendPosition?.status === "failed" && (
                        <div className="p-20">
                          <div role="status" className="w-[250px] h-[250px] m-[20px]">
                            <img src="/exclamation.svg" alt="Loading" className="w-full h-full" />
                            <span className="sr-only">Loading...</span>
                          </div>
                        </div>
                      )}
                  </>
                )}

                <div className="divider h-0.5 w-full bg-gray-100 my-8"></div>
                {/*receipt start*/}
                {(!lendActionInitiated || latestLendPosition?.status === "pending") &&
                  <div>
                    <div className="mb-2 flex flex-col gap-3 text-shrub-grey-200 text-lg font-light">
                      <div className="flex flex-row  justify-between">
                        <span className="">Lockup starts</span>
                        <span>{currentDate.toDateString()}</span>
                      </div>
                      <div className="flex flex-row  justify-between">
                        <span className="">Lockup ends</span>
                        <span>{endDate.toDateString()}</span>
                      </div>
                      <div className="flex flex-row  justify-between">
                        <span className="">Estimated Yield</span>
                        <span className="font-semibold text-shrub-green-500">
                          {" "}
                          {estimatedAPY}%
                        </span>
                      </div>

                      <div className="flex flex-row  justify-between">
                        <span>Wallet</span>
                        <span>
                          {truncateEthAddress(walletAddress)}
                          <Image
                            src="/copy.svg"
                            className="hidden w-6 md:inline align-baseline ml-2"
                            alt={"copy icon"}
                            width={6}
                            height={6}
                          />{" "}
                        </span>
                      </div>
                      <div className="flex flex-row  justify-between">
                        <span>Contract Address</span>
                        <span>
                          {truncateEthAddress(lendingPlatformAddress)}
                          <Image
                            src="/copy.svg"
                            className="hidden md:inline w-6 align-baseline ml-2"
                            alt={"copy icon"}
                            width={6}
                            height={6}
                          />{" "}
                        </span>
                      </div>
                    </div>
                    <div className="divider h-0.5 w-full bg-gray-100 my-8"></div>
                  </div>
                }

                {/*total*/}
                {(!lendActionInitiated || latestLendPosition?.status === "pending") && (
                  <div>
                    <div className="flex flex-col gap-3 mb-6 text-shrub-grey-200 text-lg font-light">
                      <div className="flex flex-row justify-between ">
                        <span className="">Current USDC balance</span>
                        <span>{usdcBalanceData?.displayValue} USDC</span>
                      </div>
                      <div className="flex flex-row justify-between">
                        <span className="">Gas Cost</span>
                        <span>0.0012 ETH</span>
                      </div>
                    </div>

                    {/*approve and deposit*/}
                    {usdcBalanceDataIsLoading ? (
                      <p>Loading balance...</p>
                    ) : (
                      <>
                        {/* Check if user has insufficient balance */}
                        {usdcBalanceData &&
                          BigNumber.from(usdcBalanceData.value).lt(
                            ethers.utils.parseUnits(lendAmount, 6),
                          ) && (
                            <button
                              disabled={true}
                              className="btn btn-block border-0 normal-case text-xl mb-4 disabled:!text-shrub-grey-200 disabled:!bg-shrub-grey-50"
                            >
                              Insufficient Balance
                            </button>
                          )}
                        {/* Approve if allowance is insufficient, and balance is enough */}
                        {!allowance ||
                        BigNumber.from(allowance).lt(
                          ethers.utils.parseUnits(lendAmount, 6),
                        )
                          ? usdcBalanceData &&
                            !BigNumber.from(usdcBalanceData.value).lt(
                              ethers.utils.parseUnits(lendAmount, 6),
                            ) && (
                              <Web3Button
                                contractAddress={lendingPlatformAddress}
                                contractAbi={lendingPlatformAbi}
                                className="!btn !btn-block !bg-shrub-green !border-0 !text-white !normal-case !text-xl hover:!bg-shrub-green-500 !mb-4"
                                action={() =>
                                  mutateAsyncApprove({
                                    args: [
                                      lendingPlatformAddress,
                                      ethers.constants.MaxUint256,
                                    ],
                                  })
                                }
                                onSuccess={() => setIsApproved(true)}
                                onError={(e) => {
                                  if (e instanceof Error) {
                                    handleErrorMessages({ err: e });
                                  }
                                }}
                              >
                                Approve
                              </Web3Button>
                            )
                          : null}

                        {allowance &&
                          !BigNumber.from(allowance).lt(
                            ethers.utils.parseUnits(lendAmount, 6),
                          ) &&
                          !(
                            usdcBalanceData &&
                            BigNumber.from(usdcBalanceData.value).lt(
                              ethers.utils.parseUnits(lendAmount, 6),
                            )
                          ) && (
                            <Web3Button
                              contractAddress={lendingPlatformAddress}
                              contractAbi = {lendingPlatformAbi}
                              className="!btn !btn-block !bg-shrub-green !border-0 !text-white !normal-case !text-xl hover:!bg-shrub-green-500 !mb-4 web3button"
                              action={async (lendingPlatform) =>
                              {console.log(lendingPlatform)
                                return await lendingPlatform?.contractWrapper?.writeContract?.deposit(timestamp, ethers.utils.parseUnits(lendAmount, 6))

                                // mutateAsyncDeposit({
                                //   args: [
                                //     timestamp,
                                //     ethers.utils.parseUnits(lendAmount, 6),
                                //   ],
                                // })
                              }}
                              onSubmit={() => {
                                setLocalError("");
                                setLendActionInitiated(true);
                                const filteredLendingPools =
                                  activeLendingPoolsData.lendingPools.filter(
                                    (pool) =>
                                      pool.timestamp === timestamp.toString(),
                                  );
                                const matchedLendingPool =
                                  filteredLendingPools.length > 0
                                    ? filteredLendingPools[0]
                                    : null;
                                const newLendPosition = {
                                  id: matchedLendingPool.id,
                                  depositsUsdc: lendAmount * 1000000,
                                  apy: estimatedAPY,
                                  currentBalanceOverride: lendAmount,
                                  interestEarnedOverride: "0",
                                  lendingPool: {
                                    id: matchedLendingPool.id,
                                    timestamp: matchedLendingPool.timestamp,
                                    tokenSupply: matchedLendingPool.tokenSupply,
                                    totalEthYield:
                                      matchedLendingPool.totalEthYield,
                                    totalPrincipal:
                                      matchedLendingPool.totalPrincipal,
                                    totalUsdcInterest:
                                      matchedLendingPool.totalUsdcInterest,
                                    __typename: matchedLendingPool.__typename,
                                  },
                                  timestamp: timestamp,
                                  updated: Math.floor(Date.now() / 1000),
                                  status: "pending",
                                };
                                dispatch({
                                  type: "ADD_LEND_POSITION",
                                  payload: newLendPosition,
                                });
                              }}
                              onSuccess={(result) => {
                                console.log(result);
                                const filteredLendingPools =
                                  activeLendingPoolsData.lendingPools.filter(
                                    (pool) =>
                                      pool.timestamp === timestamp.toString(),
                                  );
                                const matchedLendingPool =
                                  filteredLendingPools.length > 0
                                    ? filteredLendingPools[0]
                                    : null;
                                dispatch({
                                  type: "UPDATE_LEND_POSITION_STATUS",
                                  payload: {
                                    id: matchedLendingPool.id,
                                    status: "confirmed",
                                  },
                                });
                              }}
                              onError={(e) => {

                                if (e instanceof Error) {
                                  console.log(e);
                                  handleErrorMessages({ err: e });
                                  const filteredLendingPools =
                                    activeLendingPoolsData.lendingPools.filter(
                                      (pool) =>
                                        pool.timestamp === timestamp.toString(),
                                    );
                                  const matchedLendingPool =
                                    filteredLendingPools.length > 0
                                      ? filteredLendingPools[0]
                                      : null;
                                  dispatch({
                                    type: "UPDATE_LEND_POSITION_STATUS",
                                    payload: {
                                      id: matchedLendingPool.id,
                                      status: "failed",
                                    },
                                  });
                                }
                              }}
                            >
                              Initiate Deposit
                            </Web3Button>
                          )}
                      </>
                    )}
                  </div>
                )}


                {(lendActionInitiated && latestLendPosition?.status === "confirmed") && (
                  <>
                  <button
                    onClick={handleViewDash}
                    className="btn btn-block bg-white border text-shrub-grey-700 hover:bg-gray-100 hover:border-shrub-grey-50 normal-case text-xl border-shrub-grey-50"
                  >
                    View in Dashboard
                  </button>
                    <button
                      onClick={onBackLend}
                      className="btn btn-block bg-white border text-shrub-grey-700 hover:bg-gray-100 hover:border-shrub-grey-50 normal-case text-xl border-shrub-grey-50 mt-4"
                    >
                      Lend More
                    </button>
                  </>
                  )}

                {(lendActionInitiated && latestLendPosition?.status === "failed") && (
                  <>
                  <button
                    onClick={handleViewDash}
                    className="btn btn-block bg-white border text-shrub-grey-700 hover:bg-gray-100 hover:border-shrub-grey-50 normal-case text-xl border-shrub-grey-50"
                  >
                    View in Dashboard
                  </button>
                  <button
                    onClick={onBackLend}
                    className="btn btn-block bg-white border text-shrub-grey-700 hover:bg-gray-100 hover:border-shrub-grey-50 normal-case text-xl border-shrub-grey-50 mt-4"
                  >
                    Try Again
                  </button>
                  </>
                )}

                {(!lendActionInitiated || latestLendPosition?.status === "pending") && (
                  <button
                    onClick={onBackLend}
                    className="btn btn-block bg-white border text-shrub-grey-700 hover:bg-gray-100 hover:border-shrub-grey-50 normal-case text-xl border-shrub-grey-50"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
