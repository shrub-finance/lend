import React, { useEffect, useRef, useState } from "react";
import { handleErrorMessagesFactory } from "../../components/HandleErrorMessages";
import { useBalance, useContract } from "@thirdweb-dev/react";
import { getContractAbis, getContractAddresses } from "../../utils/contracts";
import { NATIVE_TOKEN_ADDRESS } from "@thirdweb-dev/sdk";
import {
  EXCHANGE_RATE_BUFFER,
  interestToLTV,
  isInvalidOrZero,
  ONE_HUNDRED_PERCENT,
  percentMul,
  roundEth,
} from "../../utils/ethMethods";
import { BigNumber, ethers } from "ethers";
import Image from "next/image";
import { interestRates, Zero } from "../../constants";
import { useValidation } from "../../hooks/useValidation";
import ErrorDisplay from "../../components/ErrorDisplay";
import { getChainInfo } from "../../utils/chains";
import Tooltip from "../../components/Tooltip";

interface BorrowViewProps {
  onBorrowViewChange: (interestRate, amount) => void;
  requiredCollateral: ethers.BigNumber;
  setRequiredCollateral: (value: ethers.BigNumber) => void;
}

export const BorrowView: React.FC<BorrowViewProps> = ({
  onBorrowViewChange,
  requiredCollateral,
  setRequiredCollateral,
}) => {
  const { chainId } = getChainInfo();
  const { lendingPlatformAddress } = getContractAddresses(chainId);
  const { lendingPlatformAbi } = getContractAbis(chainId);

  const [localError, setLocalError] = useState("");
  const handleErrorMessages = handleErrorMessagesFactory(setLocalError);
  const [showBorrowAPYSection, setShowBorrowAPYSection] = useState(false);
  const {
    errors: borrowErrors,
    setError: setBorrowError,
    clearError: clearBorrowError,
  } = useValidation();
  const { data: ethBalance, isLoading: ethBalanceIsLoading } =
    useBalance(NATIVE_TOKEN_ADDRESS);
  const [maxBorrow, setMaxBorrow] = useState(ethers.utils.parseEther("0"));
  const [borrowAmount, setBorrowAmount] = useState("");
  const [displayAmount, setDisplayAmount] = useState("");

  const [selectedInterestRate, setSelectedInterestRate] = useState("8");
  const {
    contract: lendingPlatform,
    isLoading: lendingPlatformIsLoading,
    error: lendingPlatformError,
  } = useContract(lendingPlatformAddress, lendingPlatformAbi);

  const format = (val: string) => val;
  const isValidationError = !!borrowErrors.borrow;

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  async function fillMax() {
    if (
      lendingPlatformIsLoading ||
      lendingPlatformError ||
      ethBalanceIsLoading
    ) {
      handleErrorMessages({
        customMessage: "Wallet not connected. Please check your connection.",
      });
      console.log("wallet not connected");
    } else {
      console.log(ethers.utils.formatUnits(maxBorrow, 6));
      setBorrowAmount(ethers.utils.formatUnits(maxBorrow, 6));
    }
  }
  const handleAmountChange = (event) => {
    if (ethBalance?.value?.isZero()) {
      setBorrowError(
        "borrow",
        "No ETH balance. Please add ETH to your wallet.",
      );
      return;
    }

    let inputValue = event.target.value.trim();

    if (inputValue.startsWith(".")) {
      inputValue = "0" + inputValue; // Prepend '0' if input starts with '.'
    }

    // Remove commas for numeric processing
    const rawValue = inputValue.replace(/,/g, "");

    if (rawValue === "") {
      setBorrowAmount("");
      setDisplayAmount("");
      setLocalError("");
      clearBorrowError("borrow");
      return;
    }

    if (
      requiredCollateral &&
      ethBalance?.value &&
      requiredCollateral.gt(ethBalance.value)
    ) {
      setBorrowError("borrow", "ETH wallet balance insufficient.");
      return;
    }

    const isValidInput = /^([0-9]+(\.[0-9]{1,6})?|\.[0-9]{1,6})$/.test(
      rawValue,
    );
    const parsedValue = parseFloat(rawValue);
    const isInvalidOrZero =
      !isValidInput || isNaN(parsedValue) || parsedValue === 0;

    if (isInvalidOrZero) {
      setBorrowError(
        "borrow",
        "Must be a valid number, greater than 0, less than 6 decimal places",
      );
    } else {
      clearBorrowError("borrow");
    }

    setBorrowAmount(rawValue);

    const formattedValue = parsedValue.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    });

    // Set the formatted display value
    setDisplayAmount(formattedValue);
  };

  useEffect(() => {
    async function determineRequiredCollateral() {
      const ltv = interestToLTV[selectedInterestRate];
      const usdcUnits = ethers.utils.parseUnits(borrowAmount, 6); // Use raw value for calculations
      const coll: BigNumber = await lendingPlatform.call("requiredCollateral", [
        ltv,
        usdcUnits,
      ]);
      // Add the exchange rate buffer to the requiredCollateral
      return roundEth(
        percentMul(coll, ONE_HUNDRED_PERCENT.add(EXCHANGE_RATE_BUFFER)),
        6,
      );
    }

    if (
      selectedInterestRate !== "" &&
      borrowAmount !== "0" &&
      !isInvalidOrZero(borrowAmount)
    ) {
      determineRequiredCollateral()
        .then((res) => setRequiredCollateral(res))
        .catch((e) => {
          console.error(e);
          handleErrorMessages({
            customMessage: "Unable to determine required collateral",
          });
        });
    }
  }, [
    borrowAmount,
    selectedInterestRate,
    lendingPlatform,
    setRequiredCollateral,
  ]);

  useEffect(() => {
    getMaxBorrow()
      .then((m) => {
        setMaxBorrow(m);
      })
      .catch((e) => console.error(e));
  }, [selectedInterestRate]);

  async function getMaxBorrow() {
    if (
      lendingPlatformIsLoading ||
      lendingPlatformError ||
      ethBalanceIsLoading ||
      !selectedInterestRate ||
      !ethBalance.value
    ) {
      return ethers.utils.parseEther("0");
    }
    const maxBorrow: BigNumber = await lendingPlatform.call("maxBorrow", [
      interestToLTV[selectedInterestRate],
      ethBalance.value,
    ]);
    return maxBorrow;
  }
  const handleBorrowContinue = () => {
    onBorrowViewChange(selectedInterestRate, borrowAmount);
  };

  return (
    <div className="md:hero mx-auto p-4 max-w-[600px]">
      <div className="md:hero-content flex flex-col">
        {/*alert*/}
        <div className="mt-6 self-start">
          {localError && (
            <div
              className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 flex items-center"
              role="alert"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current shrink-0 h-6 w-6 mr-2"
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
          {/*heading*/}
          <h1 className="text-[36px] font-bold leading-[44px] tracking-tightest">
            Borrow
          </h1>
          <p className="text-[16px] font-normal leading-[24px] text-left">
            Borrow USDC on Shrub with fixed-rates as low as
            <span className="font-bold"> 0 - 8% APR</span>
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
                    <span className="text-[16px] font-semibold leading-[24px] text-left">
                      Enter borrow amount
                    </span>
                    {/*<span className="label-text-alt  text-xl font-semibold absolute right-4 top-[57px]">*/}
                    {/*  <Image*/}
                    {/*    alt="usdc logo"*/}
                    {/*    src="/usdc-logo.svg"*/}
                    {/*    className="w-[22px] mr-1 inline align-sub"*/}
                    {/*    width="40"*/}
                    {/*    height="40"*/}
                    {/*  />*/}
                    {/*  USDC*/}
                    {/*</span>*/}
                  </label>
                  <div className="relative w-full">
                    <span className="absolute left-[-0.25rem] top-1/2 transform -translate-y-1/2 text-[78px] font-medium pointer-events-none">
                      $
                    </span>
                    <input
                      type="text"
                      placeholder="0"
                      name="amount"
                      id="amount"
                      ref={inputRef}
                      className="input pl-12 pr-16 w-full h-[70px] bg-white border-none font-medium text-[78px] focus:outline-none"
                      onChange={(e) => {
                        handleAmountChange(e);
                        setShowBorrowAPYSection(true);
                      }}
                      value={format(displayAmount)}
                    />
                    <button
                      className="hidden sm:block absolute right-4 top-1/2 transform -translate-y-1/2 bg-shrub-grey-light2 rounded-full px-4 py-2 font-semibold"
                      onClick={fillMax}
                    >
                      Max
                    </button>
                  </div>
                  <ErrorDisplay errors={borrowErrors} />
                  {/*enter max section*/}
                  {/*<div className="flex items-center justify-between mt-0 sm:mt-2">*/}
                  {/*  <span className="label-text-alt text-shrub-grey-200 text-sm font-light">*/}
                  {/*    Wallet balance:{" "}*/}
                  {/*    {!ethBalanceIsLoading && (*/}
                  {/*      <span>{ethBalance.displayValue || 0} ETH</span>*/}
                  {/*    )}*/}
                  {/*  </span>*/}
                  {/*  <button*/}
                  {/*    className="label-text-alt w-[66px] h-[40px] px-4 py-2 gap-2 rounded-tl-[30px] rounded-tr-none rounded-br-none rounded-bl-none opacity-0 bg-shrub-grey-light2 cursor-pointer"*/}
                  {/*    onClick={fillMax}*/}
                  {/*  >*/}
                  {/*    ENTER MAX*/}
                  {/*  </button>*/}
                  {/*</div>*/}
                </div>

                {/*interest rate control*/}
                <div className="form-control w-full mt-8">
                  <label className="label">
                    <span className="text-[16px] font-semibold leading-[24px] text-left">
                      Interest Rate
                    </span>
                  </label>
                  <div>
                    <ul className="flex flex-row ">
                      {interestRates.map(({ id, rate }) => (
                        <li className="mr-4" key={id}>
                          <input
                            type="radio"
                            id={id}
                            name="borrow"
                            value={id}
                            className="hidden peer"
                            checked={rate === selectedInterestRate}
                            onChange={() => {
                              setSelectedInterestRate(rate);
                            }}
                            required
                          />
                          <label
                            htmlFor={id}
                            className="inline-flex items-center justify-center w-full px-4 md:px-8 lg:px-8 py-3 text-shrub-grey bg-white border border-shrub-grey-50 rounded-lg cursor-pointer peer-checked:border-shrub-green-300 peer-checked:bg-teal-50 peer-checked:text-shrub-green-500 hover:text-shrub-green hover:border-shrub-green-300 hover:bg-teal-50 select-none"
                          >
                            <div className="block">
                              <div className="w-full text-lg font-semibold">
                                {rate}%
                              </div>
                            </div>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/*<div className="divider h-0.5 w-full bg-shrub-grey-light2 my-8"></div>*/}

                {/*display required collateral*/}
                {showBorrowAPYSection && (
                  <div className="hero-content mb-2 mt-8 flex-col gap-2 justify-between">
                    <div className="card w-full flex flex-row text-lg justify-between">
                      <span className="w-[360px]">Required collateral</span>
                      <span className="hidden md:inline">
                        <Image
                          alt="eth logo"
                          src="/eth-logo.svg"
                          className="w-4 inline align-middle"
                          width="16"
                          height="24"
                        />{" "}
                        ETH
                      </span>
                    </div>
                    <div className="card w-full bg-teal-50 border border-shrub-green p-10">
                      {Number(borrowAmount) ? (
                        // <span className="text-4xl text-shrub-green-500 font-bold text-center">
                        <span className="text-2xl sm:text-5xl text-shrub-green-500 font-bold text-center">
                          {ethers.utils.formatEther(requiredCollateral)} ETH
                        </span>
                      ) : (
                        <span className="sm:text-4xl md:text-5xl text-shrub-green-500 font-bold text-center">
                          ---- ETH
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <div className="divider h-[1px] w-full bg-shrub-grey-light2 my-8"></div>
                {/*cta*/}
                <Tooltip text="Enter amount to proceed" showOnDisabled>
                  <button
                    className="w-full h-[59px] px-5 py-3 bg-shrub-green-900 rounded-full text-white font-semibold leading-[24px] disabled:bg-shrub-grey-50
                  disabled:border-shrub-grey-100
                  disabled:text-white
                  disabled:border"
                    disabled={
                      Number(borrowAmount) <= 0 ||
                      selectedInterestRate === "" ||
                      requiredCollateral.lte(Zero) ||
                      isValidationError
                    }
                    onClick={handleBorrowContinue}
                  >
                    Continue
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
