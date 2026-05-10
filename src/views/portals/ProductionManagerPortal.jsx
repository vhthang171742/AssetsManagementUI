import React from "react";
import PortalLayout from "layouts/portal";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";

export default function ProductionManagerPortal() {
  const { t } = useLanguage();

  return (
    <PortalLayout>
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">
          {t(K.PORTAL_PRODUCTION_MANAGER_NAME, "Production Manager Portal")}
        </p>
      </div>
    </PortalLayout>
  );
}
