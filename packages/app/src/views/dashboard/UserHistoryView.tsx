import React, { useEffect } from "react";
import { fromEthDate } from "@shrub-lend/common";
import { ethers } from "ethers";
import { useLazyQuery } from "@apollo/client";
import { GET_USER_LOGS_QUERY } from "../../constants/queries";
import { useAddress } from "@thirdweb-dev/react";
import {
  formatLargeUsdc,
  formatShortDate,
  formatWad,
} from "../../utils/ethMethods";
import { Zero } from "../../constants";
import TransactionButton from "../../components/TxButton";
import { getChainInfo } from "../../utils/chains";
import {Card} from "./Card";

interface UserHistoryViewProps {}

export const UserHistoryView: React.FC<UserHistoryViewProps> = ({}) => {
  const walletAddress = useAddress();
  const [
    getUserLogsQuery,
    {
      loading: userLogsLoading,
      error: userLogsError,
      data: userLogs,
      startPolling: userLogsStartPolling,
      stopPolling: userLogsStopPolling,
    },
  ] = useLazyQuery(GET_USER_LOGS_QUERY, {
    variables: {
      user: walletAddress && walletAddress.toLowerCase(),
    },
  });
  const { chainId } = getChainInfo();

  useEffect(() => {
    if (ethers.utils.isAddress(walletAddress)) {
      getUserLogsQuery();
    }
  }, [walletAddress]);

  useEffect(() => {
    if (userLogs) {
      // console.log(userLogs);
    }
  }, [userLogs]);

  function parseTxId(id: string) {
    return id.split("-")[0];
  }

  function getNotes(userLog) {
    const {
      type,
      timestamp: timestampUnparsed,
      block,
      principal: principalUnparsed,
      collateral: collateralUnparsed,
      interest: interestUnparsed,
      ethYield: ethYieldUnparsed,
      deposit,
      borrow,
      beneficiary,
      tokenAmount: tokenAmountUnparsed,
    } = userLog;
    const logTime = fromEthDate(timestampUnparsed);
    const tokenAmount = tokenAmountUnparsed
      ? ethers.BigNumber.from(tokenAmountUnparsed)
      : Zero;
    const principal = principalUnparsed
      ? ethers.BigNumber.from(principalUnparsed)
      : Zero;
    const interest = interestUnparsed
      ? ethers.BigNumber.from(interestUnparsed)
      : Zero;
    const collateral = collateralUnparsed
      ? ethers.BigNumber.from(collateralUnparsed)
      : Zero;
    const ethYield = ethYieldUnparsed
      ? ethers.BigNumber.from(ethYieldUnparsed)
      : Zero;
    const depositEndDate =
      deposit &&
      deposit.lendingPool &&
      fromEthDate(deposit.lendingPool.timestamp);
    const borrowEndDate = borrow && fromEthDate(borrow.timestamp);
    if (type === "Deposit") {
      return (
        <div className="flex flex-col">
          <span>Lockup Date {formatShortDate(depositEndDate)}</span>
          <span>
            Deposit Amount: {formatLargeUsdc(principal.add(interest))} USDC
          </span>
          <span>PST Tokens received: {formatWad(tokenAmount, 6)}</span>
        </div>
      );
    } else if (type === "Withdraw") {
      return (
        <div className="flex flex-col">
          <span>Lockup Date {formatShortDate(depositEndDate)}</span>
          <span>
            Withdraw Amount: {formatLargeUsdc(principal.add(interest))} USDC
          </span>
          <span>Interest Collected: {formatLargeUsdc(interest)} USDC</span>
          <span>ETH Yield Collected: {formatWad(ethYield, 6)} ETH</span>
          <span>PST Tokens deposited: {formatWad(tokenAmount, 6)}</span>
        </div>
      );
    } else if (type === "PartialRepayBorrow") {
      return (
        <div className="flex flex-col">
          <span>Repayment Due Date: {formatShortDate(borrowEndDate)}</span>
          <span>Interest Payment: {formatLargeUsdc(interest)} USDC</span>
          <span>Principal Payment: {formatLargeUsdc(principal)} USDC</span>
          <span>
            Total Payment: {formatLargeUsdc(principal.add(interest))} USDC
          </span>
        </div>
      );
    } else if (type === "Borrow") {
      return (
        <div className="flex flex-col">
          <span>Repayment Due Date: {formatShortDate(borrowEndDate)}</span>
          <span>Amount Borrowed: {formatLargeUsdc(principal)} USDC</span>
          <span>Collateral Provided: {formatWad(collateral, 6)} ETH</span>
        </div>
      );
    } else {
      return <></>;
    }
  }

  return (
<Card>
      <div className="relative overflow-x-auto border rounded-2xl">
        <table className="w-full text-left text-shrub-grey">
          <caption className="p-5 text-lg font-semibold text-left rtl:text-right text-shrub-grey-900 bg-white">
            History
          </caption>
          <thead className="text-xs bg-shrub-grey-light border border-shrub-grey-light2">
            <tr>
              <th scope="col" className="px-6 py-3 text-shrub-grey font-medium">
                Date
              </th>
              <th scope="col" className="px-6 py-3 text-shrub-grey font-medium">
                Type
              </th>
              <th scope="col" className="px-6 py-3 text-shrub-grey font-medium">
                txid
              </th>
              <th scope="col" className="px-6 py-3 text-shrub-grey font-medium">
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="text-lg">
            {userLogs && userLogs.userLogs ? (
              userLogs.userLogs.map((log, index) => {
                return (
                  <tr key={`earnRow-${index}`} className="bg-white border-b">
                    <td className="px-6 py-4 text-sm font-bold">
                      {fromEthDate(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold">{log.type}</td>
                    <td className="py-4 text-sm font-bold break-all max-w-[200px] overflow-hidden">
                      <TransactionButton
                        txHash={parseTxId(log.id)}
                        chainId={chainId}
                        className="normal-case border-0 hover:text-shrub-green-500 hover:underline"
                      >
                        {parseTxId(log.id)}
                      </TransactionButton>
                    </td>

                    <td className="px-6 py-4 text-sm font-bold">
                      {getNotes(log)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <></>
            )}
          </tbody>
        </table>
      </div>
</Card>
  );
};
