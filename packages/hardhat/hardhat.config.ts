import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import "@nomicfoundation/hardhat-toolbox";


import "./hardhat-tasks";


const config: HardhatUserConfig = {
  solidity: "0.8.18",
  namedAccounts: {
    deployer: 0,
    account1: 1,
    account2: 2,
    account3: 3,
  },
};

export default config;
