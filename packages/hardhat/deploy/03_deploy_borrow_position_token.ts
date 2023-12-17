import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import {usdcAddress} from "@shrub-lend/app/src/utils/contracts";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();
  const usdCoinDeployment = await deployments.get('USDCoin');

  const NAME = "Shrub Borrow Position Token";
  const SYMBOL = "SBPT";
  const usdcAddress = usdCoinDeployment.address;

  const deployResult = await deploy("BorrowPositionToken", {
    from: deployer,
    log: true,
    args: [NAME, SYMBOL, usdcAddress]
  });

};
export default func;
func.id = "deploy_borrow_position_token"; // id to prevent re-execution
func.tags = ["BorrowPositionToken"];
