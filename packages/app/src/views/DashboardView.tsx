// Next, React
import {FC, useEffect, useState} from "react";
import Link from "next/link";


import {
  useConnectedWallet,
  useBalance,
  useAddress,
  useContract,
  useContractRead
} from "@thirdweb-dev/react";
import { getBlock, NATIVE_TOKEN_ADDRESS } from "@thirdweb-dev/sdk";

import { toEthDate, fromEthDate, getPlatformDates } from '@shrub-lend/common'
import {
  usdcAddress,
  lendingPlatformAddress,
  lendingPlatformAbi,
  chainlinkAggregatorAbi,
  chainlinkAggregatorAddress,
} from "../utils/contracts";
import { ethers } from "ethers";
import Image from "next/image";
import { secondsInDay} from "@shrub-lend/common";
import { USER_POSITIONS_QUERY } from "../constants/queries";
import { useLazyQuery } from "@apollo/client";
import {useFinancialData} from "../components/FinancialDataContext";
import Modal from "../components/Modal";
import ExtendView from './extend/ExtendView';

const now = new Date();
const oneYearFromNow = new Date(new Date(now).setFullYear(now.getFullYear() + 1));
export const DashboardView: FC = ({}) => {
  const wallet = useConnectedWallet();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { store, dispatch } = useFinancialData();
  const { data: usdcBalance, isLoading: usdcBalanceIsLoading } = useBalance(usdcAddress);
  const { data: ethBalance, isLoading: ethBalanceIsLoading } = useBalance(NATIVE_TOKEN_ADDRESS);
  const walletAddress = useAddress();
  const [ethPrice, setEthPrice] = useState(ethers.BigNumber.from(0));
  const [blockchainTime, setBlockchainTime] = useState(0);
  const {
    contract: lendingPlatform,
    isLoading: lendingPlatformIsLoading,
    error: lendingPlatformError,
  } = useContract(lendingPlatformAddress, lendingPlatformAbi);
  const {
    contract: chainLinkAggregator,
    isLoading: chainLinkAggregatorIsLoading,
    error: chainLinkAggregatorError,
  } = useContract(chainlinkAggregatorAddress, chainlinkAggregatorAbi);
  const {
    data: usdcEthRoundData,
    isLoading: usdcEthRoundIsLoading,
    error: usdcEthRoundError,
  } = useContractRead(chainLinkAggregator, "latestRoundData", []);
  const [
    getUserPositions,
    { loading: userPositionsDataLoading,
      error: userPositionsDataError,
      data: userPositionsData,
      startPolling: userPositionsDataStartPolling,
      stopPolling: userPositionsDataStopPolling,
    },
  ] = useLazyQuery(USER_POSITIONS_QUERY, {
    variables: {
      user: walletAddress && walletAddress.toLowerCase(),
    },
  });

  const [currentHovered, setCurrentHovered] = useState<number | null>(null);
  const [timestamp, setTimestamp] = useState(0);
  const [showAPYSection, setShowAPYSection] = useState(false);
  const [estimatedAPY, setEstimatedAPY] = useState("0");
  const {oneMonth, threeMonth, sixMonth, twelveMonth} = getPlatformDates();
  const depositTerms = [
    { id: 'smallest-deposit', value: 'smallest-deposit', duration: oneMonth },
    { id: 'small-deposit', value: 'small-deposit', duration: threeMonth },
    { id: 'big-deposit', value: 'big-deposit', duration: sixMonth },
    { id: 'biggest-deposit', value: 'biggest-deposit', duration: twelveMonth },
  ];
  const [selectedLendPositionBalance, setSelectedLendPositionBalance] = useState("");
  const [selectedLendPositionTermDate, setSelectedLendPositionTermDate] = useState<Date | null>(null);
  const [selectedPoolShareTokenAmount, setSelectedPoolShareTokenAmount] = useState(0);
  const [selectedTokenSupply, setSelectedTokenSupply] = useState(0);
  const [selectedTotalEthYield, setSelectedTotalEthYield] = useState(0);
  const [selectedPoolTokenId, setSelectedPoolTokenId] = useState('');


  const dummyEarningPools = "2";


  useEffect(() => {
    const handleAPYCalc = () => {
      const apyGenerated = timestamp === oneMonth.getTime() / 1000 ? 7.56 :
        timestamp === threeMonth.getTime() / 1000 ? 8.14 :
          timestamp === sixMonth.getTime() / 1000 ? 9.04 :
            timestamp === twelveMonth.getTime() / 1000 ? 10.37 : Math.random() * 5 + 7;

      setEstimatedAPY(apyGenerated.toFixed(2).toString());
    };

    if (timestamp) {
      handleAPYCalc();
    }
  }, [timestamp]);

  useEffect(() => {
    // console.log("running contract useEffect");
    async function callContract() {
      const APYvalue = await lendingPlatform.call("getAPYBasedOnLTV", [33]);
    }

    if (!lendingPlatformIsLoading && !lendingPlatformError) {
      callContract().then().catch(console.log);
    }
  }, [lendingPlatformIsLoading, lendingPlatformError, lendingPlatform]);

  useEffect(() => {
    // console.log("running usdc useEffect");
  }, [usdcBalanceIsLoading]);

  useEffect(() => {
    // console.log("running eth useEffect");
  }, [ethBalanceIsLoading]);

  useEffect(() => {
    // console.log("running walletAddress useEffect");
    if (!walletAddress) {
      return;
    }
    getUserPositions();
  }, [walletAddress, getUserPositions]);

  useEffect(() => {
    // console.log("running userPositionsDataLoading useEffect");
    if (userPositionsDataLoading) {
      return;
    }
  }, [userPositionsDataLoading]);

  useEffect(() => {
    // Once data is loaded, update the store
    if (!userPositionsDataLoading && userPositionsData && userPositionsData.user) {
      const { loans, lendPositions } = userPositionsData.user;
      dispatch({
        type: "SET_USER_DATA",
        payload: {
          loans,
          lendPositions,
        },
      });
    }
  }, [userPositionsDataLoading, userPositionsData, dispatch]);

  useEffect(() => {
    // console.log("running usdcEthRound useEffect");
    if (usdcEthRoundData) {
      const invertedPrice = usdcEthRoundData.answer;
      const ethPriceTemp = ethers.utils.parseUnits("1", 26).div(invertedPrice);
      setEthPrice(ethPriceTemp);
    }
  }, [usdcEthRoundIsLoading, usdcEthRoundData]);

  useEffect(() => {
        // console.log('running block useEffect')
        getBlockTest()
    }, [userPositionsDataLoading]);

  async function getBlockTest() {
        const block = await getBlock({
            network: "localhost",
            block: "latest"
        });
        // console.log(block);
        setBlockchainTime(block.timestamp);
    }

  function daysFromNow(date: Date) {
      return Math.round((toEthDate(date) - blockchainTime) / secondsInDay);
  }


  /** might need this later **/
  // let newlyAddedLendPosition = store.lendPositions.filter(item => item.hasOwnProperty('id'));
  // newlyAddedLendPosition = newlyAddedLendPosition[0];
  // let calculatedPoolShareTokenAmount = (newlyAddedLendPosition?.lendingPool?.totalPrincipal + newlyAddedLendPosition?.lendingPool?.totalUsdcInterest + newlyAddedLendPosition?.lendingPool?.totalEthYield === 0) ?
  //   newlyAddedLendPosition?.depositsUsdc * 1e12 :
  //   (newlyAddedLendPosition?.depositsUsdc * newlyAddedLendPosition?.lendingPool?.tokenSupply) /
  //   (newlyAddedLendPosition?.lendingPool?.totalPrincipal + newlyAddedLendPosition?.lendingPool?.totalUsdcInterest +
  //     (newlyAddedLendPosition?.lendingPool?.totalEthYield * ethPrice));

// console.log(store);

  return (
    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col ">
        <div className="relative group mt-4 w-full bg-shrub-grey-light">
          <div className="flex flex-col">
            <div className="card w-full text-left">
              <div className="card-body ">
                <div className="flex-col gap-2">
                  <div className="flex flex-row text-lg ">
                    <span className="w-[500px]">
                      <h1 className=" text-[36px] font-semibold self-start leading-9">
                        Dashboard
                      </h1>
                    </span>
                    <span className="w-[500px]"></span>
                    <span>
                      <Link href="/borrow" passHref>
                        <button
                          type="button"
                          className="text-shrub-grey-900 mr-2 bg-white border border-shrub-grey-300 focus:outline-none hover:bg-shrub-grey-100 focus:ring-4 focus:ring-grey-200 font-medium rounded-full text-sm px-5 py-2.5  mb-2 dark:bg-shrub-grey-800 dark:text-white dark:border-shrub-grey-600 dark:hover:bg-shrub-grey-700 dark:hover:border-shrub-grey-600 dark:focus:ring-grey-700"
                        >
                          Borrow
                        </button>
                      </Link>
                      <Link href="/lend" passHref>
                        <button
                          type="button"
                          className="text-white bg-shrub-green-500 border border-shrub-grey-300 focus:outline-none focus:ring-4 focus:ring-grey-200 font-medium rounded-full text-sm px-5 py-2.5  mb-2 dark:bg-shrub-grey-800 dark:text-white dark:border-shrub-grey-600  dark:focus:ring-grey-700"
                        >
                          Lend
                        </button>
                      </Link>
                    </span>
                  </div>
                  <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} >
                    <ExtendView
                      depositTerms={depositTerms}
                      timestamp={timestamp}
                      selectedLendPositionBalance={selectedLendPositionBalance}
                      setIsModalOpen={setIsModalOpen}
                      setTimestamp={setTimestamp}
                      showAPYSection={showAPYSection}
                      estimatedAPY={estimatedAPY}
                      setShowAPYSection={setShowAPYSection}
                      selectedLendPositionTermDate={selectedLendPositionTermDate}
                      selectedPoolShareTokenAmount={selectedPoolShareTokenAmount}
                      selectedTotalEthYield={selectedTotalEthYield}
                      selectedTokenSupply={selectedTokenSupply}
                      selectedPoolTokenId={selectedPoolTokenId}
                    />
                  </Modal>

                  <div className="card w-full py-4">
                    <span className="text-left">
                      <h3 className="font-normal  pb-5 text-shrub-grey">
                        {" "}
                        Welcome back, ryan.eth!
                      </h3>
                      Eth Price:{" "}
                      {ethers.utils.formatUnits(ethPrice, 8)} USDC
                    </span>
                    <span>{fromEthDate(blockchainTime).toLocaleString()}</span>
                  </div>
                </div>
                <div className="form-control w-full mt-6">
                  <div>
                    <ul className="flex flex-col gap-4">
                      <li className="mr-4">
                        <div className="relative overflow-x-auto border rounded-2xl">
                          <table className="w-full text-left text-shrub-grey  dark:text-shrub-grey-400">
                            <caption className="p-5 text-lg font-semibold text-left rtl:text-right text-shrub-grey-900 bg-white dark:text-white dark:bg-shub-grey-800">
                              Earn Account
                              <span className=" leading-5 inline-block bg-shrub-grey-light3 text-shrub-green-500 text-xs font-medium ml-2 px-2 py-0.5 rounded-full dark:bg-green-900 dark:text-green-300">
                                Total of {dummyEarningPools} Earning Pools
                              </span>
                            </caption>
                            <thead className="text-xs bg-shrub-grey-light dark:bg-shrub-grey-700 border border-shrub-grey-light2">
                              <tr>
                                <th scope="col" className="px-6 py-3 text-shrub-grey font-medium">
                                  Amount Deposited
                                </th>
                                <th scope="col" className="px-6 py-3 text-shrub-grey font-medium">
                                  Interest Earned
                                </th>
                                <th scope="col" className="px-6 py-3 text-shrub-grey font-medium">
                                  Current Balance
                                </th>
                                <th scope="col" className="px-6 py-3 text-shrub-grey font-medium">
                                  APR
                                </th>
                                <th scope="col" className="px-6 py-3 text-shrub-grey font-medium">
                                  Unlock Date
                                </th>
                                <th scope="col" className="px-6 py-3 text-shrub-grey font-medium"></th>
                              </tr>
                            </thead>
                            <tbody className="text-lg">
                              {store?.lendPositions?.map(
                                (item, index) => (
                                  <tr
                                    key={`earnRow-${index}`}
                                    className="bg-white border-b dark:bg-shrub-grey-800 dark:border-shrub-grey-700"
                                  >
                                    <td className="px-6 py-4 text-sm font-bold">
                                      {wallet && !ethBalanceIsLoading ? (
                                        <p>{" "}<Image src="/usdc-logo.svg" alt="usdc logo" className="w-6 mr-2 inline align-middle" width="40" height="40"/>
                                          {ethers.utils.formatUnits(item.depositsUsdc ?? "0", 6)}{" "} USDC
                                          {item.status === 'pending' && (
                                            <span className=" ml-2 inline-flex items-center bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-yellow-900 dark:text-yellow-300"><span className="w-2 h-2 me-1 bg-yellow-500 rounded-full"></span>Pending</span>
                                          )}
                                          {item.status === 'failed' && (
                                            <span className=" ml-2 inline-flex items-center bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-red-900 dark:text-red-300"><span className="w-2 h-2 me-1 bg-red-500 rounded-full"></span>Failed</span>
                                          )}
                                        </p>
                                      ) : (
                                        <p className="text-sm">
                                          Loading ETH balance...
                                        </p>
                                      )}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold">
                                      {item.interestEarnedOverride ? item.interestEarnedOverride :
                                        ethers.utils.formatUnits(
                                          ethers.BigNumber.from(item.lendingPool.totalPrincipal)
                                            .add(item.lendingPool.totalUsdcInterest)
                                            .add(ethPrice
                                              .mul(item.lendingPool.totalEthYield)
                                              .div(ethers.utils.parseUnits("1", 20)))
                                            .mul(item.amount)
                                            .div(item.lendingPool.tokenSupply)
                                            .sub(item.depositsUsdc), 6)}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold">
                                      {item.currentBalanceOverride ? item.currentBalanceOverride:
                                        ethers.utils.formatUnits(
                                          ethers.BigNumber.from(item.lendingPool.totalPrincipal)
                                            .add(item.lendingPool.totalUsdcInterest)
                                            .add(ethPrice
                                              .mul(item.lendingPool.totalEthYield)
                                              .div(ethers.utils.parseUnits("1", 20)))
                                            .mul(item.amount)
                                            .div(item.lendingPool.tokenSupply), 6)}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold">
                                      <span className="bg-green-100 text-green-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-full dark:bg-green-900 dark:text-green-300">
                                        {(item.apy)?item.apy :"X"}%
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold">
                                      {fromEthDate(parseInt(item.lendingPool.timestamp)).toLocaleString()}
                                    </td>
                                    <td className="px-1 py-4 text-sm font-bold">
                                      <div className="flex items-center justify-center space-x-2 h-full p-2">
                                        <button type="button" className="text-shrub-grey-900 bg-white border border-shrub-grey-300 focus:outline-none hover:bg-shrub-green-500 hover:text-white focus:ring-4 focus:ring-grey-200 font-medium rounded-full text-sm px-5 py-2.5 disabled:bg-shrub-grey-50 disabled:text-white disabled:border disabled:border-shrub-grey-100 dark:bg-shrub-grey-700 dark:text-white dark:border-shrub-grey-50 dark:hover:bg-shrub-grey-700 dark:hover:border-shrub-grey-700 dark:focus:ring-grey-700" disabled={fromEthDate(parseInt(item.lendingPool.timestamp)).getTime() === twelveMonth.getTime()} onClick={() => {
                                          setIsModalOpen(true);
                                          setSelectedLendPositionBalance(item.currentBalanceOverride ? item.currentBalanceOverride :
                                            ethers.utils.formatUnits(
                                              ethers.BigNumber.from(item.lendingPool.totalPrincipal)
                                                .add(item.lendingPool.totalUsdcInterest)
                                                .add(ethPrice
                                                  .mul(item.lendingPool.totalEthYield)
                                                  .div(ethers.utils.parseUnits("1", 20)))
                                                .mul(item.amount)
                                                .div(item.lendingPool.tokenSupply), 6));
                                            setSelectedLendPositionTermDate(fromEthDate(parseInt(item.lendingPool.timestamp)))
                                          setSelectedPoolShareTokenAmount(item.amount)
                                          setSelectedTokenSupply(item.lendingPool.tokenSupply)
                                          setSelectedTotalEthYield(item.lendingPool.totalEthYield)
                                          setSelectedPoolTokenId(item.lendingPool.id)
                                        }} >
                                          {/*Corresponding modal at the top*/}
                                        Extend
                                      </button>
                                        <a onMouseOver={() => setCurrentHovered(index)} onMouseOut={() => setCurrentHovered(null)}
                                             href="https://app.uniswap.org/" target="_blank"
                                             type="button"
                                             className="flex items-center justify-center text-shrub-grey-900 bg-white border border-shrub-grey-300 focus:outline-none hover:bg-shrub-green-500 hover:text-white focus:ring-4 focus:ring-grey-200 font-medium rounded-full text-sm px-5 py-2.5 dark:bg-shrub-grey-800 dark:text-white dark:border-shrub-grey-600 dark:hover:bg-shrub-grey-700 dark:hover:border-shrub-grey-600 dark:focus:ring-grey-700">{currentHovered === index  ? <Image
                                            src="/up-right-arrow-light.svg"
                                            alt="down arrow"
                                            width={20}
                                            height={20}
                                            className="mr-2"
                                          /> : <Image
                                            src="/up-right-arrow.svg"
                                            alt="down arrow"
                                            width={20}
                                            height={20}
                                            className="mr-2"
                                          />} Trade</a>

                                      </div>
                                    </td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      </li>
                      <li className="mr-4">
                        <div className="relative overflow-x-auto border rounded-2xl">
                          <table className="w-full text-left text-shrub-grey  dark:text-shrub-grey-400">
                            <caption className="p-5 text-lg font-semibold text-left rtl:text-right text-shrub-grey-900 bg-white dark:text-white dark:bg-shrub-grey-800">
                              Borrow Account
                            </caption>
                            <thead className="text-xs bg-shrub-grey-light dark:bg-shrub-grey-700 border border-shrub-grey-light2">
                              <tr>
                                <th
                                  scope="col"
                                  className="px-6 py-3 text-shrub-grey font-medium"
                                >
                                  Amount Borrowed
                                </th>
                                <th
                                  scope="col"
                                  className="px-6 py-3 text-shrub-grey font-medium"
                                >
                                  Amount Paid Back
                                </th>
                                <th
                                  scope="col"
                                  className="px-6 py-3 text-shrub-grey font-medium"
                                >
                                  Time until due date (days)
                                </th>
                                <th
                                  scope="col"
                                  className="px-6 py-3 text-shrub-grey font-medium"
                                >
                                  APR
                                </th>
                                <th
                                  scope="col"
                                  className="px-6 py-3 text-shrub-grey font-medium"
                                >
                                  Current Balance
                                </th>
                                <th
                                  scope="col"
                                  className="px-6 py-3 text-shrub-grey font-medium"
                                >
                                  Due Date
                                </th>
                              </tr>
                            </thead>
                            <tbody className="text-lg">
                              {store?.loans?.map((item, index) => (
                                <tr
                                  key={`borrowRow-${index}`}
                                  className="bg-white border-b dark:bg-shrub-grey-800 dark:border-shrub-grey-700"
                                >
                                  <td className="px-6 py-4 text-sm font-bold">
                                    {wallet && !ethBalanceIsLoading ? (
                                      <p>
                                        {ethers.utils.formatUnits(
                                          item.originalPrincipal ?? "0",
                                          6,
                                        )}
                                        {item.status === 'pending' && (
                                          <span className=" ml-2 inline-flex items-center bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-yellow-900 dark:text-yellow-300"><span className="w-2 h-2 me-1 bg-yellow-500 rounded-full"></span>Pending</span>
                                        )}
                                        {item.status === 'failed' && (
                                          <span className=" ml-2 inline-flex items-center bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-red-900 dark:text-red-300"><span className="w-2 h-2 me-1 bg-red-500 rounded-full"></span>Failed</span>
                                        )}
                                      </p>
                                    ) : (
                                      <p className="text-sm">
                                        Loading ETH balance...
                                      </p>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 text-sm font-bold">
                                    {ethers.utils.formatUnits(
                                      item.paid ?? "0",
                                      6,
                                    )}
                                  </td>
                                  <td className="px-6 py-4 text-sm font-bold">
                                    {daysFromNow(
                                      fromEthDate(parseInt(item.timestamp ?? "0", 10)),
                                    )}
                                  </td>
                                  <td>
                                    <span className="bg-green-100 text-green-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-full dark:bg-green-900 dark:text-green-300">{`${ethers.utils.formatUnits(
                                      item.apy ?? "0",
                                      6,
                                    )}%`}</span>
                                  </td>
                                  <td className="px-6 py-4 text-sm font-bold">
                                    {ethers.utils.formatUnits(
                                      ethers.BigNumber.from(
                                        item.principal ?? "0",
                                      ).add(
                                        ethers.BigNumber.from(item.apy ?? "0")
                                          .mul(
                                            ethers.BigNumber.from(
                                              item.principal ?? "0",
                                            ),
                                          )
                                          .mul(
                                            ethers.BigNumber.from(
                                              blockchainTime,
                                            ).sub(
                                              ethers.BigNumber.from(
                                                item.updated ?? "0",
                                              ),
                                            ),
                                          )
                                          .div(
                                            ethers.BigNumber.from(
                                              60 * 60 * 24 * 365,
                                            ),
                                          )
                                          .div(ethers.utils.parseUnits("1", 8)),
                                      ),
                                      6,
                                    )}
                                  </td>
                                  <td className="px-6 py-4 text-sm font-bold">
                                    {fromEthDate(
                                      parseInt(item.timestamp ?? "0", 10),
                                    ).toLocaleString()}
                                  </td>
                                  <td className="px-1 py-4 text-sm font-bold">
                                    <button
                                      type="button"
                                      className="flex items-center justify-center text-shrub-grey-900 bg-white border border-shrub-grey-300 focus:outline-none hover:bg-shrub-grey-100 focus:ring-4 focus:ring-grey-200 font-medium rounded-full text-sm px-5 py-2.5 mb-2 dark:bg-shrub-grey-800 dark:text-white dark:border-shrub-grey-600 dark:hover:bg-shrub-grey-700 dark:hover:border-shrub-grey-600 dark:focus:ring-grey-700"
                                    >
                                      <Image
                                        src="/up-right-arrow.svg"
                                        alt="down arrow"
                                        width={20}
                                        height={20}
                                        className="mr-2"
                                      />
                                      Pay
                                    </button>
                                  </td>
                                </tr>
                              ))}
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
}
