import React, { useMemo } from "react";
import Chart from "react-apexcharts";
import Card from "components/card";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";

const AssetStatusPieChart = ({ data = [] }) => {
  const { t } = useLanguage();

  const { series, labels } = useMemo(() => ({
    series: data.map((d) => d.value),
    labels: data.map((d) => d.label),
  }), [data]);

  const options = {
    chart: { toolbar: { show: false } },
    labels,
    legend: { position: "bottom", fontSize: "13px" },
    colors: ["#4318FF", "#6AD2FF", "#EFF4FB", "#FFA500", "#FF4560"],
    dataLabels: { enabled: true, formatter: (val) => `${Math.round(val)}%` },
    tooltip: { y: { formatter: (val) => `${val} ${t(K.ADMIN_TABLE_ASSET, "assets")}` } },
  };

  return (
    <Card extra="rounded-[20px] p-3">
      <div className="px-3 pt-2 pb-1">
        <h4 className="text-lg font-bold text-navy-700 dark:text-white">
          {t(K.DASH_ASSET_STATUS_TITLE, "Assets by Status")}
        </h4>
        <p className="text-sm text-gray-500">{t(K.DASH_ASSET_STATUS_SUBTITLE, "Current status breakdown")}</p>
      </div>
      <div className="h-[260px] w-full flex items-center justify-center">
        {series.length > 0
          ? <Chart options={options} series={series} type="pie" width="100%" height="100%" />
          : <p className="text-sm text-gray-400">{t(K.TABLE_NO_DATA, "No data")}</p>
        }
      </div>
    </Card>
  );
};

export default AssetStatusPieChart;
