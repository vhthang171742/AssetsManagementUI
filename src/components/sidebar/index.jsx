/* eslint-disable */

import { HiX } from "react-icons/hi";
import Links from "./components/Links";
import routes from "routes.js";

const Sidebar = ({ open, onClose }) => {
  return (
    <div
      className={`sm:none duration-175 linear fixed !z-50 flex min-h-full flex-col bg-white pb-10 shadow-2xl shadow-white/5 transition-all dark:!bg-navy-800 dark:text-white md:!z-50 lg:!z-50 xl:!z-0 w-[260px] xl:w-[313px] ${open ? "translate-x-0" : "-translate-x-96"
        }`}
      style={{ left: 0 }}
    >
      <span
        className="absolute top-4 right-4 block cursor-pointer xl:hidden"
        onClick={onClose}
      >
        <HiX />
      </span>

      <div className="flex flex-col gap-0">
        <div className={`flex items-center h-20 justify-center`}>
          <div className="hidden xl:block font-poppins text-[26px] font-bold uppercase text-navy-700 dark:text-white">
            Assets Management
          </div>
        </div>
        <div class="mb-7 h-px bg-gray-300 dark:bg-white/30" className="flex" />
        {/* Nav item */}

        <ul className="mb-auto">
          <Links routes={routes} />
        </ul>

        {/* Nav item end */}
      </div>
    </div>
  );
};

export default Sidebar;
