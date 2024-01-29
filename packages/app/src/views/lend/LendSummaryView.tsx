import {FC, useEffect, useState} from "react";
import {useAddress, useBalance, useContract, useContractRead, useContractWrite, Web3Button} from "@thirdweb-dev/react";
import {lendingPlatformAbi, lendingPlatformAddress, usdcAbi, usdcAddress} from "../../utils/contracts";
import {fromEthDate, truncateEthAddress} from "../../utils/ethMethods";
import {BigNumber, ethers} from "ethers";
import {router} from "next/client";
import {handleErrorMessagesFactory} from "../../utils/handleErrorMessages";
import Image from "next/image";
import {useRouter} from "next/router";


interface LendSummaryViewProps {
  timestamp: number;
  estimatedAPY: string;
  lendAmount: string;
  onBackLend: () => void;
}

export const LendSummaryView: FC<LendSummaryViewProps> = ({onBackLend, timestamp, estimatedAPY, lendAmount}) => {


  const router = useRouter();

  const handleViewDash = () => {
    router.push('/dashboard');
  };


  // error handling
  const [localError, setLocalError] = useState("");
  const handleErrorMessages = handleErrorMessagesFactory(setLocalError);

  const [lendSuccess, setLendSuccess] = useState(false);
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


  return (
    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col">
        <div className='mt-6 self-start'>

          {localError && (
            <div className="alert alert-warning justify-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6 ml-4p mr-2" fill="none"
                   viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <span>{localError}</span>
            </div>
          )}

          {!lendSuccess && <h1 className=" text-4xl font-medium ">
            <button onClick={onBackLend}
                    className="w-[56px] h-[40px] bg-gray-100 rounded-full dark:bg-gray-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="none"
                   className="w-6 grow-0 order-0 flex-none ml-[16px] mt-[4px]">
                <path d="M20 12H4M4 12L10 18M4 12L10 6" stroke="black" strokeWidth="2" strokeLinecap="round"
                      strokeLinejoin="round"/>
              </svg>
            </button>
            Confirm Details
          </h1>}


        </div>

        <div className="relative group mt-4 w-full">
          <div className="absolute -inset-1 shadow-shrub border rounded-3xl "></div>
          <div className="flex flex-col ">
            <div className="card w-full text-left">
              <div className="card-body ">
                {!lendSuccess && <div>
                  <p className="text-lg font-bold pb-2">
                    Lend amount
                  </p>
                  <div className="w-full text-xl font-semibold flex flex-row">
                    <span className="text-4xl  font-medium text-left w-[500px]">{lendAmount} USDC</span>
                    <Image src="/usdc-logo.svg" className="w-10 inline align-baseline" alt={"usdc logo"} width={10} height={10}/>
                  </div>
                </div>
                }

                {lendSuccess &&
                  <>
                    <p className="text-lg font-bold pb-2 text-left">
                      Deposit successful
                    </p>
                    <div className="p-20">
                      <svg className="w-[250px] h-[250px] text-shrub-green dark:text-white m-[20px]" aria-hidden="true"
                           xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"
                              strokeWidth="1" d="m7 10 2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
                      </svg>
                    </div>
                  </>}

                <div className="divider h-0.5 w-full bg-gray-100 my-8"></div>
                {/*receipt start*/}
                {!lendSuccess && <div>
                  <div className="mb-2 flex flex-col gap-3 text-shrub-grey-200 text-lg font-light">
                    <div className="flex flex-row  justify-between">
                      <span className="">Lockup starts</span>
                      <span>{currentDate.toDateString()}</span>
                    </div>
                    <div className="flex flex-row  justify-between">
                      <span className="">Lockup ends</span>
                      <span>{endDate.toDateString()}</span>
                    </div>
                    {/*<div className="flex flex-row  justify-between">*/}
                    {/*  <span className="">Bonus APR ✨</span>*/}
                    {/*  <span className="font-semibold text-shrub-green-500"> 5%</span>*/}
                    {/*</div>*/}
                    <div className="flex flex-row  justify-between">
                      <span className="">Estimated Yield</span>
                      <span className="font-semibold text-shrub-green-500"> {estimatedAPY}%</span>
                    </div>

                    <div className="flex flex-row  justify-between">
                      <span>Wallet</span>
                      <span>{truncateEthAddress(walletAddress)}<Image src="/copy.svg"
                                                                      className="hidden w-6 md:inline align-baseline ml-2"
                                                                      alt={"copy icon"} width={6} height={6}/> </span>
                    </div>
                    <div className="flex flex-row  justify-between">
                      <span>Contract Address</span>
                      <span>{truncateEthAddress(lendingPlatformAddress)}<Image src="/copy.svg"
                                                                               className="hidden md:inline w-6 align-baseline ml-2"
                                                                               alt={"copy icon"} width={6} height={6}/> </span>
                    </div>
                  </div>
                  <div className="divider h-0.5 w-full bg-gray-100 my-8"></div>
                </div>}


                {/*total*/}
                {!lendSuccess && <div>
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
                  {usdcBalanceDataIsLoading ?
                    <p>Loading balance...</p> :
                    <>
                      {/* Check if user has insufficient balance */}
                      {usdcBalanceData && BigNumber.from(usdcBalanceData.value).lt(ethers.utils.parseUnits(lendAmount, 6)) &&
                        <button
                          disabled={true}
                          className="btn btn-block border-0 normal-case text-xl mb-4 disabled:!text-shrub-grey-200 disabled:!bg-shrub-grey-50"
                        >
                          Insufficient Balance
                        </button>
                      }
                      {/* Show Approve button if allowance is insufficient, and balance is enough */}
                      {!allowance || BigNumber.from(allowance).lt(ethers.utils.parseUnits(lendAmount, 6)) ?
                        usdcBalanceData && !BigNumber.from(usdcBalanceData.value).lt(ethers.utils.parseUnits(lendAmount, 6)) &&
                        <Web3Button
                          contractAddress={lendingPlatformAddress}
                          className="!btn !btn-block !bg-shrub-green !border-0 !normal-case !text-xl hover:!bg-shrub-green-500 !mb-4"
                          action={() => mutateAsyncApprove({
                            args: [
                              lendingPlatformAddress,
                              ethers.constants.MaxUint256
                            ]
                          })}
                          onSuccess={() => setIsApproved(true)}
                          onError={(e) => {
                            if (e instanceof Error) {
                              handleErrorMessages({err: e});
                            }
                          }}
                        >
                          Approve
                        </Web3Button> : null}

                      {(allowance && !BigNumber.from(allowance).lt(ethers.utils.parseUnits(lendAmount, 6))) && !(usdcBalanceData && BigNumber.from(usdcBalanceData.value).lt(ethers.utils.parseUnits(lendAmount, 6))) &&
                        <Web3Button
                          contractAddress={lendingPlatformAddress}
                          className="!btn !btn-block !bg-shrub-green !border-0 !normal-case !text-xl hover:!bg-shrub-green-500 !mb-4"
                          action={() => mutateAsyncDeposit({
                            args: [
                              timestamp,
                              ethers.utils.parseUnits(lendAmount, 6)
                            ]
                          })}
                          onSuccess={() => setLendSuccess(true)}
                          onError={(e) => {
                            if (e instanceof Error) {
                              handleErrorMessages({err: e});
                            }
                          }}
                        >
                          Deposit
                        </Web3Button>
                      }
                    </>}
                </div>}
                {lendSuccess && <button onClick={handleViewDash}
                                        className="btn btn-block bg-white border text-shrub-grey-700 hover:bg-gray-100 hover:border-shrub-grey-50 normal-case text-xl border-shrub-grey-50">View in Dashboard
                </button>}

                {!lendSuccess && <button onClick={onBackLend}
                                         className="btn btn-block bg-white border text-shrub-grey-700 hover:bg-gray-100 hover:border-shrub-grey-50 normal-case text-xl border-shrub-grey-50">Cancel
                </button>}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

  );
};
