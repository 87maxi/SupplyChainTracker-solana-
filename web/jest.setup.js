// Este archivo se ejecuta antes de cada prueba
import '@testing-library/jest-dom';

// Polyfill para Node.js environment
if (typeof global.TextEncoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Mock para APIs del navegador
if (typeof window !== 'undefined') {
  // Mock para window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  // Mock para Solana wallet adapter
  Object.defineProperty(window, 'solana', {
    writable: true,
    value: {
      connect: jest.fn().mockResolvedValue({ publicKey: null }),
      disconnect: jest.fn().mockResolvedValue(undefined),
      isConnected: false,
      on: jest.fn(),
      off: jest.fn(),
      signTransaction: jest.fn(),
      signMessage: jest.fn(),
    },
  });
}

// Mock para fetch
if (typeof global !== 'undefined') {
  global.fetch = jest.fn();
}

// Mock para Solana web3.js
jest.mock('@solana/web3.js', () => ({
  Connection: jest.fn().mockImplementation(() => ({
    getSlot: jest.fn().mockResolvedValue(1n),
    getBalance: jest.fn().mockResolvedValue(1000000000n),
    getLatestBlockhash: jest.fn().mockResolvedValue({ blockhash: 'mockBlockhash', lastValidBlockHeight: 1000 }),
  })),
  PublicKey: jest.fn().mockImplementation((address) => ({
    toString: () => address,
    toBase58: () => address,
    equals: jest.fn(),
  })),
  Transaction: jest.fn().mockImplementation(() => ({
    sign: jest.fn(),
    serialize: jest.fn(),
  })),
  SystemProgram: {
    createAccount: jest.fn(),
    transfer: jest.fn(),
  },
  LAMPORTS_PER_SOL: 1000000000,
}));

// Mock para Anchor
jest.mock('@coral-xyz/anchor', () => ({
  Program: jest.fn().mockImplementation(() => ({
    methods: {
      registerNetbook: jest.fn().mockReturnThis(),
      registerNetbooksBatch: jest.fn().mockReturnThis(),
      auditHardware: jest.fn().mockReturnThis(),
      validateSoftware: jest.fn().mockReturnThis(),
      assignToStudent: jest.fn().mockReturnThis(),
      grantRole: jest.fn().mockReturnThis(),
      revokeRole: jest.fn().mockReturnThis(),
      requestRole: jest.fn().mockReturnThis(),
      approveRoleRequest: jest.fn().mockReturnThis(),
      rejectRoleRequest: jest.fn().mockReturnThis(),
      addRoleHolder: jest.fn().mockReturnThis(),
      removeRoleHolder: jest.fn().mockReturnThis(),
      rpc: jest.fn().mockResolvedValue('mockSignature'),
    },
    account: {
      netbook: {
        fetch: jest.fn().mockResolvedValue(null),
      },
      supplyChainConfig: {
        fetch: jest.fn().mockResolvedValue({ roleHolders: [] }),
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    programId: new (require('@solana/web3.js').PublicKey)('CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS'),
  })),
  AnchorProvider: jest.fn().mockImplementation(() => ({})),
}));
