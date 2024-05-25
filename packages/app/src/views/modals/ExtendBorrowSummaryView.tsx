import React, {useEffect, useState} from 'react';
import Image from 'next/image';
import {
  calcLtv,
  calcPercentage,
  ethInUsdc,
  formatLargeUsdc,
  formatPercentage, formatWad,
  fromEthDate, interestToLTV, ltvToInterest,
  toEthDate,
} from '../../utils/ethMethods';
import {
  chainlinkAggregatorAbi,
  chainlinkAggregatorAddress,
  lendingPlatformAbi,
  lendingPlatformAddress,
  usdcAbi,
  usdcAddress,
  aethAddress,
  aethAbi,
} from '../../utils/contracts';
import {BigNumber, ethers} from 'ethers';
import {
  useAddress,
  useContract,
  useContractRead,
  Web3Button,
} from '@thirdweb-dev/react';
import {handleErrorMessagesFactory} from '../../utils/handleErrorMessages';
import {useLazyQuery} from '@apollo/client';
import {ACTIVE_LENDINGPOOLS_QUERY} from '../../constants/queries';
import {useFinancialData} from '../../components/FinancialDataContext';
import useEthPriceFromChainlink from '../../hooks/useEthPriceFromChainlink';
import { Borrow, BorrowObj } from '../../types/types';

interface ExtendBorrowSummaryProps {
  onBackExtend: (data?) => void,
  borrow: BorrowObj
  newEndDate: number,
  targetLtv: ethers.BigNumber,
  additionalCollateral: ethers.BigNumber,
}

const ExtendBorrowSummaryView: React.FC<ExtendBorrowSummaryProps & {
  onExtendBorrowActionChange: (initiated: boolean) => void
}> = (
  {
    onBackExtend,
    onExtendBorrowActionChange,
    borrow,
    newEndDate,
    targetLtv,
    additionalCollateral,
  }) => {
  const {ethPrice, isLoading, error} = useEthPriceFromChainlink(chainlinkAggregatorAddress, chainlinkAggregatorAbi);
  const {store, dispatch} = useFinancialData();
  const walletAddress = useAddress();
  const [approveUSDCActionInitiated, setApproveUSDCActionInitiated] = useState(false);
  const [approveAETHActionInitiated, setApproveAETHActionInitiated] = useState(false);
  const [extendBorrowActionInitiated, setExtendBorrowActionInitiated] = useState(false);
  const [erc20ApprovalNeeded, setErc20ApprovalNeeded] = useState('');
  const [localError, setLocalError] = useState('');
  const handleErrorMessages = handleErrorMessagesFactory(setLocalError);
  const {
    contract: usdc,
    isLoading: usdcIsLoading,
    error: usdcError,
  } = useContract(usdcAddress, usdcAbi);
  const {
    contract: aeth,
    isLoading: aethIsLoading,
    error: aethError,
  } = useContract(aethAddress, aethAbi);
  const {
    data: usdcAllowance,
    isLoading: usdcAllowanceIsLoading,
    error: usdcAllowanceError,
  } = useContractRead(usdc, 'allowance', [walletAddress, lendingPlatformAddress]);
  const {
    data: aethAllowance,
    isLoading: aethAllowanceIsLoading,
    error: aethAllowanceError,
  } = useContractRead(aeth, 'allowance', [walletAddress, lendingPlatformAddress]);
  const ltv = borrow.collateral.isZero() || !ethPrice || ethPrice.isZero() ?
    BigNumber.from(0) :
    calcLtv(borrow.debt, borrow.collateral, ethPrice);

  useEffect(() => {
    console.log('running allowance useEffect');
    if (
      erc20ApprovalNeeded !== 'usdc' && (
        !usdcAllowance ||
        BigNumber.from(usdcAllowance).lt(ethers.utils.parseUnits(formatLargeUsdc(borrow.debt), 6))
      )
    ) {
      console.log('setting erc20ApprovalNeeded to usdc');
      return setErc20ApprovalNeeded('usdc');
    }
    if (
      erc20ApprovalNeeded !== 'aeth' && (
        !aethAllowance ||
        BigNumber.from(aethAllowance).lt(borrow.collateral)
      )
    ) {
      console.log('setting erc20ApprovalNeeded to aeth');
      return setErc20ApprovalNeeded('aeth');
    }
    if (erc20ApprovalNeeded !== 'none') {
      console.log('setting erc20ApprovalNeeded to none');
      setErc20ApprovalNeeded('none');
    }
  }, [usdcAllowanceIsLoading, aethAllowanceIsLoading, approveAETHActionInitiated, approveUSDCActionInitiated]);

  useEffect(() => {
    onExtendBorrowActionChange(extendBorrowActionInitiated);
  }, [extendBorrowActionInitiated, onExtendBorrowActionChange]);

  return (
    <div className='relative group mt-4 w-full min-w-[500px]'>
      <div className='flex flex-col'>
        <div className='card w-full'>
          <div className='card-body'>
            <div className='w-full text-xl font-semibold flex flex-row'>
              <span className='text-4xl  font-medium text-left w-[500px]'>{formatLargeUsdc(borrow.debt)} USDC</span>
              <Image alt='usdc icon' src='/usdc-logo.svg' className='w-10 inline align-baseline' width='40'
                     height='40'/>
            </div>
            <p className='text-shrub-grey-700 text-lg text-left font-light pt-8 max-w-[550px]'>
              When you extend this borrow of
              <span className='font-bold'>{' '}{formatLargeUsdc(borrow.debt)} USDC</span>, your
              existing borrow position
              token will be burnt and a new one will be minted reflecting the new date <span
              className='font-bold'>{newEndDate ? fromEthDate(newEndDate).toLocaleString() : toEthDate(store.platformData.activePoolTimestamps[store.platformData.activePoolTimestamps.length - 1])}</span>.
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
                <div className='flex flex-row  justify-between'>
                  <span className=''>Current LTV</span>
                  <span>
                    {formatPercentage(ltv)}%
                  </span>
                </div>
                <div className='flex flex-row  justify-between cursor-pointer'
                     onClick={(e) => onBackExtend('dateChangeRequest')}>
                  <span>New Due Date ✨</span>
                  <span className='font-semibold text-shrub-green-500'>
                    {newEndDate ? fromEthDate(newEndDate).toLocaleString() : toEthDate(store.platformData.activePoolTimestamps[store.platformData.activePoolTimestamps.length - 1])}<Image
                    alt='edit icon' src='/edit.svg' className='w-5 inline align-baseline ml-2' width='20' height='20' /></span>
                </div>
                <div className='flex flex-row  justify-between cursor-pointer'
                     onClick={(e) => onBackExtend('ltvChangeRequest')}>
                  <span className=''>Interest Rate</span>
                  <span className='font-semibold text-shrub-green-500'> {ltvToInterest[targetLtv.toString()]}%<Image
                    alt='edit icon' src='/edit.svg' className='w-5 inline align-baseline ml-2' width='20' height='20' /></span>
                </div>
              </div>

              <div className='divider h-0.5 w-full bg-shrub-grey-light3 my-8'></div>
              <div className='mb-6 flex flex-col gap-3 text-shrub-grey-200 text-lg font-light'>
                <div className='flex flex-row  justify-between'>
                  <span className=''>Additional Collateral</span>
                  <span>{ethers.utils.formatEther(additionalCollateral)} ETH</span>
                </div>
              </div>
              {/*approve and modals deposit*/}
              {(usdcAllowanceIsLoading || aethAllowanceIsLoading) ? (
                <p>Loading balance...</p>
              ) : (
                <>
                  {/* Approve if allowance is insufficient */}
                  {erc20ApprovalNeeded === 'usdc'
                    && (
                      <Web3Button contractAddress={usdcAddress} contractAbi={usdcAbi}
                                  isDisabled={approveUSDCActionInitiated}
                                  className='!btn !btn-block !bg-shrub-green !border-0 !text-white !normal-case !text-xl hover:!bg-shrub-green-500 !mb-4'
                                  action={
                                    async (usdc) => {
                                      setLocalError('');
                                      // @ts-ignore
                                      return await usdc.contractWrapper.writeContract.approve(lendingPlatformAddress, ethers.constants.MaxUint256);
                                    }
                                  } onSuccess={
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
                        handleErrorMessages({err: e});
                      }}>
                        {!extendBorrowActionInitiated && !approveUSDCActionInitiated ? 'Approve USDC' : 'USDC Approval Submitted'}
                      </Web3Button>
                    )
                  }


                  {/* Approve if allowance is insufficient */}
                  {erc20ApprovalNeeded === 'aeth'
                    && (
                      <Web3Button contractAddress={aethAddress} contractAbi={aethAbi}
                                  isDisabled={approveAETHActionInitiated}
                                  className='!btn !btn-block !bg-shrub-green !border-0 !text-white !normal-case !text-xl hover:!bg-shrub-green-500 !mb-4'
                                  action={
                                    async (aeth) => {
                                      setLocalError('');
                                      // @ts-ignore
                                      return await aeth.contractWrapper.writeContract.approve(lendingPlatformAddress, ethers.constants.MaxUint256);
                                    }
                                  } onSuccess={
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
                          setApproveAETHActionInitiated(true);
                        }} onError={(e) => {
                        console.log(e);
                        handleErrorMessages({err: e});
                      }}>
                        {!extendBorrowActionInitiated && !approveAETHActionInitiated ? 'Approve aETH' : 'aETH Approval Submitted'}
                      </Web3Button>
                    )
                  }
                  {erc20ApprovalNeeded === 'none'
                    && (
                      <Web3Button contractAddress={lendingPlatformAddress} contractAbi={lendingPlatformAbi}
                                  isDisabled={extendBorrowActionInitiated}
                                  className='web3button !btn !btn-block !bg-shrub-green !border-0 !text-white !normal-case !text-xl hover:!bg-shrub-green-500 !mb-4'
                                  action={
                                    async (lendingPlatform) => {
                                      setLocalError('');
                                      // @ts-ignore
                                      return await lendingPlatform.contractWrapper.writeContract.extendBorrow(
                                        borrow.id,
                                        newEndDate,
                                        additionalCollateral,
                                        0,  // Additional Repayment
                                        targetLtv, // LTV
                                        {value: additionalCollateral}
                                      );
                                    }
                                  }
                                  onSuccess={
                                    async (tx) => {
                                      setLocalError('');
                                      const newBorrowRepay: Borrow = {
                                        id: `${tx.hash}-repay`,
                                        status: 'pending',
                                        collateral: borrow.collateral,
                                        created: Math.floor(Date.now() / 1000),
                                        ltv: borrow.ltv.toString(),
                                        originalPrincipal: borrow.originalPrincipal.mul(-1).toString(),
                                        paid: "0",
                                        apy: borrow.apy.toString(),
                                        principal: borrow.principal.mul(-1).toString(),
                                        timestamp: toEthDate(borrow.endDate).toString(),
                                        startDate: Math.floor(Date.now() / 1000),
                                        updated: Math.floor(Date.now() / 1000),
                                        __typename: "Borrow",
                                        tempData: true
                                      };
                                      const newBorrow = {
                                        ...newBorrowRepay,
                                        id: `${tx.hash}-borrow`,
                                        principal: borrow.principal.toString(),
                                        originalPrincipal: borrow.originalPrincipal.toString(),
                                        timestamp: newEndDate.toString()

                                      };
                                      dispatch({
                                        type: 'ADD_BORROW',
                                        payload: { address: walletAddress, borrow: newBorrowRepay },
                                      });
                                      dispatch({
                                        type: 'ADD_BORROW',
                                        payload: { address: walletAddress, borrow: newBorrow },
                                      });
                                      dispatch({
                                        type: 'UPDATE_BORROW_STATUS',
                                        payload: {
                                          address: walletAddress,
                                          id: borrow.id.toString(),
                                          status: 'extending',
                                        },
                                      });
                                      try {
                                        const receipt = await tx.wait();
                                        if(!receipt.status) {
                                            throw new Error("Transaction failed")
                                        }
                                        dispatch({
                                          type: 'UPDATE_BORROW_STATUS',
                                          payload: {
                                            address: walletAddress,
                                            id: `${tx.hash}-borrow`,
                                            status: 'confirmed',
                                          },
                                        });
                                        dispatch({
                                          type: 'UPDATE_BORROW_STATUS',
                                          payload: {
                                            address: walletAddress,
                                            id: `${tx.hash}-repay`,
                                            status: 'confirmed',
                                          },
                                        });
                                        dispatch({
                                          type: 'UPDATE_BORROW_STATUS',
                                          payload: {
                                            address: walletAddress,
                                            id: borrow.id.toString(),
                                            status: 'extended',
                                          },
                                        });
                                      } catch (e) {
                                        console.log('Transaction failed:', e);
                                        dispatch({
                                          type: 'UPDATE_BORROW_STATUS',
                                          payload: {
                                            address: walletAddress,
                                            id: `${tx.hash}-borrow`,
                                            status: 'failed',
                                          },
                                        });
                                        dispatch({
                                          type: 'UPDATE_BORROW_STATUS',
                                          payload: {
                                            address: walletAddress,
                                            id: `${tx.hash}-repay`,
                                            status: 'failed',
                                          },
                                        });
                                      }
                                      setExtendBorrowActionInitiated(true);
                                    }}
                                  onError={(e) => {
                                    handleErrorMessages({err: e});
                                  }}>
                        {!extendBorrowActionInitiated ? 'Initiate Now' : 'Extend Order Submitted'}
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
