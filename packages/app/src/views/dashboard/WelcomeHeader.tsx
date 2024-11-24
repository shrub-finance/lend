import { FC } from "react"
import { Card } from "./Card"
import { getUserData, useFinancialData } from "components/FinancialDataContext"
import { useAddress } from "@thirdweb-dev/react"
import { formatLargeUsdc } from "utils/ethMethods"
import { BigNumber } from "ethers"

export const WelcomeHeader: FC = ({}) => {
  const { store } = useFinancialData()
  const walletAddress = useAddress()

  const deposits = getUserData(store, walletAddress).deposits
  const totalDeposits = deposits.reduce((sum, d) => sum + Number(formatLargeUsdc(BigNumber.from(d.lendingPool.totalUsdcInterest))), 0)
  const totalEarnings = totalDeposits.toFixed(2)

  return (
    <Card>
      <div className="p-6">
        <h1 className="text-xl font-semibold text-gray-900">Welcome back</h1>
        <p className="text-sm text-gray-500 mt-2">Total earnings</p>
        <div className="mt-4 flex items-center">
          <p className="text-4xl font-bold text-gray-900">${totalEarnings}</p>
          <div className="ml-4 flex items-center bg-green-100 text-green-600 text-sm font-medium px-3 py-1 rounded-full">
            0.00%
          </div>
        </div>
      </div>
    </Card>
  )
}