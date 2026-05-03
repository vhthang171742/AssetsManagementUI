import React, { useMemo } from "react";
import Chart from "react-apexcharts";
import Card from "components/card";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";

const MaintenanceTrendChart = ({ data = [] }) => {
  const { t } = useLanguage();

  const { months, counts } = useMemo(() => ({
    months: data.map((d) => d.month),
    counts: data.map((d) => d.count),
  }), [data]);

  const series = [{ name: t(K.ADMIN_TABLE_RECORDS, "Records"), data: counts }];

  const options = {
    chart: { type: "area", toolbar: { show: false }, zoom: { enabled: false } },
    colors: ["#4318FF"],
    fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.45, opacityTo: 0.05 } },
    stroke: { curve: "smooth", width: 2 },
    xaxis: {
      categories: months,
      labels: { style: { fontSize: "11px" }, rotate: -30 },
    },
    yaxis: { labels: { formatter: (val) => Math.round(val) } },
    grid: { borderColor: "#f1f1f1" },
    dataLabels: { enabled: false },
    tooltip: { y: { formatter: (val) => `${val} ${t(K.ADMIN_TABLE_RECORDS, "records")}` } },
  };

  return (
    <Card extra="rounded-[20px] p-3">
      <div className="px-3 pt-2 pb-1">
        <h4 className="text-lg font-bold text-navy-700 dark:text-white">
          {t(K.DASH_MAINTENANCE_TREND_TITLE, "Maintenance Records — Last 12 Months")}
        </h4>
        <p className="text-sm text-gray-500">{t(K.DASH_MAINTENANCE_TREND_SUBTITLE, "Monthly maintenance activity trend")}</p>
      </div>
      <div className="h-[260px] w-full">
        <Chart options={options} series={series} type="area" width="100%" height="100%" />
      </div>
    </Card>
  );
};

export default MaintenanceTrendChart;
