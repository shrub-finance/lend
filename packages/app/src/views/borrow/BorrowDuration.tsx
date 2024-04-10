import React, {useState} from "react";
import {toEthDate} from '@shrub-lend/common';
import {formatDate, getPlatformDates} from "@shrub-lend/common"
import Image from 'next/image'

interface BorrowDurationViewProps {
  requiredCollateral: string;
  onDurationChange: (timestamp: number) => void;
  onBackDuration: () => void;
}

export const BorrowDurationView: React.FC<BorrowDurationViewProps> = ({ onBackDuration, requiredCollateral, onDurationChange }) => {

  const [timestamp, setTimestamp] = useState(0);
  const [selectedDuration, setSelectedDuration] = useState('');
  const dates = getPlatformDates();
  const durations = [
    { id: 'smallest-duration', duration: dates.oneMonth },
    { id: 'small-duration', duration: dates.threeMonth },
    { id: 'big-duration', duration: dates.sixMonth },
    { id: 'biggest-duration', duration: dates.twelveMonth },
  ];

  const handleDurationContinue = () => {
    onDurationChange(timestamp);
  };

  return (
    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col">
        <div className='mt-6 self-start'>
          <h1 className=" text-4xl font-bold ">
            <button onClick={onBackDuration}
              className="w-[56px] h-[40px] bg-shrub-grey-light3 rounded-full dark:bg-shrub-grey-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="none" className="w-6 grow-0 order-0 flex-none ml-[16px] mt-[4px]">
                <path d="M20 12H4M4 12L10 18M4 12L10 6" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button> Duration
          </h1>
          <p className="text-lg font-light pt-2">Borrow USDC on Shrub with fixed-rates as low as<span
            className="font-semibold">&nbsp;0%</span></p>

        </div>

        <div className="relative group mt-4 w-full">
          <div className="absolute -inset-1 shadow-shrub border rounded-3xl "></div>
          <div className="flex flex-col ">
            <div className="card w-full text-left">
              <div className="card-body ">

                <div className="flex-col gap-2">
                  <div className="flex flex-row text-lg ">
                    <span className="w-[500px]">Required collateral</span>
                    <span className="hidden md:inline">
                      <Image alt="ETH logo" src="/eth-logo.svg" className="w-4 inline align-middle" width="16" height="24"/> ETH
                    </span>
                  </div>
                  <div className="card w-full py-4">
                    <span className="text-5xl text-shrub-green-500 font-bold text-left">{requiredCollateral} ETH</span>
                  </div>
                </div>

                <div className="form-control w-full mt-6">
                  <label className="label">
                    <span className="label-text text-shrub-blue">Loan Duration</span>
                  </label>
                  <div>

                    <ul className="flex flex-col gap-4">
                      {durations.map(({ id, duration }) => (
                        <li className="mr-4" key={id}>
                          <input type="radio" id={id} name="loan" value={id} className="hidden peer" required onChange={(e) => {
                            setSelectedDuration(e.target.value)
                            setTimestamp(toEthDate(duration))}}
                                 checked={selectedDuration === id}/>
                          <label htmlFor={id}
                                 className="inline-flex items-center justify-center w-full px-8 py-3 text-shrub-grey-200 bg-white border border-shrub-grey-light2 rounded-lg cursor-pointer dark:hover:text-shrub-green dark:border-shrub-grey-700 dark:peer-checked:text-shrub-green-500 peer-checked:shadow-shrub-thin peer-checked:border-shrub-green-50 peer-checked:bg-teal-50 peer-checked:text-shrub-green-500 hover:text-shrub-green hover:border-shrub-green hover:bg-teal-50 dark:text-shrub-grey-400 dark:bg-shrub-grey-800 dark:hover:bg-shrub-grey-700">
                            <div className="block">
                              <div className="w-full text-xl font-semibold">{formatDate.long(duration)}</div>
                            </div>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="divider h-0.5 w-full bg-shrub-grey-light3 my-8"></div>
                {/*cta*/}
                <button onClick={handleDurationContinue} disabled={!selectedDuration}
                  className="btn btn-block bg-shrub-green border-0 normal-case text-white text-xl hover:bg-shrub-green-500 disabled:bg-shrub-grey-50
                  disabled:border-shrub-grey-100
                  disabled:text-white
                  disabled:border">Continue
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

  );
};
