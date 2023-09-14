// Next, React
import {FC, useEffect, useState} from 'react';

// Wallet
import {RequestAirdrop} from "../components/RequestAirdrop";
import {useConnectedWallet, useBalance, useAddress, useContract, useContractRead} from "@thirdweb-dev/react";
import {NATIVE_TOKEN_ADDRESS} from "@thirdweb-dev/sdk";

// Custom
import {toEthDate, fromEthDate} from "../utils/ethMethods";
import { usdcAddress, lendingPlatformAddress, lendingPlatformAbi } from "../utils/contracts";
import {ethers} from "ethers";

const now = new Date();
const oneYearFromNow = new Date((new Date(now)).setFullYear(now.getFullYear() + 1));

export const DashboardView: FC = ({}) => {
    const wallet = useConnectedWallet();

    const {data: usdcBalance, isLoading: usdcBalanceIsLoading} = useBalance(usdcAddress);
    const {data: ethBalance, isLoading: ethBalanceIsLoading} = useBalance(NATIVE_TOKEN_ADDRESS);
    const walletAddress = useAddress();
    const {
        contract: lendingPlatform,
        isLoading: lendingPlatformIsLoading,
        error: lendingPlatformError
    } = useContract(lendingPlatformAddress, lendingPlatformAbi);
    const {
        data: totalAvailableLiquidityOneYearFromNow,
        isLoading: totalAvailableLiquidityOneYearFromNowIsLoading,
        error: totalAvailableLiquidityOneYearFromNowError
    } = useContractRead(lendingPlatform, 'getTotalAvailableLiquidity', [toEthDate(oneYearFromNow)])

    useEffect(() => {
        console.log('running contract useEffect');
        console.log(lendingPlatform, lendingPlatformIsLoading, lendingPlatformError);
        async function callContract() {
            const APYvalue = await lendingPlatform.call("getAPYBasedOnLTV",[33]);
            console.log(APYvalue);
        }
        if (!lendingPlatformIsLoading && !lendingPlatformError) {
            callContract()
                .then()
                .catch(console.log);
        }
    }, [lendingPlatformIsLoading, lendingPlatformError])

    useEffect(() => {
        console.log('running usdc useEffect');
        console.log(usdcBalance);
    }, [usdcBalanceIsLoading])

    useEffect(() => {
        console.log('running eth useEffect');
        console.log(ethBalance);
    }, [ethBalanceIsLoading])

    useEffect(() => {
        console.log('running totalLiquidityOneYearFromNow useEffect');
        if (!totalAvailableLiquidityOneYearFromNowIsLoading && !totalAvailableLiquidityOneYearFromNowError) {
            console.log(totalAvailableLiquidityOneYearFromNow);
        }
    })

    return (

        <div className="md:hero mx-auto p-4">
            <div className="md:hero-content flex flex-col">
                <div className='mt-6 self-start'>

                <h1 className=" text-5xl font-bold text-base-100 self-start">
                    Dashboard
                </h1>
                <p className="text-base-100 text-lg font-light pt-5 pb-5"> Welcome back, <span className="font-semibold">ryan.eth!</span></p>
                </div>
                <div className="relative overflow-x-auto -inset-1 shadow-shrub border rounded-2xl">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead
                          className="text-xs text-shrub-blue bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th scope="col" className="px-6 py-3">
                                ETH Balance
                            </th>
                            <th scope="col" className="px-6 py-3">
                                USDC Balance
                            </th>
                            <th scope="col" className="px-6 py-3">
                                Wallet Address
                            </th>
                        </tr>
                        </thead>
                        <tbody className="text-lg">
                        <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                            <td className="px-6 py-4">{wallet && !ethBalanceIsLoading ? (
                              <p>{ethers.utils.formatEther(
                                  ethBalance.value
                                      .div(ethers.utils.parseUnits('1',15))
                                      .mul(ethers.utils.parseUnits('1',15))
                              )}</p>
                            ) : (
                              <p>Loading ETH balance...</p>
                            )}</td>
                            <td className="px-6 py-4">
                                {wallet && !usdcBalanceIsLoading ? (
                                  <p>{(usdcBalance.displayValue || 0).toLocaleString()}</p>
                                ) : (
                                  <p>Loading USDC balance...</p>
                                )}
                            </td>
                            <td className="px-6 py-4">
                                {walletAddress}
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    );
};
