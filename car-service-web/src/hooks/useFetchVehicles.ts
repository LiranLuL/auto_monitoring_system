// src/hooks/useFetchVehicles.ts
import { useEffect, useState } from "react";
import { Vehicle } from "../types/models";
import { fetchVehicles } from "../api/endpoints";

export const useFetchVehicles = () => {
  const [data, setData] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetchVehicles();
        setData(response);
      } catch (err) {
        setError("Ошибка загрузки данных");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return { data, loading, error };
};
