import React, { useState } from "react";
import NavElement from "./nav-element";
import { ConnectWallet } from "@thirdweb-dev/react";
import Image from "next/image";
import {ga4events} from "../utils/ga4events";

export const AppBar: React.FC = () => {
  const [isNavOpen, setIsNavOpen] = useState(false);

  const handleNavClick = (label) => {
    if (label === 'Dashboard') {
      ga4events.topNavDashboard();
    } else if (label === 'Borrow') {
      ga4events.topNavBorrow();
    } else if (label === 'Logo') {
      ga4events.topNavLogo();
    }
    setIsNavOpen(false);
  };

  return (
    <div>
      <div className="navbar flex h-20 flex-row md:mb-2 bg-black text-neutral-content drop-shadow-md">
        <div>
          <div className="sm:inline w-22 h-22 md:max-w-22">
            <NavElement
              chiplabel="isLogo"
              label={
                <Image
                  src="/shrub-logo.svg"
                  alt="Shrub Logo"
                  width="140"
                  height="20"
                />
              }
              href={"/"}
              navigationStarts={() => handleNavClick("Logo")}
            />
          </div>
        </div>
        <div className="navbar-start">
          <div className="hidden md:inline-flex align-items-center justify-items gap-4">
            <NavElement
              label="Dashboard"
              href="/dashboard"
              navigationStarts={() => handleNavClick("Dashboard")}
            />
            <NavElement
              label="Borrow"
              href="/borrow"
              navigationStarts={() => handleNavClick("Borrow")}
            />
          </div>
        </div>

        <div className="navbar-end">
          <div className="md:inline-flex align-items-center justify-items gap-6">
            <ConnectWallet
              btnTitle="Connect Wallet"
              className=" !border !border-shrub-green !bg-shrub-green-900 !rounded-3xl !text-white !text-[16px] lg:!p-[12px]"
              style={{
                border: "1px #16735B solid !important",
                padding: "10px",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
