import { config } from './config';
import { getAccount } from 'wagmi/actions';

export function testWagmiConnection() {
  try {
    const account = getAccount(config);
    console.log('Wagmi connection test:', {
      isConnected: account.isConnected,
      address: account.address,
      status: account.status
    });
    return account;
  } catch (error) {
    console.error('Wagmi connection test failed:', error);
    throw error;
  }
}