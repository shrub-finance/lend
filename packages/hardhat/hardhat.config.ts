import {extendEnvironment, HardhatUserConfig} from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-deploy";
import "hardhat-abi-exporter";
import "./hardhat-tasks";
import "./hardhat-tests";

import getDeployedContracts from "./scripts/get-deployed-contracts";

extendEnvironment((hre) => {
    async function init() {
        const {ethers, deployments} = hre;
        hre.aeth = await ethers.getContractAt("AETH", (await deployments.get('AETH')).address);
        hre.usdc = await ethers.getContractAt("USDCoin", (await deployments.get('USDCoin')).address);
        hre.bpt = await ethers.getContractAt("BorrowPositionToken", (await deployments.get('BorrowPositionToken')).address);
        hre.lendingPlatform = await ethers.getContractAt("LendingPlatform", (await deployments.get('LendingPlatform')).address);
        hre.mockAaveV3 = await ethers.getContractAt("MockAaveV3", (await deployments.get('MockAaveV3')).address);
        hre.mockChainlinkAggregator = await ethers.getContractAt("MockChainlinkAggregator", (await deployments.get('MockChainlinkAggregator')).address);
            
        // const { aeth, usdc, bpt, lendingPlatform, mockAaveV3, mockChainlinkAggregator } = await require('./scripts/get-deployed-contracts')(hre)
        const { account1, account2, account3, account4, account5, account6, deployer, shrubTreasury } = await hre.getNamedAccounts()
        // hre.aeth = aeth;
        // hre.usdc = usdc;
        // hre.bpt = bpt;
        // hre.lendingPlatform = lendingPlatform;
        // hre.mockAaveV3 = mockAaveV3;
        // hre.mockChainlinkAggregator = mockChainlinkAggregator;
        hre.account1 = account1;
        hre.account2 = account2;
        hre.account3 = account3;
        hre.account4 = account4;
        hre.account5 = account5;
        hre.account6 = account6;
        hre.deployer = deployer;
        hre.shrubTreasury = shrubTreasury;
    }
    init().then().catch(console.log)
});

const config: HardhatUserConfig = {
  solidity: "0.8.18",
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      chainId: 1337,
      // chainId: 1337,
      // mining: {
      //   auto: false,
      //   interval: [3000, 3500] // Simulate mining time between 3 and 6 seconds
      // }
    }
  },
  namedAccounts: {
    deployer: 0,
    account1: 1,
    account2: 2,
    account3: 3,
    account4: 4,
    account5: 5,
    account6: 6,
    shrubTreasury: 7
  },
    abiExporter: {
        path: "../subgraph/abis",
        runOnCompile: true,
        clear: true,
        flat: true,
        only: ["LendingPlatform", "USDCoin", "PoolShareToken"]
    }
};

export default config;
