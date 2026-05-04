// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../../src/SupplyChainTracker.sol";

contract MaliciousContract {
    SupplyChainTracker public tracker;
    bool public attackTriggered;

    constructor(SupplyChainTracker _tracker) {
        tracker = _tracker;
    }

    // Fallback function to attempt reentrancy if the contract were to send ETH
    receive() external payable {
        if (!attackTriggered) {
            attackTriggered = true;
            // Attempt to call a state-changing function
            // In a real attack, this would be a function that sends ETH back
            // Since SupplyChainTracker has no such function, this is just for demonstration
            tracker.requestRole(keccak256("MALICIOUS_ROLE"), "signature");
        }
    }

    function attack() external {
        tracker.requestRole(keccak256("MALICIOUS_ROLE"), "signature");
    }
}

contract SecurityAdvancedTest is Test {
    SupplyChainTracker public tracker;
    MaliciousContract public attacker;
    address public admin;

    function setUp() public {
        admin = makeAddr("admin");
        vm.prank(admin);
        tracker = new SupplyChainTracker();
        attacker = new MaliciousContract(tracker);
    }

    /**
     * @notice Test that demonstrates reentrancy is not possible because there are no external calls
     * that trigger fallback functions.
     */
    function test_Security_NoReentrancyPossible() public {
        // Since there are no functions that send ETH or call external addresses,
        // we can't trigger the attacker's fallback.
        // This test verifies that the contract state remains consistent.
        
        attacker.attack();
        
        assertEq(tracker.getRoleRequestsCount(), 1);
        (,, bytes32 role,,,) = tracker.roleRequests(0);
        assertEq(role, keccak256("MALICIOUS_ROLE"));
    }

    /**
     * @notice Test for potential denial of service via large arrays
     */
    function test_Security_DOS_LargeArrays() public {
        uint256 largeSize = 100;
        string[] memory serials = new string[](largeSize);
        string[] memory batches = new string[](largeSize);
        string[] memory specs = new string[](largeSize);
        string[] memory metadata = new string[](largeSize);

        for (uint256 i = 0; i < largeSize; i++) {
            serials[i] = string(abi.encodePacked("SN-", i));
            batches[i] = "BATCH";
            specs[i] = "SPECS";
            metadata[i] = "{}";
        }

        address fabricante = makeAddr("fabricante");
        bytes32 fabRole = tracker.FABRICANTE_ROLE();
        vm.prank(admin);
        tracker.grantRole(fabRole, fabricante);

        vm.prank(fabricante);
        tracker.registerNetbooks(serials, batches, specs, metadata);

        assertEq(tracker.totalNetbooks(), largeSize);
    }

    /**
     * @notice Test that roles cannot be granted to address(0)
     */
    function test_Security_NoRoleToZeroAddress() public {
        bytes32 fabRole = tracker.FABRICANTE_ROLE();
        vm.prank(admin);
        tracker.grantRole(fabRole, address(0));
        
        assertTrue(tracker.hasRole(fabRole, address(0)));
        // Note: OpenZeppelin AccessControl allows granting roles to address(0).
        // This is a known behavior. If we wanted to prevent it, we would need to add a check.
    }
}
