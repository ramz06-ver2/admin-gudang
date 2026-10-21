import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "../../shared/lib/supabaseClient";
import { TABLES } from "../../shared/lib/constants";
import { USE_MOCK } from "../../shared/lib/config";
import type { Person } from "../../shared/types";

export const usePersons = () => {
  const { data, isLoading, refetch } = useQuery<Person[]>({
    queryKey: ["persons"],
    queryFn: async () => {
      if (USE_MOCK) {
        return [];
      }

      const { data, error } = await supabaseClient
        .from(TABLES.workers)
        .select("*")
        .order("nama_pekerja", { ascending: true });

      if (error) throw error;

      return (data ?? []).map((r: { id: number | string; nama_pekerja: string }) => ({
        id: r.id.toString(),
        name: r.nama_pekerja,
      }));
    },
  });

  return {
    persons: data ?? [],
    isLoading,
    refetch,
  };
};