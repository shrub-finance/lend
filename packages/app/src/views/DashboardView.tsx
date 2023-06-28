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
    const w = useConnectedWallet();

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
                <div className='mt-6'>
                    <h1 className="text-center text-5xl md:pl-12 font-bold text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-fuchsia-500 mb-4">
                        Shrub Lend
                    </h1>
                </div>

                <div className="flex flex-col mt-2">
                    <RequestAirdrop/>
                    <h4 className="md:w-full text-2xl text-slate-300 my-2">

                        {w &&
                            <>
                                <div className="flex flex-row justify-center">
                                    <div className='text-slate-600 ml-2'>
                                        {!ethBalanceIsLoading ? (
                                            <p className='text-base-100 ml-2'>ETH
                                                Balance: {(ethBalance.displayValue || 0).toLocaleString()}</p>
                                        ) : (
                                            <p className='text-base-100 ml-2'>Loading ETH balance...</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-row justify-center">
                                    <div className='text-slate-600 ml-2'>
                                        {!usdcBalanceIsLoading ? (
                                            <p className='text-base-100 ml-2'>USDC
                                                Balance: {(usdcBalance.displayValue || 0).toLocaleString()}</p>
                                        ) : (
                                            <p className='text-base-100 ml-2'>Loading USDC balance...</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-row justify-center">
                                    <div className='text-slate-600 ml-2'>
                                        <p className='text-base-100 ml-2'>Wallet Address: {walletAddress}</p>
                                    </div>
                                </div>
                            </>

                        }
                    </h4>
                </div>
            </div>
        </div>
    );
};
