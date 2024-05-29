  import React, { useState, useEffect } from 'react';
  import Image from "next/image";
  import {
    calcLtv, formatLargeUsdc, formatPercentage,

  } from '../../utils/ethMethods';
  import PartialRepaySummaryView from './PartialRepaySummaryView';
  import { BorrowObj } from "../../types/types";
  import useEthPriceFromChainlink from '../../hooks/useEthPriceFromChainlink';
  import { chainlinkAggregatorAbi, chainlinkAggregatorAddress } from '../../utils/contracts';
  import { ethers } from 'ethers';
  import { Zero } from '../../constants';
  import { useValidation } from '../../hooks/useValidation';
  import ErrorDisplay from '../../components/ErrorDisplay';

  interface PartialRepayViewProps {
    borrow: BorrowObj;
    isFullPay: boolean;
    partialPaymentRequested : boolean;
    setPartialPaymentRequested: (partialPaymentRequested: boolean) => void;
  }

  const PartialRepayView: React.FC<PartialRepayViewProps> = ({ borrow , isFullPay, partialPaymentRequested , setPartialPaymentRequested}) => {

    const {ethPrice, isLoading, error} = useEthPriceFromChainlink(chainlinkAggregatorAddress, chainlinkAggregatorAbi);
    const [repayActionInitiated, setRepayActionInitiated] = useState(false);
    const [repayAmount, setRepayAmount] = useState(formatLargeUsdc(borrow.debt));
    const [newLtv, setNewLtv] = useState<ethers.BigNumber>();
    const { errors: repayErrors, setError: setRepayError, clearError: clearRepayError } = useValidation();


    const handleRepayActionChange = (initiated) => {
      setRepayActionInitiated(initiated);
    };

    const format = (val: string) => val;

    const handleBackRepay = (data?) => {
      setPartialPaymentRequested(false)
    };

    const handleRepayAmountChange = (event) => {
      const inputValue = event.target.value.trim();
      const parsedValue = parseFloat(inputValue);
      setRepayAmount(inputValue);
      if (inputValue === '') {
        clearRepayError('validation');
        clearRepayError('exceeding');
        setNewLtv(Zero);
        return;
      }
      const isValidInput = /^[0-9]+(\.[0-9]*)?$/.test(inputValue);
      const isInvalidOrZero = !isValidInput || isNaN(parsedValue) || parsedValue === 0;
      if (isInvalidOrZero) {
        setRepayError('validation', 'Amount must be a number');
      } else {
        clearRepayError('validation');
      }
      if (parsedValue > parseFloat(formatLargeUsdc(borrow.debt))) {
        setRepayError('exceeding', 'Amount exceeds repayment amount');
      } else {
        clearRepayError('exceeding');
      }
      if (!isInvalidOrZero && parsedValue <= parseFloat(formatLargeUsdc(borrow.debt)) && ethPrice && !ethPrice.isZero()) {
        const newDebt = borrow.debt.sub(ethers.utils.parseEther(parsedValue.toString()));
        setNewLtv(calcLtv(newDebt, borrow.collateral, ethPrice));
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
        {!partialPaymentRequested ?
          <div className='relative group w-full'>
            <div className='flex flex-col'>
              <div className='card w-full text-left'>
                <div className='card-body'>
                    <div className='form-control w-full'>
                      <label className='label relative'>
                        <span className='label-text text-shrub-blue'>Amount</span>
                        <span className='label-text-alt  text-xl font-semibold absolute right-4 top-[57px]'>
                            <Image alt='usdc logo' src='/usdc-logo.svg' className='w-[22px] mr-1 inline align-sub'
                                   width='40' height='40' />USDC</span>
                      </label>
                      <input type='text' placeholder='Amount' name='amount' id='amount'
                             className='input input-bordered w-full h-[70px] bg-white border-solid border !border-shrub-grey-50 text-lg focus:outline-none focus:shadow-shrub-thin focus:border-shrub-green-50'
                             onChange={handleRepayAmountChange} value={format(repayAmount)} />
                      <ErrorDisplay errors={repayErrors} />
                    </div>
                  {/*divider*/}
                  <div className='divider h-0.5 w-full bg-shrub-grey-light2 my-8'></div>
                      <div className='hero-content flex-col mb-2'>
                        <p className='self-start text-lg'>Estimated LTV</p>
                        <div className='card flex-shrink-0 w-full bg-teal-50 py-6 border-shrub-green border'>
                          <div className='text-center p-2'>
                            <span
                              className='sm: text-5xl md:text-6xl text-shrub-green-500 font-bold'>{newLtv && formatPercentage(newLtv)}%</span>
                            <span className=' pl-3 text-2xl font-thin text-shrub-green-500'>LTV</span>
                          </div>
                        </div>
                      </div>
                  {/*CTA*/}
                  <button
                    className='btn btn-block bg-shrub-green border-0 hover:bg-shrub-green-500 text-xl text-white normal-case disabled:bg-shrub-grey-50 disabled:border-shrub-grey-100 disabled:text-white disabled:border'
                    onClick={() => {
                      setPartialPaymentRequested(true);
                    }}>
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          </div>
         :
          <PartialRepaySummaryView
            onBackRepay={handleBackRepay}
            onRepayActionChange={handleRepayActionChange}
            borrow={borrow}
            repayAmount={repayAmount}
            newLtv={newLtv}/>
        }

      </>
    );
  };

  export default PartialRepayView;

