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
import { toEthDate, fromEthDate } from '@shrub-lend/common'
import {
  usdcAddress,
  chainlinkAggregatorAbi,
  chainlinkAggregatorAddress,
} from "../utils/contracts";
import { ethers } from 'ethers';
import Image from "next/image";
import { secondsInDay} from "@shrub-lend/common";
import { USER_POSITIONS_QUERY } from "../constants/queries";
import { useLazyQuery } from "@apollo/client";
import {useFinancialData} from "../components/FinancialDataContext";
import Modal from "../components/Modal";
import ExtendDepositView from './extend/ExtendDepositView';
import { formatLargeUsdc } from '../utils/ethMethods';
import {Deposit} from "../types/types";
import ExtendBorrowView from './extend/ExtendBorrowView';
import { depositTerms, oneMonth, sixMonth, threeMonth, twelveMonth } from '../constants';

const now = new Date();
const Zero = ethers.constants.Zero;
new Date(new Date(now).setFullYear(now.getFullYear() + 1));
export const DashboardView: FC = ({}) => {

  const wallet = useConnectedWallet();
  const [extendDepositModalOpen, setExtendDepositModalOpen] = useState(false);
  const [extendBorrowModalOpen, setExtendBorrowModalOpen] = useState(false);
  const { store, dispatch } = useFinancialData();
  const { data: usdcBalance, isLoading: usdcBalanceIsLoading } = useBalance(usdcAddress);
  const { data: ethBalance, isLoading: ethBalanceIsLoading } = useBalance(NATIVE_TOKEN_ADDRESS);
  const walletAddress = useAddress();
  const [ethPrice, setEthPrice] = useState(ethers.BigNumber.from(0));
  const [blockchainTime, setBlockchainTime] = useState(0);
  // const [extendDepositProps, setExtendDepositProps] = useState({})
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
  const [estimatedAPY, setEstimatedAPY] = useState(Zero);
  const [selectedDepositBalance, setSelectedDepositBalance] = useState(Zero);
  const [selectedDepositTermDate, setSelectedDepositTermDate] = useState<Date | null>(null);
  const [selectedPoolShareTokenAmount, setSelectedPoolShareTokenAmount] = useState(Zero);
  const [selectedTokenSupply, setSelectedTokenSupply] = useState(Zero);
  const [selectedTotalEthYield, setSelectedTotalEthYield] = useState(Zero);
  const [selectedPoolTokenId, setSelectedPoolTokenId] = useState('')
  const [selectedBorrowAmount, setSelectedBorrowAmount] = useState(Zero)
  const dummyEarningPools = "2";

  useEffect(() => {
    const handleAPYCalc = () => {
      const apyGenerated = timestamp === oneMonth.getTime() / 1000 ? 7.56 :
        timestamp === threeMonth.getTime() / 1000 ? 8.14 :
          timestamp === sixMonth.getTime() / 1000 ? 9.04 :
            timestamp === twelveMonth.getTime() / 1000 ? 10.37 : Math.random() * 5 + 7;
      // setEstimatedAPY(apyGenerated.toFixed(2).toString());
        setEstimatedAPY(ethers.utils.parseUnits(apyGenerated.toFixed(2),2));
    };

    if (timestamp) {
      handleAPYCalc();
    }
  }, [timestamp]);
  useEffect(() => {
    // console.log("running usdc useEffect");
  }, [usdcBalanceIsLoading]);
  useEffect(() => {
    // console.log("running eth useEffect");
  }, [ethBalanceIsLoading]);
  useEffect(() => {
    // console.log("running walletAddress useEffect");
    if (!walletAddress) {return}
    getUserPositions();
  }, [walletAddress, getUserPositions]);
  useEffect(() => {
    // console.log("running userPositionsDataLoading useEffect");
    if (userPositionsDataLoading) {return}
  }, [userPositionsDataLoading]);
  useEffect(() => {
    // Once data is loaded, update the store
    if (!userPositionsDataLoading && userPositionsData && userPositionsData.user) {
      const { borrows, deposits } = userPositionsData.user;
      const tempDeposits: Deposit[] = deposits.map((deposit) => {
          return {
              ...deposit,
              id: deposit.lendingPool.id
          }
      });
      dispatch({
        type: "SET_USER_DATA",
        payload: {
          borrows,
          deposits: tempDeposits,
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

  const handleExtendDeposit = () => {
    setExtendDepositModalOpen(false);
  };

  const handleExtendBorrow = () => {
    setExtendBorrowModalOpen(false);
  };


  /** Might Need Later **/
  // let newlyAddedDeposit = store.deposits.filter(item => item.hasOwnProperty('id'));
  // newlyAddedDeposit = newlyAddedDeposit[0];
  // let calculatedPoolShareTokenAmount = (newlyAddedDeposit?.lendingPool?.totalPrincipal + newlyAddedDeposit?.lendingPool?.totalUsdcInterest + newlyAddedDeposit?.lendingPool?.totalEthYield === 0) ?
  //   newlyAddedDeposit?.depositsUsdc * 1e12 :
  //   (newlyAddedDeposit?.depositsUsdc * newlyAddedDeposit?.lendingPool?.tokenSupply) /
  //   (newlyAddedDeposit?.lendingPool?.totalPrincipal + newlyAddedDeposit?.lendingPool?.totalUsdcInterest +
  //     (newlyAddedDeposit?.lendingPool?.totalEthYield * ethPrice));

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
                      <h1 className=" text-[36px] font-semibold self-start leading-9">Dashboard</h1>
                    </span>
                    <span className="w-[500px]"></span>
                    <span>
                      <Link href="/borrow" passHref>
                        <button
                          type="button"
                          className="text-shrub-grey-900 mr-2 bg-white border border-shrub-grey-300 focus:outline-none hover:bg-shrub-grey-100 focus:ring-4 focus:ring-grey-200 font-medium rounded-full text-sm px-5 py-2.5  mb-2 dark:bg-shrub-grey-800 dark:text-white dark:border-shrub-grey-600 dark:hover:bg-shrub-grey-700 dark:hover:border-shrub-grey-600 dark:focus:ring-grey-700">Borrow</button>
                      </Link>
                      <Link href="/lend" passHref>
                        <button
                          type="button"
                          className="text-white bg-shrub-green-500 border border-shrub-grey-300 focus:outline-none focus:ring-4 focus:ring-grey-200 font-medium rounded-full text-sm px-5 py-2.5  mb-2 dark:bg-shrub-grey-800 dark:text-white dark:border-shrub-grey-600  dark:focus:ring-grey-700">Lend</button>
                      </Link>
                    </span>
                  </div>

                  <Modal isOpen={extendDepositModalOpen} onClose={() => setExtendDepositModalOpen(false)} >
                    <ExtendDepositView
                      onModalClose={handleExtendDeposit}
                      depositTerms={depositTerms}
                      timestamp={timestamp}
                      selectedDepositBalance={selectedDepositBalance}
                      setIsModalOpen={setExtendDepositModalOpen}
                      setTimestamp={setTimestamp}
                      showAPYSection={showAPYSection}
                      estimatedAPY={estimatedAPY}
                      setShowAPYSection={setShowAPYSection}
                      selectedDepositTermDate={selectedDepositTermDate}
                      selectedPoolShareTokenAmount={selectedPoolShareTokenAmount}
                      selectedTotalEthYield={selectedTotalEthYield}
                      selectedTokenSupply={selectedTokenSupply}
                      selectedPoolTokenId={selectedPoolTokenId}
                    />
                  </Modal>
                  <Modal isOpen={extendBorrowModalOpen} onClose={() => setExtendBorrowModalOpen(false)} >
                    <ExtendBorrowView
                      onModalClose={handleExtendBorrow}
                      setIsModalOpen={setExtendBorrowModalOpen}
                      selectedBorrowAmount={selectedBorrowAmount}
                    />
                  </Modal>

                  <div className="card w-full py-4">
                    <span className="text-left">
                      <h3 className="font-normal  pb-5 text-shrub-grey">
                        {" "}
                        Welcome back, ryan.eth!
                      </h3>
                      ETH Price:{" "}
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
                                  Net Deposited
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
                              {store?.deposits?.sort((a,b) => parseInt(a.lendingPool.timestamp) - parseInt(b.lendingPool.timestamp)).map(  // Sort by timestamp before mapping
                                (item, index) => {
                                    const depositsUsdcBN = ethers.BigNumber.from(item.depositsUsdc ? item.depositsUsdc : Zero);
                                    const withdrawsUsdcBN = ethers.BigNumber.from(item.withdrawsUsdc ? item.withdrawsUsdc : Zero);
                                    const lendingPoolPrincipalBN = ethers.BigNumber.from(item.lendingPool.totalPrincipal ? item.lendingPool.totalPrincipal : Zero);
                                    const lendingPoolUsdcInterestBN = ethers.BigNumber.from(item.lendingPool.totalUsdcInterest ? item.lendingPool.totalUsdcInterest : Zero);
                                    const lendingPoolEthYieldBN = ethers.BigNumber.from(item.lendingPool.totalEthYield ? item.lendingPool.totalEthYield : Zero);
                                    const tokenAmountBN = ethers.BigNumber.from(item.amount ? item.amount : Zero);
                                    const tokenSupplyBN = ethers.BigNumber.from(item.lendingPool.tokenSupply ? item.lendingPool.tokenSupply : Zero);
                                    const netDeposits = depositsUsdcBN.sub(withdrawsUsdcBN);
                                    const currentBalance = tokenSupplyBN.eq(Zero) ? Zero :
                                    (
                                        lendingPoolPrincipalBN
                                            .add(lendingPoolUsdcInterestBN)
                                            .add(
                                                ethPrice
                                                    .mul(lendingPoolEthYieldBN)
                                                    .div(ethers.utils.parseUnits("1", 20))
                                            )
                                    )
                                        .mul(tokenAmountBN)
                                        .div(tokenSupplyBN);
                                    const interestEarned = currentBalance.sub(netDeposits);
                                    return (
                                  <tr key={`earnRow-${index}`} className="bg-white border-b dark:bg-shrub-grey-800 dark:border-shrub-grey-700">
                                    <td className="px-6 py-4 text-sm font-bold">
                                      {wallet && !ethBalanceIsLoading ? (
                                        <p>{" "}<Image src="/usdc-logo.svg" alt="usdc logo" className="w-6 mr-2 inline align-middle" width="40" height="40"/>
                                          {formatLargeUsdc(netDeposits)}{" "} USDC
                                          {item.status === 'pending' && (
                                            <span className=" ml-2 inline-flex items-center bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-yellow-900 dark:text-yellow-300"><span className="w-2 h-2 me-1 bg-yellow-500 rounded-full"></span>Pending</span>
                                          )}
                                          {item.status === 'failed' && (
                                            <span className=" ml-2 inline-flex items-center bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-red-900 dark:text-red-300"><span className="w-2 h-2 me-1 bg-red-500 rounded-full"></span>Failed</span>
                                          )}
                                            {item.status === 'confirmed' && (
                                                <span className=" ml-2 inline-flex items-center bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-green-900 dark:text-green-300"><span className="w-2 h-2 me-1 bg-green-500 rounded-full"></span>Confirmed</span>
                                            )}
                                            {item.status === 'extending' && (
                                                <span className=" ml-2 inline-flex items-center bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-amber-900 dark:text-amber-300"><span className="w-2 h-2 me-1 bg-amber-500 rounded-full"></span>Extending</span>
                                            )}
                                            {item.status === 'extended' && (
                                                <span className=" ml-2 inline-flex items-center bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-300"><span className="w-2 h-2 me-1 bg-blue-500 rounded-full"></span>Extended</span>
                                            )}
                                        </p>
                                      ) : (
                                        <p className="text-sm">
                                          Loading ETH balance...
                                        </p>
                                      )}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold">
                                      {
                                          item.interestEarnedOverride ?
                                              formatLargeUsdc(item.interestEarnedOverride) :
                                              formatLargeUsdc(interestEarned)
                                      }
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold">
                                      {
                                          item.currentBalanceOverride ?
                                              formatLargeUsdc(item.currentBalanceOverride) :
                                              formatLargeUsdc(currentBalance)
                                      }
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold">
                                      <span className="bg-green-100 text-green-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-full dark:bg-green-900 dark:text-green-300">
                                        {(item.apy)?item.apy :"X"}%
                                      </span>
                                    </td>
                                    <td className='px-6 py-4 text-sm font-bold'>
                                      {fromEthDate(parseInt(item.lendingPool.timestamp)).toLocaleString()}
                                    </td>
                                    <td className="px-1 py-4 text-sm font-bold">
                                      <div className="flex items-center justify-center space-x-2 h-full p-2">
                                          <button type="button" style={{ visibility: item.amount && !['extending', 'extended', 'failed'].includes(item.status) ? 'visible' : 'hidden' }} className="text-shrub-grey-900 bg-white border border-shrub-grey-300 focus:outline-none hover:bg-shrub-green-500 hover:text-white focus:ring-4 focus:ring-grey-200 font-medium rounded-full text-sm px-5 py-2.5 disabled:bg-shrub-grey-50 disabled:text-white disabled:border disabled:border-shrub-grey-100 dark:bg-shrub-grey-700 dark:text-white dark:border-shrub-grey-50 dark:hover:bg-shrub-grey-700 dark:hover:border-shrub-grey-700 dark:focus:ring-grey-700"
                                          disabled={fromEthDate(parseInt(item.lendingPool.timestamp)).getTime() === twelveMonth.getTime()}
                                         onClick={() => {
                                          setExtendDepositModalOpen(true)
                                          setSelectedDepositBalance(currentBalance)
                                          setSelectedDepositTermDate(fromEthDate(parseInt(item.lendingPool.timestamp)))
                                          setSelectedPoolShareTokenAmount(tokenAmountBN)
                                          setSelectedTokenSupply(tokenSupplyBN)
                                          setSelectedTotalEthYield(lendingPoolEthYieldBN)
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
                                )}
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
                              {store?.borrows?.map((item, index) => {
                                const amountBorrowedBN = ethers.BigNumber.from(item.originalPrincipal ? item.originalPrincipal : Zero)
                                const amountPaidBackBN = ethers.BigNumber.from(item.paid ? item.paid : Zero)
                                const timeLeftBN = daysFromNow(fromEthDate(parseInt(item.timestamp ?? "0", 10)),)
                                const apyBN = ethers.utils.formatUnits(item.apy ?? "0",2,)
                                const currentBalanceBN = formatLargeUsdc(
                                ethers.BigNumber.from(item.principal ?? "0",)
                                .add(ethers.BigNumber.from(item.apy ?? "0")
                                .mul(ethers.BigNumber.from(item.principal ?? "0",),)
                                .mul(ethers.BigNumber.from(blockchainTime,)
                                .sub(ethers.BigNumber.from(item.updated ?? "0",),),)
                                .div(ethers.BigNumber.from(60 * 60 * 24 * 365,),)
                                .div(ethers.utils.parseUnits("1", 8)),))
                                const dueDateBN = fromEthDate(parseInt(item.timestamp ?? "0", 10),).toLocaleString()

                                return (
                                <tr
                                  key={`borrowRow-${index}`}
                                  className="bg-white border-b dark:bg-shrub-grey-800 dark:border-shrub-grey-700"
                                >
                                  <td className="px-6 py-4 text-sm font-bold">
                                    {wallet && !ethBalanceIsLoading ? (
                                      <p>
                                        {" "}<Image src="/usdc-logo.svg" alt="usdc logo" className="w-6 mr-2 inline align-middle" width="40" height="40"/>
                                        {formatLargeUsdc(amountBorrowedBN)}{" "}USDC
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
                                    {formatLargeUsdc(amountPaidBackBN)}
                                  </td>
                                  <td className="px-6 py-4 text-sm font-bold">
                                    {timeLeftBN}
                                  </td>
                                  <td>
                                    <span className="bg-green-100 text-green-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-full dark:bg-green-900 dark:text-green-300">{`${apyBN}%`}</span>
                                  </td>
                                  <td className="px-6 py-4 text-sm font-bold">
                                    {currentBalanceBN}
                                  </td>
                                  <td className="px-6 py-4 text-sm font-bold">
                                    {dueDateBN}
                                  </td>
                                  <td className="px-1 py-4 text-sm font-bold">
                                    <div className="flex items-center justify-center space-x-2 h-full p-2">
                                      <button type="button"
                                              className="text-shrub-grey-900 bg-white border border-shrub-grey-300 focus:outline-none hover:bg-shrub-green-500 hover:text-white focus:ring-4 focus:ring-grey-200 font-medium rounded-full text-sm px-5 py-2.5 disabled:bg-shrub-grey-50 disabled:text-white disabled:border disabled:border-shrub-grey-100 dark:bg-shrub-grey-700 dark:text-white dark:border-shrub-grey-50 dark:hover:bg-shrub-grey-700 dark:hover:border-shrub-grey-700 dark:focus:ring-grey-700"
                                              onClick={() => {
                                                setExtendBorrowModalOpen(true)
                                                setSelectedBorrowAmount(amountBorrowedBN)
                                              }}>
                                        {/*Corresponding modal at the top*/}
                                        Extend
                                      </button>
                                      <button type="button"
                                              className="flex items-center justify-center text-shrub-grey-900 bg-white border border-shrub-grey-300 focus:outline-none hover:bg-shrub-grey-100 focus:ring-4 focus:ring-grey-200 font-medium rounded-full text-sm px-5 py-2.5 dark:bg-shrub-grey-800 dark:text-white dark:border-shrub-grey-600 dark:hover:bg-shrub-grey-700 dark:hover:border-shrub-grey-600 dark:focus:ring-grey-700">
                                        Repay
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                                )})}
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
