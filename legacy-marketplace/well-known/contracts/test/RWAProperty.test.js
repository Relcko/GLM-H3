const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("RWAProperty", function () {
  // Fixture for deploying contracts
  async function deployContractsFixture() {
    const [owner, treasury, buyer1, buyer2, other] = await ethers.getSigners();

    // Deploy MockUSDT
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const mockUSDT = await MockUSDT.deploy();
    await mockUSDT.waitForDeployment();

    // Deploy RWAProperty
    const RWAProperty = await ethers.getContractFactory("RWAProperty");
    const rwaProperty = await RWAProperty.deploy(
      await mockUSDT.getAddress(),
      treasury.address
    );
    await rwaProperty.waitForDeployment();

    return { rwaProperty, mockUSDT, owner, treasury, buyer1, buyer2, other };
  }

  // Fixture with a property already created
  async function deployWithPropertyFixture() {
    const { rwaProperty, mockUSDT, owner, treasury, buyer1, buyer2, other } =
      await loadFixture(deployContractsFixture);

    const totalSupply = 1000n;
    const pricePerToken = ethers.parseEther("100"); // 100 USDT per token
    const uri = "ipfs://QmPropertyMetadata123";

    await rwaProperty.createProperty(totalSupply, pricePerToken, uri);

    return {
      rwaProperty,
      mockUSDT,
      owner,
      treasury,
      buyer1,
      buyer2,
      other,
      propertyId: 1n,
      totalSupply,
      pricePerToken,
      uri,
    };
  }

  describe("Deployment", function () {
    it("should set the correct name and symbol", async function () {
      const { rwaProperty } = await loadFixture(deployContractsFixture);
      expect(await rwaProperty.name()).to.equal("RWA Property Tokens");
      expect(await rwaProperty.symbol()).to.equal("RWAP");
    });

    it("should set the correct payment token", async function () {
      const { rwaProperty, mockUSDT } = await loadFixture(deployContractsFixture);
      expect(await rwaProperty.paymentToken()).to.equal(await mockUSDT.getAddress());
    });

    it("should set the correct treasury", async function () {
      const { rwaProperty, treasury } = await loadFixture(deployContractsFixture);
      expect(await rwaProperty.treasury()).to.equal(treasury.address);
    });

    it("should set deployer as owner", async function () {
      const { rwaProperty, owner } = await loadFixture(deployContractsFixture);
      expect(await rwaProperty.owner()).to.equal(owner.address);
    });

    it("should revert with invalid payment token address", async function () {
      const [owner, treasury] = await ethers.getSigners();
      const RWAProperty = await ethers.getContractFactory("RWAProperty");
      await expect(
        RWAProperty.deploy(ethers.ZeroAddress, treasury.address)
      ).to.be.revertedWith("Invalid payment token");
    });

    it("should revert with invalid treasury address", async function () {
      const { mockUSDT } = await loadFixture(deployContractsFixture);
      const RWAProperty = await ethers.getContractFactory("RWAProperty");
      await expect(
        RWAProperty.deploy(await mockUSDT.getAddress(), ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid treasury");
    });
  });

  describe("Property Creation", function () {
    it("should create a property with correct details", async function () {
      const { rwaProperty } = await loadFixture(deployContractsFixture);

      const totalSupply = 500n;
      const pricePerToken = ethers.parseEther("50");
      const uri = "ipfs://QmTestProperty";

      await expect(rwaProperty.createProperty(totalSupply, pricePerToken, uri))
        .to.emit(rwaProperty, "PropertyCreated")
        .withArgs(1n, totalSupply, pricePerToken, uri);

      const property = await rwaProperty.getProperty(1n);
      expect(property.id).to.equal(1n);
      expect(property.propertyUri).to.equal(uri);
      expect(property.totalSupply).to.equal(totalSupply);
      expect(property.availableSupply).to.equal(totalSupply);
      expect(property.pricePerToken).to.equal(pricePerToken);
      expect(property.isActive).to.be.true;
      expect(property.exists).to.be.true;
    });

    it("should increment property count", async function () {
      const { rwaProperty } = await loadFixture(deployContractsFixture);

      expect(await rwaProperty.propertyCount()).to.equal(0n);

      await rwaProperty.createProperty(100n, ethers.parseEther("10"), "uri1");
      expect(await rwaProperty.propertyCount()).to.equal(1n);

      await rwaProperty.createProperty(200n, ethers.parseEther("20"), "uri2");
      expect(await rwaProperty.propertyCount()).to.equal(2n);
    });

    it("should revert if called by non-owner", async function () {
      const { rwaProperty, other } = await loadFixture(deployContractsFixture);
      await expect(
        rwaProperty.connect(other).createProperty(100n, ethers.parseEther("10"), "uri")
      ).to.be.revertedWithCustomError(rwaProperty, "OwnableUnauthorizedAccount");
    });

    it("should revert with zero supply", async function () {
      const { rwaProperty } = await loadFixture(deployContractsFixture);
      await expect(
        rwaProperty.createProperty(0n, ethers.parseEther("10"), "uri")
      ).to.be.revertedWith("Supply must be > 0");
    });

    it("should revert with zero price", async function () {
      const { rwaProperty } = await loadFixture(deployContractsFixture);
      await expect(
        rwaProperty.createProperty(100n, 0n, "uri")
      ).to.be.revertedWith("Price must be > 0");
    });
  });

  describe("Token Purchase", function () {
    it("should allow purchase of tokens", async function () {
      const { rwaProperty, mockUSDT, buyer1, treasury, propertyId, pricePerToken } =
        await loadFixture(deployWithPropertyFixture);

      const amount = 5n;
      const totalCost = amount * pricePerToken;

      // Mint USDT to buyer and approve
      await mockUSDT.mint(buyer1.address, totalCost);
      await mockUSDT.connect(buyer1).approve(await rwaProperty.getAddress(), totalCost);

      // Purchase tokens
      await expect(rwaProperty.connect(buyer1).purchaseTokens(propertyId, amount))
        .to.emit(rwaProperty, "TokensPurchased")
        .withArgs(propertyId, buyer1.address, amount, totalCost);

      // Verify balances
      expect(await rwaProperty.balanceOf(buyer1.address, propertyId)).to.equal(amount);
      expect(await mockUSDT.balanceOf(treasury.address)).to.equal(totalCost);
    });

    it("should update available supply after purchase", async function () {
      const { rwaProperty, mockUSDT, buyer1, propertyId, pricePerToken, totalSupply } =
        await loadFixture(deployWithPropertyFixture);

      const amount = 10n;
      const totalCost = amount * pricePerToken;

      await mockUSDT.mint(buyer1.address, totalCost);
      await mockUSDT.connect(buyer1).approve(await rwaProperty.getAddress(), totalCost);
      await rwaProperty.connect(buyer1).purchaseTokens(propertyId, amount);

      const property = await rwaProperty.getProperty(propertyId);
      expect(property.availableSupply).to.equal(totalSupply - amount);
    });

    it("should revert if property does not exist", async function () {
      const { rwaProperty, buyer1 } = await loadFixture(deployWithPropertyFixture);
      await expect(
        rwaProperty.connect(buyer1).purchaseTokens(999n, 1n)
      ).to.be.revertedWith("Property does not exist");
    });

    it("should revert if property is not active", async function () {
      const { rwaProperty, mockUSDT, buyer1, propertyId, pricePerToken } =
        await loadFixture(deployWithPropertyFixture);

      await rwaProperty.updateProperty(propertyId, 0n, false);

      const amount = 5n;
      await mockUSDT.mint(buyer1.address, amount * pricePerToken);
      await mockUSDT.connect(buyer1).approve(await rwaProperty.getAddress(), amount * pricePerToken);

      await expect(
        rwaProperty.connect(buyer1).purchaseTokens(propertyId, amount)
      ).to.be.revertedWith("Property not active");
    });

    it("should revert if amount is zero", async function () {
      const { rwaProperty, buyer1, propertyId } = await loadFixture(deployWithPropertyFixture);
      await expect(
        rwaProperty.connect(buyer1).purchaseTokens(propertyId, 0n)
      ).to.be.revertedWith("Amount must be > 0");
    });

    it("should revert if insufficient supply", async function () {
      const { rwaProperty, mockUSDT, buyer1, propertyId, pricePerToken, totalSupply } =
        await loadFixture(deployWithPropertyFixture);

      const amount = totalSupply + 1n;
      const totalCost = amount * pricePerToken;

      await mockUSDT.mint(buyer1.address, totalCost);
      await mockUSDT.connect(buyer1).approve(await rwaProperty.getAddress(), totalCost);

      await expect(
        rwaProperty.connect(buyer1).purchaseTokens(propertyId, amount)
      ).to.be.revertedWith("Insufficient supply");
    });

    it("should revert if paused", async function () {
      const { rwaProperty, mockUSDT, buyer1, propertyId, pricePerToken } =
        await loadFixture(deployWithPropertyFixture);

      await rwaProperty.pause();

      const amount = 5n;
      await mockUSDT.mint(buyer1.address, amount * pricePerToken);
      await mockUSDT.connect(buyer1).approve(await rwaProperty.getAddress(), amount * pricePerToken);

      await expect(
        rwaProperty.connect(buyer1).purchaseTokens(propertyId, amount)
      ).to.be.revertedWithCustomError(rwaProperty, "EnforcedPause");
    });
  });

  describe("Admin Mint", function () {
    it("should allow owner to mint tokens", async function () {
      const { rwaProperty, buyer1, propertyId, totalSupply } =
        await loadFixture(deployWithPropertyFixture);

      const amount = 10n;

      await expect(rwaProperty.adminMint(propertyId, buyer1.address, amount))
        .to.emit(rwaProperty, "TokensMinted")
        .withArgs(propertyId, buyer1.address, amount);

      expect(await rwaProperty.balanceOf(buyer1.address, propertyId)).to.equal(amount);

      const property = await rwaProperty.getProperty(propertyId);
      expect(property.availableSupply).to.equal(totalSupply - amount);
    });

    it("should revert if called by non-owner", async function () {
      const { rwaProperty, buyer1, other, propertyId } =
        await loadFixture(deployWithPropertyFixture);

      await expect(
        rwaProperty.connect(other).adminMint(propertyId, buyer1.address, 10n)
      ).to.be.revertedWithCustomError(rwaProperty, "OwnableUnauthorizedAccount");
    });

    it("should revert for non-existent property", async function () {
      const { rwaProperty, buyer1 } = await loadFixture(deployWithPropertyFixture);
      await expect(
        rwaProperty.adminMint(999n, buyer1.address, 10n)
      ).to.be.revertedWith("Property does not exist");
    });

    it("should revert if amount exceeds available supply", async function () {
      const { rwaProperty, buyer1, propertyId, totalSupply } =
        await loadFixture(deployWithPropertyFixture);

      await expect(
        rwaProperty.adminMint(propertyId, buyer1.address, totalSupply + 1n)
      ).to.be.revertedWith("Insufficient supply");
    });

    it("should revert for zero address", async function () {
      const { rwaProperty, propertyId } = await loadFixture(deployWithPropertyFixture);
      await expect(
        rwaProperty.adminMint(propertyId, ethers.ZeroAddress, 10n)
      ).to.be.revertedWith("Invalid address");
    });

    it("should revert for zero amount", async function () {
      const { rwaProperty, buyer1, propertyId } = await loadFixture(deployWithPropertyFixture);
      await expect(
        rwaProperty.adminMint(propertyId, buyer1.address, 0n)
      ).to.be.revertedWith("Amount must be > 0");
    });
  });

  describe("Property Update", function () {
    it("should update property price and status", async function () {
      const { rwaProperty, propertyId } = await loadFixture(deployWithPropertyFixture);

      const newPrice = ethers.parseEther("150");

      await expect(rwaProperty.updateProperty(propertyId, newPrice, false))
        .to.emit(rwaProperty, "PropertyUpdated")
        .withArgs(propertyId, newPrice, false);

      const property = await rwaProperty.getProperty(propertyId);
      expect(property.pricePerToken).to.equal(newPrice);
      expect(property.isActive).to.be.false;
    });

    it("should keep original price if zero is passed", async function () {
      const { rwaProperty, propertyId, pricePerToken } =
        await loadFixture(deployWithPropertyFixture);

      await rwaProperty.updateProperty(propertyId, 0n, false);

      const property = await rwaProperty.getProperty(propertyId);
      expect(property.pricePerToken).to.equal(pricePerToken);
      expect(property.isActive).to.be.false;
    });

    it("should revert if called by non-owner", async function () {
      const { rwaProperty, other, propertyId } = await loadFixture(deployWithPropertyFixture);
      await expect(
        rwaProperty.connect(other).updateProperty(propertyId, ethers.parseEther("100"), true)
      ).to.be.revertedWithCustomError(rwaProperty, "OwnableUnauthorizedAccount");
    });

    it("should revert for non-existent property", async function () {
      const { rwaProperty } = await loadFixture(deployWithPropertyFixture);
      await expect(
        rwaProperty.updateProperty(999n, ethers.parseEther("100"), true)
      ).to.be.revertedWith("Property does not exist");
    });
  });

  describe("Property URI", function () {
    it("should return correct URI", async function () {
      const { rwaProperty, propertyId, uri } = await loadFixture(deployWithPropertyFixture);
      expect(await rwaProperty.uri(propertyId)).to.equal(uri);
    });

    it("should update URI", async function () {
      const { rwaProperty, propertyId } = await loadFixture(deployWithPropertyFixture);

      const newUri = "ipfs://QmNewMetadata456";
      await rwaProperty.setPropertyURI(propertyId, newUri);

      expect(await rwaProperty.uri(propertyId)).to.equal(newUri);

      const property = await rwaProperty.getProperty(propertyId);
      expect(property.propertyUri).to.equal(newUri);
    });

    it("should revert if called by non-owner", async function () {
      const { rwaProperty, other, propertyId } = await loadFixture(deployWithPropertyFixture);
      await expect(
        rwaProperty.connect(other).setPropertyURI(propertyId, "new-uri")
      ).to.be.revertedWithCustomError(rwaProperty, "OwnableUnauthorizedAccount");
    });

    it("should revert for non-existent property", async function () {
      const { rwaProperty } = await loadFixture(deployWithPropertyFixture);
      await expect(rwaProperty.uri(999n)).to.be.revertedWith("Property does not exist");
    });
  });

  describe("Treasury Management", function () {
    it("should update treasury address", async function () {
      const { rwaProperty, treasury, other } = await loadFixture(deployContractsFixture);

      await expect(rwaProperty.setTreasury(other.address))
        .to.emit(rwaProperty, "TreasuryUpdated")
        .withArgs(treasury.address, other.address);

      expect(await rwaProperty.treasury()).to.equal(other.address);
    });

    it("should revert with zero address", async function () {
      const { rwaProperty } = await loadFixture(deployContractsFixture);
      await expect(rwaProperty.setTreasury(ethers.ZeroAddress)).to.be.revertedWith(
        "Invalid treasury"
      );
    });

    it("should revert if called by non-owner", async function () {
      const { rwaProperty, other } = await loadFixture(deployContractsFixture);
      await expect(
        rwaProperty.connect(other).setTreasury(other.address)
      ).to.be.revertedWithCustomError(rwaProperty, "OwnableUnauthorizedAccount");
    });
  });

  describe("Payment Token Management", function () {
    it("should update payment token", async function () {
      const { rwaProperty, mockUSDT } = await loadFixture(deployContractsFixture);

      const NewToken = await ethers.getContractFactory("MockUSDT");
      const newToken = await NewToken.deploy();
      await newToken.waitForDeployment();

      await expect(rwaProperty.setPaymentToken(await newToken.getAddress()))
        .to.emit(rwaProperty, "PaymentTokenUpdated")
        .withArgs(await mockUSDT.getAddress(), await newToken.getAddress());

      expect(await rwaProperty.paymentToken()).to.equal(await newToken.getAddress());
    });

    it("should revert with zero address", async function () {
      const { rwaProperty } = await loadFixture(deployContractsFixture);
      await expect(rwaProperty.setPaymentToken(ethers.ZeroAddress)).to.be.revertedWith(
        "Invalid token"
      );
    });

    it("should revert if called by non-owner", async function () {
      const { rwaProperty, other, mockUSDT } = await loadFixture(deployContractsFixture);
      await expect(
        rwaProperty.connect(other).setPaymentToken(await mockUSDT.getAddress())
      ).to.be.revertedWithCustomError(rwaProperty, "OwnableUnauthorizedAccount");
    });
  });

  describe("Pause/Unpause", function () {
    it("should pause and unpause", async function () {
      const { rwaProperty } = await loadFixture(deployContractsFixture);

      await rwaProperty.pause();
      expect(await rwaProperty.paused()).to.be.true;

      await rwaProperty.unpause();
      expect(await rwaProperty.paused()).to.be.false;
    });

    it("should revert pause if called by non-owner", async function () {
      const { rwaProperty, other } = await loadFixture(deployContractsFixture);
      await expect(rwaProperty.connect(other).pause()).to.be.revertedWithCustomError(
        rwaProperty,
        "OwnableUnauthorizedAccount"
      );
    });

    it("should revert unpause if called by non-owner", async function () {
      const { rwaProperty, other } = await loadFixture(deployContractsFixture);
      await rwaProperty.pause();
      await expect(rwaProperty.connect(other).unpause()).to.be.revertedWithCustomError(
        rwaProperty,
        "OwnableUnauthorizedAccount"
      );
    });
  });

  describe("Emergency Withdraw", function () {
    it("should allow owner to withdraw stuck tokens", async function () {
      const { rwaProperty, mockUSDT, owner } = await loadFixture(deployContractsFixture);

      const amount = ethers.parseEther("100");
      await mockUSDT.mint(await rwaProperty.getAddress(), amount);

      await expect(rwaProperty.emergencyWithdraw(await mockUSDT.getAddress(), amount))
        .to.emit(rwaProperty, "EmergencyWithdraw")
        .withArgs(await mockUSDT.getAddress(), amount);

      expect(await mockUSDT.balanceOf(owner.address)).to.equal(amount);
    });

    it("should revert if called by non-owner", async function () {
      const { rwaProperty, mockUSDT, other } = await loadFixture(deployContractsFixture);
      await expect(
        rwaProperty.connect(other).emergencyWithdraw(await mockUSDT.getAddress(), 100n)
      ).to.be.revertedWithCustomError(rwaProperty, "OwnableUnauthorizedAccount");
    });
  });

  describe("Calculate Cost", function () {
    it("should calculate correct cost", async function () {
      const { rwaProperty, propertyId, pricePerToken } =
        await loadFixture(deployWithPropertyFixture);

      const amount = 7n;
      const expectedCost = amount * pricePerToken;

      expect(await rwaProperty.calculateCost(propertyId, amount)).to.equal(expectedCost);
    });

    it("should revert for non-existent property", async function () {
      const { rwaProperty } = await loadFixture(deployWithPropertyFixture);
      await expect(rwaProperty.calculateCost(999n, 10n)).to.be.revertedWith(
        "Property does not exist"
      );
    });
  });

  describe("Can Purchase Check", function () {
    it("should return true for valid purchase", async function () {
      const { rwaProperty, mockUSDT, buyer1, propertyId, pricePerToken } =
        await loadFixture(deployWithPropertyFixture);

      const amount = 5n;
      const totalCost = amount * pricePerToken;

      await mockUSDT.mint(buyer1.address, totalCost);
      await mockUSDT.connect(buyer1).approve(await rwaProperty.getAddress(), totalCost);

      const [canPurchase, reason] = await rwaProperty.canPurchase(propertyId, buyer1.address, amount);
      expect(canPurchase).to.be.true;
      expect(reason).to.equal("");
    });

    it("should return false for non-existent property", async function () {
      const { rwaProperty, buyer1 } = await loadFixture(deployWithPropertyFixture);

      const [canPurchase, reason] = await rwaProperty.canPurchase(999n, buyer1.address, 5n);
      expect(canPurchase).to.be.false;
      expect(reason).to.equal("Property does not exist");
    });

    it("should return false for inactive property", async function () {
      const { rwaProperty, buyer1, propertyId } = await loadFixture(deployWithPropertyFixture);

      await rwaProperty.updateProperty(propertyId, 0n, false);

      const [canPurchase, reason] = await rwaProperty.canPurchase(propertyId, buyer1.address, 5n);
      expect(canPurchase).to.be.false;
      expect(reason).to.equal("Property not active");
    });

    it("should return false for zero amount", async function () {
      const { rwaProperty, buyer1, propertyId } = await loadFixture(deployWithPropertyFixture);

      const [canPurchase, reason] = await rwaProperty.canPurchase(propertyId, buyer1.address, 0n);
      expect(canPurchase).to.be.false;
      expect(reason).to.equal("Amount must be > 0");
    });

    it("should return false for insufficient supply", async function () {
      const { rwaProperty, buyer1, propertyId, totalSupply } =
        await loadFixture(deployWithPropertyFixture);

      const [canPurchase, reason] = await rwaProperty.canPurchase(
        propertyId,
        buyer1.address,
        totalSupply + 1n
      );
      expect(canPurchase).to.be.false;
      expect(reason).to.equal("Insufficient supply");
    });

    it("should return false for insufficient balance", async function () {
      const { rwaProperty, mockUSDT, buyer1, propertyId, pricePerToken } =
        await loadFixture(deployWithPropertyFixture);

      const amount = 5n;
      await mockUSDT.connect(buyer1).approve(await rwaProperty.getAddress(), amount * pricePerToken);

      const [canPurchase, reason] = await rwaProperty.canPurchase(propertyId, buyer1.address, amount);
      expect(canPurchase).to.be.false;
      expect(reason).to.equal("Insufficient balance");
    });

    it("should return false for insufficient allowance", async function () {
      const { rwaProperty, mockUSDT, buyer1, propertyId, pricePerToken } =
        await loadFixture(deployWithPropertyFixture);

      const amount = 5n;
      await mockUSDT.mint(buyer1.address, amount * pricePerToken);

      const [canPurchase, reason] = await rwaProperty.canPurchase(propertyId, buyer1.address, amount);
      expect(canPurchase).to.be.false;
      expect(reason).to.equal("Insufficient allowance");
    });
  });

  describe("ERC1155 Functionality", function () {
    it("should allow token transfers", async function () {
      const { rwaProperty, mockUSDT, buyer1, buyer2, propertyId, pricePerToken } =
        await loadFixture(deployWithPropertyFixture);

      const amount = 10n;
      const totalCost = amount * pricePerToken;

      await mockUSDT.mint(buyer1.address, totalCost);
      await mockUSDT.connect(buyer1).approve(await rwaProperty.getAddress(), totalCost);
      await rwaProperty.connect(buyer1).purchaseTokens(propertyId, amount);

      // Transfer tokens
      await rwaProperty
        .connect(buyer1)
        .safeTransferFrom(buyer1.address, buyer2.address, propertyId, 5n, "0x");

      expect(await rwaProperty.balanceOf(buyer1.address, propertyId)).to.equal(5n);
      expect(await rwaProperty.balanceOf(buyer2.address, propertyId)).to.equal(5n);
    });

    it("should track total supply correctly", async function () {
      const { rwaProperty, mockUSDT, buyer1, propertyId, pricePerToken } =
        await loadFixture(deployWithPropertyFixture);

      const amount = 15n;
      const totalCost = amount * pricePerToken;

      await mockUSDT.mint(buyer1.address, totalCost);
      await mockUSDT.connect(buyer1).approve(await rwaProperty.getAddress(), totalCost);
      await rwaProperty.connect(buyer1).purchaseTokens(propertyId, amount);

      expect(await rwaProperty["totalSupply(uint256)"](propertyId)).to.equal(amount);
    });

    it("should allow burning tokens", async function () {
      const { rwaProperty, mockUSDT, buyer1, propertyId, pricePerToken } =
        await loadFixture(deployWithPropertyFixture);

      const amount = 10n;
      const totalCost = amount * pricePerToken;

      await mockUSDT.mint(buyer1.address, totalCost);
      await mockUSDT.connect(buyer1).approve(await rwaProperty.getAddress(), totalCost);
      await rwaProperty.connect(buyer1).purchaseTokens(propertyId, amount);

      // Burn tokens
      await rwaProperty.connect(buyer1).burn(buyer1.address, propertyId, 3n);

      expect(await rwaProperty.balanceOf(buyer1.address, propertyId)).to.equal(7n);
      expect(await rwaProperty["totalSupply(uint256)"](propertyId)).to.equal(7n);
    });
  });

  describe("MockUSDT", function () {
    it("should have correct name and symbol", async function () {
      const { mockUSDT } = await loadFixture(deployContractsFixture);
      expect(await mockUSDT.name()).to.equal("Mock USDT");
      expect(await mockUSDT.symbol()).to.equal("USDT");
    });

    it("should have 18 decimals", async function () {
      const { mockUSDT } = await loadFixture(deployContractsFixture);
      expect(await mockUSDT.decimals()).to.equal(18);
    });

    it("should allow owner to mint", async function () {
      const { mockUSDT, buyer1 } = await loadFixture(deployContractsFixture);
      const amount = ethers.parseEther("1000");
      await mockUSDT.mint(buyer1.address, amount);
      expect(await mockUSDT.balanceOf(buyer1.address)).to.equal(amount);
    });

    it("should allow faucet up to 10000 tokens", async function () {
      const { mockUSDT, buyer1 } = await loadFixture(deployContractsFixture);
      const amount = ethers.parseEther("10000");
      await mockUSDT.connect(buyer1).faucet(amount);
      expect(await mockUSDT.balanceOf(buyer1.address)).to.equal(amount);
    });

    it("should revert faucet over 10000 tokens", async function () {
      const { mockUSDT, buyer1 } = await loadFixture(deployContractsFixture);
      const amount = ethers.parseEther("10001");
      await expect(mockUSDT.connect(buyer1).faucet(amount)).to.be.revertedWith(
        "Max 10000 tokens per request"
      );
    });
  });
});
