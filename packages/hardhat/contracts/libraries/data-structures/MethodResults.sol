// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "../../tokenization/PoolShareToken.sol";
import "../../tokenization/BorrowPositionToken.sol";
import "../../interfaces/IAETH.sol";
import "../../interfaces/IBorrowPositionToken.sol";

library MethodResults {
    struct calcLPIncreasesResult {
        uint deltaAccumYield; // New aETH yield to be distributed to this lending pool from this borrowing pool (Wad)
        uint deltaShrubYield; // New aETH yield to be distributed as fees to the shrub treasury from this borrowing pool (Wad)
        uint deltaAccumInterest; // New aETH yield to be distributed to this lending pool from this borrowing pool (Wad)
        uint deltaShrubInterest; // New aETH yield to be distributed to this lending pool from this borrowing pool (Wad)
    }
}
