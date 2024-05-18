import {FC, useEffect, useState} from "react";
import Link from "next/link";
import {
  useConnectedWallet,
  useAddress
} from "@thirdweb-dev/react";
import { getBlock } from "@thirdweb-dev/sdk";
import { toEthDate, fromEthDate } from '@shrub-lend/common'
import { chainlinkAggregatorAbi, chainlinkAggregatorAddress, usdcAddress } from '../utils/contracts';
import { ethers } from 'ethers';
import Image from "next/image";
import { secondsInDay} from "@shrub-lend/common";
import {USER_POSITIONS_QUERY, GLOBAL_DATA_QUERY} from "../constants/queries";
import { useLazyQuery } from "@apollo/client";
import {useFinancialData} from "../components/FinancialDataContext";
import Modal from "../components/Modal";
import ExtendDepositView from './modals/ExtendDepositView';
import {durationWad, formatLargeUsdc, formatPercentage, wadMul} from '../utils/ethMethods';
import {BorrowObj, Deposit} from "../types/types";
import ExtendBorrowView from './modals/ExtendBorrowView';
import { oneMonth, sixMonth, threeMonth, twelveMonth, Zero } from '../constants';
import useEthPriceFromChainlink from '../hooks/useEthPriceFromChainlink';
import WithdrawView from './modals/WithdrawView';
const now = new Date();
new Date(new Date(now).setFullYear(now.getFullYear() + 1));
export const DashboardView: FC = ({}) => {

  const wallet = useConnectedWallet();
  const [extendDepositModalOpen, setExtendDepositModalOpen] = useState(false);
  const [extendBorrowModalOpen, setExtendBorrowModalOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const { store, dispatch } = useFinancialData();
  const walletAddress = useAddress();
  const [blockchainTime, setBlockchainTime] = useState(0);
  const [
    getGlobalData,
    {
      loading: globalDataLoading,
      error: globalDataError,
      data: globalData,
      startPolling: globalDataStartPolling,
      stopPolling: globalDataStopPolling,
    }
  ] = useLazyQuery(GLOBAL_DATA_QUERY);
  const [
    getUserPositions,
    {
      loading: userPositionsDataLoading,
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
  const { ethPrice, isLoading, error } = useEthPriceFromChainlink(chainlinkAggregatorAddress, chainlinkAggregatorAbi);
  const [currentHovered, setCurrentHovered] = useState<number | null>(null);
  const [timestamp, setTimestamp] = useState(0);
  const [showAPYSection, setShowAPYSection] = useState(false);
  const [estimatedAPY, setEstimatedAPY] = useState(Zero);
  const [selectedDepositBalance, setSelectedDepositBalance] = useState(Zero);
  const [selectedYieldEarned, setSelectedYieldEarned] = useState(Zero);
  const [selectedDepositTermDate, setSelectedDepositTermDate] = useState<Date | null>(null);
  const [selectedPoolShareTokenAmount, setSelectedPoolShareTokenAmount] = useState(Zero);
  const [selectedTokenSupply, setSelectedTokenSupply] = useState(Zero);
  const [selectedTotalLendingPoolEthYield, setSelectedTotalLendingPoolEthYield] = useState(Zero);
  const [selectedPoolTokenId, setSelectedPoolTokenId] = useState('');
  const [selectedBorrow, setSelectedBorrow] = useState<BorrowObj | undefined>();
  const [lastSnapshotDate, setLastSnapshotDate] = useState(new Date(0))
  const dummyEarningPools = "2";

  useEffect(() => {
    getGlobalData();
  }, []);

  useEffect(() => {
    if (globalData) {
      setLastSnapshotDate(fromEthDate(globalData.globalData.lastSnapshotDate));
    }
  }, [globalDataLoading]);

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

  function calcBorrowInterest(principal: ethers.BigNumber, apy: ethers.BigNumber, startDate: Date) {
    const duration = durationWad(startDate, lastSnapshotDate);
    const interestPerYear = wadMul(apy, principal);
    return wadMul(interestPerYear, duration);
  }

  const handleExtendDeposit = () => {
    setExtendDepositModalOpen(false);
  };

  const handleExtendBorrow = () => {
    setExtendBorrowModalOpen(false);
  };

  const handleWithdraw = () => {
    setWithdrawModalOpen(false);
  };

  /** Might Need Later **/
  // let newlyAddedDeposit = store.deposits.filter(item => item.hasOwnProperty('id'));
  // newlyAddedDeposit = newlyAddedDeposit[0];
  // let calculatedPoolShareTokenAmount = (newlyAddedDeposit.lendingPool.totalPrincipal + newlyAddedDeposit.lendingPool.totalUsdcInterest + newlyAddedDeposit.lendingPool.totalEthYield === 0) ?
  //   newlyAddedDeposit.depositsUsdc * 1e12 :
  //   (newlyAddedDeposit.depositsUsdc * newlyAddedDeposit.lendingPool.tokenSupply) /
  //   (newlyAddedDeposit.lendingPool.totalPrincipal + newlyAddedDeposit.lendingPool.totalUsdcInterest +
  //     (newlyAddedDeposit.lendingPool.totalEthYield * ethPrice));

  console.log(store);

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
                          className="text-shrub-grey-900 mr-2 bg-white border border-shrub-grey-300 focus:outline-none hover:bg-shrub-grey-100 focus:ring-4 focus:ring-grey-200 font-medium rounded-full text-sm px-5 py-2.5  mb-2">Borrow</button>
                      </Link>
                      <Link href="/deposit" passHref>
                        <button
                          type="button"
                          className="text-white bg-shrub-green-500 border border-shrub-grey-300 focus:outline-none focus:ring-4 focus:ring-grey-200 font-medium rounded-full text-sm px-5 py-2.5  mb-2 ">Deposit</button>
                      </Link>
                    </span>
                  </div>
                  {/*withdraw modal*/}
                  <Modal isOpen={withdrawModalOpen} onClose={() => setWithdrawModalOpen(false)} >
                    <WithdrawView
                      selectedDepositBalance={selectedDepositBalance}
                      onModalClose={handleWithdraw}
                      setIsModalOpen={setWithdrawModalOpen}
                      selectedDepositTermDate={selectedDepositTermDate}
                      selectedPoolShareTokenAmount={selectedPoolShareTokenAmount}
                      selectedYieldEarned={selectedYieldEarned}
                     />
                  </Modal>
                  {/*deposit modal*/}
                  <Modal isOpen={extendDepositModalOpen} onClose={() => setExtendDepositModalOpen(false)} >
                    <ExtendDepositView
                      onModalClose={handleExtendDeposit}
                      timestamp={timestamp}
                      selectedDepositBalance={selectedDepositBalance}
                      setIsModalOpen={setExtendDepositModalOpen}
                      setTimestamp={setTimestamp}
                      showAPYSection={showAPYSection}
                      estimatedAPY={estimatedAPY}
                      setShowAPYSection={setShowAPYSection}
                      selectedDepositTermDate={selectedDepositTermDate}
                      selectedPoolShareTokenAmount={selectedPoolShareTokenAmount}
                      selectedTotalLendingPoolEthYield={selectedTotalLendingPoolEthYield}
                      selectedTokenSupply={selectedTokenSupply}
                      selectedPoolTokenId={selectedPoolTokenId}
                    />
                  </Modal>
                  {/*borrow modal*/}
                  <Modal isOpen={extendBorrowModalOpen} onClose={() => setExtendBorrowModalOpen(false)} >
                    <ExtendBorrowView
                      onModalClose={handleExtendBorrow}
                      setIsModalOpen={setExtendBorrowModalOpen}
                      borrow={selectedBorrow}
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
                          <table className="w-full text-left text-shrub-grey  ">
                            <caption className="p-5 text-lg font-semibold text-left rtl:text-right text-shrub-grey-900 bg-white  ">
                              Deposits
                              {/*<span className=" leading-5 inline-block bg-shrub-grey-light3 text-shrub-green-500 text-xs font-medium ml-2 px-2 py-0.5 rounded-full  ">*/}
                              {/*  Total of {dummyEarningPools} Earning Pools*/}
                              {/*</span>*/}
                            </caption>
                            <thead className="text-xs bg-shrub-grey-light  border border-shrub-grey-light2">
                            <tr>
                              <th scope='col' className='px-6 py-3 text-shrub-grey font-medium'>
                                Current Balance
                              </th>
                              <th scope='col' className='px-6 py-3 text-shrub-grey font-medium'>
                                Interest Earned
                              </th>
                              <th scope='col' className='px-6 py-3 text-shrub-grey font-medium'>
                                Net Deposited
                              </th>
                              <th scope='col' className='px-6 py-3 text-shrub-grey font-medium'>
                                APR
                              </th>
                              <th scope='col' className='px-6 py-3 text-shrub-grey font-medium'>
                                Unlock Date
                              </th>
                              <th scope='col' className='px-6 py-3 text-shrub-grey font-medium'></th>
                            </tr>
                            </thead>
                            <tbody className='text-lg'>
                            {store?.deposits?.sort((a, b) => parseInt(a.lendingPool.timestamp) - parseInt(b.lendingPool.timestamp)).map(  // Sort by timestamp before mapping
                                (storeDeposit, index) => {
                                    const depositsUsdcBN = ethers.BigNumber.from(storeDeposit.depositsUsdc ? storeDeposit.depositsUsdc : Zero);
                                    const withdrawsUsdcBN = ethers.BigNumber.from(storeDeposit.withdrawsUsdc ? storeDeposit.withdrawsUsdc : Zero);
                                    const lendingPoolPrincipalBN = ethers.BigNumber.from(storeDeposit.lendingPool.totalPrincipal ? storeDeposit.lendingPool.totalPrincipal : Zero);
                                    const lendingPoolUsdcInterestBN = ethers.BigNumber.from(storeDeposit.lendingPool.totalUsdcInterest ? storeDeposit.lendingPool.totalUsdcInterest : Zero);
                                    const lendingPoolEthYieldBN = ethers.BigNumber.from(storeDeposit.lendingPool.totalEthYield ? storeDeposit.lendingPool.totalEthYield : Zero);
                                    const tokenAmountBN = ethers.BigNumber.from(storeDeposit.amount ? storeDeposit.amount : Zero);
                                    const tokenSupplyBN = ethers.BigNumber.from(storeDeposit.lendingPool.tokenSupply ? storeDeposit.lendingPool.tokenSupply : Zero);
                                    const netDeposits = depositsUsdcBN.sub(withdrawsUsdcBN);
                                    const currentBalance = tokenSupplyBN.eq(Zero) ? Zero :
                                      (
                                        lendingPoolPrincipalBN
                                          .add(lendingPoolUsdcInterestBN)
                                          .add(
                                            ethPrice
                                              .mul(lendingPoolEthYieldBN)
                                              .div(ethers.utils.parseUnits('1', 20)),
                                          )
                                      )
                                        .mul(tokenAmountBN)
                                        .div(tokenSupplyBN);
                                    const interestEarned = currentBalance.sub(netDeposits);
                                    const yieldEarned = lendingPoolEthYieldBN.mul(tokenAmountBN).div(tokenSupplyBN) //Eth yield belonging to a deposit
                                    return (
                                  <tr key={`earnRow-${index}`} className="bg-white border-b  ">
                                    <td className="px-6 py-4 text-sm font-bold">
                                      {wallet ? (
                                        <p>{" "}<Image src="/usdc-logo.svg" alt="usdc logo" className="w-6 mr-2 inline align-middle" width="40" height="40"/>
                                          {storeDeposit.currentBalanceOverride ? formatLargeUsdc(storeDeposit.currentBalanceOverride) : formatLargeUsdc(currentBalance)} USDC
                                          {storeDeposit.status === 'pending' && (
                                            <span className=" ml-2 inline-flex items-center bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full  "><span className="w-2 h-2 me-1 bg-yellow-500 rounded-full"></span>Pending</span>
                                          )}
                                          {storeDeposit.status === 'failed' && (
                                            <span className=" ml-2 inline-flex items-center bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full  "><span className="w-2 h-2 me-1 bg-red-500 rounded-full"></span>Failed</span>
                                          )}
                                            {storeDeposit.status === 'confirmed' && (
                                                <span className=" ml-2 inline-flex items-center bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full  "><span className="w-2 h-2 me-1 bg-green-500 rounded-full"></span>Confirmed</span>
                                            )}
                                            {storeDeposit.status === 'extending' && (
                                                <span className=" ml-2 inline-flex items-center bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-0.5 rounded-full  "><span className="w-2 h-2 me-1 bg-amber-500 rounded-full"></span>Extending</span>
                                            )}
                                            {storeDeposit.status === 'extended' && (
                                                <span className=" ml-2 inline-flex items-center bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full  "><span className="w-2 h-2 me-1 bg-blue-500 rounded-full"></span>Extended</span>
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
                                          storeDeposit.interestEarnedOverride ? formatLargeUsdc(storeDeposit.interestEarnedOverride) : formatLargeUsdc(interestEarned)
                                      }
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold">
                                      {formatLargeUsdc(netDeposits)}{" "} USDC
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold">
                                      <span className="bg-green-100 text-green-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-full  ">
                                        {(storeDeposit.apy)?storeDeposit.apy :"X"}%
                                      </span>
                                    </td>
                                    <td className='px-6 py-4 text-sm font-bold'>
                                      {fromEthDate(parseInt(storeDeposit.lendingPool.timestamp)).toLocaleString()}
                                    </td>
                                    <td className="px-1 py-4 text-sm font-bold">
                                      <div className='flex items-center justify-center space-x-2 h-full p-2'>
                                        <button type='button'
                                                style={{ visibility: storeDeposit.amount && !['extending', 'extended', 'failed'].includes(storeDeposit.status) ? 'visible' : 'hidden' }}
                                                className='text-shrub-grey-900 bg-white border border-shrub-grey-300 focus:outline-none hover:bg-shrub-green-500 hover:text-white focus:ring-4 focus:ring-grey-200 font-medium rounded-full text-sm px-5 py-2.5 disabled:bg-shrub-grey-50 disabled:text-white disabled:border disabled:border-shrub-grey-100      '
                                                disabled={fromEthDate(parseInt(storeDeposit.lendingPool.timestamp)).getTime() === store.activePoolTimestamps[store.activePoolTimestamps.length - 1].getTime()}
                                                onClick={() => {
                                                  setExtendDepositModalOpen(true);
                                                  setSelectedDepositBalance(currentBalance);
                                                  setSelectedDepositTermDate(fromEthDate(parseInt(storeDeposit.lendingPool.timestamp)));
                                                  setSelectedPoolShareTokenAmount(tokenAmountBN);
                                                  setSelectedTokenSupply(tokenSupplyBN);
                                                  setSelectedTotalLendingPoolEthYield(lendingPoolEthYieldBN);
                                                  setSelectedPoolTokenId(storeDeposit.lendingPool.id);
                                                }}>
                                          {/*Corresponding modal at the top*/}
                                          Extend
                                        </button>
                                        {!storeDeposit.lendingPool.finalized ?
                                        <a onMouseOver={() => setCurrentHovered(index)}
                                           onMouseOut={() => setCurrentHovered(null)} href='https://app.uniswap.org/'
                                           target='_blank' type='button'
                                           className='flex items-center justify-center text-shrub-grey-900 bg-white border border-shrub-grey-300 focus:outline-none hover:bg-shrub-green-500 hover:text-white focus:ring-4 focus:ring-grey-200 font-medium rounded-full text-sm px-5 py-2.5      '>{currentHovered === index ?
                                          <Image src='/up-right-arrow-light.svg' alt='down arrow' width={20} height={20}
                                                 className='mr-2' /> :
                                          <Image src='/up-right-arrow.svg' alt='down arrow' width={20} height={20}
                                                 className='mr-2' />} Trade</a>
                                       :
                                          <button type='button'
                                                  style={{ visibility: storeDeposit.tempData || storeDeposit.status  ? 'hidden' : 'visible' }}
                                                className='text-shrub-grey-900 bg-white border border-shrub-grey-300 focus:outline-none hover:bg-shrub-green-500 hover:text-white focus:ring-4 focus:ring-grey-200 font-medium rounded-full text-sm px-5 py-2.5 disabled:bg-shrub-grey-50 disabled:text-white disabled:border disabled:border-shrub-grey-100      '
                                                // disabled={}
                                                onClick={() => {
                                                  setWithdrawModalOpen(true);
                                                  setSelectedDepositBalance(currentBalance)
                                                  setSelectedDepositTermDate(fromEthDate(parseInt(storeDeposit.lendingPool.timestamp)))
                                                  setSelectedPoolShareTokenAmount(tokenAmountBN)
                                                  setSelectedYieldEarned(yieldEarned)

                                                }}>
                                          {/*Corresponding modal at the top*/}
                                          Withdraw
                                        </button>
                                         }
                                      </div>
                                    </td>
                                  </tr>
                                    )
                                }
                            )}
                            </tbody>
                          </table>
                        </div>
                      </li>
                      <li className='mr-4'>
                        <div className='relative overflow-x-auto border rounded-2xl'>
                          <table className='w-full text-left text-shrub-grey  '>
                            <caption
                              className='p-5 text-lg font-semibold text-left rtl:text-right text-shrub-grey-900 bg-white  '>
                              Borrows
                            </caption>
                            <thead
                              className='text-xs bg-shrub-grey-light  border border-shrub-grey-light2'>
                            <tr>
                              <th scope='col' className='px-6 py-3 text-shrub-grey font-medium'>Current Balance</th>

                              <th scope='col' className='px-6 py-3 text-shrub-grey font-medium'>
                                Amount Paid Back
                              </th>
                              <th scope='col' className='px-6 py-3 text-shrub-grey font-medium'>
                                Time until due date (days)
                              </th>
                              <th scope='col' className='px-6 py-3 text-shrub-grey font-medium'>
                                APR
                              </th>
                              <th scope='col' className='px-6 py-3 text-shrub-grey font-medium'>Amount Borrowed</th>
                              <th scope='col' className='px-6 py-3 text-shrub-grey font-medium'>
                                Due Date
                              </th>
                            </tr>
                            </thead>
                            <tbody className="text-lg">
                              {store?.borrows?.map((storeBorrow, index) => {
                                const principal = ethers.BigNumber.from(storeBorrow.principal);
                                const apy = ethers.BigNumber.from(storeBorrow.apy);
                                const startDate = fromEthDate(storeBorrow.startDate);
                                const interest = calcBorrowInterest(principal, apy, startDate);
                                const borrow: BorrowObj = {
                                    id: isNaN(Number(storeBorrow.id)) ? storeBorrow.id : ethers.BigNumber.from(storeBorrow.id),
                                    endDate: fromEthDate(parseInt(storeBorrow.timestamp, 10)),
                                    startDate,
                                    created: fromEthDate(storeBorrow.created),
                                    updated: fromEthDate(storeBorrow.updated),
                                    collateral: ethers.BigNumber.from(storeBorrow.collateral),
                                    principal,
                                    originalPrincipal: ethers.BigNumber.from(storeBorrow.originalPrincipal),
                                    paid: ethers.BigNumber.from(storeBorrow.paid),
                                    ltv: ethers.BigNumber.from(storeBorrow.ltv),
                                    apy,
                                    interest,
                                    debt: principal.add(interest)
                                };
                                const timeLeft = daysFromNow(borrow.endDate);

                                return (
                                <tr
                                  key={`borrowRow-${index}`}
                                  className="bg-white border-b  "
                                >
                                  <td className="px-6 py-4 text-sm font-bold">
                                    {wallet ? (
                                      <p>
                                        {" "}<Image src="/usdc-logo.svg" alt="usdc logo" className="w-6 mr-2 inline align-middle" width="40" height="40"/>
                                        {formatLargeUsdc(borrow.debt)} USDC
                                        {storeBorrow.status === 'pending' && (
                                          <span className=" ml-2 inline-flex items-center bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full  "><span className="w-2 h-2 me-1 bg-yellow-500 rounded-full"></span>Pending</span>
                                        )}
                                        {storeBorrow.status === 'failed' && (
                                          <span className=" ml-2 inline-flex items-center bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full  "><span className="w-2 h-2 me-1 bg-red-500 rounded-full"></span>Failed</span>
                                        )}
                                        {storeBorrow.status === 'confirmed' && (
                                          <span className=" ml-2 inline-flex items-center bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full  "><span className="w-2 h-2 me-1 bg-green-500 rounded-full"></span>Confirmed</span>
                                        )}
                                        {storeBorrow.status === 'extending' && (
                                          <span className=" ml-2 inline-flex items-center bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-0.5 rounded-full  "><span className="w-2 h-2 me-1 bg-amber-500 rounded-full"></span>Extending</span>
                                        )}
                                        {storeBorrow.status === 'extended' && (
                                          <span className=" ml-2 inline-flex items-center bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full  "><span className="w-2 h-2 me-1 bg-blue-500 rounded-full"></span>Extended</span>
                                        )}
                                      </p>
                                    ) : (
                                      <p className="text-sm">
                                        Loading ETH balance...
                                      </p>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 text-sm font-bold">
                                    {formatLargeUsdc(borrow.paid)}
                                  </td>
                                  <td className="px-6 py-4 text-sm font-bold">
                                    {timeLeft}
                                  </td>
                                  <td>
                                    <span className="bg-green-100 text-green-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-full  ">{`${formatPercentage(borrow.apy)}%`}</span>
                                  </td>
                                  <td className="px-6 py-4 text-sm font-bold">
                                    {formatLargeUsdc(borrow.originalPrincipal)} USDC
                                  </td>
                                  <td className="px-6 py-4 text-sm font-bold">
                                    {borrow.endDate.toLocaleString()}
                                  </td>
                                  <td className="px-1 py-4 text-sm font-bold">
                                    <div className="flex items-center justify-center space-x-2 h-full p-2">
                                      <button type="button"
                                              style={{ visibility: storeBorrow.tempData || storeBorrow.status  ? 'hidden' : 'visible' }}
                                              className="text-shrub-grey-900 bg-white border border-shrub-grey-300 focus:outline-none hover:bg-shrub-green-500 hover:text-white focus:ring-4 focus:ring-grey-200 font-medium rounded-full text-sm px-5 py-2.5 disabled:bg-shrub-grey-50 disabled:text-white disabled:border disabled:border-shrub-grey-100"
                                              disabled={store.activePoolTimestamps[store.activePoolTimestamps.length - 1].getTime() === borrow.endDate.getTime()}
                                              onClick={() => {
                                                setExtendBorrowModalOpen(true);
                                                setSelectedBorrow(borrow);
                                              }}>
                                        {/*Corresponding modal at the top*/}
                                        Extend
                                      </button>
                                      <button type="button"
                                              style={{ visibility: storeBorrow.tempData || storeBorrow.status  ? 'hidden' : 'visible' }}
                                              className="flex items-center justify-center text-shrub-grey-900 bg-white border border-shrub-grey-300 focus:outline-none hover:bg-shrub-grey-100 focus:ring-4 focus:ring-grey-200 font-medium rounded-full text-sm px-5 py-2.5      ">
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
};
