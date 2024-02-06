// Next, React
import {FC, useEffect, useState} from 'react';

// Wallet
import {useConnectedWallet, useBalance, useAddress, useContract, useContractRead} from "@thirdweb-dev/react";
import {NATIVE_TOKEN_ADDRESS} from "@thirdweb-dev/sdk";

// Custom
import {toEthDate, fromEthDate} from "../utils/ethMethods";
import {
    usdcAddress,
    lendingPlatformAddress,
    lendingPlatformAbi,
    chainlinkAggregatorAbi,
    chainlinkAggregatorAddress
} from "../utils/contracts";
import {ethers} from "ethers";
import Image from "next/image";
import {formatDate, milliSecondsInDay} from "@shrub-lend/common";
import {USER_POSITIONS_QUERY} from "../constants/queries";
import {useQuery, useLazyQuery} from "@apollo/client";

const now = new Date();
const oneYearFromNow = new Date((new Date(now)).setFullYear(now.getFullYear() + 1));

export const DashboardView: FC = ({}) => {
  const wallet = useConnectedWallet();

  const {data: usdcBalance, isLoading: usdcBalanceIsLoading} = useBalance(usdcAddress);
  const {data: ethBalance, isLoading: ethBalanceIsLoading} = useBalance(NATIVE_TOKEN_ADDRESS);
  const walletAddress = useAddress();
  const [ethPrice, setEthPrice] = useState(ethers.BigNumber.from(0));
  const {
    contract: lendingPlatform,
    isLoading: lendingPlatformIsLoading,
    error: lendingPlatformError
  } = useContract(lendingPlatformAddress, lendingPlatformAbi);
  const {
      contract: chainLinkAggregator,
      isLoading: chainLinkAggregatorIsLoading,
      error: chainLinkAggregatorError
  } = useContract(chainlinkAggregatorAddress, chainlinkAggregatorAbi);
    const {
        data: usdcEthRoundData,
        isLoading: usdcEthRoundIsLoading,
        error: usdcEthRoundError
    } = useContractRead(chainLinkAggregator, 'latestRoundData', [])
    const [getUserPositions, {
        loading: userPositionsDataLoading,
        error: userPositionsDataError,
        data: userPositionsData,
        startPolling: userPositionsDataStartPolling,
        stopPolling: userPositionsDataStopPolling,
    }] = useLazyQuery(USER_POSITIONS_QUERY, {
        variables: {
            user: walletAddress && walletAddress.toLowerCase(),
        },
    });

  useEffect(() => {
    console.log('running contract useEffect');
    console.log(lendingPlatform, lendingPlatformIsLoading, lendingPlatformError);

    async function callContract() {
      const APYvalue = await lendingPlatform.call("getAPYBasedOnLTV", [33]);
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
        console.log('running walletAddress useEffect');
        if (!walletAddress) {
            // walletAddress has not been fetched yet
            return;
        }
        console.log(walletAddress);
        getUserPositions();
    }, [walletAddress]);

    useEffect(() => {
        console.log('running userPositionsDataLoading useEffect');
        console.log(`userPositionsDataLoading: ${userPositionsDataLoading}`);
        if (userPositionsDataLoading) {
            return;
        }
        console.log('userPositionsData');
        console.log(userPositionsData);
        console.log('userPositionsError');
        console.log(userPositionsDataError)
        console.log(userPositionsData?.user?.lendPositions)
    }, [userPositionsDataLoading]);

    const testVar = "2";

    useEffect(() => {
        console.log('running usdcEthRound useEffect')
        if (usdcEthRoundData) {
            console.log(usdcEthRoundData);
            const invertedPrice = usdcEthRoundData.answer;
            console.log(ethers.utils.formatUnits(invertedPrice, 18));
            const ethPriceTemp = ethers.utils.parseUnits("1", 26).div(invertedPrice);
            console.log(ethers.utils.formatUnits(ethPriceTemp, 8));
            setEthPrice(ethPriceTemp);
        }

    }, [usdcEthRoundIsLoading]);

    function daysFromNow(date: Date) {
        return Math.round((date.valueOf() - now.valueOf()) / milliSecondsInDay);
    }


  return (

    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col bg-shrub-grey-light">


        <div className="relative group mt-4 w-full ">
          <div className="flex flex-col">
            <div className="card w-full text-left ">
              <div className="card-body ">

                <div className="flex-col gap-2 ">
                  <div className="flex flex-row text-lg ">
                                        <span className="w-[500px]"><h1
                                          className=" text-[36px] font-semibold self-start leading-9">
                    Dashboard
                </h1></span>
                      <span className="w-[500px]"></span>
                    <span> <button type="button"
                                                         className="text-gray-900 mr-2 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-full text-sm px-5 py-2.5  mb-2 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700">Deposit
                                                                </button>
<button type="button"
        className="text-white bg-shrub-green-500 border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-full text-sm px-5 py-2.5  mb-2 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700">Lend
                                                                </button></span>


                  </div>
                  <div className="card w-full py-4">
                    <span className="text-left"><h3 className="font-normal  pb-5 text-shrub-grey"> Welcome back, ryan.eth!</h3><span></span>Eth Price: {ethers.utils.formatUnits(ethPrice, 8)} USDC</span>
                  </div>
                </div>

                <div className="form-control w-full mt-6">
                  <div>

                    <ul className="flex flex-col gap-4">
                      <li className="mr-4">
                        <div className="relative overflow-x-auto border rounded-2xl">
                          <table className="w-full text-left text-shrub-grey  dark:text-gray-400">
                            <caption
                              className="p-5 text-lg font-semibold text-left rtl:text-right text-gray-900 bg-white dark:text-white dark:bg-gray-800">
                              Earning
                              <span
                                className=" leading-5 inline-block bg-shrub-grey-light3 text-shrub-green-500 text-xs font-medium ml-2 px-2 py-0.5 rounded-full dark:bg-green-900 dark:text-green-300">Total of {testVar} contracts</span>

                            </caption>
                            <thead
                              className="text-xs bg-shrub-grey-light dark:bg-gray-700 border border-shrub-grey-light2">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-shrub-grey font-medium">
                                Amount Deposited
                              </th>
                              <th scope="col" className="px-6 py-3 text-shrub-grey font-medium">
                                Current Value
                              </th>
                              <th scope="col" className="px-6 py-3 text-shrub-grey font-medium">
                                APR
                              </th>
                              <th scope="col" className="px-6 py-3 text-shrub-grey font-medium">
                                Earned
                              </th>
                              <th scope="col" className="px-6 py-3 text-shrub-grey font-medium">
                                Unlock Date
                              </th>
                              <th scope="col" className="px-6 py-3 text-shrub-grey font-medium">

                              </th>
                            </tr>
                            </thead>
                              <tbody className="text-lg">
                              {userPositionsData?.user?.lendPositions?.map((item, index) => (
                                  <tr key={`earnRow-${index}`} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                      {/*<td><p>Hi</p></td>*/}
                                      {/*<td> Hi</td>*/}
                                      {/*<td> Hi</td>*/}
                                      {/*<td> Hi</td>*/}
                                      {/*<td> Hi</td>*/}
                                      {/*<td> Hi</td>*/}
                                      <td className="px-6 py-4 text-sm font-bold">{wallet && !ethBalanceIsLoading ? (
                                          <p>{ethers.utils.formatUnits(
                                              item.depositsUsdc, 6
                                          )}</p>
                                      ) : (
                                          <p className="text-sm">Loading ETH balance...</p>
                                      )}</td>
                                      <td className="px-6 py-4 text-sm font-bold">
                                          {
                                              ethers.utils.formatUnits(
                                                  ethers.BigNumber.from(item.lendingPool.totalUsdc)
                                                      .add(item.lendingPool.totalUsdcInterest)
                                                      .add(ethPrice.mul(item.lendingPool.totalEthYield).div(ethers.utils.parseUnits("1", 20)))
                                                      .mul(item.amount)
                                                      .div(item.lendingPool.tokenSupply)
                                                  , 6
                                              )

                                              // item.lendingPool.totalEthYield * ethPrice
                                          }
                                      </td>
                                      <td className="px-6 py-4 text-sm font-bold">
                                          X%
                                      </td>
                                      <td className="px-6 py-4 text-sm font-bold">
                                          Earned
                                      </td>
                                      <td className="px-6 py-4 text-sm font-bold">
                                          {fromEthDate(item.lendingPool.timestamp).toLocaleString()}
                                      </td>
                                      <td className="px-1 py-4 text-sm font-bold">
                                          <div className="flex items-center justify-center space-x-2 h-full p-2">
                                              <button type="button"
                                                      className="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-full text-sm px-5 py-2.5 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700">
                                                  Redeem
                                              </button>
                                              <button type="button"
                                                      className="flex items-center justify-center text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-full text-sm px-5 py-2.5 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700">
                                                  <Image src="/up-right-arrow.svg" alt="down arrow" width={20}
                                                         height={20}
                                                         className="mr-2"/>
                                                  Trade
                                              </button>
                                          </div>
                                      </td>

                                  </tr>
                              ))}
                              {/*<tr key={"99"}>*/}
                              {/*    <td><p>Hi</p></td>*/}
                              {/*    <td> Hi</td>*/}
                              {/*    <td> Hi</td>*/}
                              {/*    <td> Hi</td>*/}
                              {/*    <td> Hi</td>*/}
                              {/*    <td> Hi</td>*/}
                              {/*</tr>*/}
                              <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                  <td className="px-6 py-4 text-sm font-bold">{wallet && !ethBalanceIsLoading ? (
                                      <p>{ethers.utils.formatEther(
                                          ethBalance.value
                                              .div(ethers.utils.parseUnits('1', 15))
                                              .mul(ethers.utils.parseUnits('1', 15))
                                      )}</p>
                                  ) : (
                                      <p className="text-sm">Loading ETH balance...</p>
                                  )}</td>
                                  <td className="px-6 py-4 text-sm font-bold">
                                      {wallet && !usdcBalanceIsLoading ? (
                                          <p>{(usdcBalance.displayValue || 0).toLocaleString()}</p>
                                      ) : (
                                          <p className="text-sm">Loading USDC balance...</p>
                                      )}
                                  </td>
                                  <td className="px-6 py-4 text-sm font-bold">
                                      {walletAddress}
                                  </td>
                                  <td className="px-6 py-4 text-sm font-bold">

                                  </td>
                                  <td className="px-6 py-4 text-sm font-bold">

                                  </td>
                                  <td className="px-1 py-4 text-sm font-bold">
                                      <div className="flex items-center justify-center space-x-2 h-full p-2">
                                          <button type="button"
                                                  className="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-full text-sm px-5 py-2.5 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700">
                                              Redeem
                                          </button>
                                          <button type="button"
                                                  className="flex items-center justify-center text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-full text-sm px-5 py-2.5 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700">
                                              <Image src="/up-right-arrow.svg" alt="down arrow" width={20} height={20}
                                                     className="mr-2"/>
                                              Trade
                                          </button>
                                      </div>
                                  </td>

                              </tr>
                              </tbody>
                          </table>
                        </div>
                      </li>
                        <li className="mr-4">
                            <div className="relative overflow-x-auto border rounded-2xl">
                                <table className="w-full text-left text-shrub-grey  dark:text-gray-400">
                                    <caption
                                        className="p-5 text-lg font-semibold text-left rtl:text-right text-gray-900 bg-white dark:text-white dark:bg-gray-800">
                              Borrowing

                            </caption>
                            <thead
                              className="text-xs bg-shrub-grey-light dark:bg-gray-700 border border-shrub-grey-light2">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-shrub-grey font-medium">
                                Amount Borrowed
                              </th>
                              <th scope="col" className="px-6 py-3 text-shrub-grey font-medium">
                                Amount Paid
                              </th>
                              <th scope="col" className="px-6 py-3 text-shrub-grey font-medium">
                                Time until due date (days)
                              </th>
                              <th scope="col" className="px-6 py-3 text-shrub-grey font-medium">
                                APR
                              </th>
                              <th scope="col" className="px-6 py-3 text-shrub-grey font-medium">
                                Remaining Balance
                              </th>
                              <th scope="col" className="px-6 py-3 text-shrub-grey font-medium">
                                Due Date
                              </th>

                            </tr>
                            </thead>
                            <tbody className="text-lg">

                            {userPositionsData?.user?.loans?.map((item, index) => (
                                <tr key={`borrowRow-${index}`} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                    <td className="px-6 py-4 text-sm font-bold">{wallet && !ethBalanceIsLoading ? (
                                        <p>{ethers.utils.formatUnits(item.amount, 6)}</p>
                                    ) : (
                                        <p className="text-sm">Loading ETH balance...</p>
                                    )}</td>
                                    <td className="px-6 py-4 text-sm font-bold">
                                        0
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold">
                                        {daysFromNow(fromEthDate(item.timestamp))}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold">
                                        <p>{ethers.utils.formatUnits(item.apy, 6)}</p>
                                        {/*<p>{ethers.utils.parseUnits(item.apy, 6)}</p>*/}
                                        {/*{ethers.utils.parseUnits(item.apy, 6)}*/}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold">
                                        remaining balance
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold">
                                        {fromEthDate(item.timestamp).toLocaleString()}
                                    </td>
                                    <td className="px-1 py-4 text-sm font-bold">
                                        <button type="button"
                                                className="flex items-center justify-center text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-full text-sm px-5 py-2.5 mb-2 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700">
                                            <Image src="/up-right-arrow.svg" alt="down arrow" width={20} height={20}
                                                   className="mr-2"/>
                                            Pay
                                        </button>
                                    </td>


                                </tr>

                            ))}


                            <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                <td className="px-6 py-4 text-sm font-bold">{wallet && !ethBalanceIsLoading ? (
                                    <p>{ethers.utils.formatEther(
                                        ethBalance.value
                                            .div(ethers.utils.parseUnits('1', 15))
                                            .mul(ethers.utils.parseUnits('1', 15))
                                    )}</p>
                                ) : (
                                    <p className="text-sm">Loading ETH balance...</p>
                                )}</td>
                                <td className="px-6 py-4 text-sm font-bold">
                                    {wallet && !usdcBalanceIsLoading ? (
                                        <p>{(usdcBalance.displayValue || 0).toLocaleString()}</p>
                                    ) : (
                                        <p className="text-sm">Loading USDC balance...</p>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-sm font-bold">
                                    {walletAddress}
                                </td>
                                <td className="px-6 py-4 text-sm font-bold">
                                    {walletAddress}
                                </td>
                                <td className="px-6 py-4 text-sm font-bold">
                                    {walletAddress}
                                </td>
                                <td className="px-6 py-4 text-sm font-bold">
                                    {walletAddress}
                                </td>
                                <td className="px-1 py-4 text-sm font-bold">
                                    <button type="button"
                                            className="flex items-center justify-center text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-full text-sm px-5 py-2.5 mb-2 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700">
                                        <Image src="/up-right-arrow.svg" alt="down arrow" width={20} height={20}
                                               className="mr-2"/>
                                        Pay
                                    </button>
                                </td>


                            </tr>
                            </tbody>
                          </table>
                        </div>
                      </li>


                    </ul>
                  </div>
                </div>


              </div>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
};
