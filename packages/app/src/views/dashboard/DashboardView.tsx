import { FC } from "react";
import { Card } from "./Card";
import { NATIVE_TOKEN_ADDRESS, useBalance } from "@thirdweb-dev/react";
import { ethers } from "ethers";
import { Borrowing } from "./Borrowing";

export const DashboardView: FC = ({}) => {
  const { data: ethBalance, isLoading: ethBalanceIsLoading } =
    useBalance(NATIVE_TOKEN_ADDRESS);

  return (
    <div className='card px-8'>
      <div className="grid grid-cols-3 gap-x-4">
        <div className="col-span-2">
          <Card>
            ifondiondsf
          </Card>
          <Borrowing />
        </div>
        <Card>
          <div className="text-sm text-gray-500">
            Wallet Balance
          </div>
          <div className="text-2xl">
            {!ethBalanceIsLoading && ethBalance.displayValue}
          </div>
        </Card>
      </div>

    </div>
  )
};
