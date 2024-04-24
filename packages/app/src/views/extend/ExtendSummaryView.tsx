import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import {formatLargeUsdc, formatPercentage, fromEthDate, toEthDate, truncateEthAddress} from '../../utils/ethMethods';
import { lendingPlatformAbi, lendingPlatformAddress, usdcAbi, usdcAddress } from '../../utils/contracts';
import { BigNumber, ethers } from 'ethers';
import {
  useAddress,
  useContract,
  useContractRead,
  Web3Button
} from '@thirdweb-dev/react';
import { handleErrorMessagesFactory } from '../../utils/handleErrorMessages';
import { useLazyQuery } from '@apollo/client';
import { ACTIVE_LENDINGPOOLS_QUERY } from '../../constants/queries';
import {Deposit} from "../../types/types";
import {useFinancialData} from "../../components/FinancialDataContext";

interface ExtendSummaryProps {
  lendAmountBeingExtended: ethers.BigNumber;
  estimatedAPY: ethers.BigNumber;
  oldTimestamp: Date;
  newTimestamp: Date;
  poolShareTokenAmount: ethers.BigNumber;
  totalEthYield: ethers.BigNumber;
  tokenSupply: ethers.BigNumber;
  onBackExtend: () => void;
}

const ExtendSummaryView: React.FC<ExtendSummaryProps & { onExtendActionChange: (initiated: boolean) => void }> = (
  { lendAmountBeingExtended,
    estimatedAPY,
    oldTimestamp,
    newTimestamp,
    poolShareTokenAmount,
    totalEthYield,
    tokenSupply,
    onBackExtend,
    onExtendActionChange}) =>
{
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

    const {store, dispatch} = useFinancialData();
  const walletAddress = useAddress();
  const [approveUSDCActionInitiated, setApproveUSDCActionInitiated] = useState(false);
  const [extendActionInitiated, setExtendActionInitiated] = useState(false);
  const {
    contract: usdc,
    isLoading: usdcIsLoading,
    error: usdcError
  } = useContract(usdcAddress, usdcAbi);
  const [localError, setLocalError] = useState("");
  const handleErrorMessages = handleErrorMessagesFactory(setLocalError);
  const {
    data: allowance,
    isLoading: allowanceIsLoading,
    error: errorAllowance
  } = useContractRead(usdc, "allowance", [walletAddress, lendingPlatformAddress]);


  useEffect(() => {
    if (!walletAddress) return;
    getActiveLendingPools().then().catch(error => {
      console.error("Failed to fetch active lending pools:", error);
    })}, [walletAddress, getActiveLendingPools]);


  useEffect(() => {
    if (activeLendingPoolsLoading) {
        return;
    }}, [activeLendingPoolsLoading]);


  useEffect(() => {
    onExtendActionChange(extendActionInitiated);
  }, [extendActionInitiated, onExtendActionChange]);


  return (
    <div className="relative group mt-4 w-full min-w-[500px]">
      <div className="flex flex-col">
        <div className="card w-full">
          <div className="card-body">
            <div>
              {!extendActionInitiated && (
                <div className='flex items-center'>
                  <button onClick={onBackExtend}>
                    <svg xmlns='http://www.w3.org/2000/svg' width='26' height='26' fill='none' className='w-6 grow-0 order-0 flex-none mr-[16px] mb-[4px]'>
                      <path d='M20 12H4M4 12L10 18M4 12L10 6' stroke='black' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
                    </svg>
                  </button>
                  <p className='text-lg font-bold pb-2 text-left'>Back</p>
                </div>
              )}

              <div className='w-full text-xl font-semibold flex flex-row'>
                <span className='text-4xl  font-medium text-left w-[500px]'>{formatLargeUsdc(lendAmountBeingExtended)} USDC</span>
                <Image alt='usdc icon' src='/usdc-logo.svg' className='w-10 inline align-baseline' width='40' height='40' />
              </div>
              <p className='text-shrub-grey-700 text-lg text-left font-light pt-8 max-w-[550px]'>
                When you extend this deposit, <span className='font-bold'>{formatLargeUsdc(lendAmountBeingExtended)} USDC</span> will be
                moved from the old lending pool ending<span
                className='font-bold'> {oldTimestamp?.toLocaleString()}</span> to the new lending pool ending <span
                className='font-bold'>{newTimestamp?.toLocaleString()}</span>. You will collect earned ETH yield of <span className='font-bold'>
                  {
                    poolShareTokenAmount && ethers.utils.formatUnits(ethers.BigNumber.from(poolShareTokenAmount).mul(totalEthYield).div(tokenSupply), 6)
                  }
              </span>.</p>
            </div>

            <div className='divider h-0.5 w-full bg-shrub-grey-light3 my-8'></div>

            {/*receipt start*/}
            <div>
              <div className='mb-2 flex flex-col gap-3 text-shrub-grey-200 text-lg font-light'>
                <div className='flex flex-row  justify-between'>
                  <span className=''>Previous End Date</span>
                  <span>{oldTimestamp?.toDateString()}</span>
                </div>
                <div className="flex flex-row  justify-between">
                  <span className="">New End Date</span>
                  <span>{newTimestamp?.toDateString()}
                    <Image alt="edit icon" src="/edit.svg" className="w-5 inline align-baseline ml-2" width="20" height="20"/>
                      </span>
                </div>
                <div className="flex flex-row  justify-between">
                  <span className="">Estimated Yield ✨</span>
                  <span className="font-semibold text-shrub-green-500"> {formatPercentage(estimatedAPY)}%</span>
                </div>
                <div className="flex flex-row  justify-between">
                  <span className="">Contract Address</span>
                  <span>{truncateEthAddress(lendingPlatformAddress)}
                    <Image alt="copy icon" src="/copy.svg" className="w-6 hidden md:inline align-baseline ml-2" width="24" height="24"/>
                      </span>
                </div>
              </div>

              <div className="divider h-0.5 w-full bg-shrub-grey-light3 my-8"></div>
             {/*approve and extend deposit*/}
             {(allowanceIsLoading) ? (
               <p>Loading balance...</p>
             ) : (
               <>
                 {/* Approve if allowance is insufficient */}
                 {!allowance ||
                 BigNumber.from(allowance).lt(
                   ethers.utils.parseUnits(formatLargeUsdc(lendAmountBeingExtended), 6),
                 )
                   && (
                     <Web3Button
                       contractAddress={usdcAddress}
                       contractAbi={usdcAbi}
                       isDisabled={approveUSDCActionInitiated}
                       className="!btn !btn-block !bg-shrub-green !border-0 !text-white !normal-case !text-xl hover:!bg-shrub-green-500 !mb-4"
                       action={
                         async (usdc) =>
                         {
                           setLocalError('');
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
                         console.log(e);
                         handleErrorMessages({err: e});
                       }}
                     >
                       {!extendActionInitiated && !approveUSDCActionInitiated  ?'Approve USDC': 'USDC Approval Submitted'}
                     </Web3Button>
                   )
                   }

                 {allowance &&
                   !BigNumber.from(allowance).lt(
                     ethers.utils.parseUnits(formatLargeUsdc(lendAmountBeingExtended), 6),
                   ) && (
                     <Web3Button
                       contractAddress={lendingPlatformAddress}
                       contractAbi = {lendingPlatformAbi}
                       isDisabled={extendActionInitiated}
                       className="web3button !btn !btn-block !bg-shrub-green !border-0 !text-white !normal-case !text-xl hover:!bg-shrub-green-500 !mb-4"
                       action={

                         async (lendingPlatform) =>
                         {
                             return await lendingPlatform?.contractWrapper?.writeContract?.extendDeposit(
                               toEthDate(oldTimestamp),
                               toEthDate(newTimestamp),
                               ethers.utils.formatUnits(poolShareTokenAmount, 0)
                             );
                         }
                     }
                       onSuccess={
                       async (tx) => {
                           setLocalError('');
                           if(activeLendingPoolsError) {
                               handleErrorMessages({ customMessage: activeLendingPoolsError.message } )
                               return
                           }
                           const filteredLendingPools =
                               activeLendingPoolsData && activeLendingPoolsData.lendingPools.filter(
                                   item => item.timestamp === toEthDate(oldTimestamp).toString(),
                               );
                           console.log(filteredLendingPools);

                           const matchedLendingPool =
                               filteredLendingPools.length > 0
                                   ? filteredLendingPools[0]
                                   : null;
                           const newDepositWithdraw: Deposit = {
                               id: `${matchedLendingPool.id}-withdraw`,
                               status: "pending",
                               depositsUsdc: lendAmountBeingExtended.mul(-1).toString(),
                               apy: formatPercentage(estimatedAPY),
                               currentBalanceOverride: lendAmountBeingExtended.mul(-1).toString(),
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
                               timestamp: toEthDate(oldTimestamp),
                               updated: Math.floor(Date.now() / 1000),
                           };
                           const newDepositDeposit = {
                               ...newDepositWithdraw,
                               id: `${matchedLendingPool.id}-deposit`,
                               depositsUsdc: lendAmountBeingExtended.toString(),
                               currentBalanceOverride: lendAmountBeingExtended.toString(),
                               lendingPool: {
                                   ...newDepositWithdraw.lendingPool,
                                   timestamp: toEthDate(newTimestamp).toString()
                               }
                           };
                           dispatch({
                               type: "ADD_LEND_POSITION",
                               payload: newDepositWithdraw,
                           });
                           dispatch({
                               type: "ADD_LEND_POSITION",
                               payload: newDepositDeposit,
                           });
                           dispatch({
                               type: "UPDATE_LEND_POSITION_STATUS",
                               payload: {
                                   id: matchedLendingPool.id,
                                   status: "extending"
                               },
                           });

                           try {
                               const receipt = await tx.wait();
                               if(!receipt.status) {
                                   throw new Error("Transaction failed")
                               }
                               dispatch({
                                   type: "UPDATE_LEND_POSITION_STATUS",
                                   payload: {
                                       id: `${matchedLendingPool.id}-deposit`,
                                       status: "confirmed",
                                   },
                               });
                               dispatch({
                                   type: "UPDATE_LEND_POSITION_STATUS",
                                   payload: {
                                       id: `${matchedLendingPool.id}-withdraw`,
                                       status: "confirmed",
                                   },
                               });
                               dispatch({
                                   type: "UPDATE_LEND_POSITION_STATUS",
                                   payload: {
                                       id: matchedLendingPool.id,
                                       status: "extended",
                                   },
                               });
                           } catch (e) {
                               console.log("Transaction failed:", e);
                               dispatch({
                                   type: "UPDATE_LEND_POSITION_STATUS",
                                   payload: {
                                       id: `${matchedLendingPool.id}-deposit`,
                                       status: "failed",
                                   },
                               });
                               dispatch({
                                   type: "UPDATE_LEND_POSITION_STATUS",
                                   payload: {
                                       id: `${matchedLendingPool.id}-withdraw`,
                                       status: "failed",
                                   },
                               });
                           }

                           setExtendActionInitiated(true)


                       }}
                       onError={(e) => {
                         handleErrorMessages({err: e});
                       }}
                     >
                       {!extendActionInitiated ?'Initiate Extend': 'Extend Order Submitted'}
                     </Web3Button>
                   )}
               </>
             )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExtendSummaryView;
