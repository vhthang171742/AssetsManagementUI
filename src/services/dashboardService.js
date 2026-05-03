import { httpClient } from "./httpClient";

export const dashboardService = {
  getSummary: () => httpClient("/dashboard/summary"),
};
