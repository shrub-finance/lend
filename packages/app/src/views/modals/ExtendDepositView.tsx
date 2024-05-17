import React, { useState } from 'react';
import Image from "next/image";
import { calculateLockupPeriod, fromEthDate, toEthDate } from '@shrub-lend/common';
import ExtendDepositSummaryView from './ExtendDepositSummaryView';
import {ethers} from "ethers";
import {formatLargeUsdc, formatPercentage} from "../../utils/ethMethods";
import {useFinancialData} from "../../components/FinancialDataContext";

interface ExtendDepositViewProps {
  timestamp: number;
  setTimestamp: (timestamp: number) => void;
  showAPYSection: boolean;
  setShowAPYSection: (show: boolean) => void;
  selectedDepositBalance: ethers.BigNumber;
  selectedDepositTermDate: Date;
  selectedPoolShareTokenAmount: ethers.BigNumber;
  selectedTokenSupply: ethers.BigNumber;
  selectedTotalEthYield: ethers.BigNumber;
  estimatedAPY: ethers.BigNumber;
  setIsModalOpen: (isOpen: boolean) => void;
  selectedPoolTokenId: string;
}

const ExtendDepositView: React.FC<ExtendDepositViewProps & { onModalClose: (date: Date) => void }> = ({
                                                 timestamp,
                                                 setTimestamp,
                                                 showAPYSection,
                                                 setShowAPYSection,
                                                 selectedDepositBalance,
                                                 selectedDepositTermDate,
                                                 selectedPoolShareTokenAmount,
                                                 selectedTokenSupply,
                                                 selectedTotalEthYield,
                                                 estimatedAPY,
                                                 setIsModalOpen,
                                                 onModalClose
                                               }) => {
  const [showSummary, setShowSummary] = useState(false);
  const { store, dispatch } = useFinancialData();
  const handleExtendDepositBack = () => {
    setShowSummary(false)
  };
  const [extendDepositActionInitiated, setExtendDepositActionInitiated] = useState(false);
  const handleExtendDepositActionChange = (initiated) => {
    setExtendDepositActionInitiated(initiated);
  };
  const closeModalAndPassData = () => {
    if (extendDepositActionInitiated) {
      onModalClose(fromEthDate(timestamp));
    }
    setIsModalOpen(false);
  };

  return (
    <>
    <div className="flex items-center justify-between p-4 md:p-5 border-b rounded-t ">
      <h3 className="text-xl font-semibold text-shrub-grey-900 ">Extend Deposit</h3>
      <button type="button" onClick={closeModalAndPassData} className="text-shrub-grey-400 bg-transparent hover:bg-shrub-grey-100 hover:text-shrub-grey-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center  ">
        <svg className="w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"></path>
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
          <div className="form-control w-full">
            <div>
              <label className="label">
                <span className="label-text text-shrub-blue">Amount Being Extended</span>
              </label>
              <div className='w-full text-xl font-semibold flex flex-row'>
                <span className='text-4xl font-medium text-left w-[500px]'>{formatLargeUsdc(selectedDepositBalance)} USDC</span>
                <Image src='/usdc-logo.svg' className='w-10 inline align-baseline' alt={'usdc logo'} width={10} height={10} />
              </div>
            </div>
          </div>
          <div className="form-control w-full mt-4">
            <label className="label">
              <span className="label-text text-shrub-blue">New Lockup Period</span>
            </label>
            <ul className="flex flex-row">
              {store.activePoolTimestamps.filter(activePoolTimestamp => activePoolTimestamp > selectedDepositTermDate).map((activePoolTimestamp) => (
                <li key={activePoolTimestamp.toISOString()} className="mr-4">
                  <input
                    type="radio"
                    id={activePoolTimestamp.toISOString()}
                    name="deposit-extension"
                    value={toEthDate(activePoolTimestamp)}
                    className="hidden peer"
                    required
                    onChange={() => {
                      setTimestamp(toEthDate(activePoolTimestamp))
                      setShowAPYSection(true)
                    }}
                  />
                  <label
                    htmlFor={activePoolTimestamp.toISOString()}
                    className="inline-flex items-center justify-center w-full px-4 py-3 text-shrub-grey bg-white border border-shrub-grey-light2 rounded-lg cursor-pointer peer-checked:shadow-shrub-thin peer-checked:border-shrub-green-50 peer-checked:bg-teal-50 peer-checked:text-shrub-green-500 hover:text-shrub-green hover:border-shrub-green       select-none">
                    <div className="block">
                      <div className="w-full text-lg font-semibold">{calculateLockupPeriod(activePoolTimestamp)}
                      </div>
                    </div>
                  </label>
                </li>
              ))}
            </ul>
          </div>
          {/*divider*/}
          <div className="divider h-0.5 w-full bg-shrub-grey-light2 my-8"></div>
          { showAPYSection && (<div className="hero-content flex-col mb-4">
              <p className="self-start text-lg">Estimated APY</p>
              <div className="card flex-shrink-0 w-full bg-teal-50 py-6 border-shrub-green border">
                <div className="text-center p-2">
                  <span className="sm: text-5xl md:text-6xl text-shrub-green-500 font-bold">{formatPercentage(estimatedAPY)}%</span>
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
  </div>
        :
      <ExtendDepositSummaryView
        depositAmountBeingExtended={selectedDepositBalance}
        estimatedAPY={estimatedAPY}
        newTimestamp={fromEthDate(timestamp)}
        oldTimestamp={selectedDepositTermDate}
        poolShareTokenAmount={selectedPoolShareTokenAmount}
        totalEthYield={selectedTotalEthYield}
        tokenSupply={selectedTokenSupply}
        onBackExtend={handleExtendDepositBack}
        onExtendDepositActionChange={handleExtendDepositActionChange}
      />
      }
    </>
  );
};

export default ExtendDepositView;
