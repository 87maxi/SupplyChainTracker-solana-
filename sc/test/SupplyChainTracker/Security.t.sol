// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../../src/SupplyChainTracker.sol";

contract SecurityTest is Test {
    SupplyChainTracker public tracker;

    address public fabricante;
    address public auditor;
    address public tecnico;
    address public escuela;
    address public admin;
    address public unauthorized;

    string constant SERIAL_01 = "NB001";
    string constant BATCH = "LOT-2025-01";
    string constant SPECS = "Modelo X-256 RAM 4GB SSD 32GB";
    string constant OS_VERSION = "Linux Edu 5.1";
    bytes32 constant SCHOOL_HASH = keccak256("school");
    bytes32 constant STUDENT_HASH = keccak256("student");
    bytes32 constant REPORT_HASH = keccak256("report");
    string constant REGISTER_METADATA = "{}";
    string constant HARDWARE_METADATA = "{}";
    string constant SOFTWARE_METADATA = "{}";
    string constant ASSIGNMENT_METADATA = "{}";

    function setUp() public {
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
        
        // Deploy the contract using admin address to avoid the test contract having admin role
        vm.startPrank(admin);
        tracker = new SupplyChainTracker();
        
        // Usar el admin (que es el deployer) para otorgar los otros roles
        tracker.grantRole(tracker.FABRICANTE_ROLE(), fabricante);
        tracker.grantRole(tracker.AUDITOR_HW_ROLE(), auditor);
        tracker.grantRole(tracker.TECNICO_SW_ROLE(), tecnico);
        tracker.grantRole(tracker.ESCUELA_ROLE(), escuela);
        vm.stopPrank();
    }

    // --- Access Control Tests ---

    function test_accessControl_cannotGrantRoleWithoutAdmin() public {
        bytes32 role = tracker.FABRICANTE_ROLE();
        bytes32 adminRole = tracker.DEFAULT_ADMIN_ROLE();
        vm.prank(unauthorized);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                unauthorized,
                adminRole
            )
        );
        tracker.grantRole(role, unauthorized);
    }

    function test_accessControl_cannotRevokeRoleWithoutAdmin() public {
        bytes32 role = tracker.FABRICANTE_ROLE();
        bytes32 adminRole = tracker.DEFAULT_ADMIN_ROLE();
        vm.prank(unauthorized);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                unauthorized,
                adminRole
            )
        );
        tracker.revokeRole(role, fabricante);
    }

    function test_accessControl_cannotRegisterWithoutFabricanteRole() public {
        string[] memory serials = new string[](1);
        string[] memory batches = new string[](1);
        string[] memory specs = new string[](1);
        string[] memory metadata = new string[](1);
        
        serials[0] = SERIAL_01;
        batches[0] = BATCH;
        specs[0] = SPECS;
        metadata[0] = REGISTER_METADATA;

        vm.prank(unauthorized);
        vm.expectRevert(
            abi.encodeWithSelector(
                SupplyChainTracker.Unauthorized.selector, 
                tracker.FABRICANTE_ROLE()
            )
        );
        tracker.registerNetbooks(serials, batches, specs, metadata);
    }

    function test_accessControl_cannotAuditWithoutAuditorRole() public {
        // Primero registrar el netbook
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

        vm.prank(unauthorized);
        vm.expectRevert(
            abi.encodeWithSelector(
                SupplyChainTracker.Unauthorized.selector, 
                tracker.AUDITOR_HW_ROLE()
            )
        );
        tracker.auditHardware(SERIAL_01, true, REPORT_HASH, HARDWARE_METADATA);
    }
}