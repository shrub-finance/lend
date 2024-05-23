import {FC, useEffect, useState} from "react"
import {useAddress, useBalance, useContract, useContractRead, Web3Button} from "@thirdweb-dev/react"
import {lendingPlatformAbi, lendingPlatformAddress, usdcAbi, usdcAddress} from "../../utils/contracts"
import {fromEthDate, truncateEthAddress} from "../../utils/ethMethods"
import {BigNumber, ethers} from "ethers"
import {handleErrorMessagesFactory} from "../../utils/handleErrorMessages"
import Image from "next/image";
import {useRouter} from "next/router"
import {getUserData, useFinancialData} from '../../components/FinancialDataContext'
import { Deposit } from '../../types/types'
import useActiveLendingPools from "hooks/useActiveLendingPools"


interface LendSummaryViewProps {
  timestamp: number;
  estimatedAPY: string;
  depositAmount: string;
  backOnDeposit: () => void;
}

export const DepositSummaryView: FC<LendSummaryViewProps> = ({backOnDeposit, timestamp, estimatedAPY, depositAmount}) => {

  const router = useRouter();
  const {store, dispatch} = useFinancialData();
  const handleViewDash = async () => {
    await router.push('/dashboard');
  };
  const {
    getActiveLendingPools,
    activeLendingPoolsLoading,
    activeLendingPoolsError,
    activeLendingPoolsData,
    activeLendingPoolsStartPolling,
    activeLendingPoolsStopPolling,
  } = useActiveLendingPools();

  const [localError, setLocalError] = useState("");
  const handleErrorMessages = handleErrorMessagesFactory(setLocalError);
  const [lendActionInitiated, setLendActionInitiated] = useState(false);
  const [approveUSDCActionInitiated, setApproveUSDCActionInitiated] = useState(false);
  const {data: usdcBalanceData, isLoading: usdcBalanceDataIsLoading} = useBalance(usdcAddress);
  const walletAddress = useAddress();
  const currentDate = new Date();
  const endDate = fromEthDate(timestamp);

  const latestDeposit: Deposit = getUserData(store, walletAddress).deposits.reduce((latest, current) => {
      return current.updated > latest.updated ? current : latest;
    }
    , getUserData(store, walletAddress).deposits[0] || { tempData: false });
  // const latestDeposit: Deposit = store?.deposits?.reduce((latest, current) => {
  //     return current.updated > latest.updated ? current : latest;
  //   }
  //   , store?.deposits[0] || { tempData: false });
  const {
    contract: usdc,
    isLoading: usdcIsLoading,
    error: usdcError
  } = useContract(usdcAddress, usdcAbi);
  const {
    data: allowance,
    isLoading: allowanceIsLoading,
    error: allowanceError
  } = useContractRead(usdc, "allowance", [walletAddress, lendingPlatformAddress]);


  useEffect(() => {
    if (!walletAddress) return;
    getActiveLendingPools().then().catch(error => {
      console.error("Failed to fetch active lending pools:", error);
    });
  }, [walletAddress, getActiveLendingPools]);


  useEffect(() => {
    // console.log("running userPositionsDataLoading useEffect");
    if (activeLendingPoolsLoading) {
      return;
    }
  }, [activeLendingPoolsLoading]);

  useEffect(() => {
    if (localError) {
      const element = document.querySelector('.md\\:hero');
      if (element) element.scrollIntoView({ behavior: 'smooth' });
    }
  }, [localError]);



  return (
    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col">
        <div className="mt-6 self-start">
          {localError && (
            <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50   flex items-center" role="alert">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{localError}</span>
            </div>
          )}

          {!lendActionInitiated && (
            <h1 className="text-4xl font-medium">
              <button onClick={backOnDeposit} className="w-[56px] h-[40px] bg-shrub-grey-light3 rounded-full ">
                <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="none" className="w-6 grow-0 order-0 flex-none ml-[16px] mt-[4px]">
                  <path d="M20 12H4M4 12L10 18M4 12L10 6" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
                {(!lendActionInitiated || latestDeposit?.status === "pending") && (
                  <div>
                    <p className="text-lg font-bold pb-2">Deposit amount</p>
                    <div className="w-full text-xl font-semibold flex flex-row">
                      <span className="text-4xl  font-medium text-left w-[500px]">
                        {depositAmount} USDC
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
                      {/*spinner */}
                      {/*{latestDeposit?.status === "pending" && (*/}
                      {/*  <div class="flex w-[230px] h-[230px] items-center justify-center rounded-full bg-gradient-to-tr from-shrub-green to-shrub-green-50 animate-spin">*/}
                      {/*    <div class="w-[205px] h-[205px] rounded-full bg-white"></div>*/}
                      {/*  </div>*/}
                      {/*)}*/}

                      {latestDeposit?.status === "confirmed" && (
                        <>
                          <p className="text-lg font-bold pb-2 text-left">
                            Deposit Successful!
                          </p>
                        <div className="p-20">
                          <div role="status" className="w-[250px] h-[250px] m-[20px]">
                            <Image src="/checkmark.svg" alt="Loading" className="w-full h-full" width="250" height="250"/>
                            <span className="sr-only">Loading...</span>
                          </div>
                        </div>
                        </>
                      )}
                      {latestDeposit?.status === "failed" && (
                        <>
                        <p className="text-lg font-bold pb-2 text-left">
                        Deposit Unsuccessful
                        </p>
                        <div className="p-20">
                          <div role="status" className="w-[250px] h-[250px] m-[20px]">
                            <Image src="/exclamation.svg" alt="Loading" className="w-full h-full" width="250" height="250"/>
                            <span className="sr-only">Loading...</span>
                          </div>
                        </div>
                        </>
                      )}
                  </>
                )}

                <div className="divider h-0.5 w-full bg-shrub-grey-light2 my-8"></div>
                {/*receipt start*/}
                {(!lendActionInitiated || latestDeposit?.status === "pending") &&
                  <div>
                    <div className="mb-2 flex flex-col gap-3 text-shrub-grey-200 text-lg font-light">
                      <div className="flex flex-row  justify-between">
                        <span className="">Lockup starts</span>
                        <span>{currentDate.toDateString()}</span>
                      </div>
                      <div className="flex flex-row justify-between cursor-pointer" onClick={backOnDeposit}>
                        <span className="">Lockup ends</span>
                        <span>
                          {timestamp}
                          {endDate.toDateString()}
                          <Image alt="edit icon" src="/edit.svg" className="w-5 inline align-baseline ml-2" width="20" height="20"/>
                        </span>
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
                    <div className="divider h-0.5 w-full bg-shrub-grey-light2 my-8"></div>
                  </div>
                }

                {/*total*/}
                {(!lendActionInitiated || latestDeposit?.status === "pending") && (
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
                    {(allowanceIsLoading) ? (
                      <p>Loading balance...</p>
                    ) : (
                      <>
                        {/* Check for insufficient balance */}
                        {usdcBalanceData &&
                          BigNumber.from(usdcBalanceData.value).lt(
                            ethers.utils.parseUnits(depositAmount, 6),
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
                          ethers.utils.parseUnits(depositAmount, 6),
                        )
                          ? usdcBalanceData &&
                            !BigNumber.from(usdcBalanceData.value).lt(
                              ethers.utils.parseUnits(depositAmount, 6),
                            ) && (
                              <Web3Button
                                contractAddress={usdcAddress}
                                contractAbi={usdcAbi}
                                isDisabled={approveUSDCActionInitiated}
                                className="!btn !btn-block !bg-shrub-green !border-0 !text-white !normal-case !text-xl hover:!bg-shrub-green-500 !mb-4"
                                action={
                                  async (usdc) =>
                                  {
                                    setLocalError('');
                                    // @ts-ignore
                                    return await usdc.contractWrapper.writeContract.approve(lendingPlatformAddress, ethers.constants.MaxUint256)
                                  }}
                                onSuccess={
                                async (tx) => {
                                  setLocalError("");
                                  try {
                                    const receipt = await tx.wait();
                                    if(!receipt.status) {throw new Error("Transaction failed")}
                                  } catch (e) {console.log("Transaction failed:", e)}
                                  setApproveUSDCActionInitiated(true);
                                }}
                                onError={(e) => {
                                  handleErrorMessages({err: e});
                                }}
                              >
                                {!approveUSDCActionInitiated ?'Approve USDC': 'USDC Approval Submitted'}
                              </Web3Button>
                            )
                          : null}

                        {allowance &&
                          !BigNumber.from(allowance).lt(
                            ethers.utils.parseUnits(depositAmount, 6),
                          ) &&
                          !(
                            usdcBalanceData &&
                            BigNumber.from(usdcBalanceData.value).lt(
                              ethers.utils.parseUnits(depositAmount, 6),
                            )
                          ) && (
                            <Web3Button
                              contractAddress={lendingPlatformAddress}
                              contractAbi = {lendingPlatformAbi}
                              isDisabled={latestDeposit?.status === "pending"}
                              className="!btn !btn-block !bg-shrub-green !border-0 !text-white !normal-case !text-xl hover:!bg-shrub-green-500 !mb-4 web3button"
                              action={
                              async (lendingPlatform) =>
                              {
                                setLocalError('');
                                // @ts-ignore
                                return await lendingPlatform?.contractWrapper?.writeContract?.deposit(timestamp, ethers.utils.parseUnits(depositAmount, 6))
                              }}
                              onSuccess={async (tx) => {
                                  setLocalError('');
                                  if(activeLendingPoolsError) {
                                    handleErrorMessages({ customMessage: activeLendingPoolsError.message } )
                                    return
                                  }
                                  const filteredLendingPools =
                                    activeLendingPoolsData && activeLendingPoolsData.lendingPools.filter(
                                      (item) =>
                                        item.timestamp === timestamp.toString(),
                                    );

                                  const matchedLendingPool =
                                    filteredLendingPools.length > 0
                                      ? filteredLendingPools[0]
                                      : null;
                                  const newDeposit: Deposit = {
                                    id: matchedLendingPool.id,
                                    status: "pending",
                                    depositsUsdc: (ethers.utils.parseEther(depositAmount)).toString(),
                                    apy: estimatedAPY,
                                    currentBalanceOverride: (ethers.utils.parseEther(depositAmount)).toString(),
                                    interestEarnedOverride: "0",
                                    lendingPool: {
                                      id: matchedLendingPool.id,
                                      timestamp: matchedLendingPool.timestamp,
                                      tokenSupply: matchedLendingPool.tokenSupply,
                                      totalEthYield: matchedLendingPool.totalEthYield,
                                      totalPrincipal: matchedLendingPool.totalPrincipal,
                                      totalUsdcInterest: matchedLendingPool.totalUsdcInterest,
                                      __typename: matchedLendingPool.__typename,
                                    },
                                    timestamp: timestamp,
                                    updated: Math.floor(Date.now() / 1000),
                                    tempData: true
                                  };
                                  dispatch({
                                    type: "ADD_LEND_POSITION",
                                    payload: { address: walletAddress, deposit: newDeposit }
                                  });

                                  try {
                                    const receipt = await tx.wait();
                                    if(!receipt.status) {
                                      throw new Error("Transaction failed")
                                    }
                                      dispatch({
                                        type: "UPDATE_LEND_POSITION_STATUS",
                                        payload: {
                                          address: walletAddress,
                                          id: matchedLendingPool.id,
                                          status: "confirmed",
                                          // tempData: true
                                        },
                                      });
                                  } catch (e) {
                                    console.log("Transaction failed:", e);
                                    dispatch({
                                      type: "UPDATE_LEND_POSITION_STATUS",
                                      payload: {
                                        address: walletAddress,
                                        id: matchedLendingPool.id,
                                        status: "failed",
                                        // tempData: true
                                      },
                                    });
                                  }
                                  setLendActionInitiated(true);
                              }}
                              onError={(e) => {
                                handleErrorMessages({err: e});

                              }}
                            >
                              {latestDeposit?.status === "pending"? "Deposit Order Submitted":"Initiate Deposit"}
                            </Web3Button>
                          )}
                      </>
                    )}
                  </div>
                )}


                {(lendActionInitiated || latestDeposit?.status === "pending") && (
                  <button
                    onClick={handleViewDash}
                    className="btn btn-block bg-white border text-shrub-grey-700 hover:bg-shrub-grey-light2 hover:border-shrub-grey-50 normal-case text-xl border-shrub-grey-50">
                    View in Dashboard
                  </button>
                  )}

                {(lendActionInitiated || latestDeposit?.status === "pending") &&  ( <button
                  onClick={backOnDeposit}
                  className="btn btn-block bg-white border text-shrub-grey-700 hover:bg-shrub-grey-light2 hover:border-shrub-grey-50 normal-case text-xl border-shrub-grey-50 mt-4">
                  Back
                </button>
                  )}

                {(!lendActionInitiated  && latestDeposit?.status !== "pending") &&
                  <button
                    onClick={backOnDeposit}
                    className="btn btn-block bg-white border text-shrub-grey-700 hover:bg-shrub-grey-light2 hover:border-shrub-grey-50 normal-case text-xl border-shrub-grey-50"
                  >
                    Cancel
                  </button>
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
