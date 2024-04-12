import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-deploy";
import "hardhat-abi-exporter";
import "./hardhat-tasks";
import "./hardhat-tests";


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
    },
    external: {
      contracts: [
          {
              artifacts: '../../node_modules/@aave/deploy-v3/artifacts',
              deploy: '../../node_modules/@aave/deploy-v3/dist/deploy',
          }
        ]
    }
};

export default config;
