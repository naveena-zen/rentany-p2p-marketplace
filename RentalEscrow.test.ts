import { expect } from "chai";
import { ethers } from "hardhat";

describe("RentalEscrow", function () {
  let escrow: any;
  let owner: any;
  let renter: any;
  let arbitrator: any;

  beforeEach(async function () {
    [arbitrator, renter, owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("RentalEscrow", arbitrator);
    escrow = await Factory.deploy();
  });

  it("should create escrow with deposit", async function () {
    const agreementId = ethers.id("agreement-1");
    const depositAmount = ethers.parseEther("1.0");

    await escrow.connect(renter).createEscrow(agreementId, owner.address, { value: depositAmount });
    const stored = await escrow.getEscrow(agreementId);

    expect(stored.renter).to.equal(renter.address);
    expect(stored.owner).to.equal(owner.address);
    expect(stored.amount).to.equal(depositAmount);
    expect(stored.status).to.equal(1); // EscrowStatus.PENDING
  });

  it("should release funds to owner when renter confirms completion", async function () {
    const agreementId = ethers.id("agreement-2");
    const depositAmount = ethers.parseEther("1.0");

    await escrow.connect(renter).createEscrow(agreementId, owner.address, { value: depositAmount });

    const initialOwnerBal = await ethers.provider.getBalance(owner.address);
    await escrow.connect(renter).confirmCompletion(agreementId);

    const finalOwnerBal = await ethers.provider.getBalance(owner.address);
    const expectedPayout = (depositAmount * 95n) / 100n; // 95% after 5% fee

    expect(finalOwnerBal - initialOwnerBal).to.equal(expectedPayout);
  });

  it("should handle dispute resolution by arbitrator (SPLIT)", async function () {
    const agreementId = ethers.id("agreement-3");
    const depositAmount = ethers.parseEther("1.0");

    await escrow.connect(renter).createEscrow(agreementId, owner.address, { value: depositAmount });
    await escrow.connect(renter).raiseDispute(agreementId);

    await escrow.connect(arbitrator).resolveDispute(agreementId, 3); // SPLIT
    const stored = await escrow.getEscrow(agreementId);
    expect(stored.status).to.equal(4); // EscrowStatus.SPLIT
  });
});
