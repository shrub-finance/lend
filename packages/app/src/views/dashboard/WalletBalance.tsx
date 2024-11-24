import { NATIVE_TOKEN_ADDRESS, useBalance } from '@thirdweb-dev/react';
import axios from 'axios';
import { Button } from 'components/Button';
import { ethers } from 'ethers';
import Image from 'next/image';
import { useRouter } from 'next/router';
import React, { FC, useEffect, useState } from 'react';
import { getChainInfo } from 'utils/chains';
import { getContractAddresses } from 'utils/contracts';
import { formatLargeUsdc } from 'utils/ethMethods';
import { Card } from './Card';

export const WalletBalance: FC = () => {
  const { data: ethBalance, isLoading: ethBalanceIsLoading } =
    useBalance(NATIVE_TOKEN_ADDRESS);
  const [convertedBalance, setConvertedBalance] = useState<string>('0')

  const { chainId } = getChainInfo();
  const { usdcAddress } = getContractAddresses(chainId);
  const { data: usdcBalance, isLoading: usdcBalanceIsLoading } =
    useBalance(usdcAddress);

  const router = useRouter()
  const handleBorrow = async () => {
    await router.push("/borrow");
  }
  const handleDeposit = async () => {
    await router.push("/deposit");
  }

  useEffect(() => {
    if(!ethBalanceIsLoading) {
      axios.get(
        "https://api.coingecko.com/api/v3/simple/price",
        {
          params: {
            ids: "ethereum",
            vs_currencies: "usd",
          },
        }
      ).then((response) => {
        const ethToUsdRate = response.data.ethereum.usd;
        const usdcValue = parseFloat(ethers.utils.formatEther(ethBalance.value)) * ethToUsdRate;
        setConvertedBalance(usdcValue.toFixed(2)); // Round to 2 decimal places
      })
    }
  }, [ethBalanceIsLoading])

  return (
    <Card>
      <div className="mx-auto p-6 bg-white rounded-lg">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-700">
            <p>Wallet Balance</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">$4,234.00</p>
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
                {!usdcBalanceIsLoading && Number(usdcBalance.displayValue).toFixed(2)}
              </p>
            </div>
            <Button
              type='primary'
              text='Deposit'
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
                {convertedBalance}
              </p>
            </div>
            <Button
              type='primary'
              text='Borrow'
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
