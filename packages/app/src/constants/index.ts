import { getPlatformDates } from '@shrub-lend/common';
import { ethers } from 'ethers';

export const {oneMonth, threeMonth, sixMonth, twelveMonth} = getPlatformDates();

export const interestRates = [
  { id: "smallest-borrow", rate: "0" },
  { id: "small-borrow", rate: "1" },
  { id: "big-borrow", rate: "5" },
  { id: "biggest-borrow", rate: "8" },
];

export const Zero = ethers.constants.Zero;
