// Next, React
import {FC, useEffect, useState} from 'react';

// Wallet
import {RequestAirdrop} from "../components/RequestAirdrop";
import {useConnectedWallet, useBalance, useAddress, useContract, useContractRead} from "@thirdweb-dev/react";
import {NATIVE_TOKEN_ADDRESS} from "@thirdweb-dev/sdk";

// Custom
import {toEthDate, fromEthDate} from "../utils/ethMethods";
import { usdcAddress, lendingPlatformAddress, lendingPlatformAbi } from "../utils/contracts";

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

                <h1 className=" text-5xl font-bold text-base-100 self-start">
                    Dashboard
                </h1>
                <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
                    {/*<table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">*/}
                    {/*    <caption*/}
                    {/*      className="p-5 text-lg font-semibold text-left text-gray-900 bg-white dark:text-white dark:bg-gray-800">*/}
                    {/*        Earning*/}
                    {/*        <p className="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400"></p>*/}
                    {/*    </caption>*/}
                    {/*    <thead*/}
                    {/*      className="text-xs text-gray-700 bg-gray-50 dark:bg-gray-700 dark:text-gray-400">*/}
                    {/*    <tr>*/}
                    {/*        <th scope="col" className="px-6 py-3">*/}
                    {/*            Amount Deposited*/}
                    {/*        </th>*/}
                    {/*        <th scope="col" className="px-6 py-3">*/}
                    {/*            Term duration (months)*/}
                    {/*        </th>*/}
                    {/*        <th scope="col" className="px-6 py-3">*/}
                    {/*            APR*/}
                    {/*        </th>*/}
                    {/*        <th scope="col" className="px-6 py-3">*/}
                    {/*            Earned*/}
                    {/*        </th>*/}
                    {/*        <th scope="col" className="px-6 py-3">*/}
                    {/*            Unlock date*/}
                    {/*        </th>*/}
                    {/*        <th scope="col" className="px-6 py-3">*/}
                    {/*            <span className="sr-only">Edit</span>*/}
                    {/*        </th>*/}
                    {/*    </tr>*/}
                    {/*    </thead>*/}
                    {/*    <tbody>*/}
                    {/*    <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">*/}
                    {/*        <th scope="row"*/}
                    {/*            className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">*/}
                    {/*            Microsoft Surface Pro*/}
                    {/*        </th>*/}
                    {/*        <td className="px-6 py-4">*/}
                    {/*            White*/}
                    {/*        </td>*/}
                    {/*        <td className="px-6 py-4">*/}
                    {/*            Laptop PC*/}
                    {/*        </td>*/}
                    {/*        <td className="px-6 py-4">*/}
                    {/*            $1999*/}
                    {/*        </td>*/}
                    {/*        <td className="px-6 py-4">*/}
                    {/*            $1999*/}
                    {/*        </td>*/}
                    {/*        <td className="px-6 py-4 text-right">*/}
                    {/*            <a href="#"*/}
                    {/*               className="btn btn-block bg-white border text-shrub-grey-700 hover:bg-gray-100 hover:border-shrub-grey-50 normal-case text-lg font-normal border-shrub-grey-50">*/}
                    {/*                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10" fill="none">*/}
                    {/*                    <path d="M0.833496 0.833252L9.16683 9.16659M9.16683 9.16659V0.833252M9.16683 9.16659H0.833496" stroke="#344054" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/>*/}
                    {/*                </svg>&nbsp;*/}
                    {/*                Withdraw</a>*/}
                    {/*        </td>*/}
                    {/*    </tr>*/}
                    {/*    </tbody>*/}
                    {/*</table>*/}
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <caption
                          className="p-5 text-lg text-left text-gray-500 bg-white dark:text-white dark:bg-gray-800">
                            Welcome back, Ryan.eth!
                            <p className="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400"></p>
                        </caption>
                        <thead
                          className="text-xs text-gray-700 bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
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
                        <tbody>
                        <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                            <td className="px-6 py-4">{wallet && !ethBalanceIsLoading ? (
                              <p>{(ethBalance.displayValue || 0).toLocaleString()}</p>
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
