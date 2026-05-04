"use client";

import { useWeb3 } from '@/hooks/useWeb3';
import { Button } from '@/components/ui/button';

export function WalletConnectButton() {
  const { isConnected, address, connectWallet, disconnect } = useWeb3();

  return (
    <div className="flex items-center gap-4">
      {isConnected ? (
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
          <Button variant="outline" size="sm" onClick={() => { disconnect(); window.location.reload(); }}>
            Disconnect
          </Button>
        </div>
      ) : (
        <Button size="sm" onClick={() => connectWallet()}>
          Connect Wallet
        </Button>
      )}
    </div>
  );
}