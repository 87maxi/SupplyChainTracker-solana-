// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../../src/SupplyChainTracker.sol";

contract EdgeCasesTest is Test {
    SupplyChainTracker public tracker;

    address public fabricante;
    address public auditor;
    address public tecnico;
    address public escuela;
    address public admin;
    address public unauthorized;

    string constant SERIAL_01 = "NB001";
    string constant SERIAL_02 = "NB002";
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
        
        // Usar direcciones conocidas
        fabricante = address(uint160(2));
        auditor = address(uint160(3));
        tecnico = address(uint160(4));
        escuela = address(uint160(5));
        admin = address(uint160(6));
        unauthorized = address(uint160(10));
        
        // Asegurar que las cuentas tengan saldo
        vm.deal(fabricante, 1 ether);
        vm.deal(auditor, 1 ether);
        vm.deal(tecnico, 1 ether);
        vm.deal(escuela, 1 ether);
        vm.deal(admin, 1 ether);
        vm.deal(unauthorized, 1 ether);
        
        // Otorgar roles
        vm.prank(address(this));
        tracker.grantRole(tracker.DEFAULT_ADMIN_ROLE(), admin);
        tracker.grantRole(tracker.FABRICANTE_ROLE(), fabricante);
        tracker.grantRole(tracker.AUDITOR_HW_ROLE(), auditor);
        tracker.grantRole(tracker.TECNICO_SW_ROLE(), tecnico);
        tracker.grantRole(tracker.ESCUELA_ROLE(), escuela);
    }

    // --- Edge Cases ---

    function test_edgeCase_registerEmptySerial() public {
        string[] memory serials = new string[](1);
        string[] memory batches = new string[](1);
        string[] memory specs = new string[](1);
        string[] memory metadata = new string[](1);
        
        serials[0] = ""; // Empty serial
        batches[0] = BATCH;
        specs[0] = SPECS;
        metadata[0] = REGISTER_METADATA;

        vm.prank(fabricante);
        vm.expectRevert(
            abi.encodeWithSelector(SupplyChainTracker.InvalidSerialNumber.selector)
        );
        tracker.registerNetbooks(serials, batches, specs, metadata);
    }

    function test_edgeCase_registerDuplicateSerial() public {
        string[] memory serials = new string[](1);
        string[] memory batches = new string[](1);
        string[] memory specs = new string[](1);
        string[] memory metadata = new string[](1);
        
        serials[0] = SERIAL_01;
        batches[0] = BATCH;
        specs[0] = SPECS;
        metadata[0] = REGISTER_METADATA;

        vm.prank(fabricante);
        tracker.registerNetbooks(serials, batches, specs, metadata);

        // Try to register same serial again
        vm.prank(fabricante);
        vm.expectRevert(
            abi.encodeWithSelector(SupplyChainTracker.NetbookAlreadyRegistered.selector)
        );
        tracker.registerNetbooks(serials, batches, specs, metadata);
    }

    function test_edgeCase_registerMultipleNetbooks() public {
        string[] memory serials = new string[](2);
        string[] memory batches = new string[](2);
        string[] memory specs = new string[](2);
        string[] memory metadata = new string[](2);
        
        serials[0] = SERIAL_01;
        serials[1] = SERIAL_02;
        batches[0] = BATCH;
        batches[1] = BATCH;
        specs[0] = SPECS;
        specs[1] = SPECS;
        metadata[0] = REGISTER_METADATA;
        metadata[1] = REGISTER_METADATA;

        vm.prank(fabricante);
        tracker.registerNetbooks(serials, batches, specs, metadata);

        assertEq(uint(tracker.getNetbookState(SERIAL_01)), uint(SupplyChainTracker.State.FABRICADA));
        assertEq(uint(tracker.getNetbookState(SERIAL_02)), uint(SupplyChainTracker.State.FABRICADA));
        assertEq(tracker.totalNetbooks(), 2);
    }

    function test_edgeCase_auditBeforeRegistration() public {
        vm.prank(auditor);
        vm.expectRevert(
            abi.encodeWithSelector(SupplyChainTracker.NetbookNotFound.selector)
        );
        tracker.auditHardware(SERIAL_01, true, REPORT_HASH, HARDWARE_METADATA);
    }

    function test_edgeCase_auditInvalidState() public {
        // Register netbook
        string[] memory serials = new string[](1);
        string[] memory batches = new string[](1);
        string[] memory specs = new string[](1);
        string[] memory metadata = new string[](1);
        
        serials[0] = SERIAL_01;
        batches[0] = BATCH;
        specs[0] = SPECS;
        metadata[0] = REGISTER_METADATA;

        vm.prank(fabricante);
        tracker.registerNetbooks(serials, batches, specs, metadata);

        // First audit the hardware
        vm.prank(auditor);
        tracker.auditHardware(SERIAL_01, true, REPORT_HASH, HARDWARE_METADATA);

        // Then validate the software
        vm.prank(tecnico);
        tracker.validateSoftware(SERIAL_01, OS_VERSION, true, SOFTWARE_METADATA);

        // Now try to audit again (invalid state)
        vm.prank(auditor);
        vm.expectRevert(
            abi.encodeWithSelector(
                SupplyChainTracker.InvalidState.selector,
                SupplyChainTracker.State.SW_VALIDADO,
                SupplyChainTracker.State.FABRICADA
            )
        );
        tracker.auditHardware(SERIAL_01, true, REPORT_HASH, HARDWARE_METADATA);
    }

    function test_edgeCase_validateBeforeHardwareAudit() public {
        // Register netbook
        string[] memory serials = new string[](1);
        string[] memory batches = new string[](1);
        string[] memory specs = new string[](1);
        string[] memory metadata = new string[](1);
        
        serials[0] = SERIAL_01;
        batches[0] = BATCH;
        specs[0] = SPECS;
        metadata[0] = REGISTER_METADATA;

        vm.prank(fabricante);
        tracker.registerNetbooks(serials, batches, specs, metadata);

        vm.prank(tecnico);
        vm.expectRevert(
            abi.encodeWithSelector(
                SupplyChainTracker.InvalidState.selector,
                SupplyChainTracker.State.FABRICADA,
                SupplyChainTracker.State.HW_APROBADO
            )
        );
        tracker.validateSoftware(SERIAL_01, OS_VERSION, true, SOFTWARE_METADATA);
    }
}