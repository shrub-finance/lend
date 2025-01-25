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

  function calculateTotalGrowth(deposits) {
    let totalDeposit = 0;
    let weightedGrowth = 0;

    deposits.forEach((deposit) => {
      const depositAmount = deposit.amount ? Number(formatLargeUsdc(BigNumber.from(deposit.amount))) : 0;
      const growth = deposit.lendingPool?.totalUsdcInterest
        ? Number(formatLargeUsdc(BigNumber.from(deposit.lendingPool.totalUsdcInterest)))
        : 0;

      totalDeposit += depositAmount;
      weightedGrowth += growth;
    });

    if (totalDeposit === 0) return "0.00"; 

    const totalGrowthPercentage = (weightedGrowth / totalDeposit) * 100;
    return totalGrowthPercentage.toFixed(2);
  }


  return (
    <Card>
      <div className="p-6">
        <h1 className="text-xl font-semibold text-gray-900">Welcome back</h1>
        <p className="text-sm text-gray-500 mt-2">Total earnings</p>
        <div className="mt-4 flex items-center">
          <p className="text-4xl font-bold text-gray-900">${totalEarnings}</p>
          <div className="ml-4 flex items-center bg-green-100 text-green-600 text-sm font-medium px-3 py-1 rounded-full">
            {deposits && calculateTotalGrowth(deposits)}%
          </div>
        </div>
      </div>
    </Card>
  )
}
