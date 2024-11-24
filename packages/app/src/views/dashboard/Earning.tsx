import { FC, useState } from "react"
import { Card } from "./Card"
import { getUserData, useFinancialData } from "components/FinancialDataContext"
import { useAddress } from "@thirdweb-dev/react"
import Image from "next/image"
import { formatLargeUsdc, formatPercentage } from "utils/ethMethods"
import { BigNumber } from "ethers"
import {
  oneMonth,
  sixMonth,
  threeMonth,
  twelveMonth,
} from "../../constants";
import { Button } from "components/Button"

export const Earning: FC = ({}) => {
  const { store } = useFinancialData()
  const walletAddress = useAddress()

  const headerStyling = "px-6 py-3 text-shrub-grey font-medium whitespace-nowrap"
  const headers = ['Amount deposited', 'APR yield', 'Withdraw date', 'Earned to date']
  const rowStyling = "px-6 py-4 text-sm font-bold whitespace-nowrap"

  function getAPY ( timestamp: number ) {
    const apyGenerated =
      timestamp === oneMonth.getTime() / 1000
        ? 7.56
        : timestamp === threeMonth.getTime() / 1000
        ? 8.14
        : timestamp === sixMonth.getTime() / 1000
        ? 9.04
        : timestamp === twelveMonth.getTime() / 1000
        ? 10.37
        : Math.random() * 5 + 7

    return apyGenerated.toFixed(2).toString()
  }

  return (
    <Card>
      <table className="w-full text-left text-shrub-grey">
        <caption className="p-5 text-lg font-semibold text-left rtl:text-right text-shrub-grey-900 bg-white">
          Earning
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
        <tbody>
          {getUserData(store, walletAddress).deposits.map(
            (storeDeposit, index) => {
              return (
                <tr key={`storeDeposit-${index}`}>
                  <td className={rowStyling}>
                    <Image
                      alt="usdc logo"
                      src="/usdc-logo.svg"
                      className="w-4 inline align-middle"
                      width="24"
                      height="24"
                    />
                    <span className="pl-2">
                      {Number(formatLargeUsdc(BigNumber.from(storeDeposit.depositsUsdc))).toFixed(2)}
                    </span>
                  </td>
                  <td className={rowStyling}>
                  <span className="bg-green-100 text-green-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-full  ">
                    {`${getAPY(Number(storeDeposit.lendingPool.timestamp))}%`}
                  </span>
                  </td>
                  <td className={rowStyling}>
                    {new Date(parseInt(storeDeposit.lendingPool.timestamp)*1000).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </td>
                  <td className={rowStyling}>
                    ${Number(formatLargeUsdc(BigNumber.from(storeDeposit.lendingPool.totalUsdcInterest))).toFixed(2)}
                  </td>
                  <td className={rowStyling}>
                  <Button
                    type="primary"
                    text="Withdraw"
                    onClick={() => {
                    }}
                    fill={false}
                    boldText={false}
                    additionalClasses="flex font-medium px-5 py-2.5"
                  />
                  </td>
                </tr>
              )
            }
          )}
        </tbody>
      </table>
    </Card>
  )
}