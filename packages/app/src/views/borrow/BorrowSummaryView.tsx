import { FC, useEffect, useState } from "react";
import { useAddress, Web3Button } from "@thirdweb-dev/react";
import { getContractAddresses, getContractAbis } from "../../utils/contracts";
import {
  fromEthDate,
  interestToLTV,
  truncateEthAddress,
} from "../../utils/ethMethods";
import { ethers } from "ethers";
import { useRouter } from "next/router";
import { handleErrorMessagesFactory } from "../../components/HandleErrorMessages";
import {
  getUserData,
  useFinancialData,
} from "../../components/FinancialDataContext";
import Image from "next/image";
import { Borrow } from "../../types/types";
import { getChainInfo } from "../../utils/chains";
import TransactionButton from "../../components/TxButton";
import { ga4events } from "../../utils/ga4events";
import Confetti from "react-confetti";

interface BorrowSummaryViewProps {
  requiredCollateral: ethers.BigNumber;
  timestamp: number;
  interestRate: string;
  amount: string;
  backtoBorrowDuration: () => void;
  onCancel: () => void;
}

export const BorrowSummaryView: FC<BorrowSummaryViewProps> = ({
  backtoBorrowDuration,
  onCancel,
  requiredCollateral,
  timestamp,
  interestRate,
  amount,
}) => {
  const router = useRouter();
  const [localError, setLocalError] = useState("");
  const handleErrorMessages = handleErrorMessagesFactory(setLocalError);

  const handleViewDash = async () => {
    await router.push("/dashboard");
  };
  const { store, dispatch } = useFinancialData();
  const [borrowActionInitiated, setBorrowActionInitiated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [borrowButtonPressed, setBorrowButtonPressed] = useState(false);
  const [latestBorrowId, setLatestBorrowId] = useState<string>();
  const [txHash, setTxHash] = useState<string | null>(null);

  const walletAddress = useAddress();

  // Calculate the end date by adding the number of months to the current date
  const currentDate = new Date();
  const endDate = fromEthDate(timestamp);

  const latestBorrow = getUserData(store, walletAddress).borrows.find(
    (borrow) => borrow.id === latestBorrowId && borrow.tempData,
  );

  useEffect(() => {
    if (localError) {
      const element = document.querySelector(".md\\:hero");
      if (element) element.scrollIntoView({ behavior: "smooth" });
    }
  }, [localError]);

  const { chainId } = getChainInfo();
  const { lendingPlatformAddress } = getContractAddresses(chainId);
  const { lendingPlatformAbi } = getContractAbis(chainId);

  const handleCopyClick = () => {
    setCopied(false);
    navigator.clipboard.writeText(lendingPlatformAddress);
    setCopied(true);
    ga4events.summaryContractAddressCopy();
    setTimeout(() => setCopied(false), 1000);
  };

  const handleWeb3ButtonClick = () => {
    // Only record the event if there is no connected wallet
    if (walletAddress) {
      return;
    }
    ga4events.summaryConnectWallet();
  };

  return (
    <div className="md:hero mx-auto p-4 max-w-[680px]">
      <div className="md:hero-content flex flex-col">
        {/*outer card content*/}
        <div className="mt-6 self-start">
          {/*errors*/}
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
          {/*back button*/}
          <h1 className=" text-4xl font-medium">
            <button
              className="w-[56px] h-[40px] bg-shrub-grey-light3 rounded-full "
              onClick={backtoBorrowDuration}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="26"
                height="26"
                fill="none"
                className="w-6 grow-0 order-0 flex-none ml-[16px] mt-[4px]"
              >
                <path
                  d="M20 12H4M4 12L10 18M4 12L10 6"
                  stroke="black"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            Summary
          </h1>
        </div>
        {/*card starts*/}
        <div className="relative group mt-4 w-full lg:min-w-[500px]">
          <div className="absolute -inset-1 shadow-shrub border rounded-3xl"></div>
          <div className="flex flex-col ">
            <div className="card w-full">
              <div className="card-body">
                {/*header*/}
                {!borrowActionInitiated && (
                  <>
                    <p className="text-lg font-bold pb-2 text-left">
                      Borrow amount
                    </p>
                    <div className="w-full text-xl font-semibold flex flex-row">
                      <span className="text-4xl  font-medium text-left w-[500px]">
                        {amount} USDC
                      </span>
                      <Image
                        alt="usdc icon"
                        src="/usdc-logo.svg"
                        className="w-10 inline align-baseline"
                        width="40"
                        height="40"
                      />
                    </div>
                    <p className="text-shrub-grey-700 text-lg text-left font-light pt-8 max-w-[550px]">
                      You are borrowing{" "}
                      <span className="font-semibold">{amount} USDC</span> and
                      providing{" "}
                      <span className="font-semibold">
                        {ethers.utils.formatEther(requiredCollateral)} ETH
                      </span>{" "}
                      as collateral. The collateral will be locked until the
                      borrow is fully paid. The interest rate of{" "}
                      <span className="font-semibold">{interestRate}%</span> is
                      guaranteed for
                      <span className="font-semibold"> 1 year </span>
                      and then may adjust to the rate at that time.
                    </p>
                  </>
                )}

                {/*success and pending states*/}
                {borrowButtonPressed && (
                  <>
                    <div className="flex items-center justify-center p-14">
                      {/*spinner*/}
                      <div
                        role="status"
                        className="flex w-[230px] h-[230px] items-center justify-center rounded-full bg-gradient-to-tr from-shrub-green-900 to-shrub-green-50 animate-spin"
                      >
                        <div className="w-[205px] h-[205px] rounded-full bg-white"></div>
                      </div>
                    </div>
                  </>
                )}

                {latestBorrow?.status === "pending" && (
                  <>
                    <p className="text-lg font-bold pb-2 text-left">
                      Borrow Submitted
                    </p>
                    <div className="flex items-center justify-center p-20">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1}
                        stroke="#0A4736"
                        className="w-[300px] h-[300px]"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                        />
                      </svg>
                    </div>
                  </>
                )}

                {borrowActionInitiated && (
                  <>
                    {latestBorrow?.status === "confirmed" && (
                      <>
                        <p className="text-lg font-bold pb-2 text-left">
                          Borrow Successful{" "}
                        </p>
                        <p
                          role="status"
                          className="w-[250px] h-[250px] m-[108px] sm:self-center"
                        >
                          <Image
                            src="/checkmark.svg"
                            alt="Loading"
                            className="w-full h-full"
                            width="250"
                            height="250"
                          />
                          <span className="sr-only">Loading...</span>
                        </p>
                      </>
                    )}
                    {latestBorrow?.status === "failed" && (
                      <>
                        <p className="text-lg font-bold pb-2 text-left">
                          Borrow Unsuccessful{" "}
                        </p>
                        <p
                          role="status"
                          className="w-[250px] h-[250px] m-[108px] sm:self-center"
                        >
                          <Image
                            src="/exclamation.svg"
                            alt="Loading"
                            className="w-full h-full"
                            width="250"
                            height="250"
                          />
                          <span className="sr-only">Loading...</span>
                        </p>
                      </>
                    )}
                  </>
                )}

                {/*divider*/}
                <div className="divider h-0.5 w-full bg-shrub-grey-light3"></div>

                {/*receipt start*/}
                {!borrowActionInitiated && !borrowButtonPressed && (
                  <>
                    <div className="mb-2 flex flex-col gap-3 text-shrub-grey-200 text-lg font-light">
                      <div className="flex flex-row  justify-between">
                        <span className="">Required Collateral</span>
                        <span>
                          {ethers.utils.formatEther(requiredCollateral)} ETH
                        </span>
                      </div>
                      {/*<div className="flex flex-row  justify-between">*/}
                      {/*  <span className="">Start Date</span>*/}
                      {/*  <span>{currentDate.toDateString()}</span>*/}
                      {/*</div>*/}
                      {/*<div*/}
                      {/*  className="flex flex-row justify-between cursor-pointer"*/}
                      {/*  onClick={backtoBorrowDuration}*/}
                      {/*>*/}
                      {/*  <span className="">Due Date</span>*/}
                      {/*  <span>*/}
                      {/*    {endDate.toDateString()}*/}
                      {/*    <Image*/}
                      {/*      alt="edit icon"*/}
                      {/*      src="/edit.svg"*/}
                      {/*      className="w-5 inline align-baseline ml-2"*/}
                      {/*      width="20"*/}
                      {/*      height="20"*/}
                      {/*    />*/}
                      {/*  </span>*/}
                      {/*</div>*/}
                      <div className="flex flex-row  justify-between">
                        <span className="">Interest Rate ✨</span>
                        <span className="font-semibold text-shrub-green-500">
                          {" "}
                          {interestRate}%
                        </span>
                      </div>
                      <div className="flex flex-row  justify-between">
                        <span className="">Interest Rate Renews</span>
                        <span className="font-semibold text-shrub-green-500">
                          {" "}
                          {/*{new Date(*/}
                          {/*  new Date().setUTCFullYear(*/}
                          {/*    new Date().getUTCFullYear() + 1,*/}
                          {/*  ),*/}
                          {/*).toDateString()}*/}
                          {new Date(
                            new Date().setUTCFullYear(
                              new Date().getUTCFullYear() + 1,
                            ),
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            // day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      {/*<div className="flex flex-row  justify-between">*/}
                      {/*  <span className="">Wallet</span>*/}
                      {/*  <span>*/}
                      {/*    {truncateEthAddress(walletAddress)}*/}
                      {/*    <Image*/}
                      {/*      alt="copy icon"*/}
                      {/*      src="/copy.svg"*/}
                      {/*      className="w-6 hidden md:inline align-baseline ml-2"*/}
                      {/*      width="24"*/}
                      {/*      height="24"*/}
                      {/*    />*/}
                      {/*  </span>*/}
                      {/*</div>*/}

                      <div className="flex flex-row justify-between items-center relative">
                        <span>Contract Address</span>

                        <span
                          className="flex items-center relative cursor-pointer"
                          onClick={handleCopyClick}
                        >
                          <span
                            className={`flex items-center transition-opacity duration-500 ${
                              copied ? "opacity-0" : "opacity-100"
                            }`}
                          >
                            {truncateEthAddress(lendingPlatformAddress)}
                            <Image
                              alt="copy icon"
                              src="/copy.svg"
                              className="w-6 md:inline hidden align-baseline ml-2" // Hide on mobile, show on md+
                              width="24"
                              height="24"
                            />
                          </span>

                          <span
                            className={`absolute flex items-center font-semibold sm:left-[61px] left-[31px] text-shrub-green-500 transition-opacity duration-500 ${
                              copied ? "opacity-100" : "opacity-0"
                            }`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5 mr-1" // Show checkmark on mobile
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            Copied!
                          </span>
                        </span>
                      </div>
                    </div>

                    {/*divider*/}
                    <div className="divider h-0.5 w-full bg-shrub-grey-light3 my-8"></div>
                  </>
                )}
                {/*total section*/}
                {!borrowActionInitiated && !borrowButtonPressed && (
                  <div onClick={handleWeb3ButtonClick}>
                    {/*<div className="flex flex-col gap-3 mb-6 text-shrub-grey-200 text-lg font-light">*/}
                    {/*  <div className="flex flex-row justify-between ">*/}
                    {/*    <span className="">Due today</span>*/}
                    {/*    <span>*/}
                    {/*      {ethers.utils.formatEther(requiredCollateral)} ETH*/}
                    {/*    </span>*/}
                    {/*  </div>*/}
                    {/*</div>*/}
                    {/*borrow button*/}
                    <Web3Button
                      contractAddress={lendingPlatformAddress}
                      isDisabled={latestBorrow?.status === "pending"}
                      contractAbi={lendingPlatformAbi}
                      className="!w-full !h-[59px] px-5 py-3 !rounded-full !bg-shrub-green-900 !border-0  !font-semibold !leading-[24px] !text-white hover:!bg-shrub-green-500 !mb-4 web3button"
                      action={async (lendingPlatform) => {
                        setLocalError("");
                        // @ts-ignore
                        return await lendingPlatform?.contractWrapper?.writeContract.borrow(
                          ethers.utils.parseUnits(amount, 6),
                          requiredCollateral,
                          interestToLTV[interestRate],
                          timestamp,
                          {
                            value: requiredCollateral,
                          },
                        );
                      }}
                      onSubmit={() => {
                        ga4events.summaryBorrow(amount);
                        setBorrowButtonPressed(true);
                      }}
                      onSuccess={async (tx) => {
                        setTxHash(tx.hash);
                        setLocalError("");
                        setBorrowActionInitiated(true);
                        setBorrowButtonPressed(false);
                        const newBorrow: Borrow = {
                          id: tx.hash,
                          status: "pending",
                          collateral: requiredCollateral,
                          created: Math.floor(Date.now() / 1000),
                          originalPrincipal: ethers.utils
                            .parseEther(amount)
                            .toString(),
                          paid: "0",
                          apy: ethers.utils
                            .parseUnits(interestRate, 2)
                            .toString(),
                          principal: ethers.utils.parseEther(amount).toString(),
                          timestamp: timestamp.toString(),
                          startDate: Math.floor(Date.now() / 1000),
                          updated: Math.floor(Date.now() / 1000),
                          __typename: "Borrow",
                          tempData: true,
                        };
                        dispatch({
                          type: "ADD_BORROW",
                          payload: {
                            address: walletAddress,
                            borrow: newBorrow,
                          },
                        });
                        setLatestBorrowId(tx.hash);
                        try {
                          const receipt = await tx.wait();
                          if (!receipt.status) {
                            throw new Error("Transaction failed");
                          }
                          dispatch({
                            type: "UPDATE_BORROW_STATUS",
                            payload: {
                              address: walletAddress,
                              id: tx.hash,
                              status: "confirmed",
                            },
                          });
                        } catch (e) {
                          console.log("Transaction failed:", e);
                          dispatch({
                            type: "UPDATE_BORROW_STATUS",
                            payload: {
                              address: walletAddress,
                              id: tx.hash,
                              status: "failed",
                            },
                          });
                        }
                      }}
                      onError={(e) => {
                        handleErrorMessages({ err: e });
                        setBorrowButtonPressed(false);
                      }}
                    >
                      Borrow
                    </Web3Button>
                  </div>
                )}
                {/*tx explorer button*/}
                {txHash && (
                  <TransactionButton
                    txHash={txHash}
                    chainId={chainId}
                    className="w-full h-[59px] px-5 py-3 bg-white rounded-full font-semibold leading-[24px] border text-shrub-grey-700 border-shrub-grey-50 mb-4 normal-case text-[16px] hover:bg-shrub-green-900 hover:text-white"
                  />
                )}
                {/*confirm in wallet button*/}
                {borrowButtonPressed && !borrowActionInitiated && (
                  <button
                    disabled={true}
                    className="w-full h-[59px] px-5 py-3 bg-white rounded-full font-semibold leading-[24px] border text-shrub-grey-700 hover:bg-shrub-grey-light2 hover:border-shrub-grey-50 border-shrub-grey-50"
                  >
                    Confirm in Wallet...
                  </button>
                )}
                {/*view in dashboard button*/}
                {(borrowActionInitiated ||
                  latestBorrow?.status === "confirmed") && (
                  <button
                    onClick={handleViewDash}
                    className="w-full h-[59px] px-5 py-3 font-semibold leading-[24px] rounded-full bg-white border text-shrub-grey-700 hover:bg-shrub-grey-light2 border-shrub-grey-50"
                  >
                    View in Dashboard
                  </button>
                )}
                {/*cancel button*/}
                {!borrowActionInitiated && !borrowButtonPressed && (
                  <button
                    onClick={() => {
                      ga4events.summaryCancel();
                      onCancel();
                    }}
                    className="w-full h-[59px] px-5 py-3 bg-white rounded-full text-shrub-grey-700 border font-semibold leading-[24px] hover:bg-shrub-grey-100 hover:border-shrub-grey-50 "
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
