// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/SupplyChainTracker.sol";

contract DeployScript is Script {
    function setUp() public {}

    function run() public {
        // Usar la primera cuenta de anvil como admin
        // Usar la primera cuenta de anvil (índice 0) como admin
        address deployer = vm.addr(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80);
        
        vm.startBroadcast(deployer);
        
        SupplyChainTracker tracker = new SupplyChainTracker();
        
        // Otorgarle el rol de admin a la cuenta desplegadora
        tracker.grantRole(tracker.DEFAULT_ADMIN_ROLE(), deployer);
        
        vm.stopBroadcast();
        
        // Guardar información de despliegue
        console.log("SupplyChainTracker deployed to:", address(tracker));
        console.log("Deployer address:", deployer);
        console.log("Admin role granted to:", deployer);
    }
}