import {extendEnvironment, HardhatUserConfig} from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-deploy";
import "hardhat-contract-sizer";
import "hardhat-abi-exporter";
import "./hardhat-tasks";
import "./hardhat-tests";

import dotenv from "dotenv";
dotenv.config();

extendEnvironment((hre) => {
// @ts-ignore
    hre.init = async() =>  {
        const {ethers, deployments, getNamedAccounts} = hre;
        const { account1, account2, account3, account4, account5, account6, deployer, shrubTreasury } = await getNamedAccounts()
// @ts-ignore
      global.aeth = await ethers.getContractAt("AETH", (await deployments.get('AETH')).address);
// @ts-ignore
        global.usdc = await ethers.getContractAt("USDCoin", (await deployments.get('USDCoin')).address);
// @ts-ignore
        global.bpt = await ethers.getContractAt("BorrowPositionToken", (await deployments.get('BorrowPositionToken')).address);
// @ts-ignore
        global.lendingPlatform = await ethers.getContractAt("LendingPlatform", (await deployments.get('LendingPlatform')).address);
// @ts-ignore
        global.mockAaveV3 = await ethers.getContractAt("MockAaveV3", (await deployments.get('MockAaveV3')).address);
// @ts-ignore
        global.mockChainlinkAggregator = await ethers.getContractAt("MockChainlinkAggregator", (await deployments.get('MockChainlinkAggregator')).address);

// @ts-ignore
        global.account1 = account1;
// @ts-ignore
        global.account2 = account2;
// @ts-ignore
        global.account3 = account3;
// @ts-ignore
        global.account4 = account4;
// @ts-ignore
        global.account5 = account5;
// @ts-ignore
        global.account6 = account6;
// @ts-ignore
        global.deployer = deployer;
// @ts-ignore
        global.shrubTreasury = shrubTreasury;
    }
});

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.18",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1 
      }
    }
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
//       allowUnlimitedContractSize: true,
      chainId: 1337,
      gasPrice: 80e9,
      // chainId: 1337,
      // mining: {
      //   auto: false,
      //   interval: [3000, 3500] // Simulate mining time between 3 and 6 seconds
      // }
    }
  },
  namedAccounts: {
    deployer: 0,
    shrubTreasury: 1,
    account1: 2,
    account2: 3,
    account3: 4,
    account4: 5,
    account5: 6,
    account6: 7,
  },
    abiExporter: {
        path: "../subgraph/abis",
        runOnCompile: true,
        clear: true,
        flat: true,
        only: ["LendingPlatform", "USDCoin", "PoolShareToken"]
    }
};

if (
  process.env.HOLESKY_SECRET_KEY &&
  process.env.HOLESKY_TREASURY_SECRET_KEY &&
  config.networks
) {
  config.networks.holesky = {
    url: "https://rpc.holesky.ethpandaops.io",
    chainId: 17000,
    accounts: [
      process.env.HOLESKY_SECRET_KEY,
      process.env.HOLESKY_TREASURY_SECRET_KEY
    ]
  };
}

export default config;
