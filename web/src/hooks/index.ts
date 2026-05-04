// web/src/hooks/index.ts

// Hooks de Web3
export { useWeb3 } from '@/hooks/useWeb3';
export { useToast } from './use-toast';
export { useNotifications } from './use-notifications';

// Hooks de contratos
export { useSupplyChainContract } from './use-contracts/use-supply-chain.hook';
export { useRoleContract } from './use-contracts/use-role.hook';
export { useRoleRequests } from './useRoleRequests';
export { useCachedData } from './use-cached-data';
