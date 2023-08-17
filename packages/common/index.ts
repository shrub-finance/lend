export function getPlatformDates() {
    // Returns an object of dates which are 00:00 UTC on the first of a month
    // Keys are oneMonth, threeMonth, sixMonth, twelveMonth
    // If it is within 5 days of a month, the dates roll over - for instance on Aug 28 the oneMonth will be on Oct 1

    const now = new Date();
    now.setUTCHours(0,0,0,0);  // Set the time to 00:00
    const oneMonth = new Date(now);
    oneMonth.setUTCMonth(now.getUTCMonth() + 1, 1);
    const daysDifference = (oneMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDifference <= 5) {
        oneMonth.setUTCMonth(oneMonth.getUTCMonth() + 1);
    }
    const threeMonth = new Date((new Date(oneMonth)).setUTCMonth(oneMonth.getUTCMonth() + 2));
    const sixMonth = new Date((new Date(oneMonth)).setUTCMonth(oneMonth.getUTCMonth() + 5));
    const twelveMonth = new Date((new Date(oneMonth)).setUTCMonth(oneMonth.getUTCMonth() + 11));

    return { oneMonth, threeMonth, sixMonth, twelveMonth };
}

export function toEthDate(date: Date) {
    return Math.round(Number(date) / 1000);
}

export function fromEthDate(ethDate: number) {
    return new Date(ethDate * 1000);
}

export const formatDate:any = {
    long: (date: Date) => date.toLocaleString(undefined, {
        dateStyle: "medium", timeStyle: "short"
    })
}
