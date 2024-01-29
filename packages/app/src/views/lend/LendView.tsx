import {FC, useEffect, useState} from "react";
import {handleErrorMessagesFactory} from "../../utils/handleErrorMessages";
import {useBalance, useConnectedWallet, useContract, useContractRead} from "@thirdweb-dev/react";

import {lendingPlatformAddress, lendingPlatformAbi, usdcAddress} from "../../utils/contracts";
import {NATIVE_TOKEN_ADDRESS} from "@thirdweb-dev/sdk";
import {toEthDate} from "../../utils/ethMethods";
import {calculateLockupPeriod, formatDate, getPlatformDates} from "@shrub-lend/common";

interface LendViewProps {
  onLendViewChange: (estimatedAPY: string, timestamp: number, lendAmount: string) => void;
}

export const LendView: FC<LendViewProps> = ({onLendViewChange}) => {
  const w = useConnectedWallet();
  const {data: usdcBalance, isLoading: usdcBalanceIsLoading} = useBalance(usdcAddress);
  const {data: ethBalance, isLoading: ethBalanceIsLoading} = useBalance(NATIVE_TOKEN_ADDRESS);


  const format = (val: string) => val;
  const parse = (val: string) => val.replace(/^\$/, "");

  const [lendAmount, setLendAmount] = useState("0");
  const [localError, setLocalError] = useState("");
  const handleErrorMessages = handleErrorMessagesFactory(setLocalError);
  const [timestamp, setTimestamp] = useState(0);
  const [showAPYSection, setShowAPYSection] = useState(false);
  const [supplyButtonPressed, setSupplyButtonPressed] = useState(false);
  const [estimatedAPY, setEstimatedAPY] = useState("0");

  const {
    contract: lendingPlatform,
    isLoading: lendingPlatformIsLoading,
    error: lendingPlatformError
  } = useContract(lendingPlatformAddress, lendingPlatformAbi);

    const {oneMonth, threeMonth, sixMonth, twelveMonth} = getPlatformDates();

  async function fillMax() {
    if (!usdcBalanceIsLoading) {
      setLendAmount(usdcBalance.displayValue);
    } else {
      handleErrorMessages({customMessage: "Wallet not connected. Please check."});
      console.log('wallet not connected');
    }
  }

  const handleLendAmountChange = (event) => {
    const inputValue = event.target.value;
    setLendAmount(parse(inputValue));
    const parsedValue = parseFloat(inputValue);

    if (parsedValue !== 0 && !isNaN(parsedValue)) {
      setShowAPYSection(true);
    } else {
      setShowAPYSection(false);
    }

  };
  

  useEffect(() => {
    if (timestamp) {
      handleAPYCalc();
    }
  }, [timestamp]);

  function handleAPYCalc() {
    setSupplyButtonPressed(true);

    // Calculate required collateral
    const apyGenerated = timestamp === oneMonth.getTime() / 1000 ? 7.56 :
        timestamp === threeMonth.getTime() / 1000 ? 8.14 :
        timestamp === sixMonth.getTime() / 1000 ? 9.04 :
        timestamp === twelveMonth.getTime() / 1000 ? 10.37 : Math.random() * 5 + 7;
      // const apyGenerated = Math.random() * 5 + 7;
    setEstimatedAPY(apyGenerated.toFixed(2).toString())

  }

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
                    <span className="label-text-alt  text-xl font-semibold absolute right-4 top-[57px]">
                      <img src="/usdc-logo.svg" className="w-[22px] mr-1 inline align-sub"/>USDC</span>
                  </label>
                  <input type="text" placeholder="Enter amount"
                         className="input input-bordered w-full  h-[70px] bg-white border-solid border border-gray-200 text-lg
                         focus:shadow-shrub-thin focus:border-shrub-green-50" onChange={handleLendAmountChange}
                         value={format(lendAmount)}/>
                  <label className="label">
                    <span className="label-text-alt text-gray-500 text-sm font-light">Wallet balance: {!usdcBalanceIsLoading &&

                      <span>
                          {usdcBalance.displayValue} USDC
                        </span>

                    }</span>
                    <button onClick={fillMax}
                            className="label-text-alt btn-sm text-shrub-green bg-green-50 p-2 rounded-md cursor-pointer text-xs">ENTER
                      MAX
                    </button>
                  </label>
                </div>

                {/*interest rate control*/}
                <div className="form-control w-full  ">
                  <label className="label">
                    <span className="label-text text-shrub-blue">Lockup period</span>
                  </label>
                  <div>

                    <ul className="flex flex-row">
                      <li className="mr-4">
                        <input type="radio" id="smallest-loan" name="loan" value="smallest-loan" className="hidden peer"
                               required onChange={() => setTimestamp(toEthDate(oneMonth))}/>
                        <label htmlFor="smallest-loan"
                               className="inline-flex items-center justify-center w-full px-4 py-3 text-shrub-grey bg-white border border-gray-200 rounded-lg cursor-pointer dark:hover:text-shrub-green dark:border-gray-700 dark:peer-checked:text-shrub-green-500 peer-checked:shadow-shrub-thin peer-checked:border-shrub-green-50 peer-checked:bg-teal-50 peer-checked:text-shrub-green-500 hover:text-shrub-green hover:border-shrub-green hover:bg-teal-50 dark:text-gray-400 dark:bg-gray-800 dark:hover:bg-gray-700">
                          <div className="block">
                            <div className="w-full text-lg font-semibold">{calculateLockupPeriod(oneMonth)}</div>
                          </div>
                        </label>
                      </li>
                      <li className="mr-4">
                        <input type="radio" id="small-loan" name="loan" value="small-loan" className="hidden peer"
                               onChange={() => setTimestamp(toEthDate(threeMonth))}/>
                        <label htmlFor="small-loan"
                               className="inline-flex items-center justify-center w-full px-4 py-3  text-shrub-grey bg-white border border-gray-200 rounded-lg cursor-pointer dark:hover:text-shrub-green dark:border-gray-700 dark:peer-checked:text-shrub-green-500 peer-checked:shadow-shrub-thin peer-checked:border-shrub-green-50 peer-checked:text-shrub-green-500 hover:text-shrub-green hover:border-shrub-green hover:bg-teal-50 dark:text-gray-400 dark:bg-gray-800 dark:hover:bg-gray-700">
                          <div className="block">
                            <div className="w-full text-lg font-semibold">{calculateLockupPeriod(threeMonth)}</div>
                          </div>
                        </label>
                      </li>
                      <li className="mr-4">
                        <input type="radio" id="big-loan" name="loan" value="big-loan" className="hidden peer"
                               required onChange={() => setTimestamp(toEthDate(sixMonth))}/>
                        <label htmlFor="big-loan"
                               className="inline-flex items-center justify-center w-full px-4 py-3  text-shrub-grey bg-white border border-gray-200 rounded-lg cursor-pointer dark:hover:text-shrub-green dark:border-gray-700 dark:peer-checked:text-shrub-green-500 peer-checked:border-shrub-green-50 peer-checked:text-shrub-green-500 peer-checked:shadow-shrub-thin hover:text-shrub-green hover:border-shrub-green hover:bg-teal-50 dark:text-gray-400 dark:bg-gray-800 dark:hover:bg-gray-700">
                          <div className="block">
                            <div className="w-full text-lg font-semibold">{calculateLockupPeriod(sixMonth)}</div>
                          </div>
                        </label>
                      </li>
                      <li className="mr-4">
                        <input type="radio" id="biggest-loan" name="loan" value="biggest-loan" className="hidden peer"
                               required onChange={() => setTimestamp(toEthDate(twelveMonth))}/>
                        <label htmlFor="biggest-loan"
                               className="inline-flex items-center justify-center w-full px-4 py-3  text-shrub-grey bg-white border border-gray-200 rounded-lg cursor-pointer dark:hover:text-shrub-green dark:border-gray-700 dark:peer-checked:text-shrub-green-500 peer-checked:border-shrub-green-50 peer-checked:text-shrub-green-500 peer-checked:shadow-shrub-thin hover:text-shrub-green hover:border-shrub-green hover:bg-teal-50 dark:text-gray-400 dark:bg-gray-800 dark:hover:bg-gray-700">
                          <div className="block">
                            <div className="w-full text-lg font-semibold">{calculateLockupPeriod(twelveMonth)}</div>
                          </div>
                        </label>
                      </li>
                    </ul>
                  </div>
                </div>

                {/*divider*/}
                <div className="divider h-0.5 w-full bg-gray-100 my-8"></div>

                {/*spinner */}
                {/*<div className="hero-content flex-col mb-3">*/}
                {/*  <div role="status">*/}
                {/*    <svg aria-hidden="true"*/}
                {/*         className="inline w-8 h-8 mr-2 text-gray-200 animate-spin dark:text-gray-600 fill-shrub-green-500"*/}
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
                {supplyButtonPressed && showAPYSection && (<div className="hero-content flex-col mb-4">
                    <p className="self-start text-lg">Estimated APY</p>
                    <div className="card flex-shrink-0 w-full bg-teal-50 py-6 border-shrub-green border">
                      <div className="text-center p-2">
                        <span className="sm: text-5xl md:text-6xl text-shrub-green-500 font-bold">{estimatedAPY}%</span>
                        <span className=" pl-3 text-2xl font-thin text-shrub-green-500">APY</span>
                        {/*TODO: Make this bonus text dynamic for different periods*/}
                        {/*<p className="font-thin pt-3 text-lg">3 month lending term includes 5% bonus</p>*/}
                      </div>

                    </div>
                  </div>
                )}

                {/*CTA*/}
                <button
                  className="btn btn-block bg-shrub-green border-0 hover:bg-shrub-green-500 text-xl text-white normal-case disabled:bg-shrub-grey-50
                  disabled:border-shrub-grey-100
                  disabled:text-gray-50
                  disabled:border"
                  onClick={handleLendContinue}
                  disabled={Number(lendAmount) <= 0 || !timestamp}
                >Continue</button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

  );
};
