// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract RentalEscrow {
    address public immutable arbitrator;
    uint256 public constant PLATFORM_FEE_PERCENT = 5; // 5% fee

    enum EscrowStatus { UNFUNDED, PENDING, RELEASED, REFUNDED, SPLIT, DISPUTED }

    struct Escrow {
        bytes32 agreementId;
        address payable renter;
        address payable owner;
        uint256 amount;
        EscrowStatus status;
        bool renterConfirmed;
        bool ownerConfirmed;
        uint256 createdAt;
    }

    mapping(bytes32 => Escrow) public escrows;

    event EscrowCreated(bytes32 indexed agreementId, address indexed renter, address indexed owner, uint256 amount);
    event EscrowReleased(bytes32 indexed agreementId, address indexed owner, uint256 ownerAmount, uint256 feeAmount);
    event EscrowRefunded(bytes32 indexed agreementId, address indexed renter, uint256 refundAmount);
    event EscrowSplit(bytes32 indexed agreementId, uint256 renterAmount, uint256 ownerAmount);
    event DisputeRaised(bytes32 indexed agreementId, address indexed raisedBy);
    event DisputeResolved(bytes32 indexed agreementId, uint8 resolution);

    modifier onlyArbitrator() {
        require(msg.sender == arbitrator, "Only arbitrator can perform this action");
        _;
    }

    constructor() {
        arbitrator = msg.sender;
    }

    function createEscrow(bytes32 agreementId, address payable owner) external payable {
        require(msg.value > 0, "Escrow amount must be > 0");
        require(escrows[agreementId].status == EscrowStatus.UNFUNDED, "Escrow already exists");
        require(owner != address(0), "Invalid owner address");
        require(owner != msg.sender, "Owner and renter cannot be same address");

        escrows[agreementId] = Escrow({
            agreementId: agreementId,
            renter: payable(msg.sender),
            owner: owner,
            amount: msg.value,
            status: EscrowStatus.PENDING,
            renterConfirmed: false,
            ownerConfirmed: false,
            createdAt: block.timestamp
        });

        emit EscrowCreated(agreementId, msg.sender, owner, msg.value);
    }

    function confirmCompletion(bytes32 agreementId) external {
        Escrow storage escrow = escrows[agreementId];
        require(escrow.status == EscrowStatus.PENDING, "Escrow is not in PENDING state");
        require(msg.sender == escrow.renter || msg.sender == escrow.owner, "Not authorized to confirm");

        if (msg.sender == escrow.renter) {
            escrow.renterConfirmed = true;
        }
        if (msg.sender == escrow.owner) {
            escrow.ownerConfirmed = true;
        }

        // If renter confirms (or both confirm), release funds to owner minus fee
        if (escrow.renterConfirmed) {
            escrow.status = EscrowStatus.RELEASED;
            uint256 fee = (escrow.amount * PLATFORM_FEE_PERCENT) / 100;
            uint256 payout = escrow.amount - fee;

            escrow.owner.transfer(payout);
            payable(arbitrator).transfer(fee);

            emit EscrowReleased(agreementId, escrow.owner, payout, fee);
        }
    }

    function raiseDispute(bytes32 agreementId) external {
        Escrow storage escrow = escrows[agreementId];
        require(escrow.status == EscrowStatus.PENDING, "Escrow must be PENDING to dispute");
        require(msg.sender == escrow.renter || msg.sender == escrow.owner, "Not party to agreement");

        escrow.status = EscrowStatus.DISPUTED;
        emit DisputeRaised(agreementId, msg.sender);
    }

    function resolveDispute(bytes32 agreementId, uint8 resolution) external onlyArbitrator {
        Escrow storage escrow = escrows[agreementId];
        require(escrow.status == EscrowStatus.DISPUTED, "Escrow is not in DISPUTED state");

        if (resolution == 1) { // REFUND_RENTER
            escrow.status = EscrowStatus.REFUNDED;
            escrow.renter.transfer(escrow.amount);
            emit EscrowRefunded(agreementId, escrow.renter, escrow.amount);
        } else if (resolution == 2) { // PAY_OWNER
            escrow.status = EscrowStatus.RELEASED;
            uint256 fee = (escrow.amount * PLATFORM_FEE_PERCENT) / 100;
            uint256 payout = escrow.amount - fee;
            escrow.owner.transfer(payout);
            payable(arbitrator).transfer(fee);
            emit EscrowReleased(agreementId, escrow.owner, payout, fee);
        } else if (resolution == 3) { // SPLIT
            escrow.status = EscrowStatus.SPLIT;
            uint256 half = escrow.amount / 2;
            escrow.renter.transfer(half);
            escrow.owner.transfer(escrow.amount - half);
            emit EscrowSplit(agreementId, half, escrow.amount - half);
        } else {
            revert("Invalid resolution code");
        }

        emit DisputeResolved(agreementId, resolution);
    }

    function getEscrow(bytes32 agreementId) external view returns (Escrow memory) {
        return escrows[agreementId];
    }
}
