import React, { useEffect, useState } from "react";
import Image from "next/image";
import {
  calcLtv,
  formatLargeUsdc,
  formatPercentage,
  toEthDate,
  truncateEthAddress,
} from "../../../utils/ethMethods";
import {
  getContractAbis,
  getContractAddresses,
} from "../../../utils/contracts";
import { handleErrorMessagesFactory } from "../../../components/HandleErrorMessages";
import { Borrow, BorrowObj } from "../../../types/types";
import {
  useAddress,
  useContract,
  useContractRead,
  Web3Button,
} from "@thirdweb-dev/react";
import { useFinancialData } from "../../../components/FinancialDataContext";
import { ethers } from "ethers";
import { Zero } from "../../../constants";
import { getChainInfo } from "../../../utils/chains";
import { useEthPrice } from "../../../hooks/useEthPriceFromShrub";
import TransactionButton from "../../../components/TxButton";
import Spinner from "../../../components/Spinner";

interface PartialRepaySummaryViewProps {
  borrow: BorrowObj;
  onBackRepay: () => void;
  repayAmount: ethers.BigNumber;
  newLtv: ethers.BigNumber;
  onModalClose?: () => void;
}

const PartialRepaySummaryView: React.FC<PartialRepaySummaryViewProps> = ({
  borrow,
  onBackRepay,
  repayAmount,
  newLtv,
  onModalClose,
}) => {
  const { chainId } = getChainInfo();
  const { usdcAddress, lendingPlatformAddress } = getContractAddresses(chainId);
  const { usdcAbi, lendingPlatformAbi } = getContractAbis(chainId);

  const walletAddress = useAddress();
  const { ethPrice, isLoading, error } = useEthPrice(
    lendingPlatformAddress,
    lendingPlatformAbi,
  );
  const [localError, setLocalError] = useState("");
  const handleErrorMessages = handleErrorMessagesFactory(setLocalError);
  const [partialRepayActionInitiated, setPartialRepayActionInitiated] =
    useState(false);
  const [approveUSDCActionInitiated, setApproveUSDCActionInitiated] =
    useState(false);
  const [erc20ApprovalNeeded, setErc20ApprovalNeeded] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState("");
  const [partialRepayButtonPressed, setPartialRepayButtonPressed] =
    useState(false);
  const [
    partialRepayApproveButtonPressed,
    setPartialRepayApproveButtonPressed,
  ] = useState(false);
  const { dispatch } = useFinancialData();
  const {
    contract: usdc,
    isLoading: usdcIsLoading,
    error: usdcError,
  } = useContract(usdcAddress, usdcAbi);
  const {
    data: usdcAllowance,
    isLoading: usdcAllowanceIsLoading,
    error: usdcAllowanceError,
  } = useContractRead(usdc, "allowance", [
    walletAddress,
    lendingPlatformAddress,
  ]);

  useEffect(() => {
    if (
      erc20ApprovalNeeded !== "usdc" &&
      (!usdcAllowance || ethers.BigNumber.from(usdcAllowance).lt(borrow.debt))
    ) {
      return setErc20ApprovalNeeded("usdc");
    }
    if (
      erc20ApprovalNeeded !== "none" &&
      usdcAllowance &&
      ethers.BigNumber.from(usdcAllowance).gte(borrow.debt)
    ) {
      setErc20ApprovalNeeded("none");
    }
  }, [
    usdcAllowance,
    usdcAllowanceIsLoading,
    approveUSDCActionInitiated,
    borrow.debt,
  ]);

  let originalBorrowLTV = Zero;
  if (ethPrice && !ethPrice.isZero()) {
    originalBorrowLTV = calcLtv(borrow.debt, borrow.collateral, ethPrice);
  }
  const newPrincipal = borrow.principal.add(borrow.interest).sub(repayAmount);

  return (
    <div className="md:hero-content flex flex-col">
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
              {!partialRepayActionInitiated && (
                <>
                  <div className="flex items-center pb-4">
                    <button onClick={onBackRepay}>
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
                      {formatLargeUsdc(repayAmount)} USDC
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
                    Making a partial payment of {formatLargeUsdc(repayAmount)}{" "}
                    USDC to your borrow will reduce the interest to 0 USDC and
                    the principal to {formatLargeUsdc(newPrincipal)} USDC. The
                    LTV of the loan will change from{" "}
                    {formatPercentage(originalBorrowLTV)}% to{" "}
                    {formatPercentage(newLtv)}%. You will not receive any
                    collateral back, nor will this affect the APY of this borrow
                    which is {formatPercentage(borrow.apy)}%.{" "}
                  </p>
                </>
              )}
              {partialRepayActionInitiated && (
                <>
                  {txStatus === "" && (
                    <>
                      <p className="text-lg font-bold pb-2 text-left">
                        Partial Repay Submitted{" "}
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
                        Partial Repay Successful!
                      </p>
                      <div className="flex items-center justify-center p-20">
                        <div
                          role="status"
                          className="w-[250px] h-[250px] m-[20px]"
                        >
                          <Image
                            src="/checkmark.svg"
                            alt="Success"
                            className="w-full h-full"
                            width="250"
                            height="250"
                          />
                          <span className="sr-only">Success</span>
                        </div>
                      </div>
                    </>
                  )}
                  {txStatus === "failed" && (
                    <>
                      <p className="text-lg font-bold pb-2 text-left">
                        Partial Repay Unsuccessful
                      </p>
                      <div className="flex items-center justify-center p-20">
                        <div
                          role="status"
                          className="w-[250px] h-[250px] m-[20px]"
                        >
                          <Image
                            src="/exclamation.svg"
                            alt="Failed"
                            className="w-full h-full"
                            width="250"
                            height="250"
                          />
                          <span className="sr-only">Failed</span>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
              {!partialRepayActionInitiated && (
                <>
                  <div className="divider h-0.5 w-full bg-shrub-grey-light3 my-8"></div>
                  <div>
                    <div className="mb-2 flex flex-col gap-3 text-shrub-grey-200 text-lg font-light">
                      <div className="flex flex-row justify-between">
                        <span className="">Current Principal</span>
                        <span>{formatLargeUsdc(borrow.principal)} USDC</span>
                      </div>
                      <div className="flex flex-row justify-between">
                        <span className="">Current Interest</span>
                        <span>{formatLargeUsdc(borrow.interest)} USDC</span>
                      </div>
                      <div className="flex flex-row justify-between">
                        <span className="">New Principal ✨</span>
                        <span>{formatLargeUsdc(newPrincipal)} USDC</span>
                      </div>
                      <div
                        className="flex flex-row justify-between cursor-pointer"
                        onClick={() => onBackRepay()}
                      >
                        <span>New LTV ✨</span>
                        <span className="font-semibold text-shrub-green-500">
                          {formatPercentage(newLtv)}%
                          <Image
                            alt="edit icon"
                            src="/edit.svg"
                            className="w-5 inline align-baseline ml-2"
                            width="20"
                            height="20"
                          />
                        </span>
                      </div>
                      <div
                        className="flex flex-row justify-between cursor-pointer"
                        onClick={() => onBackRepay()}
                      >
                        <span>USDC to repay</span>
                        <span className="font-semibold text-shrub-green-500">
                          {formatLargeUsdc(repayAmount)} USDC
                          <Image
                            alt="edit icon"
                            src="/edit.svg"
                            className="w-5 inline align-baseline ml-2"
                            width="20"
                            height="20"
                          />
                        </span>
                      </div>
                      <div className="flex flex-row justify-between">
                        <span className="">End Date</span>
                        <span>{borrow.endDate.toDateString()}</span>
                      </div>
                      <div className="flex flex-row justify-between">
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
                    </div>
                    <div className="divider h-0.5 w-full bg-shrub-grey-light3 my-8"></div>

                    {/*approve and partial repay*/}
                    {usdcAllowanceIsLoading ? (
                      <p>Loading allowance...</p>
                    ) : (
                      <>
                        {erc20ApprovalNeeded === "usdc" ? (
                          <Web3Button
                            contractAddress={usdcAddress}
                            contractAbi={usdcAbi}
                            isDisabled={approveUSDCActionInitiated}
                            className="!btn !btn-block !bg-shrub-green !border-0 !text-white !normal-case !text-xl hover:!bg-shrub-green-500 !mb-4"
                            action={async (usdc) => {
                              setLocalError("");
                              //@ts-ignore
                              return await usdc.contractWrapper.writeContract.approve(
                                lendingPlatformAddress,
                                ethers.constants.MaxUint256,
                              );
                            }}
                            onSubmit={() => {
                              setPartialRepayApproveButtonPressed(true);
                            }}
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
                              } catch (e) {
                                console.log("Transaction failed:", e);
                              }
                              setPartialRepayApproveButtonPressed(false);
                              setTxHash("");
                            }}
                            onError={(e) => {
                              handleErrorMessages({ err: e });
                              setPartialRepayApproveButtonPressed(false);
                            }}
                          >
                            {usdcAllowanceIsLoading ? (
                              "Loading..."
                            ) : partialRepayButtonPressed &&
                              approveUSDCActionInitiated ? (
                              <>
                                <Spinner />
                                Approving USDC...
                              </>
                            ) : (
                              "Approve USDC"
                            )}
                          </Web3Button>
                        ) : (
                          <Web3Button
                            contractAddress={lendingPlatformAddress}
                            contractAbi={lendingPlatformAbi}
                            isDisabled={partialRepayActionInitiated}
                            className="!btn !btn-block !bg-shrub-green !border-0 !text-white !normal-case !text-xl hover:!bg-shrub-green-500 !mb-4"
                            action={async (lendingPlatform) => {
                              setLocalError("");
                              //@ts-ignore
                              return await lendingPlatform.contractWrapper.writeContract.partialRepayBorrow(
                                borrow.id,
                                ethers.utils.parseUnits(
                                  formatLargeUsdc(repayAmount),
                                  6,
                                ),
                              );
                            }}
                            onSubmit={() => {
                              setPartialRepayButtonPressed(true);
                            }}
                            onSuccess={async (tx) => {
                              setTxHash(tx.hash);
                              setLocalError("");
                              setPartialRepayActionInitiated(true);
                              setPartialRepayButtonPressed(false);
                              const newBorrowRepay: Borrow = {
                                id: `${tx.hash}-partialPay`,
                                status: "pending",
                                collateral: borrow.collateral,
                                created: Math.floor(Date.now() / 1000),
                                originalPrincipal:
                                  borrow.originalPrincipal.toString(),
                                paid: repayAmount.toString(),
                                apy: borrow.apy.toString(),
                                principal: borrow.principal.toString(),
                                currentBalanceOverride: formatLargeUsdc(
                                  repayAmount.mul(-1),
                                ),
                                timestamp: toEthDate(borrow.endDate).toString(),
                                startDate: Math.floor(Date.now() / 1000),
                                updated: Math.floor(Date.now() / 1000),
                                __typename: "Borrow",
                                tempData: true,
                              };
                              dispatch({
                                type: "ADD_BORROW",
                                payload: {
                                  address: walletAddress,
                                  borrow: newBorrowRepay,
                                },
                              });
                              dispatch({
                                type: "UPDATE_BORROW_STATUS",
                                payload: {
                                  address: walletAddress,
                                  id: borrow.id.toString(),
                                  status: "partialRepaying",
                                },
                              });
                              try {
                                const receipt = await tx.wait();
                                if (!receipt.status) {
                                  throw new Error("Transaction failed");
                                }
                                setTxStatus("success");
                                dispatch({
                                  type: "UPDATE_BORROW_STATUS",
                                  payload: {
                                    address: walletAddress,
                                    id: `${tx.hash}-partialPay`,
                                    status: "confirmed",
                                  },
                                });
                                dispatch({
                                  type: "UPDATE_BORROW_STATUS",
                                  payload: {
                                    address: walletAddress,
                                    id: borrow.id.toString(),
                                    status: "partialRepaid",
                                  },
                                });
                              } catch (e) {
                                console.log("Transaction failed:", e);
                                setTxStatus("failed");
                                dispatch({
                                  type: "UPDATE_BORROW_STATUS",
                                  payload: {
                                    address: walletAddress,
                                    id: `${tx.hash}-partialPay`,
                                    status: "failed",
                                  },
                                });
                                dispatch({
                                  type: "UPDATE_BORROW_STATUS",
                                  payload: {
                                    address: walletAddress,
                                    id: borrow.id.toString(),
                                    status: "failed",
                                  },
                                });
                              }
                            }}
                            onError={(e) => {
                              handleErrorMessages({ err: e });
                              setTxStatus("failed");
                              setPartialRepayButtonPressed(false);
                            }}
                          >
                            Repay
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
              {partialRepayButtonPressed && !partialRepayActionInitiated && (
                <button
                  disabled={true}
                  className="btn btn-block bg-white border text-shrub-grey-700 hover:bg-shrub-grey-light2 hover:border-shrub-grey-50 normal-case text-xl border-shrub-grey-50"
                >
                  Confirm in Wallet...
                </button>
              )}
              {partialRepayActionInitiated && (
                <button
                  onClick={onModalClose}
                  className="btn btn-block bg-white border text-shrub-grey-700 hover:bg-shrub-green hover:border-shrub-green hover:text-white normal-case text-xl border-shrub-grey-50"
                >
                  View in Dashboard
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartialRepaySummaryView;
