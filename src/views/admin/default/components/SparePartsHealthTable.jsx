import React from "react";
import Card from "components/card";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";

const SparePartsHealthTable = ({ data = [] }) => {
  const { t } = useLanguage();

  return (
    <Card extra="rounded-[20px] p-4">
      <div className="mb-3">
        <h4 className="text-lg font-bold text-navy-700 dark:text-white">
          {t(K.DASH_LOW_STOCK_TITLE, "Low-Stock Spare Parts")}
        </h4>
        <p className="text-sm text-gray-500">{t(K.DASH_LOW_STOCK_SUBTITLE, "Parts at or below reorder level")}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-navy-700">
              <th className="py-2 text-left font-semibold text-gray-600 dark:text-gray-200">
                {t(K.ADMIN_TABLE_PART_CODE, "Part Code")}
              </th>
              <th className="py-2 text-left font-semibold text-gray-600 dark:text-gray-200">
                {t(K.ADMIN_TABLE_PART_NAME, "Part Name")}
              </th>
              <th className="py-2 text-right font-semibold text-gray-600 dark:text-gray-200">
                {t(K.ADMIN_TABLE_STOCK, "Stock")}
              </th>
              <th className="py-2 text-right font-semibold text-gray-600 dark:text-gray-200">
                {t(K.ADMIN_TABLE_REORDER_LEVEL, "Reorder Level")}
              </th>
              <th className="py-2 text-center font-semibold text-gray-600 dark:text-gray-200">
                {t(K.ADMIN_TABLE_STATUS, "Status")}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-gray-400">
                  {t(K.TABLE_NO_DATA, "No data")}
                </td>
              </tr>
            )}
            {data.map((part) => {
              const isCritical = part.stockQuantity === 0;
              const rowClass = isCritical
                ? "bg-red-50 dark:bg-red-900/10"
                : "hover:bg-gray-50 dark:hover:bg-navy-700";
              return (
                <tr key={part.partID} className={`border-b border-gray-100 dark:border-navy-700 ${rowClass}`}>
                  <td className="py-2 font-mono text-xs text-gray-700 dark:text-gray-300">{part.partCode}</td>
                  <td className="py-2 text-navy-700 dark:text-white">{part.partName}</td>
                  <td className={`py-2 text-right font-semibold ${isCritical ? "text-red-600" : "text-orange-600"}`}>
                    {part.stockQuantity}
                  </td>
                  <td className="py-2 text-right text-gray-500 dark:text-gray-400">{part.reorderLevel}</td>
                  <td className="py-2 text-center">
                    {isCritical ? (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        {t(K.DASH_OUT_OF_STOCK, "Out of Stock")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                        {t(K.DASH_LOW_STOCK, "Low Stock")}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default SparePartsHealthTable;
