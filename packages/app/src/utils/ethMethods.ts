import {toEthDate, fromEthDate, getPlatformDates} from "@shrub-lend/common"
import { ethers } from 'ethers';

export {toEthDate, fromEthDate};

export function truncateEthAddress (address) {
    if(address) {
        const truncateRegex = /^(0x[a-zA-Z0-9]{4})[a-zA-Z0-9]+([a-zA-Z0-9]{4})$/;
        const match = address.match(truncateRegex);
        if (!match)
            return address;
        return match[1] + "\u2026" + match[2];
    }
   else {
       return "-"
    }
}

export const interestToLTV = {
    "0": 2000,
    "1": 2500,
    "5": 3300,
    "8": 5000
}

export const timestamps = {
    1: toEthDate(getPlatformDates().oneMonth),
    3: toEthDate(getPlatformDates().threeMonth),
    6: toEthDate(getPlatformDates().sixMonth),
    12: toEthDate(getPlatformDates().twelveMonth)
}

export function formatLargeUsdc(usdcInWad: ethers.BigNumberish) {
    const usdcInWadBN = ethers.BigNumber.from(usdcInWad)
    const divisionFactor = ethers.BigNumber.from(10).pow(12)
    const roundAmount = ethers.BigNumber.from(5).mul(divisionFactor).div(10)
    return ethers.utils.formatUnits(usdcInWadBN.add(roundAmount).div(divisionFactor), 6)
}
