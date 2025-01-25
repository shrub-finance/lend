import { Button } from 'components/Button';
import Image from 'next/image';
import { useRouter } from 'next/router';
import React, { FC, useState } from 'react';
import { getChainInfo } from 'utils/chains';
import {getContractAbis, getContractAddresses} from 'utils/contracts';
import { Card } from './Card';
import { useBalance } from "@thirdweb-dev/react";
import { NATIVE_TOKEN_ADDRESS } from "@thirdweb-dev/sdk";
import {ethers} from "ethers";
import {UserHistoryView} from "./UserHistoryView";


export const WalletBalance: FC = () => {
  const [convertedBalance, setConvertedBalance] = useState<string>('0')
  const { chainId } = getChainInfo();
  const { usdcAddress } = getContractAddresses(chainId);
  const { data: usdcBalance, isLoading: usdcBalanceIsLoading } = useBalance(usdcAddress);
  const { data: ethBalance, isLoading: ethBalanceIsLoading } = useBalance(NATIVE_TOKEN_ADDRESS);

  const router = useRouter()
  const handleBorrow = async () => {
    await router.push("/borrow");
  }
  const handleDeposit = async () => {
    await router.push("/deposit");
  }
  const { lendingPlatformAddress } = getContractAddresses(chainId);
  const { lendingPlatformAbi } = getContractAbis(chainId);
  const { data: usdcBalanceData, isLoading: usdcBalanceDataIsLoading } =
    useBalance(usdcAddress);


  return (
    <Card>
      <div className="mx-auto p-6 bg-white rounded-lg">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-700">
            <p>Wallet Balance</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {!ethBalanceIsLoading && Number(ethers.utils.formatEther(ethBalance?.value || "-")).toFixed(2)} ETH
            </p>

          </h2>
          <div className="p-2 bg-green-100 rounded-lg">
            <Image
              alt="wallet icon"
              src="/wallet-icon.svg"
              width="24"
              height="24"
            />
          </div>
        </div>

        <div className="mt-6 border-t pt-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-sm text-gray-500">Available to supply</p>
              <p className="text-xl font-semibold text-gray-800 flex items-center">
                <Image
                  alt="usdc logo"
                  src="/usdc-logo.svg"
                  className="w-4 inline align-middle mr-2"
                  width="24"
                  height="24"
                />
                ${!usdcBalanceIsLoading && Number(usdcBalance.displayValue).toFixed(2)}
              </p>
            </div>
            <Button
              type="primary"
              text="Deposit"
              onClick={handleDeposit}
              additionalClasses="px-5 py-2.5 focus:outline-none focus:ring-4 focus:ring-grey-200 text-sm mb-2 right-0"
              fill={false}
              boldText={false}
            />
          </div>

          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Available to borrow</p>
              <p className="text-xl font-semibold text-gray-800 flex items-center">
                <Image
                  alt="usdc logo"
                  src="/usdc-logo.svg"
                  className="w-4 inline align-middle mr-2"
                  width="24"
                  height="24"
                />
                ${convertedBalance}
              </p>
            </div>
            <Button
              type="primary"
              text="Borrow"
              onClick={handleBorrow}
              additionalClasses="px-5 py-2.5 focus:outline-none focus:ring-4 focus:ring-grey-200 text-sm mb-2 right-0"
              fill={false}
              boldText={false}
            />
          </div>
        </div>
      </div>
    </Card>

  );
};
