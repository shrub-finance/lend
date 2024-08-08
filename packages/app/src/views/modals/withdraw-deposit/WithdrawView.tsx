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
import { handleErrorMessagesFactory } from "../../../components/HandleErrorMessages";
import { Deposit } from "../../../types/types";
import { useAddress, Web3Button } from "@thirdweb-dev/react";
import { DepositObj } from "../../../types/types";
import { useFinancialData } from "../../../components/FinancialDataContext";
import { useQuery } from "@apollo/client";
import { GET_LENDINGPOOL_QUERY } from "../../../constants/queries";
import { getChainInfo } from "../../../utils/chains";
import TransactionButton from "../../../components/TxButton";

interface WithdrawViewProps {
  deposit: DepositObj;
  setIsModalOpen: (isOpen: boolean) => void;
  onModalClose?: () => void;
}

const WithdrawView: React.FC<WithdrawViewProps> = ({
  deposit,
  setIsModalOpen,
  onModalClose,
}) => {
  const { chainId } = getChainInfo();
  const { lendingPlatformAddress } = getContractAddresses(chainId);
  const { lendingPlatformAbi } = getContractAbis(chainId);

  const closeModalAndPassData = () => {
    setIsModalOpen(false);
  };
  const walletAddress = useAddress();
  const [localError, setLocalError] = useState("");
  const handleErrorMessages = handleErrorMessagesFactory(setLocalError);
  const [withdrawActionInitiated, setWithdrawActionInitiated] = useState(false);
  const [withdrawDepositButtonPressed, setWithdrawDepositButtonPressed] =
    useState(false);
  const [txStatus, setTxStatus] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const { dispatch } = useFinancialData();
  const selectedDepositBalance = deposit.positionPrincipal.add(
    deposit.positionUsdcInterest,
  );
  const estimatedAPY = "5";
  const {
    loading: lendingPoolLoading,
    error: lendingPoolError,
    data: lendingPoolData,
  } = useQuery(GET_LENDINGPOOL_QUERY, {
    variables: {
      lendingPool: deposit.lendingPoolTokenAddress,
    },
  });

  useEffect(() => {
    console.log(lendingPoolData);
  }, [lendingPoolData]);

  return (
    <>
      <div className="flex items-center justify-between p-4 md:p-5 border-b rounded-t">
        <h3 className="text-xl font-semibold text-shrub-grey-900 ">
          Withdraw Deposit
        </h3>
        <button
          type="button"
          onClick={closeModalAndPassData}
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
      <div className="mt-4">
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
      </div>
      <div className="relative group mt-4 w-full min-w-[500px]">
        <div className="flex flex-col">
          <div className="card w-full">
            <div className="card-body">
              {!withdrawActionInitiated && (
                <>
                  <div className="w-full text-xl font-semibold flex flex-row">
                    <span className="text-4xl  font-medium text-left w-[500px]">
                      {formatLargeUsdc(selectedDepositBalance)} USDC
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
                    Withdraw will exchange your,{" "}
                    {formatWad(deposit.lendingPoolTokenAmount, 6)} pool share
                    token from the lending pool date of{" "}
                    {deposit.endDate.toLocaleString()} for{" "}
                    {formatLargeUsdc(selectedDepositBalance)} USDC, and{" "}
                    {formatWad(deposit.positionEthYield, 6)} ETH.
                  </p>
                </>
              )}
              {withdrawActionInitiated && (
                <>
                  {txStatus === "" && (
                    <>
                      <p className="text-lg font-bold pb-2 text-left">
                        Withdraw Submitted{" "}
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
                  {txStatus === "withdraw success" && (
                    <>
                      <p className="text-lg font-bold pb-2 text-left">
                        Withdraw Successful!{" "}
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
                  {txStatus === "withdraw failed" && (
                    <>
                      <p className="text-lg font-bold pb-2 text-left">
                        Withdraw Unsuccessful{" "}
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
              {!withdrawActionInitiated && (
                <>
                  {/*divider*/}
                  <div className="divider h-0.5 w-full bg-shrub-grey-light3 my-8"></div>
                  {/*receipt start*/}
                  <div>
                    <div className="mb-2 flex flex-col gap-3 text-shrub-grey-200 text-lg font-light">
                      <div className="flex flex-row  justify-between">
                        <span className="">USDC to receive</span>
                        <span>
                          {formatLargeUsdc(selectedDepositBalance)} USDC
                        </span>
                      </div>
                      <div className="flex flex-row  justify-between cursor-pointer">
                        <span className="">ETH to receive</span>
                        <span>
                          {formatWad(deposit.positionEthYield, 6)} ETH
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
                      <div className="flex flex-row  justify-between">
                        <span className="">End Date</span>
                        <span>{deposit.endDate.toDateString()}</span>
                      </div>
                    </div>

                    <div className="divider h-0.5 w-full bg-shrub-grey-light3 my-8"></div>
                    <Web3Button
                      contractAddress={lendingPlatformAddress}
                      contractAbi={lendingPlatformAbi}
                      isDisabled={
                        withdrawActionInitiated ||
                        lendingPoolLoading ||
                        !!lendingPoolError
                      }
                      className="!btn !btn-block !bg-shrub-green !border-0 !text-white !normal-case !text-xl hover:!bg-shrub-green-500 !mb-4"
                      action={async (lendingPlatform) => {
                        setLocalError("");
                        // @ts-ignore
                        return await lendingPlatform.contractWrapper.writeContract.withdraw(
                          toEthDate(deposit.endDate),
                          deposit.lendingPoolTokenAmount,
                        );
                      }}
                      onSubmit={() => {
                        setWithdrawDepositButtonPressed(true);
                      }}
                      onSuccess={async (tx) => {
                        setTxHash(tx.hash);
                        setLocalError("");
                        if (!lendingPoolData || !lendingPoolData.lendingPool) {
                          return;
                        }
                        setWithdrawActionInitiated(true);
                        setWithdrawDepositButtonPressed(false);
                        const matchedLendingPool =
                          lendingPoolData && lendingPoolData.lendingPool;
                        const newDepositWithdraw: Deposit = {
                          id: `${matchedLendingPool.id}-withdraw`,
                          status: "pending",
                          depositsUsdc: deposit.depositsUsdc.mul(-1).toString(),
                          withdrawsUsdc: deposit.withdrawsUsdc
                            .mul(-1)
                            .toString(),
                          apy: formatPercentage(estimatedAPY),
                          currentBalanceOverride: selectedDepositBalance
                            .mul(-1)
                            .toString(),
                          interestEarnedOverride: deposit.positionUsdcInterest
                            .mul(-1)
                            .toString(),
                          lendingPool: {
                            id: matchedLendingPool.id,
                            timestamp: matchedLendingPool.timestamp,
                            tokenSupply: matchedLendingPool.tokenSupply,
                            totalEthYield: matchedLendingPool.totalEthYield,
                            totalPrincipal: matchedLendingPool.totalPrincipal,
                            totalUsdcInterest:
                              matchedLendingPool.totalUsdcInterest,
                            __typename: matchedLendingPool.__typename,
                          },
                          timestamp: toEthDate(deposit.endDate),
                          updated: Math.floor(Date.now() / 1000),
                          tempData: true,
                        };
                        dispatch({
                          type: "ADD_LEND_POSITION",
                          payload: {
                            address: walletAddress,
                            deposit: newDepositWithdraw,
                          },
                        });
                        dispatch({
                          type: "UPDATE_LEND_POSITION_STATUS",
                          payload: {
                            address: walletAddress,
                            id: matchedLendingPool.id,
                            status: "withdrawing",
                            // tempData: true
                          },
                        });
                        try {
                          const receipt = await tx.wait();
                          if (!receipt.status) {
                            throw new Error("Transaction failed");
                          }
                          setTxStatus("withdraw success");
                          dispatch({
                            type: "UPDATE_LEND_POSITION_STATUS",
                            payload: {
                              address: walletAddress,
                              id: `${matchedLendingPool.id}-withdraw`,
                              status: "confirmed",
                              // tempData: true
                            },
                          });
                          dispatch({
                            type: "UPDATE_LEND_POSITION_STATUS",
                            payload: {
                              address: walletAddress,
                              id: matchedLendingPool.id,
                              status: "withdrawn",
                              // tempData: true
                            },
                          });
                        } catch (e) {
                          console.log("Transaction failed:", e);
                          setTxStatus("withdraw failed");
                          dispatch({
                            type: "UPDATE_LEND_POSITION_STATUS",
                            payload: {
                              address: walletAddress,
                              id: `${matchedLendingPool.id}-withdraw`,
                              status: "failed",
                              // tempData: true
                            },
                          });
                        }
                      }}
                      onError={(e) => {
                        handleErrorMessages({ err: e });
                        setWithdrawDepositButtonPressed(false);
                      }}
                    >
                      Withdraw Order
                    </Web3Button>
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
              {withdrawDepositButtonPressed && !withdrawActionInitiated && (
                <button
                  disabled={true}
                  className="btn btn-block bg-white border text-shrub-grey-700 hover:bg-shrub-grey-light2 hover:border-shrub-grey-50 normal-case text-xl border-shrub-grey-50"
                >
                  Confirm in Wallet...{" "}
                </button>
              )}
              {/*view in dashboard button*/}
              {withdrawActionInitiated && (
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
    </>
  );
};

export default WithdrawView;
