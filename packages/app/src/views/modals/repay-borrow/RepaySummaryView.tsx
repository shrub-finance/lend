import React, { useEffect, useState } from "react";
import Image from "next/image";
import {
  formatLargeUsdc,
  formatWad,
  toEthDate,
  truncateEthAddress,
} from "../../../utils/ethMethods";
import {
  getContractAbis,
  getContractAddresses,
} from "../../../utils/contracts";
import { handleErrorMessagesFactory } from "../../../components/HandleErrorMessages";
import {
  useAddress,
  useContract,
  useContractRead,
  Web3Button,
} from "@thirdweb-dev/react";
import { useFinancialData } from "../../../components/FinancialDataContext";
import { ethers } from "ethers";
import { getChainInfo } from "../../../utils/chains";
import { Borrow, BorrowObj } from "../../../types/types";
import TransactionButton from "../../../components/TxButton";
import Spinner from "../../../components/Spinner";
import { Button } from "components/Button";

interface RepaySummaryViewProps {
  borrow: BorrowObj;
  onBackRepay: (data?) => void;
  repayAmount: string;
  onModalClose?: () => void;
}

const RepaySummaryView: React.FC<
  RepaySummaryViewProps & { onRepayActionChange: (initiated: boolean) => void }
> = ({ borrow, onBackRepay, repayAmount, onModalClose }) => {
  const { chainId } = getChainInfo();
  const { usdcAddress, lendingPlatformAddress } = getContractAddresses(chainId);
  const { usdcAbi, lendingPlatformAbi } = getContractAbis(chainId);

  const walletAddress = useAddress();
  const [localError, setLocalError] = useState("");
  const handleErrorMessages = handleErrorMessagesFactory(setLocalError);
  const [repayActionInitiated, setRepayActionInitiated] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState("");
  const [repayApproveButtonPressed, setRepayApproveButtonPressed] =
    useState(false);
  const { dispatch } = useFinancialData();
  const [approveUSDCActionInitiated, setApproveUSDCActionInitiated] =
    useState(false);
  const [repayButtonPressed, setRepayButtonPressed] = useState(false);
  const [erc20ApprovalNeeded, setErc20ApprovalNeeded] = useState("");
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

  const displayRepayAmount = repayAmount || formatLargeUsdc(borrow.debt);
  const totalRepayAmount = repayAmount
    ? repayAmount
    : formatLargeUsdc(borrow.debt.add(borrow.earlyRepaymentFee));

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
              {!repayActionInitiated && (
                <>
                  <div className="w-full text-xl font-semibold flex flex-row">
                    <span className="text-4xl font-medium text-left w-[500px]">
                      {displayRepayAmount} USDC
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
                    Repaying will end the loan of {displayRepayAmount} USDC and
                    return back to you the collateral{" "}
                    {formatWad(borrow.collateral, 6)} ETH with due date of{" "}
                    {borrow.endDate.toLocaleString()}.
                  </p>
                </>
              )}

              {repayActionInitiated && (
                <>
                  {txStatus === "" && (
                    <>
                      <p className="text-lg font-bold pb-2 text-left">
                        Repay Submitted{" "}
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
                  {txStatus === "repay success" && (
                    <>
                      <p className="text-lg font-bold pb-2 text-left">
                        Repay Successful!{" "}
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
                  {txStatus === "repay failed" && (
                    <>
                      <p className="text-lg font-bold pb-2 text-left">
                        Repay Unsuccessful{" "}
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
              {!repayActionInitiated && (
                <>
                  {/*divider*/}
                  <div className="divider h-0.5 w-full bg-shrub-grey-light3 my-8"></div>
                  {/*receipt start*/}
                  <div>
                    <div className="mb-2 flex flex-col gap-3 text-shrub-grey-200 text-lg font-light">
                      <div className="flex flex-row justify-between">
                        <span className="">Principal</span>
                        <span>{formatLargeUsdc(borrow.principal)} USDC</span>
                      </div>
                      <div className="flex flex-row justify-between">
                        <span className="">Interest</span>
                        <span>{formatLargeUsdc(borrow.interest)} USDC</span>
                      </div>
                      <div
                        className="flex flex-row justify-between cursor-pointer"
                        onClick={() => onBackRepay()}
                      >
                        <span>USDC to repay</span>
                        <span className="font-semibold text-shrub-green-500">
                          {totalRepayAmount} USDC
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
                        className="flex flex-row justify-between"
                        style={{
                          display: borrow.earlyRepaymentFee.isZero()
                            ? "none"
                            : "inherit",
                        }}
                      >
                        <span className="">Early Repayment Fee</span>
                        <span>
                          {formatLargeUsdc(borrow.earlyRepaymentFee)} USDC
                        </span>
                      </div>
                      <div className="flex flex-row justify-between">
                        <span className="">Collateral to receive</span>
                        <span>{formatWad(borrow.collateral, 6)} ETH</span>
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
                      <div className="flex flex-row justify-between">
                        <span className="">End Date</span>
                        <span>{borrow.endDate.toDateString()}</span>
                      </div>
                    </div>
                    <div className="divider h-0.5 w-full bg-shrub-grey-light3 my-8"></div>

                    {/*approve and repay*/}
                    {usdcAllowanceIsLoading ? (
                      <p>Loading allowance...</p>
                    ) : (
                      <>
                        {erc20ApprovalNeeded === "usdc" ? (
                          <Web3Button
                            contractAddress={usdcAddress}
                            contractAbi={usdcAbi}
                            isDisabled={approveUSDCActionInitiated}
                            className="!w-full !h-[59px] px-5 py-3 !rounded-full !bg-shrub-green-500 !border-0  !font-semibold !leading-[24px] !text-white hover:!bg-shrub-green-900 !mb-4 web3button !transition-all !duration-[300ms] !ease-in-out"
                            action={async (usdc) => {
                              setLocalError("");
                              // @ts-ignore
                              return await usdc.contractWrapper.writeContract.approve(
                                lendingPlatformAddress,
                                ethers.constants.MaxUint256,
                              );
                            }}
                            onSubmit={() => {
                              setRepayApproveButtonPressed(true);
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
                                // setApprovalCompleted(true);
                              } catch (e) {
                                console.log("Transaction failed:", e);
                              }
                              setRepayApproveButtonPressed(false);
                              setTxHash("");
                            }}
                            onError={(e) => {
                              handleErrorMessages({ err: e });
                              setRepayApproveButtonPressed(false);
                            }}
                          >
                            {usdcAllowanceIsLoading ? (
                              "Loading..."
                            ) : repayApproveButtonPressed &&
                              approveUSDCActionInitiated ? (
                              <>
                                <Spinner />
                                Approving USDC...{" "}
                              </>
                            ) : (
                              "Approve USDC"
                            )}
                          </Web3Button>
                        ) : (
                          <Web3Button
                            contractAddress={lendingPlatformAddress}
                            contractAbi={lendingPlatformAbi}
                            isDisabled={repayActionInitiated}
                            className="!w-full !h-[59px] px-5 py-3 !rounded-full !bg-shrub-green-500 !border-0  !font-semibold !leading-[24px] !text-white hover:!bg-shrub-green-900 !mb-4 web3button !transition-all !duration-[300ms] !ease-in-out"
                            action={async (lendingPlatform) => {
                              setLocalError("");
                              // @ts-ignore
                              return await lendingPlatform.contractWrapper.writeContract.repayBorrow(
                                borrow.id,
                                walletAddress,
                              );
                            }}
                            onSubmit={() => {
                              setRepayButtonPressed(true);
                            }}
                            onSuccess={async (tx) => {
                              setTxHash(tx.hash);
                              setLocalError("");
                              setRepayActionInitiated(true);
                              setRepayButtonPressed(false);
                              const newBorrowRepay: Borrow = {
                                id: `${tx.hash}-repay`,
                                status: "pending",
                                collateral: borrow.collateral,
                                created: Math.floor(Date.now() / 1000),
                                originalPrincipal: borrow.originalPrincipal
                                  .mul(-1)
                                  .toString(),
                                paid: "0",
                                apy: borrow.apy.toString(),
                                principal: borrow.principal.mul(-1).toString(),
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
                                  status: "repaying",
                                },
                              });
                              try {
                                const receipt = await tx.wait();
                                if (!receipt.status) {
                                  throw new Error("Transaction failed");
                                }
                                setTxStatus("repay success");
                                dispatch({
                                  type: "UPDATE_BORROW_STATUS",
                                  payload: {
                                    address: walletAddress,
                                    id: `${tx.hash}-repay`,
                                    status: "confirmed",
                                  },
                                });
                                dispatch({
                                  type: "UPDATE_BORROW_STATUS",
                                  payload: {
                                    address: walletAddress,
                                    id: borrow.id.toString(),
                                    status: "repaid",
                                  },
                                });
                              } catch (e) {
                                console.log("Transaction failed:", e);
                                setTxStatus("repay failed");
                                dispatch({
                                  type: "UPDATE_BORROW_STATUS",
                                  payload: {
                                    address: walletAddress,
                                    id: `${tx.hash}-repay`,
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
                              setRepayButtonPressed(false);
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
                  className="w-full h-[59px] px-5 py-3 bg-white rounded-full font-semibold leading-[24px] border text-shrub-grey-700 border-shrub-grey-50 mb-4 normal-case text-[16px] hover:bg-shrub-green-900 hover:text-white"
                />
              )}
              {/*confirm in wallet button*/}
              {repayButtonPressed && !repayActionInitiated && (
                <Button
                  text="Confirm in Wallet..."
                  type="secondary"
                  disabled={true}
                  onClick={() => {}}
                  additionalClasses="border-0"
                />
              )}
              {/*view in dashboard button*/}
              {repayActionInitiated && (
                <>
                  <Button
                    type="info"
                    text="View in Dashboard"
                    onClick={onModalClose}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RepaySummaryView;
