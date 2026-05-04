import { config } from './config';

export function verifyWagmiConfig() {
  console.log('=== Wagmi Config Verification ===');
  console.log('Chains:', config.chains.map(c => c.name));
  console.log('Connectors:', config.connectors.map(c => c.name));
  console.log('===================================');
}
