import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

    const NAME = "Mock Aave Ethereum WETH";
    const SYMBOL = "aEthWETH";

  const deployResult = await deploy("AETH", {
    from: deployer,
    log: true,
    args: [NAME, SYMBOL]
  });

};
export default func;
func.id = "deploy_aeth"; // id to prevent re-execution
func.tags = ["AETH"];
