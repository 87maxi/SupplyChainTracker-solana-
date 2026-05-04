// Este archivo se ejecuta antes de cada prueba
import '@testing-library/jest-dom';

// Polyfill para Node.js environment
if (typeof global.TextEncoder === 'undefined') {
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

  // Mock para window.ethereum
  Object.defineProperty(window, 'ethereum', {
    writable: true,
    value: {
      request: jest.fn(),
      on: jest.fn(),
      removeListener: jest.fn(),
    },
  });
}

// Mock para fetch
if (typeof global !== 'undefined') {
  global.fetch = jest.fn();
}
