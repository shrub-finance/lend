import {FC} from "react";
import {RequestAirdrop} from "../components/RequestAirdrop";

export const BorrowView: FC = ({}) => {


  return (
    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col">
        <div className='mt-6'>
          <h1 className=" text-5xl font-bold text-base-100">
            Borrow
          </h1>
          <p className="text-base-100 text-lg font-light pt-2">Supply your USDC on Shrub and earn up to 7-12% APY</p>

        </div>

        <div className="relative group mt-10 w-full">
          <div className="absolute -inset-1 shadow-shrub animate-tilt border rounded-3xl "></div>
          <div className="flex flex-col mt-2 ">
            <div className="card w-full text-left">
              <div className="card-body text-base-100">
                {/*amount control*/}
                <div className="form-control w-full max-w-xs ">
                  <label className="label">
                    <span className="label-text text-base-100">Amount</span>
                  </label>
                  <input type="text" placeholder="Enter amount"
                         className="input input-bordered w-full max-w-xs bg-white border-solid border border-gray-200 text-lg"/>
                  <label className="label">
                    <span className="label-text-alt text-gray-500">Wallet Balance</span>
                    <span className="label-text-alt btn-sm text-shrub-green bg-green-50 p-2 rounded-md">MAX USDC</span>
                  </label>
                </div>

                {/*interest rate control*/}
                <div className="form-control w-full max-w-xs ">
                  <label className="label">
                    <span className="label-text text-base-100">Interest Rate</span>
                  </label>
                  <div>

                    <ul className="flex flex-row">
                      <li className="mr-4">
                        <input type="radio" id="smallest-loan" name="loan" value="smallest-loan" className="hidden peer"
                               required/>
                        <label htmlFor="smallest-loan"
                               className="inline-flex items-center justify-center w-full px-8 py-3 text-gray-500 bg-white border border-gray-200 rounded-lg cursor-pointer dark:hover:text-shrub-green dark:border-gray-700 dark:peer-checked:text-shrub-green peer-checked:border-shrub-green-50 peer-checked:text-shrub-green-50 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:bg-gray-800 dark:hover:bg-gray-700">
                          <div className="block">
                            <div className="w-full text-lg font-semibold">0%</div>
                          </div>
                        </label>
                      </li>
                      <li className="mr-4">
                        <input type="radio" id="small-loan" name="loan" value="small-loan" className="hidden peer"/>
                        <label htmlFor="small-loan"
                               className="inline-flex items-center justify-center w-full px-8 py-3  text-gray-500 bg-white border border-gray-200 rounded-lg cursor-pointer dark:hover:text-shrub-green dark:border-gray-700 dark:peer-checked:text-shrub-green peer-checked:border-shrub-green-50 peer-checked:text-shrub-green-50 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:bg-gray-800 dark:hover:bg-gray-700">
                          <div className="block">
                            <div className="w-full text-lg font-semibold">1%</div>
                          </div>
                        </label>
                      </li>
                      <li className="mr-4">
                        <input type="radio" id="big-loan" name="loan" value="big-loan" className="hidden peer"
                               required/>
                        <label htmlFor="big-loan"
                               className="inline-flex items-center justify-center w-full px-8 py-3  text-gray-500 bg-white border border-gray-200 rounded-lg cursor-pointer dark:hover:text-shrub-green dark:border-gray-700 dark:peer-checked:text-shrub-green peer-checked:border-shrub-green-50 peer-checked:text-shrub-green-50 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:bg-gray-800 dark:hover:bg-gray-700">
                          <div className="block">
                            <div className="w-full text-lg font-semibold">5%</div>
                          </div>
                        </label>
                      </li>
                      <li className="mr-4">
                        <input type="radio" id="biggest-loan" name="loan" value="biggest-loan" className="hidden peer"
                               required/>
                        <label htmlFor="biggest-loan"
                               className="inline-flex items-center justify-center w-full px-8 py-3  text-gray-500 bg-white border border-gray-200 rounded-lg cursor-pointer dark:hover:text-shrub-green dark:border-gray-700 dark:peer-checked:text-shrub-green peer-checked:border-shrub-green-50 peer-checked:text-shrub-green-50 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:bg-gray-800 dark:hover:bg-gray-700">
                          <div className="block">
                            <div className="w-full text-lg font-semibold">8%</div>
                          </div>
                        </label>
                      </li>
                    </ul>

                  </div>

                </div>

                <div className="divider text-base-100 h-0.5 w-full bg-gray-300"></div>
                <button className="btn btn-block bg-shrub-green border-0 hover:bg-shrub-green">Continue</button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

  );
};
