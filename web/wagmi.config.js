import { defineConfig } from '@wagmi/cli';
import { http } from 'wagmi';

// Define our Anvil chain
const anvil = {
  id: 31337,
  name: 'Anvil Local',
  network: 'anvil',
  nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
  rpcUrls: {
    default: { http: ['http://localhost:8545'] },
    public: { http: ['http://localhost:8545'] },
  },
  testnet: true,
};

// Create the config object as an array
const config = [{
  out: "generated/wagmi.ts",
  chains: [anvil],
  transports: {
    [anvil.id]: http(),
  },
  // Explicitly define our contracts to prevent automatic interface detection
  contracts: [
    {
      name: 'supplyChainTracker',
      address: {
        31337: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      },
      abi: [
        // Contract ownership and role management
        {
          name: "getRoleByName",
          type: "function",
          stateMutability: "view",
          inputs: [{ name: "role", type: "string" }],
          outputs: [{ name: "", type: "bytes32" }]
        },
        {
          name: "hasRole",
          type: "function",
          stateMutability: "view",
          inputs: [
            { name: "role", type: "bytes32" },
            { name: "account", type: "address" }
          ],
          outputs: [{ name: "", type: "bool" }]
        },
        {
          name: "requestRole",
          type: "function",
          stateMutability: "nonpayable",
          inputs: [
            { name: "role", type: "string" },
            { name: "metadata", type: "string" }
          ],
          outputs: []
        },
        {
          name: "grantRole",
          type: "function",
          stateMutability: "nonpayable",
          inputs: [
            { name: "role", type: "bytes32" },
            { name: "account", type: "address" }
          ],
          outputs: []
        },
        {
          name: "revokeRole",
          type: "function",
          stateMutability: "nonpayable",
          inputs: [
            { name: "account", type: "address" },
            { name: "role", type: "bytes32" }
          ],
          outputs: []
        },
        {
          name: "getPendingRoleRequests",
          type: "function",
          stateMutability: "view",
          inputs: [],
          outputs: [{ name: "", type: "uint256[]" }]
        },
        {
          name: "getRoleRequest",
          type: "function",
          stateMutability: "view",
          inputs: [{ name: "requestId", type: "uint256" }],
          outputs: [
            { name: "", type: "address" },
            { name: "", type: "bytes32" },
            { name: "", type: "uint8" },
            { name: "", type: "uint256" },
            { name: "", type: "string" }
          ]
        },
        {
          name: "rejectRoleRequest",
          type: "function",
          stateMutability: "nonpayable",
          inputs: [{ name: "requestId", type: "uint256" }],
          outputs: []
        },
        // Supply chain functions
        {
          name: "getNetbookState",
          type: "function",
          stateMutability: "view",
          inputs: [{ name: "serial", type: "string" }],
          outputs: [{ name: "", type: "uint8" }]
        },
        {
          name: "getNetbookReport",
          type: "function",
          stateMutability: "view",
          inputs: [{ name: "serial", type: "string" }],
          outputs: [
            { name: "", type: "string" },
            { name: "", type: "bool" },
            { name: "", type: "string" },
            { name: "", type: "string" },
            { name: "", type: "bool" },
            { name: "", type: "string" },
            { name: "", type: "bytes32" },
            { name: "", type: "uint256" }
          ]
        },
        {
          name: "registerNetbooks",
          type: "function",
          stateMutability: "nonpayable",
          inputs: [
            { name: "serials", type: "string[]" },
            { name: "batches", type: "string[]" },
            { name: "specs", type: "string[]" }
          ],
          outputs: []
        },
        {
          name: "auditHardware",
          type: "function",
          stateMutability: "nonpayable",
          inputs: [
            { name: "serial", type: "string" },
            { name: "passed", type: "bool" },
            { name: "reportHash", type: "bytes32" }
          ],
          outputs: []
        },
        {
          name: "validateSoftware",
          type: "function",
          stateMutability: "nonpayable",
          inputs: [
            { name: "serial", type: "string" },
            { name: "osVersion", type: "string" },
            { name: "passed", type: "bool" }
          ],
          outputs: []
        },
        {
          name: "assignToStudent",
          type: "function",
          stateMutability: "nonpayable",
          inputs: [
            { name: "serial", type: "string" },
            { name: "schoolHash", type: "bytes32" },
            { name: "studentHash", type: "bytes32" }
          ],
          outputs: []
        }
      ]
    }
  ]
}];

export default config;