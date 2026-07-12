import { useQuery } from "@tanstack/react-query";

import { api, unwrap } from "./api";
import { PageResult } from "./types";

export const useList = <T,>(key: string, path: string, enabled = true) =>
  useQuery({
    queryKey: [key, path],
    queryFn: () => unwrap<PageResult<T> | T[]>(api.get(path)).then((data) => (Array.isArray(data) ? data : data.items)),
    enabled,
  });

export const useResource = <T,>(key: string, path: string, enabled = true) =>
  useQuery({
    queryKey: [key, path],
    queryFn: () => unwrap<T>(api.get(path)),
    enabled,
  });
