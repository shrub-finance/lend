import {FC, useEffect, useState} from "react";
import {useConnection, useWallet} from "@solana/wallet-adapter-react";
import useUserSOLBalanceStore from "../../stores/useUserSOLBalanceStore";

interface BorrowDurationViewProps {
  requiredCollateral: string;
}

export const BorrowDurationView: React.FC<BorrowDurationViewProps> = ({ requiredCollateral }) => {

  const [selectedDuration, setSelectedDuration] = useState("");

  const wallet = useWallet();
  const {connection} = useConnection();

  const balance = useUserSOLBalanceStore((s) => s.balance)
  const {getUserSOLBalance} = useUserSOLBalanceStore()

  useEffect(() => {
    if (wallet.publicKey) {
      console.log(wallet.publicKey.toBase58())
      getUserSOLBalance(wallet.publicKey, connection)
    }
  }, [wallet.publicKey, connection, getUserSOLBalance])


  return (
    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col">
        <div className='mt-6 self-start'>

          <h1 className=" text-4xl font-bold text-base-100">
            <button
              className="w-[56px] h-[40px] bg-gray-100 rounded-full dark:bg-gray-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="none" className="w-6 grow-0 order-0 flex-none ml-[16px] mt-[4px]">
                <path d="M20 12H4M4 12L10 18M4 12L10 6" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button> Duration
          </h1>
          <p className="text-base-100 text-lg font-light pt-2">Borrow USDC on Shrub with fixed-rates as low as<span
            className="font-semibold">&nbsp;0%</span></p>

        </div>

        <div className="relative group mt-4 w-full">
          <div className="absolute -inset-1 shadow-shrub border rounded-3xl "></div>
          <div className="flex flex-col ">
            <div className="card w-full text-left">
              <div className="card-body text-base-100">

                <div className="flex-col gap-2">
                  <div className="flex flex-row text-lg ">
                    <span className="w-[500px]">Required collateral</span>
                    <span><img src="/sol-logo.svg" className="w-4 inline align-baseline"/> SOL</span>
                  </div>
                  <div className="card w-full py-4">
                    <span className="text-5xl text-shrub-green-500 font-bold text-left">{requiredCollateral} SOL</span>
                  </div>
                </div>

                <div className="form-control w-full mt-6">
                  <label className="label">
                    <span className="label-text text-shrub-blue">Loan Duration</span>
                  </label>
                  <div>

                    <ul className="flex flex-col gap-4">
                      <li className="mr-4">
                        <input type="radio" id="smallest-duration" name="loan" value="smallest-duration" className="hidden peer" required onChange={() => setSelectedDuration("1")}/>
                        <label htmlFor="smallest-duration"
                               className="inline-flex items-center justify-center w-full px-8 py-3 text-gray-600 bg-white border border-gray-200 rounded-lg cursor-pointer dark:hover:text-shrub-green dark:border-gray-700 dark:peer-checked:text-shrub-green-500 peer-checked:shadow-shrub-thin peer-checked:border-shrub-green-50 peer-checked:bg-teal-50 peer-checked:text-shrub-green-500 hover:text-shrub-green hover:border-shrub-green hover:bg-teal-50 dark:text-gray-400 dark:bg-gray-800 dark:hover:bg-gray-700">
                          <div className="block">
                            <div className="w-full text-xl font-semibold">1 Month</div>
                          </div>
                        </label>
                      </li>
                      <li className="mr-4">
                        <input type="radio" id="small-duration" name="loan" value="small-duration" className="hidden peer" onChange={() => setSelectedDuration("3")}/>
                        <label htmlFor="small-duration"
                               className="inline-flex items-center justify-center w-full px-8 py-3  text-shrub-grey bg-white border border-gray-200 rounded-lg cursor-pointer dark:hover:text-shrub-green dark:border-gray-700 dark:peer-checked:text-shrub-green-500 peer-checked:shadow-shrub-thin peer-checked:border-shrub-green-50 peer-checked:text-shrub-green-500 hover:text-shrub-green hover:border-shrub-green hover:bg-teal-50 dark:text-gray-400 dark:bg-gray-800 dark:hover:bg-gray-700">
                          <div className="block">
                            <div className="w-full text-xl font-semibold">3 Months</div>
                          </div>
                        </label>
                      </li>
                      <li className="mr-4">
                        <input type="radio" id="big-duration" name="loan" value="big-duration" className="hidden peer"
                               required onChange={() => setSelectedDuration("6")}/>
                        <label htmlFor="big-duration"
                               className="inline-flex items-center justify-center w-full px-8 py-3  text-shrub-grey bg-white border border-gray-200 rounded-lg cursor-pointer dark:hover:text-shrub-green dark:border-gray-700 dark:peer-checked:text-shrub-green-500 peer-checked:shadow-shrub-thin peer-checked:border-shrub-green-50 peer-checked:text-shrub-green-500 hover:text-shrub-green hover:border-shrub-green hover:bg-teal-50 dark:text-gray-400 dark:bg-gray-800 dark:hover:bg-gray-700">
                          <div className="block">
                            <div className="w-full font-semibold flex flex-row text-xl">
                              <span className="w-[360px]">6 Months</span>
                              <span className="text-base">+0.5% Interest</span>
                            </div>
                          </div>
                        </label>
                      </li>
                      <li className="mr-4">
                        <input type="radio" id="biggest-duration" name="loan" value="biggest-duration" className="hidden peer" required onChange={() => setSelectedDuration("8")}/>
                        <label htmlFor="biggest-duration"
                               className="inline-flex items-center justify-center w-full px-8 py-3  text-shrub-grey bg-white border border-gray-200 rounded-lg cursor-pointer dark:hover:text-shrub-green dark:border-gray-700 dark:peer-checked:text-shrub-green-500 peer-checked:shadow-shrub-thin peer-checked:border-shrub-green-50 peer-checked:text-shrub-green-500 hover:text-shrub-green hover:border-shrub-green hover:bg-teal-50 dark:text-gray-400 dark:bg-gray-800 dark:hover:bg-gray-700">
                          <div className="block">
                            <div className="w-full text-xl font-semibold flex flex-row">
                              <span className="w-[380px]">12 Months</span>
                              <span className="text-base">+1% Interest</span>
                            </div>
                          </div>
                        </label>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="divider h-0.5 w-full bg-gray-100 my-8"></div>
                {/*cta*/}
                <button
                  className="btn btn-block bg-shrub-green border-0 hover:bg-shrub-green normal-case text-xl hover:bg-shrub-green-500">Continue
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

  );
};
