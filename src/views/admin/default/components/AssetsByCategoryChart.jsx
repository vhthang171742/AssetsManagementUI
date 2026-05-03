import React, { useMemo } from "react";
import Chart from "react-apexcharts";
import Card from "components/card";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";

const AssetsByCategoryChart = ({ data = [] }) => {
  const { t } = useLanguage();

  const { categories, values } = useMemo(() => ({
    categories: data.map((d) => d.label),
    values: data.map((d) => d.value),
  }), [data]);

  const series = [{ name: t(K.ADMIN_TABLE_ASSET, "Assets"), data: values }];

  const options = {
    chart: { type: "bar", toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, dataLabels: { position: "top" } } },
    colors: ["#4318FF"],
    xaxis: { categories, labels: { style: { fontSize: "12px" } } },
    dataLabels: { enabled: true, offsetX: 16, style: { fontSize: "12px", colors: ["#304758"] } },
    grid: { borderColor: "#f1f1f1" },
    tooltip: { y: { formatter: (val) => `${val} ${t(K.ADMIN_TABLE_ASSET, "assets")}` } },
  };

  return (
    <Card extra="rounded-[20px] p-3">
      <div className="px-3 pt-2 pb-1">
        <h4 className="text-lg font-bold text-navy-700 dark:text-white">
          {t(K.DASH_ASSETS_BY_CATEGORY_TITLE, "Assets by Category")}
        </h4>
        <p className="text-sm text-gray-500">{t(K.DASH_ASSETS_BY_CATEGORY_SUBTITLE, "Asset portfolio composition")}</p>
      </div>
      <div className="h-[260px] w-full">
        {categories.length > 0
          ? <Chart options={options} series={series} type="bar" width="100%" height="100%" />
          : <div className="flex h-full items-center justify-center text-sm text-gray-400">{t(K.TABLE_NO_DATA, "No data")}</div>
        }
      </div>
    </Card>
  );
};

export default AssetsByCategoryChart;
