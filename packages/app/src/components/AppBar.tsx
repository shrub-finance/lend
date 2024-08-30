import React, { useState } from "react";
import NavElement from "./nav-element";
import { ConnectWallet } from "@thirdweb-dev/react";
import Image from "next/image";
import ReactGA from "react-ga4";

export const AppBar: React.FC = () => {
  const [isNavOpen, setIsNavOpen] = useState(false);

  const handleNavClick = (label) => {
    ReactGA.event({
      category: "Navigation",
      action: `Click_${label}`,
      label: `NavElement_${label}`,
    });
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
            <ConnectWallet
              btnTitle="Connect Wallet"
              className=" !bg-shrub-green-500 !rounded-3xl !text-white !text-[14px] lg:!py-[10px] lg:!px-[16px] !font-semibold !leading-[20px]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
