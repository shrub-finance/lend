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

export const secondsInDay = 60 * 60 * 24;
export const milliSecondsInDay = 1000 * 60 * 60 * 24;

export function calculateLockupPeriod(endDate: Date): string {
    const now = new Date();
    const oneDay = 1000 * 60 * 60 * 24; // milliseconds in a day

    // Calculate the total difference in days
    let diffDays = Math.ceil((endDate.getTime() - now.getTime()) / oneDay);

    if (diffDays < 53) {
        // Up to 55 days, display in days
        return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    }
    else {
        // For periods longer than 60 days, round to the nearest month
        let totalMonths = diffDays / 30;
        let roundedMonths = Math.round(totalMonths);

        return `${roundedMonths} month${roundedMonths !== 1 ? 's' : ''}`;
    }
}











