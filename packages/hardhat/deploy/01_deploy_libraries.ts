import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;

    const { deployer } = await getNamedAccounts();

    await deploy("BorrowLogic", { from: deployer, log: true, args: [] });
    await deploy("ExtendBorrowLogic", { from: deployer, log: true, args: [] });
    await deploy("ExtendSupplyLogic", { from: deployer, log: true, args: [] });
    await deploy("HelpersLogic", { from: deployer, log: true, args: [] });
    await deploy("LiquidationLogic", { from: deployer, log: true, args: [] });
    await deploy("SupplyLogic", { from: deployer, log: true, args: [] });

    // External Libraries
    await deploy("PercentageMath", { from: deployer, log: true, args: [] });
    await deploy("WadRayMath", { from: deployer, log: true, args: [] });
};
export default func;
func.id = "deploy_libraries"; // id to prevent re-execution
func.tags = ["Libraries"];
