import React, { useState } from "react";
import NavElement from './nav-element';
import { ConnectWallet } from '@thirdweb-dev/react';
import Image from 'next/image';


export const AppBar: React.FC = () => {
  const [isNavOpen, setIsNavOpen] = useState(false);
  return (
    <div>
      {/* NavBar / Header */}
      <div className="navbar flex h-20 flex-row md:mb-2  bg-black text-neutral-content drop-shadow-md">
        <div className="">
          <div className="sm:inline w-22 h-22 md:max-w-22">
            <NavElement
              chiplabel="isLogo"
              label={<Image src="/shrub-logo.svg" alt="Shrub Logo" width="140" height="20"/>} href={"/"}
              navigationStarts={() =>setIsNavOpen(false)}
            />
          </div>
        </div>
        <div className="navbar-start">
          <div className="hidden md:inline-flex align-items-center justify-items gap-4">
            {/*<NavElement*/}
            {/*  label="Dashboard"*/}
            {/*  href="/dashboard"*/}
            {/*  navigationStarts={() => setIsNavOpen(false)}*/}
            {/*/>*/}
        <NavElement
          label="Deposit"
          href="/deposit"
          navigationStarts={() => setIsNavOpen(false)}
        />

        <NavElement
          label="Borrow"
          href="/borrow"
          navigationStarts={() => setIsNavOpen(false)}
        />

          </div>
        </div>

        <div className="navbar-end">
          <div className="md:inline-flex align-items-center justify-items gap-6 ">
            <ConnectWallet btnTitle="Connect Wallet" className=" !border !border-shrub-green !bg-shrub-green-900 !rounded-3xl !text-white !text-[16px] " style={{border: "1px #16735B solid !important", }}/>
        </div>
        </div>
      </div>
    </div>
  );
};
