import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;

    const { deployer } = await getNamedAccounts();
    const allDeployments = await deployments.all();

    await deploy("AdminLogic", {
        from: deployer,
        log: true,
        args: [],
        libraries: {
            HelpersLogic: allDeployments.HelpersLogic.address,
        }
    });
    await deploy("ShrubLendMath", {
        from: deployer,
        log: true,
        args: [],
        libraries: {
            WadRayMath: allDeployments.WadRayMath.address,
        }
    });
};
export default func;
func.id = "deploy_libraries_with_dep"; // id to prevent re-execution
func.tags = ["LibrariesWithDep"];
