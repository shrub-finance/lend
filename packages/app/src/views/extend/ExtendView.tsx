// ExtendView.tsx
import React, { useState } from 'react';
import Image from "next/image";
import { calculateLockupPeriod, fromEthDate, toEthDate } from '@shrub-lend/common';
import ExtendSummary from './ExtendSummary';

interface ExtendViewProps {
  timestamp: number;
  setTimestamp: (timestamp: number) => void;
  showAPYSection: boolean;
  setShowAPYSection: (show: boolean) => void;
  selectedLendPositionBalance: string;
  selectedLendPositionTermDate: Date;
  selectedPoolShareTokenAmount: number;
  selectedTokenSupply: number;
  selectedTotalEthYield: number;
  depositTerms: any[];
  estimatedAPY: string;
  setIsModalOpen: (isOpen: boolean) => void;
  selectedPoolTokenId: string;
}

const ExtendView: React.FC<ExtendViewProps> = ({
                                                 timestamp,
                                                 setTimestamp,
                                                 showAPYSection,
                                                 setShowAPYSection,
                                                 selectedLendPositionBalance,
                                                 selectedLendPositionTermDate,
                                                 selectedPoolShareTokenAmount,
                                                 selectedTokenSupply,
                                                 selectedTotalEthYield,
                                                 depositTerms,
                                                 estimatedAPY,
                                                 setIsModalOpen,
                                                 selectedPoolTokenId

                                               }) => {
  const [showSummary, setShowSummary] = useState(false);
  return (
    <>
    <div className="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-shrub-grey-600">
      <h3 className="text-xl font-semibold text-shrub-grey-900 dark:text-white">
        Extend Deposit
      </h3>
      <button type="button" onClick={() => setIsModalOpen(false)}
              className="text-shrub-grey-400 bg-transparent hover:bg-shrub-grey-100 hover:text-shrub-grey-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-shrub-grey-600 dark:hover:text-white">
        <svg className="w-3 h-3" xmlns="http://www.w3.org/2000/svg"
             fill="none" viewBox="0 0 14 14">
          <path stroke="currentColor" strokeLinecap="round"
                strokeLinejoin="round" strokeWidth="2"
                d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"></path>
        </svg>
        <span className="sr-only">Close modal</span>
      </button>
    </div>
      {!showSummary ?
  <div className="relative group w-full">
    <div className="absolute border rounded-3xl"></div>
    <div className="flex flex-col">
      <div className="card w-full text-left">
        <div className="card-body ">
          {/*amount control*/}
          <div className="form-control w-full">
            <div>
              <label className="label">
                <span className="label-text text-shrub-blue">Amount Being Extended</span>
              </label>
              <div className='w-full text-xl font-semibold flex flex-row'>
                                                            <span className='text-4xl font-medium text-left w-[500px]'>
                                                              {selectedLendPositionBalance} USDC
                                                            </span>
                <Image src='/usdc-logo.svg' className='w-10 inline align-baseline' alt={'usdc logo'} width={10}
                       height={10} />
              </div>
            </div>
          </div>

          {/*interest rate control*/}
          <div className="form-control w-full mt-4">
            <label className="label">
              <span className="label-text text-shrub-blue">New Lockup Period</span>
            </label>
            <ul className="flex flex-row">
              {depositTerms.filter(option => option.duration > new Date(selectedLendPositionTermDate)).map((item) => (
                <li key={item.id} className="mr-4">
                  <input
                    type="radio"
                    id={item.id} name="deposit-extension"
                    value={item.value}
                    className="hidden peer"
                    required
                    onChange={() => {
                      setTimestamp(toEthDate(item.duration))
                      setShowAPYSection(true)
                    }}
                  />
                  <label
                    htmlFor={item.id}
                    className="inline-flex items-center justify-center w-full px-4 py-3 text-shrub-grey bg-white border border-shrub-grey-light2 rounded-lg cursor-pointer peer-checked:shadow-shrub-thin peer-checked:border-shrub-green-50 peer-checked:bg-teal-50 peer-checked:text-shrub-green-500 hover:text-shrub-green hover:border-shrub-green dark:text-shrub-grey-400 dark:bg-shrub-grey-800 dark:hover:bg-shrub-grey-700 dark:hover:text-shrub-green dark:border-shrub-grey-700 dark:peer-checked:text-shrub-green-500 select-none">
                    <div className="block">
                      <div className="w-full text-lg font-semibold">{calculateLockupPeriod(item.duration)}
                      </div>
                    </div>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          {/*divider*/}
          <div className="divider h-0.5 w-full bg-shrub-grey-light2 my-8"></div>
          {/*display estimate apy*/}
          { showAPYSection && (<div className="hero-content flex-col mb-4">
              <p className="self-start text-lg">Estimated APY</p>
              <div className="card flex-shrink-0 w-full bg-teal-50 py-6 border-shrub-green border">
                <div className="text-center p-2">
                  <span className="sm: text-5xl md:text-6xl text-shrub-green-500 font-bold">{estimatedAPY}%</span>
                  <span className=" pl-3 text-2xl font-thin text-shrub-green-500">APY</span>
                </div>

              </div>
            </div>
          )}
          {/*CTA*/}
          <button
            className="btn btn-block bg-shrub-green border-0 hover:bg-shrub-green-500 text-xl text-white normal-case disabled:bg-shrub-grey-50 disabled:border-shrub-grey-100 disabled:text-white disabled:border"
            disabled={!timestamp}
            onClick={() => setShowSummary(true)}>
            Continue
          </button>
        </div>
      </div>
    </div>
  </div>:
    (
      <ExtendSummary
        lendAmountBeingExtended={selectedLendPositionBalance}
        estimatedAPY={estimatedAPY}
        newTimestamp={fromEthDate(timestamp)}
        oldTimestamp={selectedLendPositionTermDate}
        poolShareTokenAmount={selectedPoolShareTokenAmount}
        totalEthYield={selectedTotalEthYield}
        tokenSupply={selectedTokenSupply}
        poolTokenId={selectedPoolTokenId}

      />)}
    </>
  );
};

export default ExtendView;
