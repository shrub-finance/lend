import {FC, useEffect, useState} from "react";
import {handleErrorMessagesFactory} from "../../utils/handleErrorMessages";
import {useBalance} from "@thirdweb-dev/react";
import {usdcAddress} from "../../utils/contracts";
import {toEthDate} from '@shrub-lend/common';
import {calculateLockupPeriod, getPlatformDates} from "@shrub-lend/common";
import Image from 'next/image';


interface LendViewProps {
  onLendViewChange: (estimatedAPY: string, timestamp: number, lendAmount: string) => void;
}

export const LendView: FC<LendViewProps> = ({onLendViewChange}) => {

  const {data: usdcBalance, isLoading: usdcBalanceIsLoading} = useBalance(usdcAddress);
  const format = (val: string) => val;
  const [lendAmount, setLendAmount] = useState("");
  const [localError, setLocalError] = useState("");
  const handleErrorMessages = handleErrorMessagesFactory(setLocalError);
  const [timestamp, setTimestamp] = useState(0);
  const [showLendAPYSection, setShowLendAPYSection] = useState(false);
  const [continueButtonEnabled, setContinueButtonEnabled] = useState(false);
  const [estimatedAPY, setEstimatedAPY] = useState("0");
  const {oneMonth, threeMonth, sixMonth, twelveMonth} = getPlatformDates();
  const depositTerms = [
    { id: 'smallest-deposit', value: 'smallest-deposit', duration: oneMonth },
    { id: 'small-deposit', value: 'small-deposit', duration: threeMonth },
    { id: 'big-deposit', value: 'big-deposit', duration: sixMonth },
    { id: 'biggest-deposit', value: 'biggest-deposit', duration: twelveMonth },
  ];
  const [isValidationError, setIsValidationError] = useState(false);

  async function fillMax() {
    if (!usdcBalanceIsLoading) {
      setLendAmount(usdcBalance.displayValue);
    } else {
      handleErrorMessages({customMessage: "Wallet not connected. Please check."});
      console.log('wallet not connected');
    }
  }

  const handleLendAmountChange = (event) => {
    const inputValue = event.target.value.trim();
    // Update the state with the current input value
    setLendAmount(inputValue);

    // Check if the input value is empty 
    if (inputValue === '') {
      setIsValidationError(false);
      setShowLendAPYSection(false);
      return;
    }

    // Continue with validation for non-empty inputs
    const isValidInput = /^([0-9]+(\.[0-9]{1,6})?|\.[0-9]{1,6})$/.test(inputValue);
    const parsedValue = parseFloat(inputValue);
    const isInvalidOrZero = !isValidInput || isNaN(parsedValue) || parsedValue === 0;
    setIsValidationError(isInvalidOrZero);
  };

  useEffect(() => {
    const handleAPYCalc = () => {
      setContinueButtonEnabled(true);

      const apyGenerated = timestamp === oneMonth.getTime() / 1000 ? 7.56 :
        timestamp === threeMonth.getTime() / 1000 ? 8.14 :
          timestamp === sixMonth.getTime() / 1000 ? 9.04 :
            timestamp === twelveMonth.getTime() / 1000 ? 10.37 : Math.random() * 5 + 7;

      setEstimatedAPY(apyGenerated.toFixed(2).toString());
    };

    if (timestamp) {
      handleAPYCalc();
    }
  }, [timestamp]); // Removed handleAPYCalc from dependencies



  const handleLendContinue = () => {
    onLendViewChange(estimatedAPY, timestamp, lendAmount);
  };


  return (

    <div className="md:hero mx-auto p-4">

      <div className="md:hero-content flex flex-col">
        <div className='mt-6 self-start'>
          {localError && (
            <div className="alert alert-warning justify-start mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6 ml-4p" fill="none"
                   viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <span>{localError}</span>
            </div>
          )}
          <h1 className=" text-5xl font-bold ">
            Lend
          </h1>
          <p className=" text-lg font-light pt-2">Supply your USDC on Shrub and earn up to <span
            className="font-semibold">7-12% APY</span></p>
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
                    <span className="label-text-alt text-xl font-semibold absolute right-4 top-[57px]">
                      <Image src="/usdc-logo.svg" className="w-[22px] mr-1 inline align-sub" width="40" height="40" alt="usdc logo"/>USDC</span>
                  </label>
                  <input type="text" placeholder="Enter amount"
                         className="input input-bordered w-full h-[70px] bg-white border-solid border border-shrub-grey-light2 text-lg
                         focus:outline-none focus:shadow-shrub-thin focus:border-shrub-green-50" onChange={handleLendAmountChange}
                         value={format(lendAmount)}/>
                  {isValidationError && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-500">
                      Invalid USDC amount (numeric and maximum 6 decimals)
                    </p>
                  )}
                  <label className="label">
                    <span className="label-text-alt text-shrub-grey-200 text-sm font-light">Wallet balance: {!usdcBalanceIsLoading &&
                      <span>{usdcBalance.displayValue} USDC</span>}
                    </span>
                    <button onClick={fillMax} className="label-text-alt btn-sm text-shrub-green bg-green-50 p-2 rounded-md cursor-pointer text-xs">
                      ENTER MAX
                    </button>
                  </label>
                </div>

                {/*interest rate control*/}
                <div className="form-control w-full  ">
                  <label className="label">
                    <span className="label-text text-shrub-blue">Lockup period</span>
                  </label>
                  <ul className="flex flex-row">
                    {depositTerms.map((item) => (
                      <li key={item.id} className="mr-4">
                        <input
                          type="radio"
                          id={item.id}
                          name="deposit"
                          value={item.value}
                          className="hidden peer"
                          required
                          onChange={() => {
                            setTimestamp(toEthDate(item.duration))
                            setShowLendAPYSection(true)
                          }}
                        />
                        <label
                          htmlFor={item.id}
                          className="inline-flex items-center justify-center w-full px-4 py-3 text-shrub-grey bg-white border border-shrub-grey-light2 rounded-lg cursor-pointer hover:text-shrub-green hover:border-shrub-green hover:bg-teal-50 peer-checked:shadow-shrub-thin peer-checked:border-shrub-green-50 peer-checked:bg-teal-50 peer-checked:text-shrub-green-500 dark:border-shrub-grey-700 dark:peer-checked:text-shrub-green-500  dark:text-shrub-grey-400 dark:bg-shrub-grey-800 dark:hover:bg-shrub-grey-700 dark:hover:text-shrub-green select-none"
                        >
                          <div className="block">
                            <div className="w-full text-lg font-semibold">
                              {calculateLockupPeriod(item.duration)}
                            </div>
                          </div>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>

                {/*divider*/}
                <div className="divider h-0.5 w-full bg-shrub-grey-light2 my-8"></div>

                {/*Simple spinner svg*/}
                {/*<div className="hero-content flex-col mb-3">*/}
                {/*  <div role="status">*/}
                {/*    <svg aria-hidden="true"*/}
                {/*         className="inline w-8 h-8 mr-2 text-shrub-grey-200 animate-spin dark:text-shrub-grey-600 fill-shrub-green-500"*/}
                {/*         viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">*/}
                {/*      <path*/}
                {/*        d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"*/}
                {/*        fill="currentColor"/>*/}
                {/*      <path*/}
                {/*        d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"*/}
                {/*        fill="currentFill"/>*/}
                {/*    </svg>*/}
                {/*    <span className="sr-only">Loading...</span>*/}
                {/*  </div>*/}
                {/*<p className="text-shrub-grey pt-3 text-sm">Calculating best rates</p>*/}
                {/*</div>*/}


                {/*display estimate apy*/}
                {showLendAPYSection && continueButtonEnabled && (<div className="hero-content flex-col mb-4">
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
                  className="btn btn-block bg-shrub-green border-0 hover:bg-shrub-green-500 text-xl text-white normal-case disabled:bg-shrub-grey-50
                  disabled:border-shrub-grey-100
                  disabled:text-white
                  disabled:border"
                  onClick={handleLendContinue}
                  disabled={Number(lendAmount) <= 0 || !timestamp || isValidationError}>
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

  );
};
