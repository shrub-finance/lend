import {toEthDate, fromEthDate, getPlatformDates} from "@shrub-lend/common"
import { ethers } from 'ethers';
import { Zero } from '../constants';

const Ten = ethers.BigNumber.from(10);

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
    const roundAmount = usdcInWadBN.gte(Zero) ?
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
    const roundAmount = amountBN.gt(amountBN.div(divisionFactor).mul(divisionFactor)) ? divisionFactor : Zero
    return amountBN.add(roundAmount).div(divisionFactor).mul(divisionFactor);
}

export function formatPercentage(percentage: ethers.BigNumberish) {
    const percentageBN = ethers.BigNumber.from(percentage);
    return ethers.utils.formatUnits(percentageBN, 2);
}

/**
 * @notice multiply 2 Wads returning a Wad
 * @param a - ethers.BigNumberish : the first number to multiply
 * @param b - ethers.BigNumberish : the second number to multiply
 * @return a * b as a Wad
 */
export function wadMul(a: ethers.BigNumberish, b: ethers.BigNumberish) {
    const aBN = ethers.BigNumber.from(a);
    const bBN = ethers.BigNumber.from(b);
    const scaleFactor = Ten.pow(18);
    return aBN
        .mul(bBN)
        .div(scaleFactor);
}

/**
 * @notice divide 2 Wads by each other returning a Wad
 * @param a - ethers.BigNumberish : the numerator
 * @param b - ethers.BigNumberish : the divisor
 * @return a / b as a Wad
 */
export function wadDiv(a: ethers.BigNumberish, b: ethers.BigNumberish) {
    const aBN = ethers.BigNumber.from(a);
    const bBN = ethers.BigNumber.from(b);
    const scaleFactor = Ten.pow(18);
    return aBN
        .mul(scaleFactor)
        .div(bBN);
}

/**
 * @notice multiply a big number by a percentage returning a big number
 * @param a - ethers.BigNumberish : the number to be multiplied
 * @param percentage - ethers.BigNumberish : the percentage in bps (10000 = 100%)
 * @return a * percentage as BigNumber
 */
export function percentMul(a: ethers.BigNumberish, percentage: ethers.BigNumberish) {
    const aBN = ethers.BigNumber.from(a);
    const percentageBN = ethers.BigNumber.from(percentage);
    const scaleFactor = Ten.pow(4);
    return aBN
        .mul(percentageBN)
        .div(scaleFactor);
}

/**
 * @notice return the duration in years between two dates (Wad)
 * @param startDate - Date : start of duration
 * @param endDate - Date : end of duration
 * @return ethers.BigNumber : the duration expressed in years represented as Wad
 */
export function durationWad(startDate: Date, endDate: Date) {
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationMsBN = ethers.BigNumber.from(durationMs);
    const scaleFactor = Ten.pow(18);
    return durationMsBN
        .mul(scaleFactor)
        .div(1000 * 60 * 60 * 24 * 365)
}

/**
 * @notice return the value of an amount of ETH in USDC
 * @param ethAmount - ethers.BigNumberish : amount of ETH to value in Wad
 * @param ethPrice - ethers.BigNumberish : USDC/ETH expressed with 8 decimals
 * @return ethers.BigNumber : the USDC value of the ETH in Wad
 */
export function ethInUsdc(ethAmount: ethers.BigNumberish, ethPrice: ethers.BigNumberish) {
    const scaleFactor = Ten.pow(10);
    const ethAmountBN = ethers.BigNumber.from(ethAmount);
    // Convert 8 decimal to Wad with scaleFactor
    const ethPriceBN = ethers.BigNumber.from(ethPrice).mul(scaleFactor);
    return wadMul(ethAmountBN, ethPriceBN);
}

/**
 * @notice return the percentage in bps of a ratio of two values
 * @param numerator - ethers.BigNumberish : the numerator (Wad)
 * @param denominator - ethers.BigNumberish : the divisor (Wad)
 * @return ethers.BigNumber : numerator / denominator expressed as a percentage in bps (10000 = 100%)
 */
export function calcPercentage(numerator: ethers.BigNumberish, denominator: ethers.BigNumberish) {
    const numeratorBN = ethers.BigNumber.from(numerator);
    const denominatorBN = ethers.BigNumber.from(denominator);
    console.log(`numeratorBN: ${numeratorBN.toString()}`);
    console.log(`denominatorBN: ${denominatorBN.toString()}`);
    const roundAmount = Ten.pow(13).mul(5);
    const scaleFactor = Ten.pow(14); // Convert to bps percentage with 4 decimals
    return (wadDiv(numeratorBN, denominatorBN).add(roundAmount)).div(scaleFactor);
}
