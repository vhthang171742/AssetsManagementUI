/*eslint-disable*/
import React from "react";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";

export default function Footer() {
  const { t } = useLanguage();
  const year = 1900 + new Date().getYear();
  return (
    <div className="z-[5] mx-auto flex w-full max-w-screen-sm flex-col items-center justify-between px-[20px] pb-4 lg:mb-6 lg:max-w-[100%] lg:flex-row xl:mb-2 xl:w-[1310px] xl:pb-6">
      <p className="mb-6 text-center text-sm text-gray-600 md:text-base lg:mb-0">
        {t(K.FOOTER_COPYRIGHT, `©${year} University of Economics - Technology for Industries.`).replace("{year}", year)}
      </p>
    </div>
  );
}
