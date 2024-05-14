import React, { useEffect, useState } from 'react';
import Image from "next/image";
import { ethers } from 'ethers';
import {formatLargeUsdc, interestToLTV, roundEth, toEthDate} from '../../utils/ethMethods';
import { interestRates, Zero } from '../../constants';
import { useContract } from '@thirdweb-dev/react';
import { lendingPlatformAbi, lendingPlatformAddress } from '../../utils/contracts';
import ExtendBorrowSummaryView from './ExtendBorrowSummaryView';
import { formatDate } from '@shrub-lend/common';
import {BorrowObj} from "../../types/types";
import {useFinancialData} from "../../components/FinancialDataContext";

interface ExtendBorrowViewProps {
  setIsModalOpen: (isOpen: boolean) => void;
  borrow: BorrowObj;
}

const ExtendBorrowView: React.FC<ExtendBorrowViewProps & { onModalClose: (date: Date) => void }> = ({
setIsModalOpen, borrow
})=> {
  const { store, dispatch } = useFinancialData();
  const [selectedInterestRate, setSelectedInterestRate] = useState('8');
  const [extendActionInitiated, setExtendBorrowActionInitiated] = useState(false);
  const [requiredCollateralToExtendBorrow, setRequiredCollateralToExtendBorrow] = useState<ethers.BigNumber>(Zero);
  const [showExtendBorrowCollateralSection, setShowExtendBorrowCollateralSection] = useState(true);
  const [ltvChangeRequested, setLtvChangeRequested] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(toEthDate(store.activePoolTimestamps[store.activePoolTimestamps.length - 1]));
  const [showDueDateOptions, setShowDueDateOptions] = useState(false);
  const handleExtendBorrowBack = (data) => {
    setLtvChangeRequested(true);
    if (data === 'dateChangeRequest') {
      setShowDueDateOptions(true);
    }
    if (data === 'ltvChangeRequest') {
      setShowDueDateOptions(false);
    }
  };
  const handleExtendBorrowActionChange = (initiated) => {
    setExtendBorrowActionInitiated(initiated);
  };

  const closeModalAndPassData = () => {
    if (extendActionInitiated) {}
    setIsModalOpen(false);
  };

  const {
    contract: lendingPlatform,
    isLoading: lendingPlatformIsLoading,
    error: lendingPlatformError
  } = useContract(lendingPlatformAddress, lendingPlatformAbi);

  useEffect(() => {
    const determineRequiredCollateral = async () => {
      const ltv = interestToLTV[selectedInterestRate];
      const usdcUnits = ethers.utils.parseUnits(formatLargeUsdc(borrow.debt), 6);
      const coll: ethers.BigNumber = await lendingPlatform.call('requiredCollateral', [ltv, usdcUnits]);
      return roundEth(coll, 6);
    };
    if (selectedInterestRate !== "") {
      determineRequiredCollateral()
        .then(res => setRequiredCollateralToExtendBorrow(res))
        .catch(e => console.error(e));
    }
  }, [selectedInterestRate, lendingPlatform, setRequiredCollateralToExtendBorrow]);


  return (
    <>
      <div className="flex items-center justify-between p-4 md:p-5 border-b rounded-t ">
        <h3 className="text-xl font-semibold text-shrub-grey-900 ">Extending Borrow</h3>
        <button type="button" onClick={closeModalAndPassData} className="text-shrub-grey-400 bg-transparent hover:bg-shrub-grey-100 hover:text-shrub-grey-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center  ">
          <svg className="w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"></path>
          </svg>
          <span className="sr-only">Close modal</span>
        </button>
      </div>
      {ltvChangeRequested ?
        <div className="relative group w-full">
          <div className="absolute border rounded-3xl"></div>
          <div className="flex flex-col">
            <div className="card w-full text-left">
              <div className='card-body '>
                <div className='form-control w-full'>
                  <div className='flex items-center pb-2'>
                    <button onClick={() => setLtvChangeRequested(false)}>
                      <svg xmlns='http://www.w3.org/2000/svg' width='26' height='26' fill='none'
                           className='w-6 grow-0 order-0 flex-none'>
                        <path d='M20 12H4M4 12L10 18M4 12L10 6' stroke='black' strokeWidth='2' strokeLinecap='round'
                              strokeLinejoin='round' />
                      </svg>
                    </button>
                    {/*<p className='text-lg font-bold pb-2 text-left'>Back</p>*/}
                  </div>
                  <div>
                    <label className='label'>
                      <span className='label-text text-shrub-blue'>Amount Being Extended</span>
                    </label>
                    <div className='w-full text-xl font-semibold flex flex-row'>
                      <span
                        className='text-4xl font-medium text-left w-[500px]'>{formatLargeUsdc(borrow.debt)} USDC</span>
                      <Image src='/usdc-logo.svg' className='w-10 inline align-baseline' alt={'usdc logo'} width={10}
                             height={10} />
                    </div>
                  </div>
                </div>
                {/*due date*/}
                {showDueDateOptions ?
                  <div className='form-control w-full mt-4'>
                    <label className='label'>
                      <span className='label-text text-shrub-blue'>Due Date</span>
                    </label>
                    <ul className='flex flex-col gap-4'>
                      {store.activePoolTimestamps.filter(activePoolTimestamp => activePoolTimestamp > borrow.endDate).map((activePoolTimestamp) => (
                        <li className='mr-4' key={activePoolTimestamp.toISOString()}>
                          <input type='radio' id={activePoolTimestamp.toISOString()} name='borrow' value={toEthDate(activePoolTimestamp)} className='hidden peer'
                                 required onChange={(e) => {
                            setSelectedDuration(toEthDate(activePoolTimestamp));
                          }} checked={selectedDuration === toEthDate(activePoolTimestamp)} />
                          <label htmlFor={activePoolTimestamp.toISOString()}
                                 className='inline-flex items-center justify-center w-full px-8 py-3 text-shrub-grey-200 bg-white border border-shrub-grey-light2 rounded-lg cursor-pointer    peer-checked:shadow-shrub-thin peer-checked:border-shrub-green-50 peer-checked:bg-teal-50 peer-checked:text-shrub-green-500 hover:text-shrub-green hover:border-shrub-green hover:bg-teal-50   '>
                            <div className='block'>
                              <div className='w-full text-xl font-semibold'>{formatDate.long(activePoolTimestamp)}</div>
                            </div>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div> :
                  /*interest rate*/
                  <div className='form-control w-full pt-4'>
                    <label className='label'>
                      <span className='label-text text-shrub-blue'>Interest Rate</span>
                    </label>
                    <div>
                      <ul className='flex flex-row '>
                        {interestRates.map(({ id, rate }) => (
                          <li className='mr-4' key={id}>
                            <input type='radio' id={id} name='loan' value={id} className='hidden peer' checked={rate === selectedInterestRate}
                             onChange={() => {
                              setSelectedInterestRate(rate);
                              setShowExtendBorrowCollateralSection(true);
                            }} required />
                            <label htmlFor={id}
                                   className='inline-flex items-center justify-center w-full px-8 py-3 text-shrub-grey bg-white border border-shrub-grey-light2 rounded-lg cursor-pointer    peer-checked:shadow-shrub-thin peer-checked:border-shrub-green-50 peer-checked:bg-teal-50 peer-checked:text-shrub-green-500 hover:text-shrub-green hover:border-shrub-green hover:bg-teal-50    select-none'>
                              <div className='block'>
                                <div className='w-full text-lg font-semibold'>{rate}%</div>
                              </div>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>

                  </div>
                }
                <div className='divider h-0.5 w-full bg-shrub-grey-light2 my-8'></div>

                {/*display required collateral*/}
                {showExtendBorrowCollateralSection && !showDueDateOptions && (
                  <div className='hero-content mb-2 flex-col gap-2 justify-between'>
                    <div className='card w-full flex flex-row text-lg justify-between'>
                      <span className='w-[360px]'>Required collateral</span>
                      <span className='hidden md:inline'>
                        <Image alt='eth logo' src='/eth-logo.svg' className='w-4 inline align-middle' width='16'
                               height='24' /> ETH
                      </span>
                    </div>
                    <div className='card w-full bg-teal-50 border border-shrub-green p-10'>
                        <span className='sm: text-4xl md:text-5xl text-shrub-green-500 font-bold text-center'>
                          {ethers.utils.formatEther(requiredCollateralToExtendBorrow)} ETH</span>
                    </div>
                  </div>
                )}
                {/*CTA*/}
                <button
                  className='btn btn-block bg-shrub-green border-0 hover:bg-shrub-green-500 text-xl text-white normal-case disabled:bg-shrub-grey-50 disabled:border-shrub-grey-100 disabled:text-white disabled:border'
                  /*  disabled={!showDueDateOptions && selectedInterestRate === '' || showDueDateOptions && selectedDuration === ''}*/
                  onClick={() => setLtvChangeRequested(false)}>
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
        :
        <ExtendBorrowSummaryView onBackExtend={handleExtendBorrowBack}
                                 onExtendBorrowActionChange={handleExtendBorrowActionChange}
                                 borrow={borrow}
                                 newEndDate={selectedDuration}
                                 />}
    </>
  );
};

export default ExtendBorrowView;
