import React, { FC } from "react";
import { Card } from "./Card";
import { Borrowing } from "./Borrowing";
import { WalletBalance } from "./WalletBalance";
import { Earning } from "./Earning";
import { WelcomeHeader } from "./WelcomeHeader";
import {UserHistoryView} from "./UserHistoryView";

export const DashboardView: FC = ({}) => {
  return (
    <>
      <div className="absolute bg-black h-24 w-full" />
      <div className='card px-8'>
        <div className="grid grid-cols-7 gap-x-4">
          <div className="col-span-5">
            <WelcomeHeader />
            <Earning />
            <Borrowing />
            <UserHistoryView/>
          </div>
          <div className="col-span-2">
            <WalletBalance />
          </div>
        </div>
      </div>
    </>
  )
};
