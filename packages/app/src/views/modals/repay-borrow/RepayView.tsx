import React, { useState, useEffect } from "react";
import Image from "next/image";
import { formatLargeUsdc } from "../../../utils/ethMethods";
import RepaySummaryView from "../repay-borrow/RepaySummaryView";
import { BorrowObj } from "../../../types/types";
import PartialRepayView from "../repay-borrow/PartialRepayView";

interface RepayViewProps {
  setIsModalOpen: (isOpen: boolean) => void;
  borrow: BorrowObj;
}

const RepayView: React.FC<RepayViewProps & { onModalClose: () => void }> = ({
  setIsModalOpen,
  borrow,
}) => {
  const [repayActionInitiated, setRepayActionInitiated] = useState(false);
  const [repayEditRequested, setRePayEditRequested] = useState(false);
  const [repayAmount, setRepayAmount] = useState(formatLargeUsdc(borrow.debt));
  const [isFullPay, setIsFullPay] = useState(true);
  const [partialPaymentRequested, setPartialPaymentRequested] = useState(false);

  const handleBackRepay = (data?) => {
    setRePayEditRequested(true);
  };

  const handleRepayActionChange = (initiated) => {
    setRepayActionInitiated(initiated);
  };

  const closeModal = () => {
    if (repayActionInitiated) {
    }
    setIsModalOpen(false);
  };

  useEffect(() => {
    if (isFullPay) {
      setRepayAmount(formatLargeUsdc(borrow.debt));
    }
  }, [isFullPay, borrow.debt]);

  return (
    <>
      <div className="flex items-center justify-between p-4 md:p-5 border-b rounded-t ">
        <h3 className="text-xl font-semibold text-shrub-grey-900 ">
          {partialPaymentRequested ? "Partial Repay" : "Repay"}
        </h3>
        <button
          type="button"
          onClick={closeModal}
          className="text-shrub-grey-400 bg-transparent hover:bg-shrub-grey-100 hover:text-shrub-grey-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center"
        >
          <svg
            className="w-3 h-3"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 14 14"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
            ></path>
          </svg>
          <span className="sr-only">Close modal</span>
        </button>
      </div>
      {repayEditRequested ? (
        <div className="relative group w-full">
          <div className="absolute border rounded-3xl"></div>
          <div className="flex flex-col">
            <div className="card w-full text-left">
              <div className="card-body">
                {!partialPaymentRequested && (
                  <div className="form-control w-full">
                    {/*back arrow*/}
                    {/*<div className='flex items-center pb-4'>*/}
                    {/*  <button onClick={() => setRePayEditRequested(false)}>*/}
                    {/*    <svg xmlns='http://www.w3.org/2000/svg' width='26' height='26' fill='none' className='w-6 grow-0 order-0 flex-none'>*/}
                    {/*      <path d='M20 12H4M4 12L10 18M4 12L10 6' stroke='#98A2B3' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />*/}
                    {/*    </svg>*/}
                    {/*  </button>*/}
                    {/*</div>*/}
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text text-shrub-blue">
                          Amount Due
                        </span>
                      </label>
                      <div className="w-full text-xl font-semibold flex flex-row">
                        <span className="text-4xl font-medium text-left w-[500px]">
                          {formatLargeUsdc(borrow.debt)} USDC
                        </span>
                        <Image
                          src="/usdc-logo.svg"
                          className="w-10 inline align-baseline"
                          alt={"usdc logo"}
                          width={10}
                          height={10}
                        />
                      </div>
                    </div>
                    <div className="form-control w-full mt-6">
                      <label className="label">
                        <span className="label-text text-shrub-blue"></span>
                      </label>
                      <ul className="flex flex-row">
                        <li className="mr-4">
                          <input
                            type="radio"
                            id="fullPay"
                            name="deposit-extension"
                            value={formatLargeUsdc(borrow.debt)}
                            className="hidden peer"
                            required
                            onChange={() => {
                              setRepayAmount(formatLargeUsdc(borrow.debt));
                              setIsFullPay(true);
                            }}
                            checked={isFullPay}
                          />
                          <label
                            htmlFor="fullPay"
                            className="inline-flex items-center justify-center w-full px-4 py-3 text-shrub-grey bg-white border border-shrub-grey-light2 rounded-lg cursor-pointer peer-checked:shadow-shrub-thin peer-checked:border-shrub-green-50 peer-checked:bg-teal-50 peer-checked:text-shrub-green-500 hover:text-shrub-green hover:border-shrub-green select-none"
                          >
                            <div className="block">
                              <p className="w-full text-lg font-semibold">
                                Pay in Full
                              </p>
                            </div>
                          </label>
                        </li>
                        <li className="mr-4">
                          <input
                            type="radio"
                            id="partialPay"
                            name="deposit-extension"
                            value="partialPay"
                            className="hidden peer"
                            required
                            onChange={() => {
                              setIsFullPay(false);
                            }}
                          />
                          <label
                            htmlFor="partialPay"
                            className="inline-flex items-center justify-center w-full px-4 py-3 text-shrub-grey bg-white border border-shrub-grey-light2 rounded-lg cursor-pointer peer-checked:shadow-shrub-thin peer-checked:border-shrub-green-50 peer-checked:bg-teal-50 peer-checked:text-shrub-green-500 hover:text-shrub-green hover:border-shrub-green select-none"
                          >
                            <div className="block">
                              <p className="w-full text-lg font-semibold">
                                Pay Partially
                              </p>
                            </div>
                          </label>
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
                {!isFullPay && (
                  <PartialRepayView
                    borrow={borrow}
                    isFullPay={isFullPay}
                    partialPaymentRequested={partialPaymentRequested}
                    setPartialPaymentRequested={setPartialPaymentRequested}
                  />
                )}

                {isFullPay && (
                  <>
                    <div className="divider h-0.5 w-full bg-shrub-grey-light2 my-8"></div>
                    <button
                      className="btn btn-block bg-shrub-green border-0 hover:bg-shrub-green-500 text-xl text-white normal-case disabled:bg-shrub-grey-50 disabled:border-shrub-grey-100 disabled:text-white disabled:border"
                      onClick={() => {
                        setRePayEditRequested(false);
                      }}
                    >
                      Confirm
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <RepaySummaryView
          onBackRepay={handleBackRepay}
          onRepayActionChange={handleRepayActionChange}
          borrow={borrow}
          repayAmount={repayAmount}
          onModalClose={closeModal}
        />
      )}
    </>
  );
};

export default RepayView;
