import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "components/navbar";
import Sidebar from "components/sidebar";
import PageGuard from "components/PageGuard";
import routes from "routes.js";

export default function Admin(props) {
  const { ...rest } = props;
  const location = useLocation();
  const HEADER_HEIGHT = 60;
  const [open, setOpen] = React.useState(() => window.innerWidth >= 1200);
  const [currentRoute, setCurrentRoute] = React.useState("Dashboard");

  React.useEffect(() => {
    getActiveRoute(routes);
  }, [location.pathname]);

  React.useEffect(() => {
    document.title = currentRoute
      ? `${currentRoute} | Assets Management`
      : "Assets Management";
  }, [currentRoute]);

  const getActiveRoute = (routes) => {
    let activeRoute = "Dashboard";
    for (let i = 0; i < routes.length; i++) {
      if (
        window.location.href.indexOf(
          routes[i].layout + "/" + routes[i].path
        ) !== -1
      ) {
        setCurrentRoute(routes[i].name);
      }
    }
    return activeRoute;
  };
  const getActiveNavbar = (routes) => {
    let activeNavbar = false;
    for (let i = 0; i < routes.length; i++) {
      if (
        window.location.href.indexOf(routes[i].layout + routes[i].path) !== -1
      ) {
        return routes[i].secondary;
      }
    }
    return activeNavbar;
  };
  const getRoutes = (routes) => {
    return routes.map((prop, key) => {
      if (prop.layout === "/admin") {
        return (
          <Route
            path={`/${prop.path}`}
            element={<PageGuard requiredRoles={prop.requiredRoles}>{prop.component}</PageGuard>}
            key={key}
          />
        );
      } else {
        return null;
      }
    });
  };

  document.documentElement.dir = "ltr";
  return (
    <div className="h-screen w-full overflow-hidden bg-lightPrimary dark:!bg-navy-900">
      <header
        className="relative z-[60] w-full border-b border-gray-200 bg-lightPrimary/95 px-4 py-1 dark:border-white/10 dark:bg-navy-900/95"
        style={{ height: `${HEADER_HEIGHT}px` }}
      >
        <div className="flex h-full items-center justify-between gap-3">
          <h1 className="shrink-0 text-lg font-bold uppercase leading-none tracking-[0.04em] text-navy-700 dark:text-white sm:text-[24px] xl:text-[26px]">
            <span className="sm:hidden">Assets</span>
            <span className="hidden sm:inline">Assets Management</span>
          </h1>
          <div className="min-w-0 flex-1">
            <Navbar
              onOpenSidenav={() => setOpen((prev) => !prev)}
              secondary={getActiveNavbar(routes)}
              {...rest}
            />
          </div>
        </div>
      </header>

      <div className="relative flex h-[calc(100vh-60px)] w-full">
        <Sidebar open={open} onClose={() => setOpen(false)} headerHeight={HEADER_HEIGHT} />

        <main
          className={`mx-[12px] h-full flex-1 overflow-y-auto transition-all ${
            open ? "ml-[260px] xl:ml-[313px]" : "ml-0"
          }`}
        >
          <div className="pt-3 mx-auto mb-auto h-full min-h-[84vh] px-2 pb-2">
            <h2 className="mb-3 truncate text-[22px] font-bold capitalize leading-none text-navy-700 dark:text-white sm:text-[26px] lg:text-[30px]">
              {currentRoute}
            </h2>
            <Routes>
              {getRoutes(routes)}

              <Route
                path="/profile"
                element={<Navigate to="/profile" replace />}
              />

              <Route
                path="/"
                element={<Navigate to="/admin/default" replace />}
              />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}
