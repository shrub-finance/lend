import React, { FC, useEffect, useState } from "react";
import { handleErrorMessagesFactory } from "../../components/HandleErrorMessages";
import { useBalance } from "@thirdweb-dev/react";
import { getContractAddresses } from "../../utils/contracts";
import { toEthDate } from "@shrub-lend/common";
import { calculateLockupPeriod } from "@shrub-lend/common";
import Image from "next/image";
import {
  oneMonth,
  sixMonth,
  threeMonth,
  twelveMonth,
  Zero,
} from "../../constants";
import { useFinancialData } from "../../components/FinancialDataContext";
import { useValidation } from "../../hooks/useValidation";
import ErrorDisplay from "../../components/ErrorDisplay";
import { getChainInfo } from "../../utils/chains";
import { ethers } from "ethers";
import Tooltip from "components/Tooltip";
import {ga4events} from "../../utils/ga4events";
import {Button} from "../../components/Button";

interface DepositViewProps {
  onDepositViewChange: (
    estimatedAPY: string,
    timestamp: number,
    depositAmount: string,
  ) => void;
}

export const DepositView: FC<DepositViewProps> = ({ onDepositViewChange }) => {
  const { chainId } = getChainInfo();
  const { usdcAddress } = getContractAddresses(chainId);

  const { data: usdcBalance, isLoading: usdcBalanceIsLoading } =
    useBalance(usdcAddress);
  const format = (val: string) => val;
  const [depositAmount, setDepositAmount] = useState("");
  const [localError, setLocalError] = useState("");
  const handleErrorMessages = handleErrorMessagesFactory(setLocalError);
  const {
    errors: depositErrors,
    setError: setDepositError,
    clearError: clearDepositError,
  } = useValidation();
  const [timestamp, setTimestamp] = useState(0);
  const [showLendAPYSection, setShowLendAPYSection] = useState(false);
  const [continueButtonEnabled, setContinueButtonEnabled] = useState(false);
  const [estimatedAPY, setEstimatedAPY] = useState("0");
  const { store, dispatch } = useFinancialData();

  async function fillMax() {
    if (!usdcBalanceIsLoading) {
      setDepositAmount(usdcBalance.displayValue);
    } else {
      handleErrorMessages({
        customMessage: "Wallet not connected. Please check your connection.",
      });
      console.log("wallet not connected");
    }
  }

  const handleDepositAmountChange = (event) => {
    if (!usdcBalance || !usdcBalance.value) {
      setDepositError(
        "deposit",
        "No USDC balance. Please add USDC to your wallet.",
      );
      setShowLendAPYSection(false);
      return;
    }

    if (usdcBalance.value.isZero()) {
      setDepositError(
        "deposit",
        "No USDC balance. Please add USDC to your wallet.",
      );
      setShowLendAPYSection(false);
      return;
    }

    let inputValue = event.target.value.trim();
    if (inputValue.startsWith(".")) {
      inputValue = "0" + inputValue; // Prepend '0' if input starts with '.'
    }
    setDepositAmount(inputValue);

    if (inputValue === "") {
      clearDepositError("deposit");
      setShowLendAPYSection(false);
      return;
    }

    // Validates inputValue as a number:
    // - Integer (e.g., "123")
    // - Float with up to 6 decimals (e.g., "123.456789" or ".456789")
    const isValidInput = /^([0-9]+(\.[0-9]{1,6})?|\.[0-9]{1,6})$/.test(
      inputValue,
    );
    const parsedValue = parseFloat(inputValue);
    const isInvalidOrZero =
      !isValidInput || isNaN(parsedValue) || parsedValue === 0;

    if (isInvalidOrZero) {
      setDepositError(
        "deposit",
        "Must be a valid number, greater than 0, less than 6 decimal places",
      );
      setShowLendAPYSection(false);
    } else if (usdcBalance.value.lt(ethers.utils.parseUnits(inputValue, 6))) {
      setDepositError("deposit", "Amount exceeds wallet balance");
      return;
    } else {
      clearDepositError("deposit");
      setShowLendAPYSection(true);
    }
  };

  useEffect(() => {
    const handleAPYCalc = () => {
      setContinueButtonEnabled(true);

      const apyGenerated =
        timestamp === oneMonth.getTime() / 1000
          ? 7.56
          : timestamp === threeMonth.getTime() / 1000
          ? 8.14
          : timestamp === sixMonth.getTime() / 1000
          ? 9.04
          : timestamp === twelveMonth.getTime() / 1000
          ? 10.37
          : Math.random() * 5 + 7;

      setEstimatedAPY(apyGenerated.toFixed(2).toString());
    };

    if (timestamp) {
      handleAPYCalc();
    }
  }, [timestamp]); // Removed handleAPYCalc from dependencies

  const isValidationError = !!depositErrors.deposit;

  const handleLendContinue = () => {
    onDepositViewChange(estimatedAPY, timestamp, depositAmount);
  };

  return (
    <div className="md:hero mx-auto p-4 max-w-[650px]">
      <div className="md:hero-content flex flex-col">
        <div className="mt-6 self-start">
          {localError && (
            <div className="alert alert-warning justify-start mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current shrink-0 h-6 w-6 ml-4p"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>{localError}</span>
            </div>
          )}
          <h1 className=" text-5xl font-bold ">Deposit</h1>
          <p className=" text-lg font-light pt-2">
            Supply your USDC on Shrub and earn up to{" "}
            <span className="font-semibold">7-12% APY</span>
          </p>
        </div>

        <div className="relative group mt-10 w-full">
          <div className="absolute -inset-1 shadow-shrub border rounded-3xl"></div>
          <div className="flex flex-col mt-2">
            <div className="card w-full text-left">
              <div className="card-body ">
                {/*amount control*/}
                <div className="form-control w-full">
                  <label className="label relative">
                    <span className="label-text text-shrub-blue text-md">
                      Amount
                    </span>
                    <span className="label-text-alt text-xl font-semibold absolute right-4 top-[57px]">
                      <Image
                        src="/usdc-logo.svg"
                        className="w-[22px] mr-1 inline align-sub"
                        width="40"
                        height="40"
                        alt="usdc logo"
                      />
                      USDC
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter amount"
                    className="input input-bordered w-full h-[70px] bg-white border-solid border border-shrub-grey-light2 text-lg
                         focus:outline-none focus:shadow-shrub-thin focus:border-shrub-green-50"
                    onChange={handleDepositAmountChange}
                    value={format(depositAmount)}
                  />
                  <ErrorDisplay errors={depositErrors} />
                  <label className="label">
                    <span className="label-text-alt text-shrub-grey-200 text-sm font-light">
                      Wallet balance:{" "}
                      {!usdcBalanceIsLoading && (
                        <span>{usdcBalance.displayValue} USDC</span>
                      )}
                    </span>
                    <button
                      onClick={fillMax}
                      className="label-text-alt btn-sm text-shrub-green bg-green-50 p-2 rounded-md cursor-pointer text-xs"
                    >
                      ENTER MAX
                    </button>
                  </label>
                </div>

                {/*interest rate control*/}
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text text-shrub-blue">
                      Lockup period
                    </span>
                  </label>
                  <ul className="flex flex-col gap-4 select-none lg:flex-row lg:gap-0">
                    {store.platformData &&
                    store.platformData.activePoolTimestamps.length ? (
                      store.platformData.activePoolTimestamps.map(
                        (activePoolTimestamp) => (
                          <li
                            key={activePoolTimestamp.toISOString()}
                            className="mr-4"
                          >
                            <input
                              type="radio"
                              id={activePoolTimestamp.toISOString()}
                              name="deposit"
                              value={toEthDate(activePoolTimestamp)}
                              className="hidden peer"
                              required
                              onChange={() => {
                                setTimestamp(toEthDate(activePoolTimestamp));
                                setShowLendAPYSection(true);
                              }}
                            />
                            <label
                              htmlFor={activePoolTimestamp.toISOString()}
                              className="inline-flex items-center justify-center w-full px-4 py-3 text-shrub-grey bg-white border border-shrub-grey-light2 rounded-lg cursor-pointer hover:text-shrub-green hover:border-shrub-green hover:bg-teal-50 peer-checked:shadow-shrub-thin peer-checked:border-shrub-green-50 peer-checked:bg-teal-50 peer-checked:text-shrub-green-500 select-none"
                            >
                              <div className="block">
                                <div className="w-full text-lg font-semibold">
                                  {calculateLockupPeriod(activePoolTimestamp)}
                                </div>
                              </div>
                            </label>
                          </li>
                        ),
                      )
                    ) : (
                      <li className="mr-4">
                        <div className="alert alert-warning justify-start mb-6">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="stroke-current shrink-0 h-6 w-6 ml-4p"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                          </svg>
                          <span>Platform data not loading</span>
                        </div>
                      </li>
                    )}
                  </ul>
                </div>

                {/*divider*/}
                <div className="divider h-0.5 w-full bg-shrub-grey-light2 my-8"></div>

                {/*display estimate apy*/}
                {showLendAPYSection && continueButtonEnabled && (
                  <div className="hero-content flex-col mb-4">
                    <p className="self-start text-lg">Estimated APY</p>
                    <div className="card flex-shrink-0 w-full bg-teal-50 py-6 border-shrub-green border">
                      <div className="text-center p-2">
                        <span className="sm: text-5xl md:text-6xl text-shrub-green-500 font-bold">
                          {estimatedAPY}%
                        </span>
                        <span className=" pl-3 text-2xl font-thin text-shrub-green-500">
                          APY
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                {/*CTA*/}
                <Tooltip text="Enter amount to proceed" showOnDisabled>

                  <Button
                    type="primary"
                    text="Continue"
                    disabled={
                      Number(depositAmount) <= 0 ||
                      !timestamp ||
                      isValidationError
                    }
                    onClick={handleLendContinue}
                  />
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
