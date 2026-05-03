import React, { useMemo } from "react";
import Chart from "react-apexcharts";
import Card from "components/card";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";

const UsageDowntimeChart = ({ data = [] }) => {
  const { t } = useLanguage();

  const { days, running, downtime } = useMemo(() => ({
    days: data.map((d) => d.day),
    running: data.map((d) => d.runningMinutes),
    downtime: data.map((d) => d.downtimeMinutes),
  }), [data]);

  const series = [
    { name: t(K.ADMIN_TABLE_RUNNING_MINUTES, "Running"), data: running },
    { name: t(K.ADMIN_TABLE_DOWNTIME_MINUTES, "Downtime"), data: downtime },
  ];

  const options = {
    chart: { type: "bar", stacked: true, toolbar: { show: false } },
    colors: ["#4318FF", "#FF4560"],
    plotOptions: { bar: { borderRadius: 2 } },
    xaxis: {
      categories: days,
      labels: { style: { fontSize: "10px" }, rotate: -45, hideOverlappingLabels: true },
    },
    yaxis: { labels: { formatter: (val) => `${Math.round(val)}m` } },
    legend: { position: "top" },
    grid: { borderColor: "#f1f1f1" },
    dataLabels: { enabled: false },
    tooltip: { y: { formatter: (val) => `${val} min` } },
  };

  return (
    <Card extra="rounded-[20px] p-3">
      <div className="px-3 pt-2 pb-1">
        <h4 className="text-lg font-bold text-navy-700 dark:text-white">
          {t(K.DASH_USAGE_TITLE, "Equipment Usage — Last 30 Days")}
        </h4>
        <p className="text-sm text-gray-500">{t(K.DASH_USAGE_SUBTITLE, "Running vs. downtime in minutes")}</p>
      </div>
      <div className="h-[260px] w-full">
        <Chart options={options} series={series} type="bar" width="100%" height="100%" />
      </div>
    </Card>
  );
};

export default UsageDowntimeChart;
