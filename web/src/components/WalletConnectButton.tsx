"use client";

import { useSolanaWeb3 } from '@/hooks/useSolanaWeb3';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function WalletConnectButton() {
  const { isConnected, address, disconnect, walletName } = useSolanaWeb3();

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  if (!isConnected) {
    return (
      <div className="flex items-center gap-2">
        <WalletMultiButton className="bg-blue-600 hover:bg-blue-700 text-white rounded-md" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 border">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-sm font-mono text-muted-foreground">
          {formatAddress(address!)}
        </span>
        {walletName && (
          <span className="text-xs text-muted-foreground hidden sm:inline">
            ({walletName})
          </span>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => disconnect()}
        className="h-8 px-2"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
