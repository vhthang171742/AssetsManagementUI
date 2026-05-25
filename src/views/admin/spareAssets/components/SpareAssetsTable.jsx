import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { QRCodeSVG } from "qrcode.react";
import { handoverService } from "services/api";
import Card from "components/card";
import Modal from "components/modal/Modal";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";
import { formatDateInTimeZone } from "services/dateTimeService";
import { useAuth } from "context/AuthContext";

const conditionBadgeClass = (condition) => {
  const v = (condition || "").toLowerCase();
  if (v === "new" || v === "good") return "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300";
  if (v === "fair") return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300";
  if (v === "poor" || v === "damaged") return "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300";
  return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
};

const statusBadgeClass = (status) => {
  const v = (status || "").toLowerCase();
  if (v === "operational" || v === "available") return "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300";
  if (v === "under maintenance" || v === "maintenance") return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300";
  if (v === "out of service" || v === "decommissioned") return "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300";
  if (v === "in use" || v === "assigned") return "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300";
  return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
};

export default function SpareAssetsTable() {
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const userTimeZoneId = currentUser?.timeZoneId || "";

  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedQrAsset, setSelectedQrAsset] = useState(null);

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const data = await handoverService.getSparePartAssets();
      setAssets(data || []);
    } catch (error) {
      console.error("Failed to fetch spare part assets:", error);
      toast.error(
        `${t(K.ADMIN_TABLE_FETCH_FAILED, "Failed to fetch")} ${t(K.ADMIN_TABLE_SPARE_PARTS, "Spare Parts")}: ${error.message || t(K.ADMIN_TABLE_UNKNOWN_ERROR, "Unknown error")}`
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => formatDateInTimeZone(dateString, userTimeZoneId);

  const filtered = assets.filter((a) => {
    if (!searchText.trim()) return true;
    const q = searchText.trim().toLowerCase();
    return (
      (a.assetName || "").toLowerCase().includes(q) ||
      (a.assetCode || "").toLowerCase().includes(q) ||
      (a.serialNumber || "").toLowerCase().includes(q) ||
      (a.condition || "").toLowerCase().includes(q) ||
      (a.operationalStatus || "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      <Card extra={"w-full h-full min-h-0 px-2 sm:px-0"}>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <h3 className="text-lg font-semibold dark:text-white">
              {t(K.ADMIN_TABLE_SPARE_PARTS, "Spare Parts")}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {filtered.length} {t(K.TABLE_ITEMS, "items")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchAssets}
              className="rounded bg-brand-500 px-4 py-2 text-sm text-white hover:bg-brand-600"
            >
              {t(K.ADMIN_TABLE_REFRESH, "Refresh")}
            </button>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={t(K.ADMIN_TABLE_SEARCH, "Search...")}
              className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            {t(K.ADMIN_TABLE_LOADING, "Loading...")}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            {t(K.TABLE_NO_DATA, "No spare part assets found.")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                    {t(K.ADMIN_TABLE_ASSET, "Asset")}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                    {t(K.ADMIN_TABLE_SERIAL_NUMBER, "Serial Number")}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                    {t(K.ADMIN_TABLE_CONDITION, "Condition")}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                    {t(K.ADMIN_TABLE_STATUS, "Status")}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                    {t(K.ADMIN_TABLE_DATE_ASSIGNED, "Date Assigned")}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                    {t(K.ADMIN_TABLE_REMARKS, "Remarks")}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                    {t(K.ADMIN_TABLE_ACTIONS, "Actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((asset) => (
                  <tr
                    key={asset.roomAssetID}
                    className="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50"
                  >
                    {/* Asset name + code */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-navy-700 dark:text-white">{asset.assetName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{asset.assetCode}</div>
                    </td>

                    {/* Serial number */}
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                      {asset.serialNumber || "â€”"}
                    </td>

                    {/* Condition badge */}
                    <td className="px-4 py-3">
                      {asset.condition ? (
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${conditionBadgeClass(asset.condition)}`}>
                          {asset.condition}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-600">â€”</span>
                      )}
                    </td>

                    {/* Operational status badge */}
                    <td className="px-4 py-3">
                      {asset.operationalStatus ? (
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(asset.operationalStatus)}`}>
                          {asset.operationalStatus}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-600">â€”</span>
                      )}
                    </td>

                    {/* Date assigned */}
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                      {asset.dateAssigned ? formatDate(asset.dateAssigned) : "â€”"}
                    </td>

                    {/* Remarks */}
                    <td className="max-w-[180px] px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                      <span className="line-clamp-2" title={asset.remarks || ""}>
                        {asset.remarks || "â€”"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      {asset.qrCodeValue ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedQrAsset(asset);
                            setShowQrModal(true);
                          }}
                          className="rounded-md border border-brand-300 px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50 dark:border-brand-500 dark:text-brand-300 dark:hover:bg-brand-900"
                        >
                          {t(K.ADMIN_TABLE_VIEW_QR, "View QR")}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">â€”</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* QR Modal */}
      {showQrModal && selectedQrAsset && (
        <Modal
          isOpen={showQrModal}
          onClose={() => {
            setShowQrModal(false);
            setSelectedQrAsset(null);
          }}
          title={t(K.ADMIN_TABLE_ASSET_QR_CODE, "Asset QR Code")}
          maxWidth="max-w-sm"
          footer={
            <button
              onClick={() => {
                setShowQrModal(false);
                setSelectedQrAsset(null);
              }}
              className="rounded bg-gray-300 px-4 py-2 hover:bg-gray-400 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-700"
            >
              {t(K.MODAL_CLOSE, "Close")}
            </button>
          }
        >
          <div className="flex flex-col items-center gap-4 py-2">
            <QRCodeSVG value={selectedQrAsset.qrCodeValue} size={200} />
            <div className="text-center">
              <p className="font-semibold dark:text-white">{selectedQrAsset.assetName}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{selectedQrAsset.assetCode}</p>
              {selectedQrAsset.serialNumber && (
                <p className="mt-1 text-sm dark:text-white">
                  {t(K.ADMIN_TABLE_SERIAL_NUMBER, "Serial")}: {selectedQrAsset.serialNumber}
                </p>
              )}
              {selectedQrAsset.condition && (
                <span className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${conditionBadgeClass(selectedQrAsset.condition)}`}>
                  {selectedQrAsset.condition}
                </span>
              )}
              <p className="mt-2 break-all font-mono text-xs text-gray-500 dark:text-gray-400">
                {selectedQrAsset.qrCodeValue}
              </p>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
