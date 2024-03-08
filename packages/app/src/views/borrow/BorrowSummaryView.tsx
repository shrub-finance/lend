import {FC, useState} from "react";
import {useAddress, useContract, useContractWrite, Web3Button} from "@thirdweb-dev/react";
import {lendingPlatformAbi, lendingPlatformAddress} from "../../utils/contracts";
import {fromEthDate, interestToLTV, toEthDate, truncateEthAddress} from "../../utils/ethMethods";
import {ethers} from "ethers";
import {useRouter} from "next/router";
import {handleErrorMessagesFactory} from "../../utils/handleErrorMessages";
import {useFinancialData} from "../../components/FinancialDataContext";

interface BorrowSummaryViewProps {
    requiredCollateral: string;
    timestamp: number;
    interestRate: string;
    amount: string;
  onBack: () => void;
  onCancel: () => void;
}

export const BorrowSummaryView: FC<BorrowSummaryViewProps> = ({onBack, onCancel, requiredCollateral, timestamp, interestRate, amount}) => {

    const router = useRouter();
    const [localError, setLocalError] = useState("");
    const handleErrorMessages = handleErrorMessagesFactory(setLocalError);

    const handleViewDash = () => {
        router.push('/dashboard');
    };

    const { dispatch } = useFinancialData();

    const [borrowSuccess, setBorrowSuccess] = useState(false);


    const walletAddress = useAddress();
    const {
        contract: lendingPlatform,
        isLoading: lendingPlatformIsLoading,
        error: lendingPlatformError
    } = useContract(lendingPlatformAddress, lendingPlatformAbi);
    const {
        mutateAsync: mutateAsyncTakeLoan,
        isLoading: isLoadingTakeLoan,
        error: errorTakeLoan
    } = useContractWrite(
        lendingPlatform,
        "takeLoan",
    );


    // Calculate the end date by adding the number of months to the current date
    const currentDate = new Date();
    const endDate = fromEthDate(timestamp);

    async function handleTakeLoan() {

    }

    return (
        <div className="md:hero mx-auto p-4">
            <div className="md:hero-content flex flex-col">
                <div className='mt-6 self-start'>
                    {localError && (
                      <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400 flex items-center" role="alert">
                          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                          </svg>
                          <span>{localError}</span>
                      </div>
                    )}
                    <h1 className=" text-4xl font-medium ">
                        <button
                            className="w-[56px] h-[40px] bg-gray-100 rounded-full dark:bg-gray-600"onClick={onBack}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="none"
                                 className="w-6 grow-0 order-0 flex-none ml-[16px] mt-[4px]">
                                <path d="M20 12H4M4 12L10 18M4 12L10 6" stroke="black" strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"/>
                            </svg>
                        </button>
                        Summary
                    </h1>
                </div>
                <div className="relative group mt-4 w-full min-w-[500px]">
                    <div className="absolute -inset-1 shadow-shrub border rounded-3xl "></div>
                    <div className="flex flex-col ">
                        <div className="card w-full">
                            <div className="card-body ">
                                {!borrowSuccess && <div>
                                <p className="text-lg font-bold pb-2 text-left">
                                    Borrow
                                </p>
                                <div className="w-full text-xl font-semibold flex flex-row">
                                    <span className="text-4xl  font-medium text-left w-[500px]">{amount} USDC</span>
                                    <img src="/usdc-logo.svg" className="w-10 inline align-baseline"/>
                                </div>
                                <p className="text-shrub-grey-700 text-lg text-left font-light pt-8 max-w-[550px]">You
                                    are borrowing <strong>{amount} USDC</strong> and
                                    giving <strong>{requiredCollateral} ETH</strong> as collateral. The collateral will be locked until the loan is fully paid, and then it
                                    will be returned to
                                    you.</p>
                                </div>}
                                {borrowSuccess &&
                                  <>
                                  <p className="text-lg font-bold pb-2 text-left">
                                      Borrow successful
                                  </p>
                                  <svg className="w-[250px] h-[250px] text-shrub-green dark:text-white m-[108px]" aria-hidden="true"
                                     xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"
                                          strokeWidth="1" d="m7 10 2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
                                </svg>
                                  </>}

                                <div className="divider h-0.5 w-full bg-gray-100 my-8"></div>
                                {!borrowSuccess && <div>
                                {/*receipt start*/}
                                <div className="mb-2 flex flex-col gap-3 text-shrub-grey-200 text-lg font-light">
                                    <div className="flex flex-row  justify-between">
                                        <span className="">Required collateral</span>
                                        <span>{requiredCollateral} ETH</span>
                                    </div>
                                    <div className="flex flex-row  justify-between">
                                        <span className="">Start Date</span>
                                        <span>{currentDate.toDateString()}</span>
                                    </div>
                                    <div className="flex flex-row  justify-between">
                                        <span className="">Due Date</span>
                                        <span>{endDate.toDateString()}
                                            <img src="/edit.svg" className="w-5 inline align-baseline ml-2"/>
                                        </span>
                                    </div>
                                    <div className="flex flex-row  justify-between">
                                        <span className="">Interest Rate ✨</span>
                                        <span className="font-semibold text-shrub-green-500"> {interestRate}%</span>
                                    </div>
                                    <div className="flex flex-row  justify-between">
                                        <span className="">Wallet</span>
                                        <span>{truncateEthAddress(walletAddress)}<img src="/copy.svg"
                                                                   className="w-6 hidden md:inline align-baseline ml-2"/> </span>
                                    </div>
                                    <div className="flex flex-row  justify-between">
                                        <span className="">Contract Address</span>
                                        <span>{truncateEthAddress(lendingPlatformAddress)}<img src="/copy.svg"
                                                                    className="w-6 hidden md:inline align-baseline ml-2"/> </span>
                                    </div>
                                </div>

                                <div className="divider h-0.5 w-full bg-gray-100 my-8"></div>
                                {/*total*/}
                                <div className="flex flex-col gap-3 mb-6 text-shrub-grey-200 text-lg font-light">
                                    <div className="flex flex-row justify-between ">
                                        <span className="">Due today</span>
                                        <span>{requiredCollateral} ETH</span>
                                    </div>
                                    <div className="flex flex-row justify-between">
                                        <span className="">Gas Cost</span>
                                        <span>0.0012 ETH</span>
                                    </div>
                                </div>
                                <Web3Button contractAddress={lendingPlatformAddress} className="!btn !btn-block !bg-shrub-green !border-0 !normal-case !text-xl !text-white hover:!bg-shrub-green-500 !mb-4"

                                            action={() => mutateAsyncTakeLoan({ args: [
                                                    ethers.utils.parseUnits(amount, 6),
                                                    ethers.utils.parseEther(requiredCollateral),
                                                    interestToLTV[interestRate],
                                                    timestamp
                                                ], overrides: {
                                                    value: ethers.utils.parseEther(requiredCollateral)
                                                } })}
                                            onSuccess={(result) => {
                                                console.log('borrow receipt', result);
                                                setLocalError('');
                                                setBorrowSuccess(true);
                                                const newLoan = {
                                                    id: result.receipt.blockHash,
                                                    active: true,
                                                    created: Date.now(),

                                                };
                                                dispatch({
                                                    type: "ADD_LOAN",
                                                    payload: newLoan,
                                                });}}
                                            onError={(e) => {
                                                if (e instanceof Error) {
                                                    handleErrorMessages({err: e});
                                                }
                                            }}
                                >
                                    Borrow
                                </Web3Button>
</div>}
                                {borrowSuccess && <button onClick={handleViewDash}
                                        className="btn btn-block bg-white border text-shrub-grey-700 hover:bg-gray-100 hover:border-shrub-grey-50 normal-case text-xl border-shrub-grey-50">View in Dashboard
                                </button>}

                                {!borrowSuccess && <button onClick={onCancel}
                                        className="btn btn-block bg-white border text-shrub-grey-700 hover:bg-gray-100 hover:border-shrub-grey-50 normal-case text-xl border-shrub-grey-50">Cancel</button>}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>

    );
};
