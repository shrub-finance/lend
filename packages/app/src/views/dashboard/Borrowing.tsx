import { FC, useEffect, useState } from "react"
import { Card } from "./Card"
import { getUserData, useFinancialData } from "components/FinancialDataContext"
import { useAddress } from "@thirdweb-dev/react"
import { durationWad, formatLargeUsdc, formatPercentage, formatWad, fromEthDate, percentMul, wadMul } from "utils/ethMethods"
import Image from "next/image"
import Tooltip from "components/Tooltip"
import { Button } from "components/Button"
import { BorrowObj } from "types/types"
import Modal from "components/Modal"
import RepayView from "views/modals/repay-borrow/RepayView"
import { ethers } from "ethers"
import { useQuery } from "@apollo/client"
import { GLOBAL_DATA_QUERY } from "constants/queries"
import {Zero} from "../../constants";
import { EARLY_REPAYMENT_THRESHOLD } from "../../constants"
import { EARLY_REPAYMENT_APY } from "../../constants"

export const Borrowing: FC = ({}) => {
  const { store } = useFinancialData()
  const walletAddress = useAddress()

  const [lastSnapshotDate, setLastSnapshotDate] = useState(new Date(0));
  const [repayModalOpen, setRepayModalOpen] = useState(false);
  const [selectedBorrowForRepay, setSelectedBorrowForRepay] = useState<
    BorrowObj | undefined
  >();
  const {
    loading: globalDataLoading,
    error: globalDataError,
    data: globalData,
    startPolling: globalDataStartPolling,
    stopPolling: globalDataStopPolling,
  } = useQuery(GLOBAL_DATA_QUERY);

  const headerStyling = "px-6 py-3 text-shrub-grey font-medium whitespace-nowrap"
  const headers = ['Amount deposited', 'Received', 'APY', 'Due date', 'Amount due']

  const rowStyling = "px-6 py-4 text-sm font-bold whitespace-nowrap"

  useEffect(() => {
    if (globalDataError) {
      console.error("Error fetching global data:", globalDataError);
      return; // Optional: You could set some error state here.
    }
    if (globalData) {
      setLastSnapshotDate(fromEthDate(globalData.globalData.lastSnapshotDate));
    }
  }, [globalData, globalDataError]);

  function calcBorrowInterest(
    principal: ethers.BigNumber,
    apy: ethers.BigNumber,
    startDate: Date,
  ) {
    const duration = durationWad(startDate, lastSnapshotDate);
    if (duration.lte(Zero)) {
      return Zero;
    }
    const interestPerYear = percentMul(principal, apy);
    return wadMul(interestPerYear, duration);
  }

  function calcEarlyRepaymentFee(
    originalPrincipal: ethers.BigNumber,
    borrowEndDate: Date,
    lastSnapshotDate: Date,
  ) {
    const thresholdDate = new Date(borrowEndDate);
    thresholdDate.setUTCMilliseconds(
      thresholdDate.getUTCMilliseconds() - EARLY_REPAYMENT_THRESHOLD,
    );
    if (lastSnapshotDate >= thresholdDate) {
      return Zero;
    }
    const feeDuration = durationWad(lastSnapshotDate, thresholdDate);
    const feePerYear = percentMul(originalPrincipal, EARLY_REPAYMENT_APY);
    return wadMul(feeDuration, feePerYear);
  }

  return (
    <Card>
      <Modal
        isOpen={repayModalOpen}
        onClose={() => setRepayModalOpen(false)}
      >
        <RepayView
          borrow={selectedBorrowForRepay}
          onModalClose={() => {setRepayModalOpen(false)}}
          setIsModalOpen={setRepayModalOpen}
        />
      </Modal>
      <table className="w-full text-left text-shrub-grey">
        <caption className="p-5 text-lg font-semibold text-left rtl:text-right text-shrub-grey-900 bg-white">
          Borrowing
        </caption>
        <thead className="text-xs bg-shrub-grey-light  border border-shrub-grey-light2">
          <tr>
            {headers.map((header) => (
              <th scope="col" className={headerStyling} key={header}>
                {header}
              </th>
            ))}
            <th></th>
          </tr>
        </thead>
        <tbody className="max-w-full w-full">
          {getUserData(store, walletAddress).borrows.map(
            (storeBorrow, index) => {
              let dueDate = new Date(storeBorrow.created * 1000)
              dueDate.setFullYear(dueDate.getFullYear() + 1)

              const principal = ethers.BigNumber.from(
                storeBorrow.principal,
              );
              const originalPrincipal =
                ethers.BigNumber.from(
                  storeBorrow.originalPrincipal,
                );
              const endDate = fromEthDate(
                parseInt(storeBorrow.timestamp, 10),
              );
              const apy = ethers.BigNumber.from(
                storeBorrow.apy,
              );
              const startDate = fromEthDate(
                storeBorrow.startDate,
              );
              const interest = calcBorrowInterest(
                principal,
                apy,
                startDate,
              );
              const earlyRepaymentFee =
                calcEarlyRepaymentFee(
                  originalPrincipal,
                  endDate,
                  lastSnapshotDate,
                );
              const borrow: BorrowObj = {
                id: isNaN(Number(storeBorrow.id))
                  ? storeBorrow.id
                  : ethers.BigNumber.from(storeBorrow.id),
                endDate,
                startDate,
                created: fromEthDate(storeBorrow.created),
                updated: fromEthDate(storeBorrow.updated),
                collateral: ethers.BigNumber.from(
                  storeBorrow.collateral,
                ),
                principal,
                originalPrincipal,
                paid: ethers.BigNumber.from(
                  storeBorrow.paid,
                ),
                apy,
                interest,
                debt: principal.add(interest),
                earlyRepaymentFee,
              };
              return (
                <tr key={`storeBorrow-${index}`} className='bg-white'>
                  <td className={rowStyling}>
                    <Image
                      alt="eth logo"
                      src="/dark-eth-logo.svg"
                      className="w-4 inline align-middle"
                      width="16"
                      height="24"
                    />
                    <span className="pl-2">
                      {formatWad(storeBorrow.collateral, 6)}
                    </span>
                  </td>
                  <td className={rowStyling}>
                    <Image
                      alt="usdc logo"
                      src="/usdc-logo.svg"
                      className="w-4 inline align-middle"
                      width="24"
                      height="24"
                    />
                    <span className="pl-2">
                      {Number(formatLargeUsdc(storeBorrow.originalPrincipal)).toFixed(2)} USDC
                    </span>
                  </td>
                  <td className={rowStyling}>
                    <span className="bg-green-100 text-green-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-full  ">
                      {`${formatPercentage(storeBorrow.apy)}%`}
                    </span>
                  </td>
                  <td className={rowStyling}>
                    {dueDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className={rowStyling}>
                    <Image
                      alt="usdc logo"
                      src="/usdc-logo.svg"
                      className="w-4 inline align-middle"
                      width="24"
                      height="24"
                    />
                    <span className="pl-2">
                      {Number(formatLargeUsdc(storeBorrow.originalPrincipal)) - Number(formatLargeUsdc(storeBorrow.paid))} USDC
                    </span>
                  </td>
                  <td className={rowStyling}>
                    <Tooltip
                      text=""
                      conditionalText="Repay not available at the moment."
                      condition={!!storeBorrow.status}
                      showOnDisabled
                    >
                      <Button
                        type="info"
                        text="Make payment"
                        onClick={() => {
                          setRepayModalOpen(true);
                          setSelectedBorrowForRepay(borrow);
                        }}
                        disabled={
                          !!storeBorrow.tempData ||
                          !!storeBorrow.status
                        }
                        fill={false}
                        boldText={false}
                        additionalClasses="flex font-medium px-5 py-2.5"
                      />
                    </Tooltip>
                  </td>
                </tr>
              )
            })}
        </tbody>
      </table>
    </Card>
  )
}
