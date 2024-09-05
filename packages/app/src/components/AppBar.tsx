import React, { useState } from "react";
import NavElement from "./nav-element";
import { ConnectWallet } from "@thirdweb-dev/react";
import Image from "next/image";
import { ga4events } from "../utils/ga4events";

export const AppBar: React.FC = () => {
  const [isNavOpen, setIsNavOpen] = useState(false);

  const handleNavClick = (label) => {
    if (label === "Dashboard") {
      ga4events.topNavDashboard();
    } else if (label === "Borrow") {
      ga4events.topNavBorrow();
    } else if (label === "Logo") {
      ga4events.topNavLogo();
    }
    setIsNavOpen(false);
  };

  const handleWalletConnectClick = () => {
    ga4events.topNavConnectWallet();
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
          <div className="hidden md:inline-flex align-items-center justify-items">
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
            <div
              onClick={handleWalletConnectClick}
              style={{ cursor: "pointer" }}
            >
              <ConnectWallet
                btnTitle="Connect Wallet"
                className="!bg-shrub-green-500 !rounded-3xl !text-white !text-[14px] lg:!py-[10px] lg:!px-[16px] !font-semibold !leading-[20px]"
                auth={{
                  loginOptional: true,
                  onLogin: () => {
                    ga4events.walletLogin();
                    ga4events.walletConnected(); //fired after login
                  },
                  onLogout: () => {
                    ga4events.walletLogout();
                  },
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
