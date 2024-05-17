import React, {useEffect, useState} from "react";

import {handleErrorMessagesFactory} from "../../utils/handleErrorMessages";
import {useBalance, useContract} from "@thirdweb-dev/react";
import {lendingPlatformAbi, lendingPlatformAddress} from "../../utils/contracts";
import {NATIVE_TOKEN_ADDRESS} from "@thirdweb-dev/sdk";
import {EXCHANGE_RATE_BUFFER, interestToLTV, ONE_HUNDRED_PERCENT, percentMul, roundEth} from "../../utils/ethMethods";
import {BigNumber, ethers} from "ethers";
import Image from 'next/image'
import { interestRates } from '../../constants';

interface BorrowViewProps {
  onBorrowViewChange: (interestRate, amount) => void;
  requiredCollateral: ethers.BigNumber;
  setRequiredCollateral: (value: ethers.BigNumber) => void;
}

export const BorrowView: React.FC<BorrowViewProps> = ({ onBorrowViewChange, requiredCollateral, setRequiredCollateral }) => {


  const [localError, setLocalError] = useState("");
  const handleErrorMessages = handleErrorMessagesFactory(setLocalError);
  const [showBorrowAPYSection, setShowBorrowAPYSection] = useState(false);


  const {data: ethBalance, isLoading: ethBalanceIsLoading} = useBalance(NATIVE_TOKEN_ADDRESS);


  const [maxBorrow, setMaxBorrow] = useState(ethers.utils.parseEther('0'));
  const [borrowAmount, setBorrowAmount] = useState('');
  const [selectedInterestRate, setSelectedInterestRate] = useState("");
  const {
    contract: lendingPlatform,
    isLoading: lendingPlatformIsLoading,
    error: lendingPlatformError
  } = useContract(lendingPlatformAddress, lendingPlatformAbi);

  const format = (val: string) => val;
  const [isValidationError, setIsValidationError] = useState(false);



  async function fillMax() {
    if (lendingPlatformIsLoading || lendingPlatformError || ethBalanceIsLoading) {
      handleErrorMessages({customMessage: "Wallet not connected. Please check your connection."});
      console.log('wallet not connected');
    } else {
      console.log(ethers.utils.formatUnits(maxBorrow, 6))
      setBorrowAmount(ethers.utils.formatUnits(maxBorrow, 6));
    }
  }


  const handleAmountChange = (event) => {
    const inputValue = event.target.value.trim();
    setBorrowAmount(inputValue);
    if (inputValue === '') {
      setIsValidationError(false);
      return;
    }
    const isValidInput = /^[0-9]+(\.[0-9]*)?$/.test(inputValue);
    const parsedValue = parseFloat(inputValue);
    const isInvalidOrZero = !isValidInput || isNaN(parsedValue) || parsedValue === 0;

    setIsValidationError(isInvalidOrZero);
  };

  useEffect(() => {
      const determineRequiredCollateral = async () => {
      const ltv = interestToLTV[selectedInterestRate];
      const usdcUnits = ethers.utils.parseUnits(borrowAmount, 6);
      const coll: BigNumber = await lendingPlatform.call('requiredCollateral', [ltv, usdcUnits]);
      // Add the exchange rate buffer to the requiredCollateral
      return roundEth(percentMul(coll, ONE_HUNDRED_PERCENT.add(EXCHANGE_RATE_BUFFER)), 6);
    };

    if (selectedInterestRate !== "" && borrowAmount !== "0") {
      determineRequiredCollateral()
        .then(res => setRequiredCollateral(res))
        .catch(e => console.error(e));
    }
  }, [borrowAmount, selectedInterestRate, lendingPlatform, setRequiredCollateral]);


  useEffect(() => {
    getMaxBorrow()
        .then(m => {
          setMaxBorrow(m);
        })
        .catch(e => console.error(e))
  }, [selectedInterestRate]);

  async function getMaxBorrow() {
    if (lendingPlatformIsLoading || lendingPlatformError || ethBalanceIsLoading || !selectedInterestRate || !ethBalance.value) {
      return ethers.utils.parseEther('0');
    }
    const maxBorrow: BigNumber = await lendingPlatform.call('maxBorrow', [interestToLTV[selectedInterestRate], ethBalance.value])
    return maxBorrow;
  }
  const handleBorrowContinue = () => {
    onBorrowViewChange(selectedInterestRate, borrowAmount);
  };

  return (
    <div className="md:hero mx-auto p-4">

      <div className="md:hero-content flex flex-col">
        {/*alert*/}
        <div className='mt-6 self-start'>

          {localError && (
            <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50   flex items-center" role="alert">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <span>{localError}</span>
            </div>
          )}
              {/*heading*/}
              <h1 className=" text-5xl font-bold ">
                Borrow
              </h1>
              <p className="text-lg font-light pt-2">Borrow USDC on Shrub with fixed-rates as low as<span className="font-semibold"> 0%</span></p>

        </div>

        <div className="relative group mt-10 w-full">
          <div className="absolute -inset-1 shadow-shrub border rounded-3xl"></div>
          <div className="flex flex-col mt-2">
            <div className="card w-full text-left">
              <div className="card-body ">

                {/*amount control*/}
                <div className="form-control w-full">
                  <label className="label relative">
                    <span className="label-text text-shrub-blue text-md">Amount</span>
                    <span className="label-text-alt  text-xl font-semibold absolute right-4 top-[57px]">
                      <Image alt="usdc logo" src="/usdc-logo.svg" className="w-[22px] mr-1 inline align-sub" width="40" height="40"/>USDC</span>
                  </label>
                  <input type="text" placeholder="Enter amount" name="amount" id="amount"
                         className="input input-bordered w-full h-[70px] bg-white border-solid border border-shrub-grey-50 text-lg focus:outline-none focus:shadow-shrub-thin focus:border-shrub-green-50"
                         onChange={handleAmountChange}
                         value={format(borrowAmount)}/>
                  {isValidationError && (
                    <p className="mt-2 text-sm text-red-600 ">
                      Amount must be a number
                    </p>)}
                  <label className="label">
                    <span className="label-text-alt text-shrub-grey-200 text-sm font-light">Wallet balance:  {!ethBalanceIsLoading &&
                        <span>
                          {( ethBalance.displayValue || 0)} ETH
                        </span>

                    }</span>
                    <button className="label-text-alt btn-sm text-shrub-green bg-green-50 p-2 rounded-md cursor-pointer text-xs"  onClick={fillMax}>ENTER MAX</button>
                  </label>
                </div>

                {/*interest rate control*/}
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text text-shrub-blue">Interest Rate</span>
                  </label>
                  <div>
                    <ul className="flex flex-row ">
                      {interestRates.map(({ id, rate }) => (
                        <li className="mr-4" key={id}>
                          <input type="radio" id={id} name="borrow" value={id} className="hidden peer" onChange={() =>
                          { setSelectedInterestRate(rate)
                            setShowBorrowAPYSection(true)
                          }} required/>
                          <label htmlFor={id}
                                 className="inline-flex items-center justify-center w-full px-8 py-3 text-shrub-grey bg-white border border-shrub-grey-light2 rounded-lg cursor-pointer    peer-checked:shadow-shrub-thin peer-checked:border-shrub-green-50 peer-checked:bg-teal-50 peer-checked:text-shrub-green-500 hover:text-shrub-green hover:border-shrub-green hover:bg-teal-50    select-none">
                            <div className="block">
                              <div className="w-full text-lg font-semibold">{rate}%</div>
                            </div>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>

                </div>

                <div className="divider h-0.5 w-full bg-shrub-grey-light2 my-8"></div>

                {/*display required collateral*/}
                {showBorrowAPYSection && (
                  <div className="hero-content mb-2 flex-col gap-2 justify-between">
                    <div className="card w-full flex flex-row text-lg justify-between">
                      <span className="w-[360px]">Required collateral</span>
                      <span className="hidden md:inline">
                        <Image alt="eth logo" src="/eth-logo.svg" className="w-4 inline align-middle" width="16" height="24"/> ETH
                      </span>
                    </div>
                    <div className="card w-full bg-teal-50 border border-shrub-green p-10">
                      { (Number(borrowAmount))? <span className="sm: text-4xl md:text-5xl text-shrub-green-500 font-bold text-center">{ethers.utils.formatEther(requiredCollateral)} ETH</span>:<span className="sm: text-medium text-shrub-green-500 font-bold text-center">Enter amount to calculate required collateral</span>}
                    </div>
                  </div>
                )}

                {/*cta*/}
                <button className="btn btn-block bg-shrub-green border-0 hover:bg-shrub-green-500 normal-case text-xl text-white disabled:bg-shrub-grey-50
                  disabled:border-shrub-grey-100
                  disabled:text-white
                  disabled:border" disabled={Number(borrowAmount) <= 0|| selectedInterestRate === ""}
                  onClick={handleBorrowContinue}>Continue</button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

  );
};
