import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  calcLtv,
  formatLargeUsdc,
  formatPercentage,
  isInvalidOrZero,
} from "../../../utils/ethMethods";
import PartialRepaySummaryView from "../repay-borrow/PartialRepaySummaryView";
import {
  getContractAbis,
  getContractAddresses,
} from "../../../utils/contracts";
import { ethers } from "ethers";
import { Zero } from "../../../constants";
import { useValidation } from "../../../hooks/useValidation";
import ErrorDisplay from "../../../components/ErrorDisplay";
import { getChainInfo } from "../../../utils/chains";
import { useEthPrice } from "../../../hooks/useEthPriceFromShrub";
import { BorrowObj } from "../../../types/types";

interface PartialRepayViewProps {
  borrow: BorrowObj;
  isFullPay: boolean;
  partialPaymentRequested: boolean;
  setPartialPaymentRequested: (partialPaymentRequested: boolean) => void;
  onModalClose: () => void;
}

const PartialRepayView: React.FC<PartialRepayViewProps> = ({
  borrow,
  isFullPay,
  partialPaymentRequested,
  setPartialPaymentRequested,
  onModalClose,
}) => {
  const { chainId } = getChainInfo();
  const { lendingPlatformAddress } = getContractAddresses(chainId);
  const { lendingPlatformAbi } = getContractAbis(chainId);

  const { ethPrice, isLoading, error } = useEthPrice(
    lendingPlatformAddress,
    lendingPlatformAbi,
  );
  const [repayActionInitiated, setRepayActionInitiated] = useState(false);
  const [repayAmount, setRepayAmount] = useState(formatLargeUsdc(borrow.debt));
  const [newLtv, setNewLtv] = useState<ethers.BigNumber>();
  const {
    errors: repayErrors,
    setError: setError,
    clearError: clearError,
  } = useValidation();

  useEffect(() => {
    if (isFullPay) {
      setRepayAmount(formatLargeUsdc(borrow.debt));
    }
  }, [isFullPay, borrow.debt]);

  useEffect(() => {
    if (
      !ethPrice ||
      ethPrice.isZero() ||
      repayAmount !== formatLargeUsdc(borrow.debt)
    ) {
      return;
    }
    setNewLtv(calcLtv(borrow.debt, borrow.collateral, ethPrice));
  }, [ethPrice]);

  const handleRepayAmountChange = (event) => {
    let inputValue = event.target.value.trim();
    if (inputValue.startsWith(".")) {
      inputValue = "0" + inputValue; // Prepend '0' if input starts with '.'
    }
    const parsedValue = parseFloat(inputValue);
    setRepayAmount(inputValue);
    if (inputValue === "") {
      clearError("validation");
      clearError("exceeding");
      setNewLtv(Zero);
      return;
    }
    if (isInvalidOrZero(inputValue)) {
      setError("validation", "Amount must be a number");
    } else {
      clearError("validation");
    }
    if (parsedValue > parseFloat(formatLargeUsdc(borrow.debt))) {
      setError("exceeding", "Amount exceeds repayment amount");
    } else {
      clearError("exceeding");
    }
    if (
      !isInvalidOrZero(inputValue) &&
      parsedValue <= parseFloat(formatLargeUsdc(borrow.debt)) &&
      ethPrice &&
      !ethPrice.isZero()
    ) {
      const newDebt = borrow.debt.sub(
        ethers.utils.parseEther(parsedValue.toString()),
      );
      setNewLtv(calcLtv(newDebt, borrow.collateral, ethPrice));
    } else {
      setNewLtv(Zero);
    }
  };

  function handleBackRepay() {
    setPartialPaymentRequested(false);
  }

  return (
    <>
      {!partialPaymentRequested ? (
        <div className="relative group w-full">
          <div className="flex flex-col">
            <div className="card w-full text-left">
              <div className="card-body">
                <div className="form-control w-full">
                  <label className="label relative">
                    <span className="label-text text-shrub-blue">Amount</span>
                    <span className="label-text-alt  text-xl font-semibold absolute right-4 top-[57px]">
                      <Image
                        alt="usdc logo"
                        src="/usdc-logo.svg"
                        className="w-[22px] mr-1 inline align-sub"
                        width="40"
                        height="40"
                      />
                      USDC
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder="Amount"
                    name="amount"
                    id="amount"
                    className="input input-bordered w-full h-[70px] bg-white border-solid border !border-shrub-grey-50 text-lg focus:outline-none focus:shadow-shrub-thin focus:border-shrub-green-50"
                    onChange={handleRepayAmountChange}
                    value={repayAmount}
                  />
                  <ErrorDisplay errors={repayErrors} />
                </div>
                {/*divider*/}
                <div className="divider h-0.5 w-full bg-shrub-grey-light2 my-8"></div>
                <div className="hero-content flex-col mb-2">
                  <p className="self-start text-lg">Estimated LTV</p>
                  <div className="card flex-shrink-0 w-full bg-teal-50 py-6 border-shrub-green border">
                    <div className="text-center p-2">
                      <span className="sm: text-5xl md:text-6xl text-shrub-green-500 font-bold">
                        {newLtv && formatPercentage(newLtv)}%
                      </span>
                      <span className=" pl-3 text-2xl font-thin text-shrub-green-500">
                        LTV
                      </span>
                    </div>
                  </div>
                </div>
                {/*CTA*/}
                <button
                  className="btn btn-block bg-shrub-green border-0 hover:bg-shrub-green-500 text-xl text-white normal-case disabled:bg-shrub-grey-50 disabled:border-shrub-grey-100 disabled:text-white disabled:border"
                  onClick={() => {
                    setPartialPaymentRequested(true);
                  }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <PartialRepaySummaryView
          onBackRepay={handleBackRepay}
          borrow={borrow}
          repayAmount={ethers.utils.parseEther(repayAmount)}
          newLtv={newLtv}
          onModalClose={onModalClose}
        />
      )}
    </>
  );
};

export default PartialRepayView;
