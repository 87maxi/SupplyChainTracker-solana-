// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../../src/SupplyChainTracker.sol";

contract FunctionalTests is Test {
    SupplyChainTracker public tracker;

    address public admin;
    address public fabricante;
    address public auditor;
    address public tecnico;
    address public escuela;
    address public unauthorized;

    // Common test data
    string constant SERIAL_ONE = "NB001";
    string constant SERIAL_TWO = "NB002";
    string constant BATCH = "LOT-2025-01";
    string constant SPECS = "Modelo X-256 RAM 4GB SSD 32GB";
    string constant OS_VERSION = "Linux Edu 5.1";
    bytes32 constant SCHOOL_HASH = keccak256("school");
    bytes32 constant STUDENT_HASH = keccak256("student");
    bytes32 constant REPORT_HASH = keccak256("report");
    
    string constant REGISTER_METADATA = "{\"deviceType\":\"netbook\",\"manufacturer\":\"TechCorp\",\"warrantyPeriod\":\"2 years\"}";
    string constant HARDWARE_METADATA = "{\"cpu\":\"Intel i3\",\"ram\":\"4GB\",\"ssd\":\"128GB\",\"batteryHealth\":\"98%\",\"externalDevices\": [\"mouse\",\"keyboard\"]}";
    string constant SOFTWARE_METADATA = "{\"os\":\"Linux Edu\",\"kernel\":\"5.10\",\"installedApps\": [\"LibreOffice\",\"Firefox\",\"GIMP\"],\"securityPatchLevel\":\"2025-01-01\"}";
    string constant ASSIGNMENT_METADATA = "{\"school\":\"Escuela Secundaria #1\",\"grade\":\"10th\",\"assignedTeacher\":\"Ana Martinez\",\"expectedReturnDate\":\"2027-12-15\"}";

    function setUp() public {
        tracker = new SupplyChainTracker();
        
        // Setup accounts using deterministic addresses from anvil
        fabricante = address(uint160(2));
        auditor = address(uint160(3));
        tecnico = address(uint160(4));
        escuela = address(uint160(5));
        admin = address(uint160(6));
        unauthorized = address(uint160(10));
        
        // Fund accounts
        vm.deal(fabricante, 1 ether);
        vm.deal(auditor, 1 ether);
        vm.deal(tecnico, 1 ether);
        vm.deal(escuela, 1 ether);
        vm.deal(admin, 1 ether);
        vm.deal(unauthorized, 1 ether);
        
        // Grant roles (from contract deployer, which has DEFAULT_ADMIN_ROLE)
        vm.startPrank(address(this));
        tracker.grantRole(tracker.DEFAULT_ADMIN_ROLE(), admin);
        tracker.grantRole(tracker.FABRICANTE_ROLE(), fabricante);
        tracker.grantRole(tracker.AUDITOR_HW_ROLE(), auditor);
        tracker.grantRole(tracker.TECNICO_SW_ROLE(), tecnico);
        tracker.grantRole(tracker.ESCUELA_ROLE(), escuela);
        vm.stopPrank();
    }

    // Helper functions to create arrays
    function createStringArray(string memory item) internal pure returns (string[] memory) {
        string[] memory arr = new string[](1);
        arr[0] = item;
        return arr;
    }
    
    function createStringArray2(string memory item1, string memory item2) internal pure returns (string[] memory) {
        string[] memory arr = new string[](2);
        arr[0] = item1;
        arr[1] = item2;
        return arr;
    }

    //--- Full Lifecycle Tests ---

    function test_fullLifecycle_Success() public {
        // 1. Register netbook
        string[] memory serials = createStringArray(SERIAL_ONE);
        string[] memory batches = createStringArray(BATCH);
        string[] memory specs = createStringArray(SPECS);
        string[] memory metadata = createStringArray(REGISTER_METADATA);
        
        vm.prank(fabricante);
        tracker.registerNetbooks(serials, batches, specs, metadata);

        // Verify initial state
        assertEq(uint(tracker.getNetbookState(SERIAL_ONE)), uint(SupplyChainTracker.State.FABRICADA), "State should be FABRICADA");
        SupplyChainTracker.Netbook memory nb = tracker.getNetbookReport(SERIAL_ONE);
        assertEq(nb.batchId, BATCH, "Batch ID mismatch");
        assertEq(nb.initialModelSpecs, SPECS, "Model specs mismatch");
        
        // Verify token and metadata
        uint256 tokenId = tracker.getTokenId(SERIAL_ONE);
        assertEq(tracker.getSerialNumber(tokenId), SERIAL_ONE, "Serial number mismatch in token mapping");
        assertEq(tracker.getTokenMetadata(tokenId), REGISTER_METADATA, "Initial metadata mismatch");
        
        // 2. Audit same netbook
        vm.prank(auditor);
        tracker.auditHardware(SERIAL_ONE, true, REPORT_HASH, HARDWARE_METADATA);
        
        // Verify hardware state
        assertEq(uint(tracker.getNetbookState(SERIAL_ONE)), uint(SupplyChainTracker.State.HW_APROBADO), "State should be HW_APROBADO");
        nb = tracker.getNetbookReport(SERIAL_ONE);
        assertEq(nb.hwAuditor, auditor, "HW auditor mismatch");
        assertTrue(nb.hwIntegrityPassed, "HW integrity should pass");
        assertEq(nb.hwReportHash, REPORT_HASH, "HW report hash mismatch");
        
        // Verify token metadata updated
        assertEq(tracker.getTokenMetadata(tokenId), HARDWARE_METADATA, "Hardware metadata mismatch");
        
        // 3. Validate software
        vm.prank(tecnico);
        tracker.validateSoftware(SERIAL_ONE, OS_VERSION, true, SOFTWARE_METADATA);
        
        // Verify software state
        assertEq(uint(tracker.getNetbookState(SERIAL_ONE)), uint(SupplyChainTracker.State.SW_VALIDADO), "State should be SW_VALIDADO");
        nb = tracker.getNetbookReport(SERIAL_ONE);
        assertEq(nb.swTechnician, tecnico, "SW technician mismatch");
        assertEq(nb.osVersion, OS_VERSION, "OS version mismatch");
        assertTrue(nb.swValidationPassed, "SW validation should pass");
        
        // Verify token metadata updated
        assertEq(tracker.getTokenMetadata(tokenId), SOFTWARE_METADATA, "Software metadata mismatch");
        
        // 4. Assign to student
        vm.prank(escuela);
        tracker.assignToStudent(SERIAL_ONE, SCHOOL_HASH, STUDENT_HASH, ASSIGNMENT_METADATA);
        
        // Verify final state
        assertEq(uint(tracker.getNetbookState(SERIAL_ONE)), uint(SupplyChainTracker.State.DISTRIBUIDA), "State should be DISTRIBUIDA");
        nb = tracker.getNetbookReport(SERIAL_ONE);
        assertEq(nb.destinationSchoolHash, SCHOOL_HASH, "School hash mismatch");
        assertEq(nb.studentIdHash, STUDENT_HASH, "Student hash mismatch");
        assertTrue(nb.distributionTimestamp > 0, "Distribution timestamp should be set");
        assertEq(uint(nb.currentState), uint(SupplyChainTracker.State.DISTRIBUIDA), "Final state mismatch");
    }
}
