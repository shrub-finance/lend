import { getPlatformDates } from '@shrub-lend/common';
import { ethers } from 'ethers';

export const {oneMonth, threeMonth, sixMonth, twelveMonth} = getPlatformDates();

export const interestRates = [
  { id: "smallest-borrow", rate: "0" },
  { id: "small-borrow", rate: "1" },
  { id: "big-borrow", rate: "5" },
  { id: "biggest-borrow", rate: "8" },
];

export const depositTerms  = [
  { id: 'smallest-deposit', value: 'smallest-deposit', duration: oneMonth },
  { id: 'small-deposit', value: 'small-deposit', duration: threeMonth },
  { id: 'big-deposit', value: 'big-deposit', duration: sixMonth },
  { id: 'biggest-deposit', value: 'biggest-deposit', duration: twelveMonth },
];

export const Zero = ethers.constants.Zero;
