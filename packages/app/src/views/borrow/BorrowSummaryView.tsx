import {FC, useEffect} from "react";
import {useConnection, useWallet} from "@solana/wallet-adapter-react";
import useUserSOLBalanceStore from "../../stores/useUserSOLBalanceStore";

interface BorrowSummaryViewProps {
  requiredCollateral: string;
  duration: string;
  interestRate: string;
  amount: string;
}

export const BorrowSummaryView: FC<BorrowSummaryViewProps> = ({requiredCollateral, duration, interestRate, amount}) => {
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

  const numberOfMonths = duration;

  // Calculate the end date by adding the number of months to the current date
  const currentDate = new Date();
  const dateShadow = new Date();
  const endDate = new Date(dateShadow.setMonth(dateShadow.getMonth() + Number(numberOfMonths)));


  return (
    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col">
        <div className='mt-6 self-start'>

          <h1 className=" text-4xl font-medium text-base-100">

            <button
              className="w-[56px] h-[40px] bg-gray-100 rounded-full dark:bg-gray-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="none"
                   className="w-6 grow-0 order-0 flex-none ml-[16px] mt-[4px]">
                <path d="M20 12H4M4 12L10 18M4 12L10 6" stroke="black" strokeWidth="2" strokeLinecap="round"
                      strokeLinejoin="round"/>
              </svg>
            </button>
            Summary
          </h1>


        </div>

        <div className="relative group mt-4 w-full">
          <div className="absolute -inset-1 shadow-shrub border rounded-3xl "></div>
          <div className="flex flex-col ">
            <div className="card w-full text-left">
              <div className="card-body text-base-100">


                <p className="text-lg font-bold pb-2">
                  Borrow
                </p>
                <div className="w-full text-xl font-semibold flex flex-row">
                  <span className="text-4xl  font-medium text-left w-[500px]">{amount} USDC</span>
                  <img src="/usdc-logo.svg" className="w-10 inline align-baseline"/>
                </div>
                <p className="text-shrub-grey-700 text-lg text-left font-light pt-8 max-w-[550px]">You are borrowing <strong>{amount} USDC</strong> and giving <strong>{requiredCollateral} SOL</strong> as collateral. There is no interest, and you have one month to repay
                  the loan. The collateral will be locked until the loan is fully paid, and then it will be returned to
                  you.</p>

                <div className="divider h-0.5 w-full bg-gray-100 my-8"></div>
                {/*receipt start*/}
                <div className="mb-2 flex flex-col gap-3 text-shrub-grey-200 text-lg font-light">
                  <div className="flex flex-row  justify-between">
                    <span className="">Required collateral</span>
                    <span>{requiredCollateral} SOL</span>
                  </div>
                  <div className="flex flex-row  justify-between">
                    <span className="">Start Date</span>
                    <span>{currentDate.toDateString()}</span>
                  </div>
                  <div className="flex flex-row  justify-between">
                    <span className="">Due Date</span>
                    <span>{endDate.toDateString()}<img src="/edit.svg" className="w-5 inline align-baseline ml-2"/></span>
                  </div>
                  <div className="flex flex-row  justify-between">
                    <span className="">Interest Rate ✨</span>
                    <span className="font-semibold text-shrub-green-500"> {interestRate}</span>
                  </div>
                  <div className="flex flex-row  justify-between">
                    <span className="">Wallet</span>
                    <span>0x5464e8...36200<img src="/copy.svg" className="w-6 hidden md:inline align-baseline ml-2"/> </span>
                  </div>
                  <div className="flex flex-row  justify-between">
                    <span className="">Contract Address</span>
                    <span>0x78s44e8...32sd0<img src="/copy.svg" className="w-6 hidden md:inline align-baseline ml-2"/> </span>
                  </div>
                  {/*<div className="flex flex-row  justify-between">*/}
                  {/*  <span className="">Late Penalty<img src="/info-circle.svg"*/}
                  {/*                                               className="w-6 ml-2 inline"/></span>*/}
                  {/*  <span>1%</span>*/}
                  {/*</div>*/}
                </div>

                <div className="divider h-0.5 w-full bg-gray-100 my-8"></div>

                {/*total*/}
                <div className="flex flex-col gap-3 mb-6 text-shrub-grey-200 text-lg font-light">
                  <div className="flex flex-row justify-between ">
                    <span className="">Due today</span>
                    <span>{requiredCollateral} SOL</span>
                  </div>
                  <div className="flex flex-row justify-between">
                    <span className="">Gas Cost</span>
                    <span>0.0012 SOL</span>
                  </div>
                </div>
                {/*cta*/}
                <button
                  className="btn btn-block bg-shrub-green border-0 hover:bg-shrub-green-500 normal-case text-xl mb-4  ">Deposit
                </button>
                <button
                  className="btn btn-block bg-white border text-shrub-grey-700 hover:bg-gray-100 hover:border-shrub-grey-50 normal-case text-xl border-shrub-grey-50">Cancel
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

  );
};
