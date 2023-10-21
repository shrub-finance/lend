import {toEthDate, fromEthDate, getPlatformDates} from "@shrub-lend/common"

// export function toEthDate(date: Date) {
//     return Math.round(Number(date) / 1000);
// }
//
// export function fromEthDate(ethDate: number) {
//     return new Date(ethDate * 1000);
// }

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
};

export const interestToLTV = {
    "0": 20,
    "1": 25,
    "5": 33,
    "8": 50
}

export const timestamps = {
    // 1: toEthDate(new Date("2023-08-01")),
    // 3: toEthDate(new Date("2023-10-01")),
    // 6: toEthDate(new Date("2024-01-01")),
    // 12: toEthDate(new Date("2024-07-01")),
    1: toEthDate(getPlatformDates().oneMonth),
    3: toEthDate(getPlatformDates().threeMonth),
    6: toEthDate(getPlatformDates().sixMonth),
    12: toEthDate(getPlatformDates().twelveMonth)
}