import { QueryClient } from '@tanstack/react-query';

/**
 * Singleton do QueryClient da aplicacao.
 *
 * Defaults:
 * - staleTime 60s: nao refetcha em remount/refocus durante 1min.
 * - gcTime 5min: mantem dados em cache por 5min apos o ultimo subscriber.
 * - retry 1: tenta uma unica vez em falha de rede.
 * - refetchOnWindowFocus false: evita ruido ao voltar pra aba.
 *
 * Ajustar por query individual via opcoes do useQuery quando necessario.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default queryClient;
