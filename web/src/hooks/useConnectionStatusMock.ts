// web/src/hooks/useConnectionStatusMock.ts
// Mock for useConnectionStatus hook until we identify the correct wagmi import

import { useAccount } from 'wagmi';

// Mock hook that uses useAccount to determine connection status
export const useConnectionStatus = () => {
  const { isConnected } = useAccount();
  
  return {
    status: isConnected ? 'connected' : 'disconnected'
  };
};
