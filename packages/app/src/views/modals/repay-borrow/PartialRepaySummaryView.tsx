import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  calcLtv,
  formatLargeUsdc,
  formatPercentage,
  toEthDate,
  truncateEthAddress,
} from '../../../utils/ethMethods';
import { getContractAbis, getContractAddresses } from '../../../utils/contracts';
import { handleErrorMessagesFactory } from '../../../components/HandleErrorMessages';
import { Borrow, BorrowObj } from '../../../types/types';
import {useAddress, useContract, useContractRead, Web3Button} from '@thirdweb-dev/react';
import { useFinancialData } from '../../../components/FinancialDataContext';
import { ethers } from 'ethers';
import { Zero } from '../../../constants';
import {getChainInfo} from "../../../utils/chains";
import {useEthPrice} from "../../../hooks/useEthPriceFromShrub";

interface PartialRepaySummaryViewProps {
  borrow: BorrowObj;
  onBackRepay: () => void;
  repayAmount: ethers.BigNumber;
  newLtv: ethers.BigNumber;
}

const PartialRepaySummaryView: React.FC<PartialRepaySummaryViewProps> = (
  {
    borrow,
    onBackRepay,
    repayAmount,
    newLtv,
  },
) => {
  const { chainId } = getChainInfo();
  const {usdcAddress, lendingPlatformAddress } = getContractAddresses(chainId);
  const {usdcAbi, lendingPlatformAbi } = getContractAbis(chainId);

  const walletAddress = useAddress();
  const { ethPrice, isLoading, error } = useEthPrice(lendingPlatformAddress, lendingPlatformAbi);
  const [localError, setLocalError] = useState('');
  const handleErrorMessages = handleErrorMessagesFactory(setLocalError);
  const [partialRepayActionInitiated, setPartialRepayActionInitiated] = useState(false);
  const { dispatch } = useFinancialData();
  const [approveUSDCActionInitiated, setApproveUSDCActionInitiated] = useState(false);
  const [erc20ApprovalNeeded, setErc20ApprovalNeeded] = useState('');
  const {
    contract: usdc,
    isLoading: usdcIsLoading,
    error: usdcError,
  } = useContract(usdcAddress, usdcAbi);
  const {
    data: usdcAllowance,
    isLoading: usdcAllowanceIsLoading,
    error: usdcAllowanceError,
  } = useContractRead(usdc, 'allowance', [walletAddress, lendingPlatformAddress]);

  useEffect(() => {
    if (erc20ApprovalNeeded !== 'usdc' && (!usdcAllowance || ethers.BigNumber.from(usdcAllowance).lt(borrow.debt))) {
      return setErc20ApprovalNeeded('usdc');
    }
    if (erc20ApprovalNeeded !== 'none' && usdcAllowance && ethers.BigNumber.from(usdcAllowance).gte(borrow.debt)) {
      setErc20ApprovalNeeded('none');
    }
  }, [usdcAllowance, usdcAllowanceIsLoading, approveUSDCActionInitiated, borrow.debt]);

  let originalBorrowLTV = Zero;
  if (ethPrice && !ethPrice.isZero()) {
    originalBorrowLTV = calcLtv(borrow.debt, borrow.collateral, ethPrice);
  }
  const newPrincipal = borrow.principal.add(borrow.interest).sub(repayAmount);

  return (
    <>
      <div className='relative group mt-4 w-full min-w-[500px]'>
        <div className='flex flex-col'>

          <div className='w-full text-xl font-semibold flex flex-row'>
            <span className='text-4xl font-medium text-left w-[500px]'>{formatLargeUsdc(repayAmount)} USDC</span>
            <Image alt='usdc icon' src='/usdc-logo.svg' className='w-10 inline align-baseline' width='40' height='40' />
          </div>
          <p className='text-shrub-grey-700 text-lg text-left font-light pt-8 max-w-[550px]'>
            Making a partial payment of {formatLargeUsdc(repayAmount)} USDC to your borrow will reduce the interest to 0 USDC and the principal to {formatLargeUsdc(newPrincipal)} USDC. The LTV of the loan will change from {formatPercentage(originalBorrowLTV)}% to {formatPercentage(newLtv)}%. You will not receive any collateral back, nor will this affect the APY of this borrow which is {formatPercentage(borrow.apy)}%.
          </p>

          <div className='divider h-0.5 w-full bg-shrub-grey-light3 my-8'></div>

          {/*Receipt start*/}
          <div>
            <div className='mb-2 flex flex-col gap-3 text-shrub-grey-200 text-lg font-light'>
              <div className='flex flex-row justify-between'>
                <span className=''>Current Principal</span>
                <span>{formatLargeUsdc(borrow.principal)} USDC</span>
              </div>
              <div className='flex flex-row justify-between'>
                <span className=''>Current Interest</span>
                <span>{formatLargeUsdc(borrow.interest)} USDC</span>
              </div>
              <div className='flex flex-row justify-between'>
                <span className=''>New Principal ✨</span>
                <span>{formatLargeUsdc(newPrincipal)} USDC</span>
              </div>
              <div className='flex flex-row justify-between cursor-pointer' onClick={() => onBackRepay()}>
                <span>New LTV ✨</span>
                <span className='font-semibold text-shrub-green-500'>{formatPercentage(newLtv)}%
                       <Image alt='edit icon' src='/edit.svg' className='w-5 inline align-baseline ml-2' width='20'
                              height='20' />
                    </span>
              </div>
              <div className='flex flex-row justify-between cursor-pointer' onClick={() => onBackRepay()}>
                <span>USDC to repay</span>
                <span className='font-semibold text-shrub-green-500'>{formatLargeUsdc(repayAmount)} USDC
                       <Image alt='edit icon' src='/edit.svg' className='w-5 inline align-baseline ml-2' width='20'
                              height='20' />
                    </span>
              </div>
              <div className='flex flex-row justify-between'>
                <span className=''>End Date</span>
                <span>{borrow.endDate.toDateString()}</span>
              </div>
              <div className='flex flex-row justify-between'>
                <span className=''>Contract Address</span>
                <span>{truncateEthAddress(lendingPlatformAddress)}
                  <Image alt='copy icon' src='/copy.svg' className='w-6 hidden md:inline align-baseline ml-2' width='24'
                         height='24' />
                    </span>
              </div>
            </div>
            <div className='divider h-0.5 w-full bg-shrub-grey-light3 my-8'></div>
            {usdcAllowanceIsLoading ? (
              <p>Loading allowance...</p>
            ) : (
              <>
                {erc20ApprovalNeeded === 'usdc' ? (
                  <Web3Button contractAddress={usdcAddress} contractAbi={usdcAbi}
                              isDisabled={approveUSDCActionInitiated}
                              className='!btn !btn-block !bg-shrub-green !border-0 !text-white !normal-case !text-xl hover:!bg-shrub-green-500 !mb-4'
                              action={
                                async (usdc) => {
                                  setLocalError('');
                                  // @ts-ignore
                                  return await usdc.contractWrapper.writeContract.approve(lendingPlatformAddress, ethers.constants.MaxUint256);
                                }
                              } onSuccess={async (tx) => {
                    setLocalError('');
                    try {
                      const receipt = await tx.wait();
                      if (!receipt.status) {
                        throw new Error('Transaction failed');
                      }
                      setApproveUSDCActionInitiated(true);
                    } catch (e) {
                      console.log('Transaction failed:', e);
                    }
                  }} onError={(e) => {
                    handleErrorMessages({ err: e });
                  }}>
                    {!approveUSDCActionInitiated ? 'Approve USDC' : 'USDC Approval Submitted'}
                  </Web3Button>
                ) : (
                  <Web3Button contractAddress={lendingPlatformAddress} contractAbi={lendingPlatformAbi}
                              isDisabled={partialRepayActionInitiated}
                              className='!btn !btn-block !bg-shrub-green !border-0 !text-white !normal-case !text-xl hover:!bg-shrub-green-500 !mb-4'
                              action={async (lendingPlatform) => {
                                setLocalError('');
                                //@ts-ignore
                                return await lendingPlatform.contractWrapper.writeContract.partialRepayBorrow(borrow.id, ethers.utils.parseUnits(formatLargeUsdc(repayAmount), 6));
                              }} onSuccess={async (tx) => {
                    setLocalError('');
                    const newBorrowRepay: Borrow = {
                      id: `${tx.hash}-partialPay`,
                      status: 'pending',
                      collateral: borrow.collateral,
                      created: Math.floor(Date.now() / 1000),
                      originalPrincipal: borrow.originalPrincipal.toString(),
                      paid: repayAmount.toString(),
                      apy: borrow.apy.toString(),
                      principal: borrow.principal.toString(),
                      currentBalanceOverride: formatLargeUsdc(repayAmount.mul(-1)),
                      timestamp: toEthDate(borrow.endDate).toString(),
                      startDate: Math.floor(Date.now() / 1000),
                      updated: Math.floor(Date.now() / 1000),
                      __typename: 'Borrow',
                      tempData: true,
                    };
                    dispatch({
                      type: 'ADD_BORROW',
                      payload: { address: walletAddress, borrow: newBorrowRepay },
                    });
                    dispatch({
                      type: 'UPDATE_BORROW_STATUS',
                      payload: {
                        address: walletAddress,
                        id: borrow.id.toString(),
                        status: 'partialRepaying',
                      },
                    });
                    try {
                      const receipt = await tx.wait();
                      if (!receipt.status) {
                        throw new Error('Transaction failed');
                      }
                      dispatch({
                        type: 'UPDATE_BORROW_STATUS',
                        payload: {
                          address: walletAddress,
                          id: `${tx.hash}-partialPay`,
                          status: 'confirmed',
                        },
                      });
                      dispatch({
                        type: 'UPDATE_BORROW_STATUS',
                        payload: {
                          address: walletAddress,
                          id: borrow.id.toString(),
                          status: 'partialRepaid',
                        },
                      });
                    } catch (e) {
                      console.log('Transaction failed:', e);
                      dispatch({
                        type: 'UPDATE_BORROW_STATUS',
                        payload: {
                          address: walletAddress,
                          id: `${tx.hash}-partialPay`,
                          status: 'failed',
                        },
                      });
                      dispatch({
                        type: 'UPDATE_BORROW_STATUS',
                        payload: {
                          address: walletAddress,
                          id: borrow.id.toString(),
                          status: 'failed',
                        },
                      });
                    }
                    setPartialRepayActionInitiated(true);
                  }} onError={(e) => {
                    handleErrorMessages({ err: e });
                  }}>
                    {!partialRepayActionInitiated ? 'Repay' : 'Repay Submitted'}
                  </Web3Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default PartialRepaySummaryView;
