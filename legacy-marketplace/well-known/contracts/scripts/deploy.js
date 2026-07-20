const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // For testnets, deploy mock USDT first
  const network = hre.network.name;
  let paymentTokenAddress;

  if (network === "hardhat" || network === "localhost" || network === "sepolia" || network === "bscTestnet") {
    console.log("\nDeploying MockUSDT...");
    const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
    const mockUSDT = await MockUSDT.deploy();
    await mockUSDT.waitForDeployment();
    paymentTokenAddress = await mockUSDT.getAddress();
    console.log("MockUSDT deployed to:", paymentTokenAddress);
  } else if (network === "mainnet") {
    // Mainnet USDT
    paymentTokenAddress = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
  } else if (network === "bsc") {
    // BSC USDT
    paymentTokenAddress = "0x55d398326f99059fF775485246999027B3197955";
  }

  // Deploy RWAProperty
  console.log("\nDeploying RWAProperty...");
  const RWAProperty = await hre.ethers.getContractFactory("RWAProperty");
  const rwaProperty = await RWAProperty.deploy(
    paymentTokenAddress,
    deployer.address // Treasury address
  );
  await rwaProperty.waitForDeployment();
  const rwaPropertyAddress = await rwaProperty.getAddress();
  console.log("RWAProperty deployed to:", rwaPropertyAddress);

  // Output deployment info
  console.log("\n=== Deployment Summary ===");
  console.log("Network:", network);
  console.log("Payment Token:", paymentTokenAddress);
  console.log("RWAProperty:", rwaPropertyAddress);
  console.log("Treasury:", deployer.address);

  // Save deployment addresses
  const fs = require("fs");
  const deploymentInfo = {
    network,
    paymentToken: paymentTokenAddress,
    rwaProperty: rwaPropertyAddress,
    treasury: deployer.address,
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    `./deployments/${network}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log(`\nDeployment info saved to ./deployments/${network}.json`);

  // Verify contracts on block explorer (skip for local networks)
  if (network !== "hardhat" && network !== "localhost") {
    console.log("\nWaiting for block confirmations before verification...");
    await new Promise((resolve) => setTimeout(resolve, 30000));

    try {
      await hre.run("verify:verify", {
        address: rwaPropertyAddress,
        constructorArguments: [paymentTokenAddress, deployer.address],
      });
      console.log("RWAProperty verified!");
    } catch (error) {
      console.log("Verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
