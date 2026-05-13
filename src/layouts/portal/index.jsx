import React from "react";
import Navbar from "components/navbar";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";

export default function PortalLayout({ title, titleKey, children }) {
  const { t } = useLanguage();
  const HEADER_HEIGHT = 60;

  const resolvedTitle = titleKey ? t(titleKey, title) : title;

  React.useEffect(() => {
    document.title = resolvedTitle
      ? `${resolvedTitle} | ${t(K.APP_NAME_FULL, "Assets Management")}`
      : t(K.APP_NAME_FULL, "Assets Management");
  }, [resolvedTitle, t]);

  return (
    <div className="flex min-h-screen flex-col bg-lightPrimary dark:bg-navy-900">
      <header
        className="fixed top-0 right-0 left-0 z-[60] w-full border-b border-gray-200 bg-lightPrimary/95 dark:border-white/10 dark:bg-navy-900/95"
        style={{ height: `${HEADER_HEIGHT}px` }}
      >
        <div className="flex h-full w-full items-center px-4">
          <div className="h-full w-full">
            <Navbar
              showSidebarToggle={false}
              profilePath="/profile"
              compact
            />
          </div>
        </div>
      </header>
      <div
        className="flex flex-1 flex-col px-4 pb-4"
        style={{ paddingTop: `calc(${HEADER_HEIGHT}px + 0.5rem)` }}
      >
        <main className="flex flex-1 flex-col w-full mt-2">{children}</main>
      </div>
    </div>
  );
}
