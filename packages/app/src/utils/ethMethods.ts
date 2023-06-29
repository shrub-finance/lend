export function toEthDate(date: Date) {
    return Math.round(Number(date) / 1000);
}

export function fromEthDate(ethDate: number) {
    return new Date(ethDate * 1000);
}

export const interestToLTV = {
    "0": 20,
    "1": 25,
    "5": 33,
    "8": 50
}
