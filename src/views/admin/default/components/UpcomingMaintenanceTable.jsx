import React from "react";
import Card from "components/card";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";

const UpcomingMaintenanceTable = ({ data = [] }) => {
  const { t } = useLanguage();

  return (
    <Card extra="rounded-[20px] p-4">
      <div className="mb-3">
        <h4 className="text-lg font-bold text-navy-700 dark:text-white">
          {t(K.DASH_UPCOMING_MAINTENANCE_TITLE, "Upcoming Maintenance (Next 30 Days)")}
        </h4>
        <p className="text-sm text-gray-500">{t(K.DASH_UPCOMING_MAINTENANCE_SUBTITLE, "Scheduled maintenance due soon")}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-navy-700">
              <th className="py-2 text-left font-semibold text-gray-600 dark:text-gray-200">
                {t(K.ADMIN_TABLE_ASSET_CODE, "Code")}
              </th>
              <th className="py-2 text-left font-semibold text-gray-600 dark:text-gray-200">
                {t(K.ADMIN_TABLE_ASSET_NAME, "Asset")}
              </th>
              <th className="py-2 text-left font-semibold text-gray-600 dark:text-gray-200">
                {t(K.ADMIN_TABLE_TYPE, "Type")}
              </th>
              <th className="py-2 text-left font-semibold text-gray-600 dark:text-gray-200">
                {t(K.ADMIN_TABLE_NEXT_DUE, "Next Due")}
              </th>
              <th className="py-2 text-left font-semibold text-gray-600 dark:text-gray-200">
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
            {data.map((item) => (
              <tr key={item.scheduleID} className="border-b border-gray-100 dark:border-navy-700 hover:bg-gray-50 dark:hover:bg-navy-700">
                <td className="py-2 font-mono text-xs text-gray-700 dark:text-gray-300">{item.assetCode}</td>
                <td className="py-2 text-navy-700 dark:text-white">{item.assetName}</td>
                <td className="py-2 text-gray-600 dark:text-gray-300">{item.maintenanceType}</td>
                <td className="py-2 text-gray-600 dark:text-gray-300">
                  {item.nextDueDate ? new Date(item.nextDueDate).toLocaleDateString() : "—"}
                </td>
                <td className="py-2">
                  {item.isOverdue ? (
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      {t(K.DASH_OVERDUE, "Overdue")}
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      {t(K.DASH_UPCOMING, "Upcoming")}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default UpcomingMaintenanceTable;
