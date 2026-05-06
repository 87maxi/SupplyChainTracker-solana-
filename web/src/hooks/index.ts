// web/src/hooks/index.ts

// Hooks de Web3
export { useWeb3 } from '@/hooks/useWeb3';
export { useToast } from './use-toast';
export { useNotifications } from './use-notifications';

// Hooks de contratos
// Legacy: use-contracts/use-supply-chain.hook and use-contracts/use-role.hook were removed
export { useRoleRequests } from './useRoleRequests';
export { useCachedData } from './use-cached-data';
