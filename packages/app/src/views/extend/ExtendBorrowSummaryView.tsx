import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import {calcPercentage, ethInUsdc, formatLargeUsdc, formatPercentage, interestToLTV} from '../../utils/ethMethods';
import {
  chainlinkAggregatorAbi,
  chainlinkAggregatorAddress,
  lendingPlatformAbi,
  lendingPlatformAddress,
  usdcAbi,
  usdcAddress,
} from '../../utils/contracts';
import { BigNumber, ethers } from 'ethers';
import {
  useAddress,
  useContract,
  useContractRead,
  Web3Button,
} from '@thirdweb-dev/react';
import { handleErrorMessagesFactory } from '../../utils/handleErrorMessages';
import { useLazyQuery } from '@apollo/client';
import { ACTIVE_LENDINGPOOLS_QUERY } from '../../constants/queries';
import { useFinancialData } from '../../components/FinancialDataContext';
import { depositTerms } from '../../constants';
import useEthPriceFromChainlink from '../../hooks/useEthPriceFromChainlink';
import {BorrowObj} from "../../types/types";
import borrow from "../../pages/borrow";

interface ExtendBorrowSummaryProps {
  onBackExtend: (data?) => void,
  borrow: BorrowObj
  debt: ethers.BigNumber,
  selectedDuration: string,
}

const ExtendBorrowSummaryView: React.FC<ExtendBorrowSummaryProps & {
  onExtendBorrowActionChange: (initiated: boolean) => void
}> = (
  {
    onBackExtend,
    onExtendBorrowActionChange,
    borrow,
    debt,
    selectedDuration,
  }) => {
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
  const { ethPrice, isLoading, error } = useEthPriceFromChainlink(chainlinkAggregatorAddress, chainlinkAggregatorAbi);
  const { store, dispatch } = useFinancialData();
  const walletAddress = useAddress();
  const [approveUSDCActionInitiated, setApproveUSDCActionInitiated] = useState(false);
  const [extendDepositActionInitiated, setExtendDepositActionInitiated] = useState(false);
  const {
    contract: usdc,
    isLoading: usdcIsLoading,
    error: usdcError,
  } = useContract(usdcAddress, usdcAbi);
  const [localError, setLocalError] = useState('');
  const handleErrorMessages = handleErrorMessagesFactory(setLocalError);
  const {
    data: allowance,
    isLoading: allowanceIsLoading,
    error: errorAllowance,
  } = useContractRead(usdc, 'allowance', [walletAddress, lendingPlatformAddress]);


  useEffect(() => {
    if (!walletAddress) return;
    getActiveLendingPools().then().catch(error => {
      console.error('Failed to fetch active lending pools:', error);
    });
  }, [walletAddress, getActiveLendingPools]);


  useEffect(() => {
    if (activeLendingPoolsLoading) {
      return;
    }
  }, [activeLendingPoolsLoading]);


  useEffect(() => {
    onExtendBorrowActionChange(extendDepositActionInitiated);
  }, [extendDepositActionInitiated, onExtendBorrowActionChange]);

    console.log(`debt: ${debt}`);
    console.log(`collateral: ${borrow.collateral}`);
    console.log(`ethPrice: ${ethPrice}`);
  const ltv = borrow.collateral.isZero() || !ethPrice || ethPrice.isZero() ?
    BigNumber.from(0) :
    // debt.div(ethInUsdc(borrow.collateral, ethPrice));

    calcPercentage(debt, ethInUsdc(borrow.collateral, ethPrice))

    console.log(`ltv: ${ltv.toString()}`);
  return (
    <div className='relative group mt-4 w-full min-w-[500px]'>
      <div className='flex flex-col'>
        <div className='card w-full'>
          <div className='card-body'>
            <div className='w-full text-xl font-semibold flex flex-row'>
              <span
                className='text-4xl  font-medium text-left w-[500px]'>{formatLargeUsdc(debt)} USDC</span>
              <Image alt='usdc icon' src='/usdc-logo.svg' className='w-10 inline align-baseline' width='40'
                     height='40' />
            </div>
            <p className='text-shrub-grey-700 text-lg text-left font-light pt-8 max-w-[550px]'>
              When you extend this borrow of
              <span className='font-bold'>{' '}{formatLargeUsdc(debt)} USDC</span>, your
              existing borrow position
              token will be burnt and a new one will be minted reflecting the new date <span
              className='font-bold'>{selectedDuration ? depositTerms.find(term => term.id === selectedDuration)?.duration.toLocaleString() : depositTerms[depositTerms.length - 1].duration.toLocaleString()}</span>.
            </p>
            <div className='divider h-0.5 w-full bg-shrub-grey-light3 my-8'></div>
            {/*receipt start*/}
            <div>
              <div className='mb-2 flex flex-col gap-3 text-shrub-grey-200 text-lg font-light'>
                <div className='flex flex-row  justify-between'>
                  <span className=''>Collateral</span>
                  <span>{ethers.utils.formatEther(borrow.collateral)} ETH</span>
                </div>
                <div className='flex flex-row  justify-between'>
                  <span className=''>Principal</span>
                  <span>{formatLargeUsdc(borrow.principal)} USDC</span>
                </div>
                <div className='flex flex-row  justify-between'>
                  <span className=''>Old Due Date</span>
                  <span>{borrow.endDate.toLocaleString()}
                  </span>
                </div>
                <div className='flex flex-row  justify-between cursor-pointer'
                     onClick={(e) => onBackExtend('dateChangeRequest')}>
                  <span className=''>New Due Date</span>
                  <span>
                    {selectedDuration ? depositTerms.find(term => term.id === selectedDuration)?.duration.toLocaleString() : depositTerms[depositTerms.length - 1].duration.toLocaleString()}<Image
                    alt='edit icon' src='/edit.svg' className='w-5 inline align-baseline ml-2' width='20' height='20' /></span>
                </div>
                <div className='flex flex-row  justify-between cursor-pointer'
                     onClick={(e) => onBackExtend('ltvChangeRequest')}>
                  <span className=''>Current LTV ✨</span>
                  <span className='font-semibold text-shrub-green-500'> {formatPercentage(ltv)}%<Image alt='edit icon'
                                                                                                src='/edit.svg'
                                                                                                className='w-5 inline align-baseline ml-2'
                                                                                                width='20'
                                                                                                height='20' /></span>
                </div>
              </div>

              <div className='divider h-0.5 w-full bg-shrub-grey-light3 my-8'></div>
              <div className='mb-6 flex flex-col gap-3 text-shrub-grey-200 text-lg font-light'>
                <div className='flex flex-row  justify-between'>
                  <span className=''>Additional Payment Required</span>
                  <span>{`calculatedField`}</span>
                </div>
              </div>
              {/*approve and extend deposit*/}
              {(allowanceIsLoading) ? (
                <p>Loading balance...</p>
              ) : (
                <>
                  {/* Approve if allowance is insufficient */}
                  {!allowance
                    // ||
                    // BigNumber.from(allowance).lt(ethers.utils.parseUnits(formatLargeUsdc('lendAmountBeingExtended'), 6),)
                    && (
                      <Web3Button contractAddress={usdcAddress} contractAbi={usdcAbi}
                                  isDisabled={approveUSDCActionInitiated}
                                  className='!btn !btn-block !bg-shrub-green !border-0 !text-white !normal-case !text-xl hover:!bg-shrub-green-500 !mb-4'
                                  action={
                                    async (usdc) => {
                                      setLocalError('');
                                      return await usdc.contractWrapper.writeContract.approve(lendingPlatformAddress, ethers.constants.MaxUint256);
                                    }} onSuccess={
                        async (tx) => {
                          setLocalError('');
                          try {
                            const receipt = await tx.wait();
                            if (!receipt.status) {
                              throw new Error('Transaction failed');
                            }
                          } catch (e) {
                            console.log('Transaction failed:', e);
                          }
                          setApproveUSDCActionInitiated(true);
                        }} onError={(e) => {
                        console.log(e);
                        handleErrorMessages({ err: e });
                      }}>
                        {!extendDepositActionInitiated && !approveUSDCActionInitiated ? 'Approve USDC' : 'USDC Approval Submitted'}
                      </Web3Button>
                    )
                  }

                  {allowance
                    // &&
                    // !BigNumber.from(allowance).lt(ethers.utils.parseUnits(formatLargeUsdc('lendAmountBeingExtended'), 6),)
                    && (
                      <Web3Button contractAddress={lendingPlatformAddress} contractAbi={lendingPlatformAbi}
                                  isDisabled={extendDepositActionInitiated}
                                  className='web3button !btn !btn-block !bg-shrub-green !border-0 !text-white !normal-case !text-xl hover:!bg-shrub-green-500 !mb-4'
                                  action={

                                    async (lendingPlatform) => {

                                    }
                                  } onSuccess={
                        async (tx) => {
                          setLocalError('');
                          if (activeLendingPoolsError) {
                            handleErrorMessages({ customMessage: activeLendingPoolsError.message });
                            return;
                          }
                          const filteredLendingPools = '';
                          // const filteredLendingPools =

                          const matchedLendingPool =
                            filteredLendingPools.length > 0
                              ? filteredLendingPools[0]
                              : null;
                          const newBorrowPositionWithdraw = {
                            id: `${matchedLendingPool}-withdraw`,
                            status: 'pending',
                            depositsUsdc: matchedLendingPool,
                            apy: formatPercentage('estimatedAPY'),
                            currentBalanceOverride: matchedLendingPool,
                            interestEarnedOverride: '0',
                            lendingPool: {
                              id: matchedLendingPool,
                              timestamp: matchedLendingPool,
                              tokenSupply: matchedLendingPool,
                              totalEthYield: matchedLendingPool,
                              totalPrincipal: matchedLendingPool,
                              totalUsdcInterest: matchedLendingPool,
                              __typename: matchedLendingPool,
                            },
                            timestamp: 1,
                          };
                          const newBorrowPositionDeposit = {
                            ...newBorrowPositionWithdraw,
                            id: `${matchedLendingPool}-borrow`,
                            depositsUsdc: 'borrowAmountBeingExtended'.toString(),
                            currentBalanceOverride: 'borrowAmountBeingExtended'.toString(),
                            lendingPool: {
                              ...newBorrowPositionWithdraw.lendingPool,
                              timestamp: matchedLendingPool,
                            },
                          };
                          dispatch({
                            type: 'ADD_LEND_POSITION',
                            // @ts-ignore
                            payload: newBorrowPositionWithdraw,
                          });
                          dispatch({
                            type: 'ADD_LEND_POSITION',
                            // @ts-ignore
                            payload: newBorrowPositionDeposit,
                          });
                          dispatch({
                            type: 'UPDATE_LEND_POSITION_STATUS',
                            payload: {
                              id: matchedLendingPool,
                              status: 'extending',
                            },
                          });

                          try {
                            const receipt = {};
                            // if(!receipt.status) {
                            //     throw new Error("Transaction failed")
                            // }
                            dispatch({
                              type: 'UPDATE_LEND_POSITION_STATUS',
                              payload: {
                                id: `${matchedLendingPool}-deposit`,
                                status: 'confirmed',
                              },
                            });
                            dispatch({
                              type: 'UPDATE_LEND_POSITION_STATUS',
                              payload: {
                                id: `${matchedLendingPool}-withdraw`,
                                status: 'confirmed',
                              },
                            });
                            dispatch({
                              type: 'UPDATE_LEND_POSITION_STATUS',
                              payload: {
                                id: matchedLendingPool,
                                status: 'extended',
                              },
                            });
                          } catch (e) {
                            console.log('Transaction failed:', e);
                            dispatch({
                              type: 'UPDATE_LEND_POSITION_STATUS',
                              payload: {
                                id: `${matchedLendingPool}-deposit`,
                                status: 'failed',
                              },
                            });
                            dispatch({
                              type: 'UPDATE_LEND_POSITION_STATUS',
                              payload: {
                                id: `${matchedLendingPool}-withdraw`,
                                status: 'failed',
                              },
                            });
                          }
                          setExtendDepositActionInitiated(true);
                        }} onError={(e) => {
                        handleErrorMessages({ err: e });
                      }}>
                        {!extendDepositActionInitiated ? 'Initiate Extend' : 'Extend Order Submitted'}
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

export default ExtendBorrowSummaryView;
