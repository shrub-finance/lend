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

/**
 * @notice converts USDC value in Wad to a string
 * @dev Wad means 18 decimal
 * @dev rounds up for positive numbers and down for negative numbers
 * @param usdcInWad - ethers.BigNumberish : An amount of USDC represented in Wad as a big numberish
 * @return USDC as a formatted string
 */
export function formatLargeUsdc(usdcInWad: ethers.BigNumberish) {
    const usdcInWadBN = ethers.BigNumber.from(usdcInWad)
    const divisionFactor = ethers.BigNumber.from(10).pow(12)
    const roundAmount = usdcInWadBN.gte(ethers.constants.Zero) ?
        ethers.BigNumber.from(5).mul(divisionFactor).div(10) :
        ethers.BigNumber.from(5).mul(divisionFactor).div(10).mul(-1);
    return ethers.utils.formatUnits(usdcInWadBN.add(roundAmount).div(divisionFactor), 6)
}

/**
 * @notice Converts eth value from a Big Number to a rounded Big Number
 * @dev rounds up for positive numbers and down for negative numbers
 * @param amount - ethers.BigNumberish : An amount of ETH represented in Wad as a big numberish
 * @param decimals - number : number of decimals to round to
 * @return USDC as a formatted string
 */
export function roundEth(amount: ethers.BigNumberish, decimals: number) {
    const amountBN = ethers.BigNumber.from(amount);
    const divisionFactor = ethers.BigNumber.from(10).pow(18 - decimals)
    const roundAmount = amountBN.gt(amountBN.div(divisionFactor).mul(divisionFactor)) ? divisionFactor : ethers.constants.Zero
    return amountBN.add(roundAmount).div(divisionFactor).mul(divisionFactor);
}

export function formatPercentage(percentage: ethers.BigNumberish) {
    const percentageBN = ethers.BigNumber.from(percentage);
    return ethers.utils.formatUnits(percentageBN, 2);
}
