import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  formatLargeUsdc, formatWad, toEthDate,
  truncateEthAddress,
} from '../../utils/ethMethods';
import { lendingPlatformAbi, lendingPlatformAddress, usdcAbi, usdcAddress } from '../../utils/contracts';
import { handleErrorMessagesFactory } from '../../utils/handleErrorMessages';
import { Borrow, BorrowObj } from '../../types/types';
import { useAddress, useContract, useContractRead, Web3Button } from '@thirdweb-dev/react';
import { useFinancialData } from '../../components/FinancialDataContext';
import { ethers } from 'ethers';

interface RepayViewProps {
  borrow: BorrowObj;
  setIsModalOpen: (isOpen: boolean) => void;
}

const RepayView: React.FC<RepayViewProps & { onModalClose: () => void }> = (
  { borrow, setIsModalOpen, onModalClose }
) => {
  const closeModalAndPassData = () => { setIsModalOpen(false); };
  const walletAddress = useAddress();
  const [localError, setLocalError] = useState('');
  const handleErrorMessages = handleErrorMessagesFactory(setLocalError);
  const [repayActionInitiated, setRepayActionInitiated] = useState(false);
  const { dispatch } = useFinancialData();
  const [approveUSDCActionInitiated, setApproveUSDCActionInitiated] = useState(false);
  const [erc20ApprovalNeeded, setErc20ApprovalNeeded] = useState('');
  const borrowDebt = borrow.debt;
  const {
    contract: usdc,
    isLoading: usdcIsLoading,
    error: usdcError } = useContract(usdcAddress, usdcAbi);
  const {
    data: usdcAllowance,
    isLoading: usdcAllowanceIsLoading,
    error: usdcAllowanceError,
  } = useContractRead(usdc, 'allowance', [walletAddress, lendingPlatformAddress]);

  useEffect(() => {
    if (erc20ApprovalNeeded !== 'usdc' && (!usdcAllowance || ethers.BigNumber.from(usdcAllowance).lt(borrowDebt))) {
      return setErc20ApprovalNeeded('usdc');
    }
    if (erc20ApprovalNeeded !== 'none' && usdcAllowance && ethers.BigNumber.from(usdcAllowance).gte(borrowDebt)) {
      setErc20ApprovalNeeded('none');
    }
  }, [usdcAllowance, usdcAllowanceIsLoading, approveUSDCActionInitiated, borrowDebt]);

  return (
    <>
      <div className='flex items-center justify-between p-4 md:p-5 border-b rounded-t '>
        <h3 className='text-xl font-semibold text-shrub-grey-900 '>Repay Borrow</h3>
        <button type='button' onClick={closeModalAndPassData}
                className='text-shrub-grey-400 bg-transparent hover:bg-shrub-grey-100 hover:text-shrub-grey-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center  '>
          <svg className='w-3 h-3' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 14 14'>
            <path stroke='currentColor' strokeLinecap='round' strokeLinejoin='round' strokeWidth='2'
                  d='m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6'></path>
          </svg>
          <span className='sr-only'>Close modal</span>
        </button>
      </div>
      <div className='relative group mt-4 w-full min-w-[500px]'>
        <div className='flex flex-col'>
          <div className='card w-full'>
            <div className='card-body'>
              <div>
                <div className='w-full text-xl font-semibold flex flex-row'>
                  <span className='text-4xl font-medium text-left w-[500px]'>{formatLargeUsdc(borrowDebt)} USDC</span>
                  <Image alt='usdc icon' src='/usdc-logo.svg' className='w-10 inline align-baseline' width='40' height='40' />
                </div>
                <p className='text-shrub-grey-700 text-lg text-left font-light pt-8 max-w-[550px]'>
                  Repaying will end the loan of <span className='font-bold'>{formatLargeUsdc(borrowDebt)}</span> USDC and return back to you the collateral <span className='font-bold'>{formatWad(borrow.collateral, 6)} ETH</span> with
                  due date <span className='font-bold'>{borrow.endDate.toLocaleString()}.</span>
                </p>
              </div>

              <div className='divider h-0.5 w-full bg-shrub-grey-light3 my-8'></div>

              {/*Receipt start*/}
              <div>
                <div className='mb-2 flex flex-col gap-3 text-shrub-grey-200 text-lg font-light'>
                  <div className='flex flex-row justify-between'>
                    <span className=''>USDC to repay</span>
                    <span>{formatLargeUsdc(borrowDebt)} USDC</span>
                  </div>
                  <div className='flex flex-row justify-between'>
                    <span className=''>Collateral to receive</span>
                    <span>{formatWad(borrow.collateral, 6)} ETH</span>
                  </div>
                  <div className='flex flex-row justify-between'>
                    <span className=''>Contract Address</span>
                    <span>{truncateEthAddress(lendingPlatformAddress)}
                      <Image alt='copy icon' src='/copy.svg' className='w-6 hidden md:inline align-baseline ml-2'
                             width='24' height='24' />
                    </span>
                  </div>
                  <div className='flex flex-row justify-between'>
                    <span className=''>End Date</span>
                    <span>{borrow.endDate.toLocaleString()}</span>
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
                                  isDisabled={repayActionInitiated}
                                  className='!btn !btn-block !bg-shrub-green !border-0 !text-white !normal-case !text-xl hover:!bg-shrub-green-500 !mb-4'
                                  action={async (lendingPlatform) => {
                                    setLocalError('');
                                    // @ts-ignore
                                    return await lendingPlatform.contractWrapper.writeContract.repayBorrow(borrow.id, walletAddress);
                                  }}
                                  onSuccess={async (tx) => {
                                    setLocalError("");
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
                                      tempData: true,
                                    };
                                    dispatch({
                                      type: 'ADD_BORROW',
                                      payload: newBorrowRepay,
                                    });
                                    dispatch({
                                      type: "UPDATE_BORROW_STATUS",
                                      payload: {
                                        id: borrow.id.toString(),
                                        status: "repaying",
                                        tempData: true
                                      },
                                    });
                                    try {
                                      const receipt = await tx.wait();
                                      if (!receipt.status) {
                                        throw new Error("Transaction failed");
                                      }
                                      dispatch({
                                        type: "UPDATE_BORROW_STATUS",
                                        payload: {
                                          id: `${tx.hash}-repay`,
                                          status: 'confirmed',
                                          tempData: true,
                                        },
                                      });
                                      dispatch({
                                        type: "UPDATE_BORROW_STATUS",
                                        payload: {
                                          id: borrow.id.toString(),
                                          status: "repaid",
                                          tempData: true
                                        },
                                      });
                                    } catch (e) {
                                      console.log("Transaction failed:", e);
                                      dispatch({
                                        type: 'UPDATE_BORROW_STATUS',
                                        payload: {
                                          id: `${tx.hash}-repay`,
                                          status: 'failed',
                                          tempData: true,
                                        },
                                      });
                                      dispatch({
                                        type: 'UPDATE_BORROW_STATUS',
                                        payload: {
                                          id: borrow.id.toString(),
                                          status: 'failed',
                                          tempData: true,
                                        },
                                      });
                                    }
                                    setRepayActionInitiated(true);
                                  }}
                                  onError={(e) => {
                                    handleErrorMessages({ err: e });
                                  }}>
                        {!repayActionInitiated ? 'Proceed to Repay' : 'Repay Order Submitted'}
                      </Web3Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RepayView;
