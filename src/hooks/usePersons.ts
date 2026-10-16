import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "../utility/supabaseClient";
import { TABLES } from "../utility/constants";
import { USE_MOCK } from "../utility/config";
import type { Person } from "../types/entry";

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
        .order("nama_pekerja", { ascending: true }); // ✅ Perbaikan kolom

      if (error) throw error;
      
      return (data ?? []).map((r: any) => ({
        id: r.id.toString(),
        name: r.nama_pekerja, // ✅ Perbaikan kolom
      }));
    },
  });

  return {
    persons: data ?? [],
    isLoading,
    refetch,
  };
};