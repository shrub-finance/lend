import React, { useState } from 'react';
import Image from "next/image";
import { ethers } from 'ethers';
import {
  formatLargeUsdc,
  formatWad,
  requiredAdditionalCollateral,
  toEthDate
} from '../../utils/ethMethods';
import { Zero } from '../../constants';
import {
  chainlinkAggregatorAbi,
  chainlinkAggregatorAddress,
} from '../../utils/contracts';
import RepaySummaryView from './RepaySummaryView';
import {BorrowObj} from "../../types/types";
import {useFinancialData} from "../../components/FinancialDataContext";
import useEthPriceFromChainlink from "../../hooks/useEthPriceFromChainlink";

interface RepayViewProps {
  setIsModalOpen: (isOpen: boolean) => void;
  borrow: BorrowObj;
}

const RepayView: React.FC<RepayViewProps & { onModalClose: (date: Date) => void }> = ({
setIsModalOpen, borrow
})=> {
  const { store, dispatch } = useFinancialData();
  const [repayActionInitiated, setRepayActionInitiated] = useState(false);
  const [partialPaymentRequested, setPartialPaymentRequested] = useState(false);
  const {ethPrice, isLoading, error} = useEthPriceFromChainlink(chainlinkAggregatorAddress, chainlinkAggregatorAbi);
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


  return (
    <>
      <div className='flex items-center justify-between p-4 md:p-5 border-b rounded-t '>
        <h3 className='text-xl font-semibold text-shrub-grey-900 '>Repay</h3>
        <button type='button' onClick={closeModalAndPassData}
                className='text-shrub-grey-400 bg-transparent hover:bg-shrub-grey-100 hover:text-shrub-grey-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center  '>
          <svg className='w-3 h-3' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 14 14'>
            <path stroke='currentColor' strokeLinecap='round' strokeLinejoin='round' strokeWidth='2'
                  d='m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6'></path>
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
                    <div className='flex items-center pb-2'>
                      <button onClick={() => setPartialPaymentRequested(false)}>
                        <svg xmlns='http://www.w3.org/2000/svg' width='26' height='26' fill='none'
                             className='w-6 grow-0 order-0 flex-none'>
                          <path d='M20 12H4M4 12L10 18M4 12L10 6' stroke='black' strokeWidth='2' strokeLinecap='round'
                                strokeLinejoin='round' />
                        </svg>
                      </button>
                    </div>
                    <div>
                      <label className='label'>
                        <span className='label-text text-shrub-blue'>Repayment Amount</span>
                      </label>
                      <div className='w-full text-xl font-semibold flex flex-row'>
                                              <span
                                                className='text-4xl font-medium text-left w-[500px]'>{formatLargeUsdc(borrow.debt)} USDC</span>
                        <Image src='/usdc-logo.svg' className='w-10 inline align-baseline' alt={'usdc logo'} width={10}
                               height={10} />
                      </div>
                    </div>
                  </div>

                  <div className='divider h-0.5 w-full bg-shrub-grey-light2 my-8'></div>

                  {/*CTA*/}
                  <button
                    className='btn btn-block bg-shrub-green border-0 hover:bg-shrub-green-500 text-xl text-white normal-case disabled:bg-shrub-grey-50 disabled:border-shrub-grey-100 disabled:text-white disabled:border'
                    onClick={() => {
                      setPartialPaymentRequested(false);
                    }}>
                    Continue
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
