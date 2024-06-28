import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  formatLargeUsdc,
  formatPercentage,
  formatWad,
  toEthDate,
  truncateEthAddress
} from '../../utils/ethMethods';
import { getContractAbis, getContractAddresses } from '../../utils/contracts';
import { BigNumber, ethers } from 'ethers';
import {
  useAddress,
  useContract,
  useContractRead,
  Web3Button
} from '@thirdweb-dev/react';
import { handleErrorMessagesFactory } from '../../components/HandleErrorMessages';
import {Deposit, DepositObj} from "../../types/types";
import {useFinancialData} from "../../components/FinancialDataContext";
import useActiveLendingPools from '../../hooks/useActiveLendingPools';
import {getChainInfo} from "../../utils/chains";

interface ExtendDepositSummaryProps {
  deposit: DepositObj;
  estimatedAPY: ethers.BigNumber;
  newTimestamp: Date;
  onBackExtend: () => void;
}

const ExtendDepositSummaryView: React.FC<ExtendDepositSummaryProps & { onExtendDepositActionChange: (initiated: boolean) => void }> = (
  {
    deposit,
    estimatedAPY,
    newTimestamp,
    onBackExtend,
    onExtendDepositActionChange
  }
) => {
  const { chainId } = getChainInfo();
  const {usdcAddress, lendingPlatformAddress} = getContractAddresses(chainId);
  const {usdcAbi, lendingPlatformAbi} = getContractAbis(chainId);
  const {
    getActiveLendingPools,
    activeLendingPoolsLoading,
    activeLendingPoolsError,
    activeLendingPoolsData,
    activeLendingPoolsStartPolling,
    activeLendingPoolsStopPolling,
  } = useActiveLendingPools();

  const {dispatch} = useFinancialData();
  const walletAddress = useAddress();
  const [approveUSDCActionInitiated, setApproveUSDCActionInitiated] = useState(false);
  const [extendDepositActionInitiated, setExtendDepositActionInitiated] = useState(false);
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
    onExtendDepositActionChange(extendDepositActionInitiated);
  }, [extendDepositActionInitiated, onExtendDepositActionChange]);

  const depositAmountBeingExtended = deposit.positionPrincipal.add(deposit.positionUsdcInterest);


  return (
    <div className="relative group mt-4 w-full min-w-[500px]">
      <div className="flex flex-col">
        <div className="card w-full">
          <div className="card-body">
              <div className='w-full text-xl font-semibold flex flex-row'>
                <span className='text-4xl font-medium text-left w-[500px]'>{formatLargeUsdc(depositAmountBeingExtended)} USDC</span>
                <Image alt='usdc icon' src='/usdc-logo.svg' className='w-10 inline align-baseline' width='40' height='40' />
              </div>
              <p className='text-shrub-grey-700 text-lg text-left font-light pt-8 max-w-[550px]'>
                When you extend this deposit, {formatLargeUsdc(depositAmountBeingExtended)} USDC will be
                moved from the old lending pool ending {deposit.endDate.toLocaleString()} to the new lending pool ending {newTimestamp.toLocaleString()}. You will collect earned ETH yield of {formatWad(deposit.positionEthYield, 8)}.</p>


            <div className='divider h-0.5 w-full bg-shrub-grey-light3 my-8'></div>

            {/*receipt start*/}
            <div>
              <div className='mb-2 flex flex-col gap-3 text-shrub-grey-200 text-lg font-light'>
                <div className='flex flex-row  justify-between'>
                  <span className=''>Previous End Date</span>
                  <span>{deposit.endDate.toDateString()}</span>
                </div>
                <div className="flex flex-row  justify-between cursor-pointer" onClick={onBackExtend}>
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
             {/*approve and modals deposit*/}
             {(allowanceIsLoading) ? (
               <p>Loading balance...</p>
             ) : (
               <>
                 {/* Approve if allowance is insufficient */}
                 {!allowance ||
                 BigNumber.from(allowance).lt(
                   ethers.utils.parseUnits(formatLargeUsdc(depositAmountBeingExtended), 6),
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
                       {!extendDepositActionInitiated && !approveUSDCActionInitiated  ?'Approve USDC': 'USDC Approval Submitted'}
                     </Web3Button>
                   )
                   }

                 {allowance &&
                   !BigNumber.from(allowance).lt(
                     ethers.utils.parseUnits(formatLargeUsdc(depositAmountBeingExtended), 6),
                   ) && (
                     <Web3Button
                       contractAddress={lendingPlatformAddress}
                       contractAbi = {lendingPlatformAbi}
                       isDisabled={extendDepositActionInitiated}
                       className="web3button !btn !btn-block !bg-shrub-green !border-0 !text-white !normal-case !text-xl hover:!bg-shrub-green-500 !mb-4"
                       action={
                         async (lendingPlatform) =>
                         {
                           // @ts-ignore
                             return await lendingPlatform?.contractWrapper?.writeContract?.extendDeposit(
                               toEthDate(deposit.endDate),
                               toEthDate(newTimestamp),
                               deposit.lendingPoolTokenAmount
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
                                   item => item.timestamp === toEthDate(deposit.endDate).toString(),
                               );
                           const matchedLendingPool =
                               filteredLendingPools.length > 0
                                   ? filteredLendingPools[0]
                                   : null;
                           const newDepositWithdraw: Deposit = {
                               id: `${matchedLendingPool.id}-withdraw`,
                               status: "pending",
                               depositsUsdc: depositAmountBeingExtended.mul(-1).toString(),
                               apy: formatPercentage(estimatedAPY),
                               currentBalanceOverride: depositAmountBeingExtended.mul(-1).toString(),
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
                               timestamp: toEthDate(deposit.endDate),
                               updated: Math.floor(Date.now() / 1000),
                             tempData: true
                           };
                           const newDepositDeposit = {
                               ...newDepositWithdraw,
                               id: `${matchedLendingPool.id}-deposit`,
                               depositsUsdc: depositAmountBeingExtended.toString(),
                               currentBalanceOverride: depositAmountBeingExtended.toString(),
                               lendingPool: {
                                   ...newDepositWithdraw.lendingPool,
                                   timestamp: toEthDate(newTimestamp).toString()
                               }
                           };
                           dispatch({
                               type: "ADD_LEND_POSITION",
                               payload: { address: walletAddress, deposit: newDepositWithdraw },
                           });
                           dispatch({
                               type: "ADD_LEND_POSITION",
                               payload: { address: walletAddress, deposit: newDepositDeposit },
                           });
                           dispatch({
                               type: "UPDATE_LEND_POSITION_STATUS",
                               payload: {
                                  address: walletAddress,
                                   id: matchedLendingPool.id,
                                   status: "extending",
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
                                     address: walletAddress,
                                       id: `${matchedLendingPool.id}-deposit`,
                                       status: "confirmed",
                                   },
                               });
                               dispatch({
                                   type: "UPDATE_LEND_POSITION_STATUS",
                                   payload: {
                                     address: walletAddress,
                                       id: `${matchedLendingPool.id}-withdraw`,
                                       status: "confirmed",
                                   },
                               });
                               dispatch({
                                   type: "UPDATE_LEND_POSITION_STATUS",
                                   payload: {
                                     address: walletAddress,
                                       id: matchedLendingPool.id,
                                       status: "extended",
                                   },
                               });
                           } catch (e) {
                               console.log("Transaction failed:", e);
                               dispatch({
                                   type: "UPDATE_LEND_POSITION_STATUS",
                                   payload: {
                                     address: walletAddress,
                                       id: `${matchedLendingPool.id}-deposit`,
                                       status: "failed",
                                   },
                               });
                               dispatch({
                                   type: "UPDATE_LEND_POSITION_STATUS",
                                   payload: {
                                     address: walletAddress,
                                       id: `${matchedLendingPool.id}-withdraw`,
                                       status: "failed",
                                   },
                               });
                           }
                           setExtendDepositActionInitiated(true)
                       }}
                       onError={(e) => {
                         handleErrorMessages({err: e});
                       }}
                     >
                       {!extendDepositActionInitiated ?'Initiate Now': 'Extend Order Submitted'}
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

export default ExtendDepositSummaryView;
