// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

library LendingPlatformEvents {
    event NewDeposit(address poolShareTokenAddress, address depositor, uint256 principalAmount, uint256 interestAmount, uint256 tokenAmount);
    event NewBorrow(uint tokenId, uint40 timestamp, address borrower, uint256 collateral, uint256 principal, uint40 startDate, uint16 apy);
    event PartialRepayBorrow(uint tokenId, uint repaymentAmount, uint principalReduction);
    event RepayBorrow(uint tokenId, uint repaymentAmount, uint collateralReturned, address beneficiary);
    event Withdraw(address user, address poolShareTokenAddress, uint tokenAmount, uint ethAmount, uint usdcPrincipal, uint usdcInterest);
    event PoolCreated(uint40 timestamp, address poolShareTokenAddress);
    event LendingPoolYield(address poolShareTokenAddress, uint accumInterest, uint accumYield);
    event FinalizeLendingPool(address poolShareTokenAddress, uint shrubInterest, uint shrubYield);
}
