"use client";

import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { PropsWithChildren } from 'react';

export function RainbowKitProviderWrapper({ children }: PropsWithChildren) {
  return (
    <RainbowKitProvider>
      {children}
    </RainbowKitProvider>
  );
}