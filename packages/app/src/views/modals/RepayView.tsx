import React, { useState, useEffect } from 'react';
import Image from "next/image";
import {
  calcLtv, formatLargeUsdc, formatPercentage,

} from '../../utils/ethMethods';
import RepaySummaryView from './RepaySummaryView';
import { BorrowObj } from "../../types/types";
import useEthPriceFromChainlink from '../../hooks/useEthPriceFromChainlink';
import { chainlinkAggregatorAbi, chainlinkAggregatorAddress } from '../../utils/contracts';
import { ethers } from 'ethers';
import { Zero } from '../../constants';

interface RepayViewProps {
  setIsModalOpen: (isOpen: boolean) => void;
  borrow: BorrowObj;
}

const RepayView: React.FC<RepayViewProps & { onModalClose: (date: Date) => void }> = ({ setIsModalOpen, borrow }) => {

  const {ethPrice, isLoading, error} = useEthPriceFromChainlink(chainlinkAggregatorAddress, chainlinkAggregatorAbi);
  const [repayActionInitiated, setRepayActionInitiated] = useState(false);
  const [partialPaymentRequested, setPartialPaymentRequested] = useState(false);
  const [repayAmount, setRepayAmount] = useState(formatLargeUsdc(borrow.debt));
  const [isFullPay, setIsFullPay] = useState(true);
  const [newLtv, setNewLtv] = useState<ethers.BigNumber>();


  const handleBackRepay = (data) => {
    if (data === 'partialRepayRequest') {
      setPartialPaymentRequested(true)
    }
  };

  const handleRepayActionChange = (initiated) => {
    setRepayActionInitiated(initiated);
  };

  const closeModalAndPassData = () => {
    if (repayActionInitiated) {}
    setIsModalOpen(false);
  };

  const format = (val: string) => val;
  const [isValidationError, setIsValidationError] = useState(false);

  const handleRepayAmountChange = (event) => {
    const inputValue = event.target.value.trim();
    setRepayAmount(inputValue);
    if (inputValue === '') {
      setIsValidationError(false);
      return;
    }
    const isValidInput = /^[0-9]+(\.[0-9]*)?$/.test(inputValue);
    const parsedValue = parseFloat(inputValue);
    const isInvalidOrZero = !isValidInput || isNaN(parsedValue) || parsedValue === 0;

    setIsValidationError(isInvalidOrZero);

    if (!isInvalidOrZero && ethPrice && !ethPrice.isZero()) {
      const newDebt = borrow.debt.sub(ethers.utils.parseEther(parsedValue.toString()))
      console.log(newDebt)
      setNewLtv(calcLtv(newDebt, borrow.collateral, ethPrice));
      console.log(newLtv.toString());
    } else {
      setNewLtv(Zero);
    }
  };

  useEffect(() => {
    if (isFullPay) {
      setRepayAmount(formatLargeUsdc(borrow.debt));
    }
  }, [isFullPay, borrow.debt]);

  useEffect(() => {
    if (!ethPrice || ethPrice.isZero()) {
      return;
    }
    setNewLtv(calcLtv(borrow.debt, borrow.collateral, ethPrice));

  }, [ethPrice]);

  return (
    <>
      <div className='flex items-center justify-between p-4 md:p-5 border-b rounded-t '>
        <h3 className='text-xl font-semibold text-shrub-grey-900 '>Repay</h3>
        <button type='button' onClick={closeModalAndPassData}
                className='text-shrub-grey-400 bg-transparent hover:bg-shrub-grey-100 hover:text-shrub-grey-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center'>
          <svg className='w-3 h-3' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 14 14'>
            <path stroke='currentColor' strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6'></path>
          </svg>
          <span className='sr-only'>Close modal</span>
        </button>
      </div>
      {partialPaymentRequested ?
        <div className='relative group w-full'>
          <div className='absolute border rounded-3xl'></div>
          <div className='flex flex-col'>
            <div className='card w-full text-left'>
              <div className='card-body '>
                <div className='form-control w-full'>
                  <div className='flex items-center pb-8'>
                    <button onClick={() => setPartialPaymentRequested(false)}>
                      <svg xmlns='http://www.w3.org/2000/svg' width='26' height='26' fill='none'
                           className='w-6 grow-0 order-0 flex-none'>
                        <path d='M20 12H4M4 12L10 18M4 12L10 6' stroke='#98A2B3' strokeWidth='2' strokeLinecap='round'
                              strokeLinejoin='round' />
                      </svg>
                    </button>
                  </div>

                  <div className='form-control w-full'>
                    <div>
                      <div className='w-full text-xl font-semibold flex flex-row'>
                        <span
                          className='text-4xl font-medium text-left w-[500px]'>{formatLargeUsdc(borrow.debt)} USDC</span>
                        <Image src='/usdc-logo.svg' className='w-10 inline align-baseline' alt={'usdc logo'} width={10}
                               height={10} />
                      </div>
                    </div>
                  </div>

                  <div className='form-control w-full mt-6'>
                    <label className='label'>
                      <span className='label-text text-shrub-blue'></span>
                    </label>
                    <ul className='flex flex-row'>
                      <li className='mr-4'>
                        <input type='radio' id='fullPay' name='deposit-extension' value={formatLargeUsdc(borrow.debt)}
                               className='hidden peer' required onChange={() => {
                          setRepayAmount(formatLargeUsdc(borrow.debt));
                          setIsFullPay(true);
                          setNewLtv(calcLtv(borrow.debt, borrow.collateral, ethPrice));
                        }} checked={isFullPay} />
                        <label htmlFor='fullPay'
                               className='inline-flex items-center justify-center w-full px-4 py-3 text-shrub-grey bg-white border border-shrub-grey-light2 rounded-lg cursor-pointer peer-checked:shadow-shrub-thin peer-checked:border-shrub-green-50 peer-checked:bg-teal-50 peer-checked:text-shrub-green-500 hover:text-shrub-green hover:border-shrub-green select-none'>
                          <div className='block'>
                            <div className='w-full text-lg font-semibold'>Pay in Full
                            </div>
                          </div>
                        </label>
                      </li>
                      <li className='mr-4'>
                        <input type='radio' id='partialPay' name='deposit-extension' value='partialPay'
                               className='hidden peer' required onChange={() => {
                          setRepayAmount('');
                          setIsFullPay(false);
                          setNewLtv(Zero);
                        }} />
                        <label htmlFor='partialPay'
                               className='inline-flex items-center justify-center w-full px-4 py-3 text-shrub-grey bg-white border border-shrub-grey-light2 rounded-lg cursor-pointer peer-checked:shadow-shrub-thin peer-checked:border-shrub-green-50 peer-checked:bg-teal-50 peer-checked:text-shrub-green-500 hover:text-shrub-green hover:border-shrub-green select-none'>
                          <div className='block'>
                            <div className='w-full text-lg font-semibold'>Partial Pay</div>
                          </div>
                        </label>
                      </li>
                    </ul>
                  </div>
                </div>
                {!isFullPay &&
                  <div className='form-control w-full mt-8'>
                    <label className='label relative'>
                      <span className='label-text text-shrub-blue'>Amount</span>
                      <span className='label-text-alt  text-xl font-semibold absolute right-4 top-[57px]'>
                          <Image alt='usdc logo' src='/usdc-logo.svg' className='w-[22px] mr-1 inline align-sub'
                                 width='40' height='40' />USDC</span>
                    </label>
                    <input type='text' placeholder='Amount' name='amount' id='amount'
                           className='input input-bordered w-full h-[70px] bg-white border-solid border !border-shrub-grey-50 text-lg focus:outline-none focus:shadow-shrub-thin focus:border-shrub-green-50'
                           onChange={handleRepayAmountChange} value={format(repayAmount)} disabled={isFullPay} />
                    {isValidationError && (
                      <p className='mt-2 text-sm text-red-600 '> Amount must be a number </p>
                    )}
                  </div>}
                {/*divider*/}
                <div className='divider h-0.5 w-full bg-shrub-grey-light2 my-8'></div>
                {!isFullPay &&
                  <>
                    <div className='hero-content flex-col mb-4'>
                      <p className='self-start text-lg'>Estimated LTV</p>
                      <div className='card flex-shrink-0 w-full bg-teal-50 py-6 border-shrub-green border'>
                        <div className='text-center p-2'>
                          <span
                            className='sm: text-5xl md:text-6xl text-shrub-green-500 font-bold'>{formatPercentage(newLtv)}%</span>
                          <span className=' pl-3 text-2xl font-thin text-shrub-green-500'>LTV</span>
                        </div>
                      </div>
                    </div>
                  </>
                }
                {/*CTA*/}
                <button
                  className='btn btn-block bg-shrub-green border-0 hover:bg-shrub-green-500 text-xl text-white normal-case disabled:bg-shrub-grey-50 disabled:border-shrub-grey-100 disabled:text-white disabled:border'
                  onClick={() => {
                    setPartialPaymentRequested(false);
                  }}>
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
        :
        <RepaySummaryView onBackRepay={handleBackRepay} onRepayActionChange={handleRepayActionChange} borrow={borrow} />

      }
    </>
  );
};

export default RepayView;

