import React, { useEffect, useState } from "react";
import Image from "next/image";
import {
  formatLargeUsdc,
  formatPercentage,
  formatWad,
  toEthDate,
  truncateEthAddress,
} from "../../../utils/ethMethods";
import {
  getContractAbis,
  getContractAddresses,
} from "../../../utils/contracts";
import { BigNumber, ethers } from "ethers";
import {
  useAddress,
  useContract,
  useContractRead,
  Web3Button,
} from "@thirdweb-dev/react";
import { handleErrorMessagesFactory } from "../../../components/HandleErrorMessages";
import { Deposit, DepositObj } from "../../../types/types";
import useActiveLendingPools from "../../../hooks/useActiveLendingPools";
import { getChainInfo } from "../../../utils/chains";
import { useFinancialData } from "../../../components/FinancialDataContext";
import TransactionButton from "../../../components/TxButton";
import Spinner from "../../../components/Spinner";

interface ExtendDepositSummaryProps {
  deposit: DepositObj;
  estimatedAPY: ethers.BigNumber;
  newTimestamp: Date;
  onBackExtendDeposit: () => void;
  onModalClose?: () => void;
}

const ExtendDepositSummaryView: React.FC<
  ExtendDepositSummaryProps & {
    onExtendDepositActionChange: (initiated: boolean) => void;
  }
> = ({
  deposit,
  estimatedAPY,
  newTimestamp,
  onBackExtendDeposit,
  onExtendDepositActionChange,
  onModalClose,
}) => {
  const { chainId } = getChainInfo();
  const { usdcAddress, lendingPlatformAddress } = getContractAddresses(chainId);
  const { usdcAbi, lendingPlatformAbi } = getContractAbis(chainId);
  const {
    getActiveLendingPools,
    activeLendingPoolsLoading,
    activeLendingPoolsError,
    activeLendingPoolsData,
    activeLendingPoolsStartPolling,
    activeLendingPoolsStopPolling,
  } = useActiveLendingPools();

  const { dispatch } = useFinancialData();
  const walletAddress = useAddress();
  const [extendDepositButtonPressed, setExtendDepositButtonPressed] =
    useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [extendApproveButtonPressed, setExtendApproveButtonPressed] =
    useState(false);
  const [approveUSDCActionInitiated, setApproveUSDCActionInitiated] =
    useState(false);
  const [txStatus, setTxStatus] = useState("");
  const [extendDepositActionInitiated, setExtendDepositActionInitiated] =
    useState(false);
  const [approvalCompleted, setApprovalCompleted] = useState(false);
  const [localError, setLocalError] = useState("");
  const handleErrorMessages = handleErrorMessagesFactory(setLocalError);
  const {
    contract: usdc,
    isLoading: usdcIsLoading,
    error: usdcError,
  } = useContract(usdcAddress, usdcAbi);
  const {
    data: allowance,
    isLoading: allowanceIsLoading,
    error: errorAllowance,
  } = useContractRead(usdc, "allowance", [
    walletAddress,
    lendingPlatformAddress,
  ]);

  useEffect(() => {
    if (!walletAddress) return;
    getActiveLendingPools()
      .then()
      .catch((error) => {
        console.error("Failed to fetch active lending pools:", error);
      });
  }, [walletAddress, getActiveLendingPools]);

  useEffect(() => {
    if (activeLendingPoolsLoading) {
      return;
    }
  }, [activeLendingPoolsLoading]);

  useEffect(() => {
    onExtendDepositActionChange(extendDepositActionInitiated);
  }, [extendDepositActionInitiated, onExtendDepositActionChange]);
  const depositAmountBeingExtended = deposit.positionPrincipal.add(
    deposit.positionUsdcInterest,
  );

  useEffect(() => {
    if (localError) {
      const element = document.querySelector(".md\\:hero-content");
      if (element) element.scrollIntoView({ behavior: "smooth" });
    }
  }, [localError]);

  return (
    <div className="md:hero-content flex flex-col">
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
      <div className="relative group mt-4 w-full min-w-[500px]">
        <div className="flex flex-col">
          <div className="card w-full">
            <div className="card-body">
              {!extendDepositActionInitiated && (
                <>
                  <div className="flex items-center pb-4">
                    <button onClick={onBackExtendDeposit}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="26"
                        height="26"
                        fill="none"
                        className="w-6 grow-0 order-0 flex-none"
                      >
                        <path
                          d="M20 12H4M4 12L10 18M4 12L10 6"
                          stroke="#98A2B3"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="w-full text-xl font-semibold flex flex-row">
                    <span className="text-4xl font-medium text-left w-[500px]">
                      {formatLargeUsdc(depositAmountBeingExtended)} USDC
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
                    When you extend this deposit,{" "}
                    {formatLargeUsdc(depositAmountBeingExtended)} USDC will be
                    moved from the old lending pool ending{" "}
                    {deposit.endDate.toLocaleString()} to the new lending pool
                    ending {newTimestamp.toLocaleString()}. You will collect
                    earned ETH yield of {formatWad(deposit.positionEthYield, 8)}
                    .{" "}
                  </p>
                </>
              )}

              {/*success and pending states*/}
              {/*{extendDepositButtonPressed && (*/}
              {/*  <>*/}
              {/*    <div className="flex items-center justify-center p-20">*/}
              {/*      /!*spinner*!/*/}
              {/*      <div*/}
              {/*        role="status"*/}
              {/*        className="flex w-[230px] h-[230px] items-center justify-center rounded-full bg-gradient-to-tr from-shrub-green to-shrub-green-50 animate-spin"*/}
              {/*      >*/}
              {/*        <div className="w-[205px] h-[205px] rounded-full bg-white"></div>*/}
              {/*      </div>*/}
              {/*    </div>*/}
              {/*  </>*/}
              {/*)}*/}

              {extendDepositActionInitiated && (
                <>
                  {txStatus === "" && (
                    <>
                      <p className="text-lg font-bold pb-2 text-left">
                        Extend Deposit Submitted{" "}
                      </p>
                      <div className="flex items-center justify-center p-20">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1}
                          stroke="#38f6c9"
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
                  {txStatus === "success" && (
                    <>
                      <p className="text-lg font-bold pb-2 text-left">
                        Extend Deposit Successful!{" "}
                      </p>
                      <div className="flex items-center justify-center p-20">
                        <div
                          role="status"
                          className="w-[250px] h-[250px] m-[20px]"
                        >
                          <Image
                            src="/checkmark.svg"
                            alt="Loading"
                            className="w-full h-full"
                            width="250"
                            height="250"
                          />
                          <span className="sr-only">Loading...</span>
                        </div>
                      </div>
                    </>
                  )}
                  {txStatus === "failed" && (
                    <>
                      <p className="text-lg font-bold pb-2 text-left">
                        Extend Deposit Unsuccessful{" "}
                      </p>
                      <div className="flex items-center justify-center p-20">
                        <div
                          role="status"
                          className="w-[250px] h-[250px] m-[20px]"
                        >
                          <Image
                            src="/exclamation.svg"
                            alt="Loading"
                            className="w-full h-full"
                            width="250"
                            height="250"
                          />
                          <span className="sr-only">Loading...</span>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {/*{!extendDepositButtonPressed && !extendDepositActionInitiated && (*/}
              {!extendDepositActionInitiated && (
                <>
                  {/*divider*/}
                  <div className="divider h-0.5 w-full bg-shrub-grey-light3 my-8"></div>
                  {/*receipt start*/}
                  <div className="mb-2 flex flex-col gap-3 text-shrub-grey-200 text-lg font-light">
                    <div className="flex flex-row  justify-between">
                      <span className="">Previous End Date</span>
                      <span>{deposit.endDate.toDateString()}</span>
                    </div>
                    <div
                      className="flex flex-row  justify-between cursor-pointer"
                      onClick={onBackExtendDeposit}
                    >
                      <span className="">New End Date</span>
                      <span>
                        {newTimestamp?.toDateString()}
                        <Image
                          alt="edit icon"
                          src="/edit.svg"
                          className="w-5 inline align-baseline ml-2"
                          width="20"
                          height="20"
                        />
                      </span>
                    </div>
                    <div className="flex flex-row  justify-between">
                      <span className="">Estimated Yield ✨</span>
                      <span className="font-semibold text-shrub-green-500">
                        {" "}
                        {formatPercentage(estimatedAPY)}%
                      </span>
                    </div>
                    <div className="flex flex-row  justify-between">
                      <span className="">Contract Address</span>
                      <span>
                        {truncateEthAddress(lendingPlatformAddress)}
                        <Image
                          alt="copy icon"
                          src="/copy.svg"
                          className="w-6 hidden md:inline align-baseline ml-2"
                          width="24"
                          height="24"
                        />
                      </span>
                    </div>
                    {/*divider*/}
                    <div className="divider h-0.5 w-full bg-shrub-grey-light3 my-8"></div>

                    {/*approve and deposit modals*/}
                    {allowanceIsLoading ? (
                      <p>Loading balance...</p>
                    ) : (
                      <>
                        {/* Approve if allowance is insufficient */}
                        {(!approvalCompleted && !allowance) ||
                          (BigNumber.from(allowance).lt(
                            ethers.utils.parseUnits(
                              formatLargeUsdc(depositAmountBeingExtended),
                              6,
                            ),
                          ) && (
                            <Web3Button
                              contractAddress={usdcAddress}
                              contractAbi={usdcAbi}
                              isDisabled={approveUSDCActionInitiated}
                              className="!btn !btn-block !bg-shrub-green !border-0 !text-white !normal-case !text-xl hover:!bg-shrub-green-500 !mb-4"
                              action={async (usdc) => {
                                setLocalError("");
                                // @ts-ignore
                                return await usdc.contractWrapper.writeContract.approve(
                                  lendingPlatformAddress,
                                  ethers.constants.MaxUint256,
                                );
                              }}
                              onSubmit={() => {
                                setExtendApproveButtonPressed(true);
                              }}
                              // broadcast
                              onSuccess={async (tx) => {
                                setTxHash(tx.hash);
                                setLocalError("");
                                setApproveUSDCActionInitiated(true);
                                try {
                                  const receipt = await tx.wait();
                                  setApproveUSDCActionInitiated(false);
                                  if (!receipt.status) {
                                    throw new Error("Transaction failed");
                                  }
                                  setApprovalCompleted(true);
                                } catch (e) {
                                  console.log("Transaction failed:", e);
                                }
                                setExtendApproveButtonPressed(false);
                                setTxHash("");
                              }}
                              onError={(e) => {
                                handleErrorMessages({ err: e });
                                setExtendApproveButtonPressed(false);
                              }}
                            >
                              {allowanceIsLoading ? (
                                "Loading..."
                              ) : extendApproveButtonPressed &&
                                approveUSDCActionInitiated ? (
                                <>
                                  <Spinner />
                                  Approving USDC...{" "}
                                </>
                              ) : (
                                "Approve USDC"
                              )}
                            </Web3Button>
                          ))}

                        {allowance &&
                          !BigNumber.from(allowance).lt(
                            ethers.utils.parseUnits(
                              formatLargeUsdc(depositAmountBeingExtended),
                              6,
                            ),
                          ) && (
                            <Web3Button
                              contractAddress={lendingPlatformAddress}
                              contractAbi={lendingPlatformAbi}
                              isDisabled={extendDepositActionInitiated}
                              className="web3button !btn !btn-block !bg-shrub-green !border-0 !text-white !normal-case !text-xl hover:!bg-shrub-green-500 !mb-4"
                              action={async (lendingPlatform) => {
                                // @ts-ignore
                                return await lendingPlatform?.contractWrapper?.writeContract?.extendDeposit(
                                  toEthDate(deposit.endDate),
                                  toEthDate(newTimestamp),
                                  deposit.lendingPoolTokenAmount,
                                );
                              }}
                              onSubmit={() => {
                                setExtendDepositButtonPressed(true);
                              }}
                              onSuccess={async (tx) => {
                                setTxHash(tx.hash);
                                setLocalError("");
                                if (activeLendingPoolsError) {
                                  handleErrorMessages({
                                    customMessage:
                                      activeLendingPoolsError.message,
                                  });
                                  return;
                                }
                                setExtendDepositActionInitiated(true);
                                setExtendDepositButtonPressed(false);
                                const filteredLendingPools =
                                  activeLendingPoolsData &&
                                  activeLendingPoolsData.lendingPools.filter(
                                    (item) =>
                                      item.timestamp ===
                                      toEthDate(deposit.endDate).toString(),
                                  );
                                const matchedLendingPool =
                                  filteredLendingPools.length > 0
                                    ? filteredLendingPools[0]
                                    : null;
                                const newDepositWithdraw: Deposit = {
                                  id: `${matchedLendingPool.id}-withdraw`,
                                  status: "pending",
                                  depositsUsdc: depositAmountBeingExtended
                                    .mul(-1)
                                    .toString(),
                                  apy: formatPercentage(estimatedAPY),
                                  currentBalanceOverride:
                                    depositAmountBeingExtended
                                      .mul(-1)
                                      .toString(),
                                  interestEarnedOverride: "0",
                                  lendingPool: {
                                    id: matchedLendingPool.id,
                                    timestamp: matchedLendingPool.timestamp,
                                    tokenSupply: matchedLendingPool.tokenSupply,
                                    totalEthYield:
                                      matchedLendingPool.totalEthYield,
                                    totalPrincipal:
                                      matchedLendingPool.totalPrincipal,
                                    totalUsdcInterest:
                                      matchedLendingPool.totalUsdcInterest,
                                    __typename: matchedLendingPool.__typename,
                                  },
                                  timestamp: toEthDate(deposit.endDate),
                                  updated: Math.floor(Date.now() / 1000),
                                  tempData: true,
                                };
                                const newDepositDeposit = {
                                  ...newDepositWithdraw,
                                  id: `${matchedLendingPool.id}-deposit`,
                                  depositsUsdc:
                                    depositAmountBeingExtended.toString(),
                                  currentBalanceOverride:
                                    depositAmountBeingExtended.toString(),
                                  lendingPool: {
                                    ...newDepositWithdraw.lendingPool,
                                    timestamp:
                                      toEthDate(newTimestamp).toString(),
                                  },
                                };
                                dispatch({
                                  type: "ADD_LEND_POSITION",
                                  payload: {
                                    address: walletAddress,
                                    deposit: newDepositWithdraw,
                                  },
                                });
                                dispatch({
                                  type: "ADD_LEND_POSITION",
                                  payload: {
                                    address: walletAddress,
                                    deposit: newDepositDeposit,
                                  },
                                });
                                dispatch({
                                  type: "UPDATE_LEND_POSITION_STATUS",
                                  payload: {
                                    address: walletAddress,
                                    id: matchedLendingPool.id,
                                    status: "extending",
                                  },
                                });

                                try {
                                  const receipt = await tx.wait();
                                  if (!receipt.status) {
                                    throw new Error("Transaction failed");
                                  }
                                  setTxStatus("success");
                                  dispatch({
                                    type: "UPDATE_LEND_POSITION_STATUS",
                                    payload: {
                                      address: walletAddress,
                                      id: `${matchedLendingPool.id}-deposit`,
                                      status: "confirmed",
                                    },
                                  });
                                  dispatch({
                                    type: "UPDATE_LEND_POSITION_STATUS",
                                    payload: {
                                      address: walletAddress,
                                      id: `${matchedLendingPool.id}-withdraw`,
                                      status: "confirmed",
                                    },
                                  });
                                  dispatch({
                                    type: "UPDATE_LEND_POSITION_STATUS",
                                    payload: {
                                      address: walletAddress,
                                      id: matchedLendingPool.id,
                                      status: "extended",
                                    },
                                  });
                                } catch (e) {
                                  console.log("Transaction failed:", e);
                                  setTxStatus("failed");
                                  dispatch({
                                    type: "UPDATE_LEND_POSITION_STATUS",
                                    payload: {
                                      address: walletAddress,
                                      id: `${matchedLendingPool.id}-deposit`,
                                      status: "failed",
                                    },
                                  });
                                  dispatch({
                                    type: "UPDATE_LEND_POSITION_STATUS",
                                    payload: {
                                      address: walletAddress,
                                      id: `${matchedLendingPool.id}-withdraw`,
                                      status: "failed",
                                    },
                                  });
                                }
                              }}
                              onError={(e) => {
                                handleErrorMessages({ err: e });
                                setExtendDepositButtonPressed(false);
                              }}
                            >
                              Extend Order
                            </Web3Button>
                          )}
                      </>
                    )}
                  </div>
                </>
              )}
              {txHash && (
                <TransactionButton
                  txHash={txHash}
                  chainId={chainId}
                  className="btn-block bg-white border text-shrub-grey-700 normal-case text-xl border-shrub-grey-50 mb-4 hover:bg-shrub-green hover:border-shrub-green hover:text-white"
                />
              )}
              {/*confirm in wallet button*/}
              {((extendDepositButtonPressed && !extendDepositActionInitiated) ||
                (extendApproveButtonPressed &&
                  !approveUSDCActionInitiated)) && (
                <button
                  disabled={true}
                  className="btn btn-block bg-white border text-shrub-grey-700 hover:bg-shrub-grey-light2 hover:border-shrub-grey-50 normal-case text-xl border-shrub-grey-50"
                >
                  Confirm in Wallet...{" "}
                </button>
              )}
              {/*view in dashboard button*/}
              {extendDepositActionInitiated && (
                <button
                  onClick={onModalClose}
                  className="btn btn-block bg-white border text-shrub-grey-700 hover:bg-shrub-green hover:border-shrub-green hover:text-white normal-case text-xl border-shrub-grey-50"
                >
                  View in Dashboard{" "}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExtendDepositSummaryView;
