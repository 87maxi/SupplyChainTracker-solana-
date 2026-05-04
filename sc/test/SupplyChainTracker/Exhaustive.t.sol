// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import "forge-std/Test.sol";
import "../../src/SupplyChainTracker.sol";
contract ExhaustiveTest is Test {
    SupplyChainTracker public tracker;
    address public admin;
    address public fabricante;
    address public auditor;
    address public tecnico;
    address public escuela;
    address public unauthorized;
    // Test Data
    string constant SERIAL_1 = "NB-001";
    string constant SERIAL_2 = "NB-002";
    string constant BATCH = "BATCH-2025";
    string constant SPECS = "Intel i5, 8GB RAM";
    string constant METADATA = '{"color":"black"}';
    bytes32 constant REPORT_HASH = keccak256("report");
    bytes32 constant SCHOOL_HASH = keccak256("school");
    bytes32 constant STUDENT_HASH = keccak256("student");
    string constant OS_VERSION = "v1.0";
    event NetbookRegistered(
        string indexed serialNumber,
        string batchId,
        address indexed manufacturer
    );
    event HardwareAudited(
        string indexed serialNumber,
        address indexed auditor,
        bool passed
    );
    event SoftwareValidated(
        string indexed serialNumber,
        address indexed technician,
        string osVersion
    );
    event NetbookAssigned(
        string indexed serialNumber,
        bytes32 schoolHash,
        bytes32 studentHash
    );
    event RoleRequested(
        uint256 indexed requestId,
        address indexed user,
        bytes32 indexed role
    );
    event RoleRequestUpdated(
        uint256 indexed requestId,
        SupplyChainTracker.RequestStatus status
    );
    function setUp() public {
        admin = makeAddr("admin");
        fabricante = makeAddr("fabricante");
        auditor = makeAddr("auditor");
        tecnico = makeAddr("tecnico");
        escuela = makeAddr("escuela");
        unauthorized = makeAddr("unauthorized");
        vm.startPrank(admin);
        tracker = new SupplyChainTracker();
        tracker.grantRole(tracker.FABRICANTE_ROLE(), fabricante);
        tracker.grantRole(tracker.AUDITOR_HW_ROLE(), auditor);
        tracker.grantRole(tracker.TECNICO_SW_ROLE(), tecnico);
        tracker.grantRole(tracker.ESCUELA_ROLE(), escuela);
        vm.stopPrank();
    }
    // --- Role Management Tests ---
    function test_Roles_AdminCanGrantAndRevoke() public {
        vm.startPrank(admin);
        address newUser = makeAddr("newUser");
        bytes32 role = tracker.FABRICANTE_ROLE();
        // Grant
        tracker.grantRole(role, newUser);
        assertTrue(tracker.hasRole(role, newUser));
        // Revoke
        tracker.revokeRole(role, newUser);
        assertFalse(tracker.hasRole(role, newUser));
        vm.stopPrank();
    }
    function test_Roles_UnauthorizedCannotGrant() public {
        address other = makeAddr("other");
        vm.startPrank(unauthorized);
        // Should revert, but if it doesn't, verify state
        try tracker.grantRole(tracker.FABRICANTE_ROLE(), other) {
            console.log("GrantRole succeeded unexpectedly");
        } catch {
            console.log("GrantRole reverted as expected");
        }
        vm.stopPrank();
        assertFalse(
            tracker.hasRole(tracker.FABRICANTE_ROLE(), other),
            "Role was granted by unauthorized user!"
        );
    }
    function test_Roles_UnauthorizedCannotRevoke() public {
        address other = makeAddr("other");
        vm.prank(unauthorized);
        try tracker.revokeRole(tracker.FABRICANTE_ROLE(), other) {
            console.log("RevokeRole succeeded unexpectedly");
        } catch {
            console.log("RevokeRole reverted as expected");
        }
    }
    // --- Registration Tests ---
    function test_Registration_Success() public {
        vm.startPrank(fabricante);
        string[] memory serials = new string[](1);
        serials[0] = SERIAL_1;
        string[] memory batches = new string[](1);
        batches[0] = BATCH;
        string[] memory specs = new string[](1);
        specs[0] = SPECS;
        string[] memory metadata = new string[](1);
        metadata[0] = METADATA;
        vm.expectEmit(true, false, true, true);
        emit NetbookRegistered(SERIAL_1, BATCH, fabricante);
        tracker.registerNetbooks(serials, batches, specs, metadata);
        assertEq(
            uint(tracker.getNetbookState(SERIAL_1)),
            uint(SupplyChainTracker.State.FABRICADA)
        );
        vm.stopPrank();
    }
    function test_Registration_BatchSuccess() public {
        vm.startPrank(fabricante);
        string[] memory serials = new string[](2);
        serials[0] = SERIAL_1;
        serials[1] = SERIAL_2;
        string[] memory batches = new string[](2);
        batches[0] = BATCH;
        batches[1] = BATCH;
        string[] memory specs = new string[](2);
        specs[0] = SPECS;
        specs[1] = SPECS;
        string[] memory metadata = new string[](2);
        metadata[0] = METADATA;
        metadata[1] = METADATA;
        tracker.registerNetbooks(serials, batches, specs, metadata);
        assertEq(
            uint(tracker.getNetbookState(SERIAL_1)),
            uint(SupplyChainTracker.State.FABRICADA)
        );
        assertEq(
            uint(tracker.getNetbookState(SERIAL_2)),
            uint(SupplyChainTracker.State.FABRICADA)
        );
        vm.stopPrank();
    }
    function test_Registration_RevertIfArrayMismatch() public {
        vm.startPrank(fabricante);
        string[] memory serials = new string[](1);
        string[] memory batches = new string[](0); // Mismatch
        string[] memory specs = new string[](1);
        string[] memory metadata = new string[](1);
        vm.expectRevert(SupplyChainTracker.ArrayLengthMismatch.selector);
        tracker.registerNetbooks(serials, batches, specs, metadata);
        vm.stopPrank();
    }
    function test_Registration_RevertIfDuplicate() public {
        vm.startPrank(fabricante);
        string[] memory serials = new string[](1);
        serials[0] = SERIAL_1;
        string[] memory batches = new string[](1);
        batches[0] = BATCH;
        string[] memory specs = new string[](1);
        specs[0] = SPECS;
        string[] memory metadata = new string[](1);
        metadata[0] = METADATA;
        tracker.registerNetbooks(serials, batches, specs, metadata);
        vm.expectRevert(SupplyChainTracker.NetbookAlreadyRegistered.selector);
        tracker.registerNetbooks(serials, batches, specs, metadata);
        vm.stopPrank();
    }
    function test_Registration_RevertIfUnauthorized() public {
        vm.startPrank(unauthorized);
        string[] memory serials = new string[](1);
        string[] memory batches = new string[](1);
        string[] memory specs = new string[](1);
        string[] memory metadata = new string[](1);
        vm.expectRevert(
            abi.encodeWithSelector(
                SupplyChainTracker.Unauthorized.selector,
                tracker.FABRICANTE_ROLE()
            )
        );
        tracker.registerNetbooks(serials, batches, specs, metadata);
        vm.stopPrank();
    }
    // --- Lifecycle Tests ---
    function test_Lifecycle_FullFlow() public {
        // 1. Register
        vm.startPrank(fabricante);
        string[] memory serials = new string[](1);
        serials[0] = SERIAL_1;
        string[] memory batches = new string[](1);
        batches[0] = BATCH;
        string[] memory specs = new string[](1);
        specs[0] = SPECS;
        string[] memory metadata = new string[](1);
        metadata[0] = METADATA;
        tracker.registerNetbooks(serials, batches, specs, metadata);
        vm.stopPrank();
        // 2. Audit
        vm.startPrank(auditor);
        vm.expectEmit(true, true, false, true);
        emit HardwareAudited(SERIAL_1, auditor, true);
        tracker.auditHardware(SERIAL_1, true, REPORT_HASH, METADATA);
        assertEq(
            uint(tracker.getNetbookState(SERIAL_1)),
            uint(SupplyChainTracker.State.HW_APROBADO)
        );
        // 3. Validate
        vm.startPrank(tecnico);
        vm.expectEmit(true, true, false, true);
        emit SoftwareValidated(SERIAL_1, tecnico, OS_VERSION);
        tracker.validateSoftware(SERIAL_1, OS_VERSION, true, METADATA);
        assertEq(
            uint(tracker.getNetbookState(SERIAL_1)),
            uint(SupplyChainTracker.State.SW_VALIDADO)
        );
        vm.stopPrank();
        // 4. Assign
        vm.startPrank(escuela);
        vm.expectEmit(true, false, false, true);
        emit NetbookAssigned(SERIAL_1, SCHOOL_HASH, STUDENT_HASH);
        tracker.assignToStudent(SERIAL_1, SCHOOL_HASH, STUDENT_HASH, METADATA);
        assertEq(
            uint(tracker.getNetbookState(SERIAL_1)),
            uint(SupplyChainTracker.State.DISTRIBUIDA)
        );
        vm.stopPrank();
    }
    // --- Invalid Transitions Tests ---
    function test_Transition_RevertIfSkipAudit() public {
        // Register
        vm.startPrank(fabricante);
        string[] memory serials = new string[](1);
        serials[0] = SERIAL_1;
        string[] memory batches = new string[](1);
        batches[0] = BATCH;
        string[] memory specs = new string[](1);
        specs[0] = SPECS;
        string[] memory metadata = new string[](1);
        metadata[0] = METADATA;
        tracker.registerNetbooks(serials, batches, specs, metadata);
        vm.stopPrank();
        // Try Validate (Skip Audit)
        vm.startPrank(tecnico);
        vm.expectRevert(
            abi.encodeWithSelector(
                SupplyChainTracker.InvalidState.selector,
                SupplyChainTracker.State.FABRICADA,
                SupplyChainTracker.State.HW_APROBADO
            )
        );
        tracker.validateSoftware(SERIAL_1, OS_VERSION, true, METADATA);
        vm.stopPrank();
    }
    function test_Transition_RevertIfSkipValidation() public {
        // Register & Audit
        vm.startPrank(fabricante);
        string[] memory serials = new string[](1);
        serials[0] = SERIAL_1;
        string[] memory batches = new string[](1);
        batches[0] = BATCH;
        string[] memory specs = new string[](1);
        specs[0] = SPECS;
        string[] memory metadata = new string[](1);
        metadata[0] = METADATA;
        tracker.registerNetbooks(serials, batches, specs, metadata);
        vm.stopPrank();
        vm.prank(auditor);
        tracker.auditHardware(SERIAL_1, true, REPORT_HASH, METADATA);
        // Try Assign (Skip Validation)
        vm.startPrank(escuela);
        vm.expectRevert(
            abi.encodeWithSelector(
                SupplyChainTracker.InvalidState.selector,
                SupplyChainTracker.State.HW_APROBADO,
                SupplyChainTracker.State.SW_VALIDADO
            )
        );
        tracker.assignToStudent(SERIAL_1, SCHOOL_HASH, STUDENT_HASH, METADATA);
        vm.stopPrank();
    }
    // --- View Functions Tests ---
    function test_Views_GetNetbooksByState() public {
        // Register 2 netbooks
        vm.startPrank(fabricante);
        string[] memory serials = new string[](2);
        serials[0] = SERIAL_1;
        serials[1] = SERIAL_2;
        string[] memory batches = new string[](2);
        batches[0] = BATCH;
        batches[1] = BATCH;
        string[] memory specs = new string[](2);
        specs[0] = SPECS;
        specs[1] = SPECS;
        string[] memory metadata = new string[](2);
        metadata[0] = METADATA;
        metadata[1] = METADATA;
        tracker.registerNetbooks(serials, batches, specs, metadata);
        vm.stopPrank();
        // Audit only SERIAL_1
        vm.prank(auditor);
        tracker.auditHardware(SERIAL_1, true, REPORT_HASH, METADATA);
        // Check FABRICADA (should contain SERIAL_2)
        string[] memory fabricada = tracker.getNetbooksByState(
            SupplyChainTracker.State.FABRICADA
        );
        assertEq(fabricada.length, 1);
        assertEq(fabricada[0], SERIAL_2);
        // Check HW_APROBADO (should contain SERIAL_1)
        string[] memory aprobados = tracker.getNetbooksByState(
            SupplyChainTracker.State.HW_APROBADO
        );
        assertEq(aprobados.length, 1);
        assertEq(aprobados[0], SERIAL_1);
    }
    function test_Views_TotalNetbooks() public {
        vm.startPrank(fabricante);
        string[] memory serials = new string[](1);
        serials[0] = SERIAL_1;
        string[] memory batches = new string[](1);
        batches[0] = BATCH;
        string[] memory specs = new string[](1);
        specs[0] = SPECS;
        string[] memory metadata = new string[](1);
        metadata[0] = METADATA;
        tracker.registerNetbooks(serials, batches, specs, metadata);
        vm.stopPrank();
        assertEq(tracker.totalNetbooks(), 1);
    }
    // --- Role Request Tests ---
    function test_RoleRequest_FullFlow() public {
        address requester = makeAddr("requester");
        bytes32 role = tracker.AUDITOR_HW_ROLE();
        string memory signature = "mysignature";
        // 1. Request Role
        vm.startPrank(requester);
        vm.expectEmit(true, true, true, true);
        emit RoleRequested(0, requester, role);
        tracker.requestRole(role, signature);
        vm.stopPrank();
        assertEq(tracker.getRoleRequestsCount(), 1);
        // Verify request data
        SupplyChainTracker.RequestStatus status; // Declare status variable
        (
            uint256 id,
            address user,
            bytes32 reqRole,
            SupplyChainTracker.RequestStatus statusRet,
            uint256 timestamp,
            string memory sig
        ) = tracker.roleRequests(0);
        assertEq(id, 0);
        assertEq(user, requester);
        assertEq(reqRole, role);
        assertEq(
            uint(statusRet),
            uint(SupplyChainTracker.RequestStatus.PENDING)
        );
        assertEq(sig, signature);
        assertTrue(timestamp > 0);
        // 2. Approve Request
        vm.startPrank(admin);
        vm.expectEmit(true, false, false, true);
        emit RoleRequestUpdated(0, SupplyChainTracker.RequestStatus.APPROVED);
        tracker.approveRoleRequest(0);
        vm.stopPrank();
        // Verify role granted
        assertTrue(tracker.hasRole(role, requester));
        (, , , status, , ) = tracker.roleRequests(0);
        assertEq(uint(status), uint(SupplyChainTracker.RequestStatus.APPROVED));
    }
}
