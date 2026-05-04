// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../../src/SupplyChainTracker.sol";

contract FuzzingTest is Test {
    SupplyChainTracker public tracker;

    address public admin;
    address public fabricante;
    address public auditor;
    address public tecnico;
    address public escuela;

    function setUp() public {
        admin = makeAddr("admin");
        fabricante = makeAddr("fabricante");
        auditor = makeAddr("auditor");
        tecnico = makeAddr("tecnico");
        escuela = makeAddr("escuela");

        vm.startPrank(admin);
        tracker = new SupplyChainTracker();
        
        tracker.grantRole(tracker.FABRICANTE_ROLE(), fabricante);
        tracker.grantRole(tracker.AUDITOR_HW_ROLE(), auditor);
        tracker.grantRole(tracker.TECNICO_SW_ROLE(), tecnico);
        tracker.grantRole(tracker.ESCUELA_ROLE(), escuela);
        vm.stopPrank();
    }

    // --- Fuzzing Tests ---

    function test_Fuzzing_RoleGrant(address randomUser) public {
        vm.assume(randomUser != address(0));
        vm.assume(randomUser != admin);
        vm.assume(randomUser != fabricante);
        vm.assume(randomUser != auditor);
        vm.assume(randomUser != tecnico);
        vm.assume(randomUser != escuela);

        // Only admin can grant roles
        vm.startPrank(admin);
        tracker.grantRole(tracker.FABRICANTE_ROLE(), randomUser);
        assertTrue(tracker.hasRole(tracker.FABRICANTE_ROLE(), randomUser));
        vm.stopPrank();

        // Clean up
        vm.startPrank(admin);
        tracker.revokeRole(tracker.FABRICANTE_ROLE(), randomUser);
        assertFalse(tracker.hasRole(tracker.FABRICANTE_ROLE(), randomUser));
        vm.stopPrank();
    }

    function test_Fuzzing_Lifecycle_FullFlow(string memory serial) public {
        // Precondition checks
        vm.assume(bytes(serial).length > 0);
        vm.assume(bytes(serial).length <= 50);
        vm.assume(keccak256(abi.encodePacked(serial)) != keccak256(abi.encodePacked("NB-001")));
        
        bytes32 reportHash = keccak256("report");
        bytes32 schoolHash = keccak256("school");
        bytes32 studentHash = keccak256("student");
        string memory osVersion = "v1.0";
        string memory metadata = "{\"color\":\"black\"}";

        // 1. Register
        vm.startPrank(fabricante);
        string[] memory serials = new string[](1);
        serials[0] = serial;
        string[] memory batches = new string[](1);
        batches[0] = "batch1";
        string[] memory specifications = new string[](1);
        specifications[0] = "specs";
        string[] memory meta = new string[](1);
        meta[0] = metadata;
        tracker.registerNetbooks(serials, batches, specifications, meta);
        vm.stopPrank();

        // 2. Audit
        vm.startPrank(auditor);
        tracker.auditHardware(serial, true, reportHash, metadata);
        assertEq(uint(tracker.getNetbookState(serial)), uint(SupplyChainTracker.State.HW_APROBADO));
        vm.stopPrank();

        // 3. Validate
        vm.startPrank(tecnico);
        tracker.validateSoftware(serial, osVersion, true, metadata);
        assertEq(uint(tracker.getNetbookState(serial)), uint(SupplyChainTracker.State.SW_VALIDADO));
        vm.stopPrank();

        // 4. Assign
        vm.startPrank(escuela);
        tracker.assignToStudent(serial, schoolHash, studentHash, metadata);
        assertEq(uint(tracker.getNetbookState(serial)), uint(SupplyChainTracker.State.DISTRIBUIDA));
        vm.stopPrank();
    }

    function test_Fuzzing_RoleRequest(address randomUser, bytes32 randomRole, string memory randomSignature) public {
        vm.assume(randomUser != address(0));
        
        vm.prank(randomUser);
        tracker.requestRole(randomRole, randomSignature);
        
        uint256 count = tracker.getRoleRequestsCount();
        assertTrue(count > 0);
        
        (uint256 id, address user, bytes32 role, SupplyChainTracker.RequestStatus status, uint256 timestamp, string memory sig) = tracker.roleRequests(count - 1);
        assertEq(user, randomUser);
        assertEq(role, randomRole);
        assertEq(uint(status), uint(SupplyChainTracker.RequestStatus.PENDING));
        assertEq(sig, randomSignature);
        assertEq(id, count - 1);
        assertTrue(timestamp > 0);
    }

    function test_Fuzzing_Registration_ArrayMismatch(
        uint8 serialsLen,
        uint8 batchesLen,
        uint8 specsLen,
        uint8 metadataLen
    ) public {
        // We want to test when at least one length is different
        vm.assume(
            serialsLen != batchesLen || 
            serialsLen != specsLen || 
            serialsLen != metadataLen
        );

        string[] memory serials = new string[](serialsLen);
        string[] memory batches = new string[](batchesLen);
        string[] memory specs = new string[](specsLen);
        string[] memory metadata = new string[](metadataLen);

        vm.prank(fabricante);
        vm.expectRevert(SupplyChainTracker.ArrayLengthMismatch.selector);
        tracker.registerNetbooks(serials, batches, specs, metadata);
    }
}
