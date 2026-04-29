/* eslint-disable */

import React from "react";
import Links from "./components/Links";
import routes from "routes.js";

const Sidebar = ({ open, headerHeight = 60 }) => {
  const scrollContainerRef = React.useRef(null);

  const handleSidebarWheel = (event) => {
    const container = scrollContainerRef.current;

    if (!container) {
      return;
    }

    const canScroll = container.scrollHeight > container.clientHeight;

    event.preventDefault();
    event.stopPropagation();

    if (!canScroll) {
      return;
    }

    container.scrollTop += event.deltaY;
  };

  React.useEffect(() => {
    const container = scrollContainerRef.current;

    if (!container) {
      return undefined;
    }

    const wheelListener = (event) => {
      handleSidebarWheel(event);
    };

    container.addEventListener("wheel", wheelListener, { passive: false });

    return () => {
      container.removeEventListener("wheel", wheelListener);
    };
  }, []);

  return (
    <div
      className={`sm:none duration-175 linear fixed !z-50 flex flex-col overflow-hidden bg-white shadow-2xl shadow-white/5 transition-all dark:!bg-navy-800 dark:text-white md:!z-50 lg:!z-50 xl:!z-0 w-[260px] xl:w-[313px] ${open ? "translate-x-0" : "-translate-x-96"
        }`}
      style={{ left: 0, top: `${headerHeight}px`, height: `calc(100vh - ${headerHeight}px)` }}
    >
      <div className="flex h-full flex-col overflow-hidden pt-1">
        {/* Nav item */}

        <div
          ref={scrollContainerRef}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
          onScroll={(e) => e.stopPropagation()}
        >
          <ul>
            <Links routes={routes} />
          </ul>
        </div>

        {/* Nav item end */}
      </div>
    </div>
  );
};

export default Sidebar;
