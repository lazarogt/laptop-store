import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export type TelegramStatus = {
  connected: boolean;
  connectUrl: string | null;
  botUsername: string | null;
};

export function useTelegramStatus(enabled: boolean) {
  return useQuery<TelegramStatus>({
    queryKey: [api.telegram.status.path],
    enabled,
    queryFn: async () => {
      const response = await fetch(api.telegram.status.path, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("No se pudo consultar Telegram");
      }

      return response.json();
    },
    retry: false,
    refetchOnWindowFocus: false,
  });
}
