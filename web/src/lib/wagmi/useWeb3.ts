import { useAccount, useConnect, useDisconnect, usePublicClient , Config, useAccount as useWagmiAccount, useConnect as useWagmiConnect, useDisconnect as useWagmiDisconnect } from 'wagmi';
import { useEffect, useState } from 'react';
import { PublicClient, WalletClient, formatEther, parseEther } from 'viem';

// Tipos para la respuesta del hook
interface UseWeb3State {
  address: string | null;
  isConnected: boolean;
  balance: string;
  chainId: number | null;
  isLoading: boolean;
}

interface UseWeb3Actions {
  connect: () => Promise<void>;
  disconnect: () => void;
}

export type UseWeb3Result = UseWeb3State & UseWeb3Actions;

/**
 * Hook personalizado para interactuar con la billetera web3
 * Utiliza wagmi para la conexión con la billetera
 */
export const useWeb3 = (): UseWeb3Result => {
  const [balance, setBalance] = useState('0');
  const [isLoading, setIsLoading] = useState(false);

  // Usa los hooks de wagmi directamente
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const publicClient = usePublicClient();

  // Conectar con el primer conector disponible (como MetaMask)
  const handleConnect = async () => {
    if (connectors.length > 0) {
      setIsLoading(true);
      try {
        await connect({ connector: connectors[0] });
      } catch (error) {
        console.error('Error connecting:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Obtener el balance del usuario
  useEffect(() => {
    const fetchBalance = async () => {
      if (address && publicClient) {
        try {
          setIsLoading(true);
          const balance = await publicClient.getBalance({ address });
          setBalance(formatEther(balance));
        } catch (error) {
          console.error('Error fetching balance:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchBalance();
  }, [address, publicClient]);

  // Retornar el estado y acciones
  return {
    address: address || null,
    isConnected,
    balance,
    chainId: chainId || null,
    isLoading,
    connect: handleConnect,
    disconnect
  };
};
