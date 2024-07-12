import React, {FC, useEffect, useState} from "react";
import Link from "next/link";
import {
  useConnectedWallet,
  useAddress
} from "@thirdweb-dev/react";
import { getBlock } from "@thirdweb-dev/sdk";
import { toEthDate, fromEthDate } from '@shrub-lend/common'
import { getContractAbis, getContractAddresses } from '../utils/contracts';
import { ethers } from 'ethers';
import Image from "next/image";
import { secondsInDay} from "@shrub-lend/common";
import {GLOBAL_DATA_QUERY} from "../constants/queries";
import {useQuery} from "@apollo/client";
import {getUserData, useFinancialData} from "../components/FinancialDataContext";
import Modal from "../components/Modal";
import ExtendDepositView from './modals/ExtendDepositView';
import {
  durationWad,
  ethInUsdc,
  formatLargeUsdc,
  formatPercentage, formatWad, percentMul,
  wadDiv,
  wadMul,
} from '../utils/ethMethods';
import {BorrowObj, DepositObj} from "../types/types";
import ExtendBorrowView from './modals/ExtendBorrowView';
import {
  EARLY_REPAYMENT_APY,
  EARLY_REPAYMENT_THRESHOLD,
  LENDING_POOL_UNLOCK_BUFFER,
  oneMonth,
  sixMonth,
  threeMonth,
  twelveMonth,
  Zero
} from '../constants';
import useEthPriceFromChainlink from '../hooks/useEthPriceFromChainlink';
import WithdrawView from './modals/WithdrawView';
import RepayView from './modals/RepayView';
import {UserHistoryView} from "./user-history/UserHistoryView";
import {getChainInfo} from "../utils/chains";
import Tooltip from '../components/Tooltip';
export const DashboardView: FC = ({}) => {
  const { chainId } = getChainInfo();
  const {chainlinkAggregatorAddress} = getContractAddresses(chainId);
  const {chainlinkAggregatorAbi} = getContractAbis(chainId);

  const wallet = useConnectedWallet();
  const [extendDepositModalOpen, setExtendDepositModalOpen] = useState(false);
  const [extendBorrowModalOpen, setExtendBorrowModalOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const { store } = useFinancialData();
  const walletAddress = useAddress();
  const [blockchainTime, setBlockchainTime] = useState(0);
  const {
      loading: globalDataLoading,
      error: globalDataError,
      data: globalData,
      startPolling: globalDataStartPolling,
      stopPolling: globalDataStopPolling,
    } = useQuery(GLOBAL_DATA_QUERY);
  const { ethPrice, isLoading, error } = useEthPriceFromChainlink(chainlinkAggregatorAddress, chainlinkAggregatorAbi);
  const [currentHovered, setCurrentHovered] = useState<number | null>(null);
  const [timestamp, setTimestamp] = useState(0);
  const [showAPYSection, setShowAPYSection] = useState(false);
  const [estimatedAPY, setEstimatedAPY] = useState(Zero);
  const [selectedDeposit, setSelectedDeposit] = useState<DepositObj | undefined>()
  const [selectedBorrow, setSelectedBorrow] = useState<BorrowObj | undefined>();
  const [lastSnapshotDate, setLastSnapshotDate] = useState(new Date(0));
  const [repayModalOpen, setRepayModalOpen] = useState(false);
  const [selectedBorrowForRepay, setSelectedBorrowForRepay] = useState<BorrowObj | undefined>();
  const handleRepay = () => {
    setRepayModalOpen(false);
  };

  useEffect(() => {
    if (globalData) {
      setLastSnapshotDate(fromEthDate(globalData.globalData.lastSnapshotDate));
    }
  }, [globalData]);

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
        // console.log('running block useEffect')
    if (walletAddress && process.env.NEXT_PUBLIC_CHAIN_NAME === 'localhost') {
      getBlockTest()
    }
  }, [walletAddress]);

  useEffect(() => {
    console.log(store);
  }, [store]);

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
    if(duration.lte(Zero)) {
      return Zero;
    }
    const interestPerYear = percentMul(principal, apy);
    return wadMul(interestPerYear, duration);
  }

  function calcEarlyRepaymentFee(originalPrincipal: ethers.BigNumber, borrowEndDate: Date, lastSnapshotDate: Date) {
    const thresholdDate = new Date(borrowEndDate);
    thresholdDate.setUTCMilliseconds(thresholdDate.getUTCMilliseconds() - EARLY_REPAYMENT_THRESHOLD);
    if (lastSnapshotDate >= thresholdDate) {
      return Zero;
    }
    const feeDuration = durationWad(lastSnapshotDate, thresholdDate);
    const feePerYear = percentMul(originalPrincipal, EARLY_REPAYMENT_APY);
    return wadMul(feeDuration, feePerYear);
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


  return (
    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col ">
        <div className="relative group mt-4 w-full bg-shrub-grey-light rounded-3xl">
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
                  {/* repay modal */}
                  <Modal isOpen={repayModalOpen} onClose={() => setRepayModalOpen(false)} >
                    <RepayView
                      borrow={selectedBorrowForRepay}
                      onModalClose={handleRepay}
                      setIsModalOpen={setRepayModalOpen}
                    />
                  </Modal>
                  {/*withdraw modal*/}
                  <Modal isOpen={withdrawModalOpen} onClose={() => setWithdrawModalOpen(false)} >
                    <WithdrawView
                      deposit={selectedDeposit}
                      onModalClose={handleWithdraw}
                      setIsModalOpen={setWithdrawModalOpen}
                     />
                  </Modal>
                  {/*deposit modal*/}
                  <Modal isOpen={extendDepositModalOpen} onClose={() => setExtendDepositModalOpen(false)} >
                    <ExtendDepositView
                      deposit={selectedDeposit}
                      onModalClose={handleExtendDeposit}
                      timestamp={timestamp}
                      setIsModalOpen={setExtendDepositModalOpen}
                      setTimestamp={setTimestamp}
                      showAPYSection={showAPYSection}
                      estimatedAPY={estimatedAPY}
                      setShowAPYSection={setShowAPYSection}
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
                        Welcome back, john.eth!
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
                            {/*Making a copy of store so that it can be sorted (store is read-only)*/}
                            {[...getUserData(store, walletAddress).deposits].sort((a, b) => parseInt(a.lendingPool.timestamp) - parseInt(b.lendingPool.timestamp)).map(  // Sort by timestamp before mapping
                                (storeDeposit, index) => {
                                  let lendingPoolTokenSupply: ethers.BigNumber;
                                  let lendingPoolTokenAmount: ethers.BigNumber;
                                  let positionEthYield: ethers.BigNumber;
                                  let positionUsdcInterest: ethers.BigNumber;
                                  let positionPrincipal: ethers.BigNumber;
                                  if (storeDeposit.amount && storeDeposit.lendingPool.tokenSupply) {
                                    lendingPoolTokenSupply = ethers.BigNumber.from(storeDeposit.lendingPool.tokenSupply);
                                    lendingPoolTokenAmount = ethers.BigNumber.from(storeDeposit.amount);
                                    positionEthYield = wadDiv(
                                      wadMul(ethers.BigNumber.from(storeDeposit.lendingPool.totalEthYield), lendingPoolTokenAmount),
                                      lendingPoolTokenSupply
                                    );
                                    positionUsdcInterest = wadDiv(
                                      wadMul(ethers.BigNumber.from(storeDeposit.lendingPool.totalUsdcInterest), lendingPoolTokenAmount),
                                      lendingPoolTokenSupply
                                    );
                                    positionPrincipal = wadDiv(
                                      wadMul(ethers.BigNumber.from(storeDeposit.lendingPool.totalPrincipal), lendingPoolTokenAmount),
                                      lendingPoolTokenSupply
                                    );
                                  }
                                  const deposit: DepositObj = {
                                    id: storeDeposit.id,
                                    endDate: fromEthDate(Number(storeDeposit.lendingPool.timestamp)),
                                    // updated: fromEthDate(storeDeposit.updated),
                                    depositsUsdc: storeDeposit.depositsUsdc ? ethers.BigNumber.from(storeDeposit.depositsUsdc) : Zero,
                                    withdrawsUsdc: storeDeposit.withdrawsUsdc ? ethers.BigNumber.from(storeDeposit.withdrawsUsdc) : Zero,
                                    // apy: ethers.BigNumber.from(storeDeposit.apy),
                                    lendingPoolTokenAddress: storeDeposit.lendingPool.id,
                                    lendingPoolTokenAmount,
                                    positionEthYield,
                                    positionUsdcInterest,
                                    positionPrincipal,
                                  };
                                    const endDatePlusBuffer = new Date(deposit.endDate);
                                    endDatePlusBuffer.setUTCMilliseconds(endDatePlusBuffer.getUTCMilliseconds() + LENDING_POOL_UNLOCK_BUFFER);
                                    const netDeposits = deposit.depositsUsdc.sub(deposit.withdrawsUsdc);
                                    const currentBalance = storeDeposit.currentBalanceOverride ?
                                      ethers.BigNumber.from(storeDeposit.currentBalanceOverride) :
                                      deposit.positionPrincipal
                                        .add(deposit.positionUsdcInterest)
                                        .add(ethInUsdc(deposit.positionEthYield, ethPrice));
                                    const interestEarned = storeDeposit.interestEarnedOverride ?
                                      ethers.BigNumber.from(storeDeposit.interestEarnedOverride) :
                                      currentBalance.sub(netDeposits);
                                    return (
                                  <tr key={`earnRow-${index}`} className="bg-white border-b  ">
                                    <td className="px-6 py-4 text-sm font-bold">
                                      {wallet ? (
                                        <p>{" "}<Image src="/usdc-logo.svg" alt="usdc logo" className="w-6 mr-2 inline align-middle" width="40" height="40"/>
                                          {formatLargeUsdc(currentBalance)} USDC
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
                                          {storeDeposit.status === 'withdrawing' && (
                                            <span className=" ml-2 inline-flex items-center bg-pink-100 text-pink-800 text-xs font-medium px-2.5 py-0.5 rounded-full"><span className="w-2 h-2 me-1 bg-pink-500 rounded-full"></span>Withdrawing</span>
                                          )}
                                          {storeDeposit.status === 'withdrawn' && (
                                            <span className=" ml-2 inline-flex items-center bg-pink-100 text-pink-800 text-xs font-medium px-2.5 py-0.5 rounded-full"><span className="w-2 h-2 me-1 bg-pink-500 rounded-full"></span>Withdrawn</span>
                                          )}
                                        </p>
                                      ) : (
                                        <p className="text-sm">
                                          Loading ETH balance...
                                        </p>
                                      )}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold">
                                      {formatLargeUsdc(interestEarned)}
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
                                      {endDatePlusBuffer.toLocaleString()}
                                    </td>
                                    <td className="px-1 py-4 text-sm font-bold">
                                      <div className='flex items-center justify-center space-x-2 h-full p-2'>
                                        <Tooltip text="This deposit is already for the longest time period."
                                          conditionalText="Extend feature in unavailable right at the moment."
                                          condition={!!storeDeposit.status}
                                        showOnDisabled>
                                        <button type='button'
                                                className='text-shrub-grey-900 bg-white border border-shrub-grey-300 focus:outline-none hover:bg-shrub-green-500 hover:text-white focus:ring-4 focus:ring-grey-200 font-medium rounded-full text-sm px-5 py-2.5 disabled:bg-shrub-grey-50 disabled:text-white disabled:border disabled:border-shrub-grey-100'
                                                disabled={storeDeposit.lendingPool.timestamp && fromEthDate(parseInt(storeDeposit.lendingPool.timestamp))?.getTime() === store.platformData.activePoolTimestamps[store.platformData.activePoolTimestamps.length - 1]?.getTime() || !!storeDeposit.tempData || !!storeDeposit.status }
                                                onClick={() => {
                                                  setExtendDepositModalOpen(true);
                                                  setSelectedDeposit(deposit);
                                                }}>
                                          {/*Corresponding modal at the top*/}
                                          Extend
                                        </button>
                                        </Tooltip>
                                        {!storeDeposit.lendingPool.finalized ?
                                        <a onMouseOver={() => setCurrentHovered(index)}
                                           onMouseOut={() => setCurrentHovered(null)}
                                           href='https://app.uniswap.org/'
                                           target='_blank'
                                           type='button'
                                           className={`flex items-center justify-center text-shrub-grey-900 bg-white border border-shrub-grey-300 focus:outline-none hover:bg-shrub-green-500 hover:text-white focus:ring-4 focus:ring-grey-200 font-medium rounded-full text-sm px-5 py-2.5 ${storeDeposit.tempData || storeDeposit.status ? 'pointer-events-none opacity-50 cursor-not-allowed' : ''}`}
                                           onClick={(e) => {
                                             if (storeDeposit.tempData || storeDeposit.status) {
                                               e.preventDefault();
                                             }
                                           }}
                                        >
                                          {currentHovered === index ?
                                          <Image src='/up-right-arrow-light.svg' alt='down arrow' width={20} height={20}
                                                 className='mr-2' /> :
                                          <Image src='/up-right-arrow.svg' alt='down arrow' width={20} height={20}
                                                 className='mr-2' />}
                                          Trade</a>
                                       :
                                          <button type='button'
                                                className='text-shrub-grey-900 bg-white border border-shrub-grey-300 focus:outline-none hover:bg-shrub-green-500 hover:text-white focus:ring-4 focus:ring-grey-200 font-medium rounded-full text-sm px-5 py-2.5 disabled:bg-shrub-grey-50 disabled:text-white disabled:border disabled:border-shrub-grey-100'
                                                disabled={!!storeDeposit.tempData || !!storeDeposit.status}
                                                onClick={() => {
                                                  setWithdrawModalOpen(true);
                                                  setSelectedDeposit(deposit);
                                                }}>
                                          {/*Corresponding modal at the top*/}
                                          Withdraw
                                        </button>
                                         }
                                      </div>
                                    </td>
                                  </tr>
                                    )}
                            )}
                            </tbody>
                          </table>
                        </div>
                      </li>
                      <li className='mr-4'>
                        <div className='relative overflow-x-auto border rounded-2xl'>
                          <table className='w-full text-left text-shrub-grey'>
                            <caption
                              className='p-5 text-lg font-semibold text-left rtl:text-right text-shrub-grey-900 bg-white'>
                              Borrows
                            </caption>
                            <thead
                              className='text-xs bg-shrub-grey-light  border border-shrub-grey-light2'>
                            <tr>
                              <th scope='col' className='px-6 py-3 text-shrub-grey font-medium'>Current Balance</th>
                              <th scope='col' className='px-6 py-3 text-shrub-grey font-medium'>Collateral Locked</th>
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
                              {getUserData(store, walletAddress).borrows.map((storeBorrow, index) => {
                                const principal = ethers.BigNumber.from(storeBorrow.principal);
                                const originalPrincipal = ethers.BigNumber.from(storeBorrow.originalPrincipal);
                                const endDate = fromEthDate(parseInt(storeBorrow.timestamp, 10));
                                const apy = ethers.BigNumber.from(storeBorrow.apy);
                                const startDate = fromEthDate(storeBorrow.startDate);
                                const interest = calcBorrowInterest(principal, apy, startDate);
                                const earlyRepaymentFee = calcEarlyRepaymentFee(originalPrincipal, endDate, lastSnapshotDate)
                                const borrow: BorrowObj = {
                                    id: isNaN(Number(storeBorrow.id)) ? storeBorrow.id : ethers.BigNumber.from(storeBorrow.id),
                                    endDate,
                                    startDate,
                                    created: fromEthDate(storeBorrow.created),
                                    updated: fromEthDate(storeBorrow.updated),
                                    collateral: ethers.BigNumber.from(storeBorrow.collateral),
                                    principal,
                                    originalPrincipal,
                                    paid: ethers.BigNumber.from(storeBorrow.paid),
                                    apy,
                                    interest,
                                    debt: principal.add(interest),
                                    earlyRepaymentFee,
                                };
                                const timeLeft = daysFromNow(borrow.endDate);

                                return (
                                  <tr key={`borrowRow-${index}`} className='bg-white border-b'>
                                    <td className='px-6 py-4 text-sm font-bold'>
                                      {wallet ? (
                                        <p>
                                          {' '}
                                          {/*<Image src='/usdc-logo.svg' alt='usdc logo' className='w-6 mr-2 inline align-middle' width='40' height='40' />*/}

                                          {storeBorrow.currentBalanceOverride ? storeBorrow.currentBalanceOverride : formatLargeUsdc(borrow.debt)} USDC

                                          {storeBorrow.status === 'pending' && (
                                            <span
                                              className=' ml-2 inline-flex items-center bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full  '><span
                                              className='w-2 h-2 me-1 bg-yellow-500 rounded-full'></span>Pending</span>
                                          )}
                                          {storeBorrow.status === 'failed' && (
                                            <span
                                              className=' ml-2 inline-flex items-center bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full  '><span
                                              className='w-2 h-2 me-1 bg-red-500 rounded-full'></span>Failed</span>
                                          )}
                                          {storeBorrow.status === 'confirmed' && (
                                            <span
                                              className=' ml-2 inline-flex items-center bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full  '><span
                                              className='w-2 h-2 me-1 bg-green-500 rounded-full'></span>Confirmed</span>
                                          )}
                                          {storeBorrow.status === 'extending' && (
                                            <span
                                              className=' ml-2 inline-flex items-center bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-0.5 rounded-full  '><span
                                              className='w-2 h-2 me-1 bg-amber-500 rounded-full'></span>Extending</span>
                                          )}
                                          {storeBorrow.status === 'extended' && (
                                            <span
                                              className=' ml-2 inline-flex items-center bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full  '><span
                                              className='w-2 h-2 me-1 bg-blue-500 rounded-full'></span>Extended</span>
                                          )}
                                          {storeBorrow.status === 'repaying' && (
                                            <span
                                              className='ml-2 inline-flex items-center bg-pink-100 text-pink-800 text-xs font-medium px-2.5 py-0.5 rounded-full'><span
                                              className='w-2 h-2 me-1 bg-pink-500 rounded-full'></span>Repaying</span>
                                          )}
                                          {storeBorrow.status === 'repaid' && (
                                            <span
                                              className='ml-2 inline-flex items-center bg-pink-100 text-pink-800 text-xs font-medium px-2.5 py-0.5 rounded-full'><span
                                              className='w-2 h-2 me-1 bg-pink-500 rounded-full'></span>Repaid</span>
                                          )}
                                          {storeBorrow.status === 'partialRepaying' && (
                                            <span
                                              className='ml-2 inline-flex items-center bg-pink-100 text-pink-800 text-xs font-medium px-2.5 py-0.5 rounded-full'><span
                                              className='w-2 h-2 me-1 bg-pink-500 rounded-full'></span>Partial Paying</span>
                                          )}
                                          {storeBorrow.status === 'partialRepaid' && (
                                            <span
                                              className='ml-2 inline-flex items-center bg-pink-100 text-pink-800 text-xs font-medium px-2.5 py-0.5 rounded-full'><span
                                              className='w-2 h-2 me-1 bg-pink-500 rounded-full'></span>Partial Paid</span>
                                          )}
                                        </p>
                                      ) : (
                                        <p className='text-sm'>
                                          Loading ETH balance... </p>
                                      )}
                                    </td>
                                    <td className='px-6 py-4 text-sm font-bold'>
                                      {/*<Image alt="ETH logo" src="/eth-logo.svg" className="w-4 inline align-middle" width="16" height="24"/>*/}
                                      {" "}{formatWad(borrow.collateral, 6)} ETH
                                    </td>
                                    <td className='px-6 py-4 text-sm font-bold'>
                                      {formatLargeUsdc(borrow.paid)}
                                    </td>
                                    <td className='px-6 py-4 text-sm font-bold'>
                                      {timeLeft}
                                    </td>
                                    <td>
                                      <span
                                        className='bg-green-100 text-green-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-full  '>{`${formatPercentage(borrow.apy)}%`}</span>
                                    </td>
                                    <td className='px-6 py-4 text-sm font-bold'>
                                      {formatLargeUsdc(borrow.originalPrincipal)} USDC
                                    </td>
                                    <td className='px-6 py-4 text-sm font-bold'>
                                      {borrow.endDate.toLocaleString()}
                                    </td>
                                    <td className='px-1 py-4 text-sm font-bold'>
                                      <div className='flex items-center justify-center space-x-2 h-full p-2'>
                                        <Tooltip text="This borrow is already for the longest time period."
                                                 conditionalText="Extend feature in unavailable right at the moment."
                                                 condition={!!storeBorrow.status}
                                                 showOnDisabled>
                                        <button type='button'
                                                className='text-shrub-grey-900 bg-white border border-shrub-grey-300 focus:outline-none hover:bg-shrub-green-500 hover:text-white focus:ring-4 focus:ring-grey-200 font-medium rounded-full text-sm px-5 py-2.5 disabled:bg-shrub-grey-50 disabled:text-white disabled:border disabled:border-shrub-grey-100'
                                                disabled={store.platformData.activePoolTimestamps.length && store.platformData.activePoolTimestamps[store.platformData.activePoolTimestamps.length - 1]?.getTime() === borrow?.endDate?.getTime() || !!storeBorrow.tempData || !!storeBorrow.status}
                                                onClick={() => {
                                                  setExtendBorrowModalOpen(true);
                                                  setSelectedBorrow(borrow);
                                                }}>
                                          {/*Corresponding modal at the top*/}
                                          Extend
                                        </button>
                                        </Tooltip>
                                        <button type='button' onClick={() => {
                                          setRepayModalOpen(true);
                                          setSelectedBorrowForRepay(borrow);
                                        }}
                                        className='flex items-center justify-center text-shrub-grey-900 bg-white border border-shrub-grey-300 focus:outline-none hover:bg-shrub-green-500 hover:text-white focus:ring-4 focus:ring-grey-200 font-medium rounded-full text-sm px-5 py-2.5'
                                        disabled={!!storeBorrow.tempData || !!storeBorrow.status}>
                                          Repay
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </li>
                      <UserHistoryView/>
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
