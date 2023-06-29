export function toEthDate(date: Date) {
    return Math.round(Number(date) / 1000);
}

export function fromEthDate(ethDate: number) {
    return new Date(ethDate * 1000);
}

export function truncateEthAddress (address) {
    const truncateRegex = /^(0x[a-zA-Z0-9]{4})[a-zA-Z0-9]+([a-zA-Z0-9]{4})$/;
    var match = address.match(truncateRegex);
    if (!match)
        return address;
    return match[1] + "\u2026" + match[2];
};

export const interestToLTV = {
    "0": 20,
    "1": 25,
    "5": 33,
    "8": 50
}

export const timestamps = {
    1: toEthDate(new Date("2023-08-01")),
    3: toEthDate(new Date("2023-10-01")),
    6: toEthDate(new Date("2024-01-01")),
    12: toEthDate(new Date("2024-07-01")),
}
