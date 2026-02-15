import { useState, useEffect, useCallback } from "react";
import { dropdownService } from "services/dropdownService";

/**
 * useDropdown — React hook for fetching database-driven dropdown options.
 *
 * @param {"assetUnits"|"equipmentStatus"|"machineTypes"|string} category
 *   One of the named shortcuts or any custom category code.
 * @param {string|null} language  Optional language override (defaults to context).
 * @returns {{ options: Array, loading: boolean, error: string|null, refresh: () => void }}
 *
 * Usage:
 *   const { options, loading } = useDropdown("assetUnits");
 *   // options = [{ itemID, itemCode, label, ... }, ...]
 */
export default function useDropdown(category, language = null) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data;
      switch (category) {
        case "assetUnits":
          data = await dropdownService.getAssetUnits(language);
          break;
        case "equipmentStatus":
          data = await dropdownService.getEquipmentStatus(language);
          break;
        case "machineTypes":
          data = await dropdownService.getMachineTypes(language);
          break;
        default:
          // Treat as a generic category code (e.g. "AssetCondition")
          data = await dropdownService.getByCategory(category, language);
          break;
      }
      setOptions(data || []);
    } catch (err) {
      console.error(`useDropdown(${category}) failed:`, err.message);
      setError(err.message);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [category, language]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  return { options, loading, error, refresh: fetchOptions };
}
