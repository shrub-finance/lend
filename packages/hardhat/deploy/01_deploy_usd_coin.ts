import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  const initialSupply = 1e6 // 1 million initial supply

  await deploy("USDCoin", {
    from: deployer,
    log: true,
    args: [initialSupply]
  });
};
export default func;
func.id = "deploy_usd_coin"; // id to prevent re-execution
func.tags = ["USDCoin"];
