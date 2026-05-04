'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Address } from 'viem';

export const useWeb3 = () => {
  const { address, isConnected, isConnecting } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const connectWallet = (connectorId?: string) => {
    if (connectorId) {
      const selectedConnector = connectors.find(c => c.id === connectorId);
      if (selectedConnector) {
        connect({ connector: selectedConnector });
      } else if (connectors.length > 0) {
        connect({ connector: connectors[0] });
      }
    } else if (connectors.length > 0) {
      connect({ connector: connectors[0] });
    }
  };

  const defaultAdminAddress = process.env.NEXT_PUBLIC_DEFAULT_ADMIN_ADDRESS as Address | undefined;

  return {
    address,
    isConnected,
    isConnecting,
    disconnect,
    connectWallet,
    defaultAdminAddress,
  };
};