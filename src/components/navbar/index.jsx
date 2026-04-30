import React from "react";
import { useMsal } from "@azure/msal-react";
import { useLocation, useNavigate } from "react-router-dom";
import Dropdown from "components/dropdown";
import { FiAlignJustify } from "react-icons/fi";
import { Link } from "react-router-dom";
import avatarDefault from "assets/img/avatars/user.png";
import { BsArrowBarUp } from "react-icons/bs";
import { FiSearch } from "react-icons/fi";
import { RiMoonFill, RiSunFill } from "react-icons/ri";
import { MdClose, MdKeyboardArrowDown } from "react-icons/md";
import { IoMdNotificationsOutline } from "react-icons/io";
import { useAuth } from "context/AuthContext";
import LanguageSwitcher from "components/languageSwitcher/LanguageSwitcher";
import GlobalSearch from "components/navbar/GlobalSearch";

const Navbar = (props) => {
  const {
    onOpenSidenav,
    showSidebarToggle = true,
    profilePath = "/profile",
    onMobileSearchOpenChange,
    compact = false,
  } = props;
  const { isDarkMode, toggleDarkMode, userProfile, userPhoto, getAvailablePortals, selectedPortalId, setSelectedPortal } = useAuth();
  const { instance } = useMsal();
  const location = useLocation();
  const navigate = useNavigate();

  /**
   * Handle logout
   */
  const handleLogout = async () => {
    try {
      await instance.logoutRedirect({
        postLogoutRedirectUri: "/auth/sign-in",
      });
      // Note: Page will redirect to sign-in page after logout
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Use profile data or fallback to defaults
  const displayName = userProfile?.displayName || userProfile?.givenName || "User";
  const email = userProfile?.email || "user@example.com";
  const avatarUrl = userPhoto || avatarDefault;
  const availablePortals = getAvailablePortals();
  const hasPortalAccess = availablePortals.length > 0;
  const activePortal =
    availablePortals.find((portal) => location.pathname.startsWith(portal.path)) ||
    availablePortals.find((portal) => portal.id === selectedPortalId) ||
    availablePortals[0];
  const compactPortalLabel = activePortal?.name?.replace(/\s+Portal$/i, "") || "Portal";
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [isVerySmallScreen, setIsVerySmallScreen] = React.useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 430 : false
  );
  const [isSmallScreen, setIsSmallScreen] = React.useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 640 : false
  );

  React.useEffect(() => {
    const handleResize = () => {
      setIsVerySmallScreen(window.innerWidth < 430);
      setIsSmallScreen(window.innerWidth < 640);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  React.useEffect(() => {
    if ((showSidebarToggle && !isSmallScreen) || (!showSidebarToggle && !isVerySmallScreen)) {
      setSearchOpen(false);
    }
  }, [isVerySmallScreen, isSmallScreen, showSidebarToggle]);

  React.useEffect(() => {
    if (typeof onMobileSearchOpenChange === "function") {
      onMobileSearchOpenChange(searchOpen && isSmallScreen);
    }
  }, [searchOpen, isSmallScreen, onMobileSearchOpenChange]);

  const isAdminMobileSearchMode = showSidebarToggle && searchOpen && isSmallScreen;

  const handlePortalSwitch = (portal) => {
    setSelectedPortal(portal.id);
    navigate(portal.path, { replace: true });
  };

  return (
    <nav
      className={`z-30 w-full px-0 ${compact ? "h-full py-0" : "py-2"}`}
      onWheel={(e) => e.stopPropagation()}
    >
      <div className={`flex items-center justify-between gap-2 ${compact ? "h-full min-h-0" : "min-h-[52px]"}`}>
        {showSidebarToggle && typeof onOpenSidenav === "function" ? (
          <button
            type="button"
            className={`cursor-pointer text-xl text-gray-600 dark:text-white ${searchOpen ? "hidden" : "flex"}`}
            onClick={onOpenSidenav}
            aria-label="Open navigation"
          >
            <FiAlignJustify className="h-5 w-5" />
          </button>
        ) : (
          <div className="w-0" />
        )}

        <div className={`flex min-w-0 w-full ${showSidebarToggle && !isAdminMobileSearchMode ? "justify-end" : ""}`}>
          <div className={`relative flex min-w-0 max-w-full items-center justify-end gap-1 rounded-[26px] bg-white px-2 py-1.5 shadow-xl shadow-shadow-500 dark:!bg-navy-800 dark:shadow-none sm:gap-1.5 ${showSidebarToggle ? "md:min-w-[430px] xl:min-w-[500px]" : "w-full"} ${isAdminMobileSearchMode ? "w-full" : ""}`}>
            {searchOpen ? (
              <div className="absolute inset-0 z-20 flex items-center gap-2 rounded-[26px] bg-white px-2 py-1.5 dark:!bg-navy-800 sm:hidden">
                <button
                  type="button"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lightPrimary text-navy-700 dark:bg-navy-900 dark:text-white"
                  onClick={() => setSearchOpen(false)}
                  aria-label="Close search"
                >
                  <MdClose className="h-4 w-4" />
                </button>
                <GlobalSearch
                  className="min-w-0 flex-1"
                  inputClassName="w-full"
                  placeholder="Search pages..."
                  autoFocus
                  onClose={() => setSearchOpen(false)}
                />
              </div>
            ) : null}
            <GlobalSearch
              className={`min-w-0 ${showSidebarToggle ? "hidden sm:block w-[145px] md:w-[175px] xl:w-[210px]" : isVerySmallScreen ? "hidden" : "flex-1"}`}
              placeholder="Search pages..."
            />
            <button
              type="button"
              className={`h-9 w-9 items-center justify-center rounded-full bg-lightPrimary text-navy-700 dark:bg-navy-900 dark:text-white ${searchOpen ? "hidden" : showSidebarToggle ? "flex sm:hidden" : isVerySmallScreen ? "flex" : "hidden"}`}
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
            >
              <FiSearch className="h-4 w-4 text-gray-400 dark:text-white" />
            </button>
            <div className={`ml-auto flex items-center gap-1 sm:gap-1.5 ${searchOpen ? "hidden sm:flex" : ""}`}>
            <Dropdown
              button={
                <p className="cursor-pointer">
                  <IoMdNotificationsOutline className="h-4 w-4 text-gray-600 dark:text-white" />
                </p>
              }
              animation="origin-[65%_0%] md:origin-top-right transition-all duration-300 ease-in-out"
              children={
                <div className="flex w-[360px] flex-col gap-3 rounded-[20px] bg-white p-4 shadow-xl shadow-shadow-500 dark:!bg-navy-700 dark:text-white dark:shadow-none sm:w-[460px]">
                  <div className="flex items-center justify-between">
                    <p className="text-base font-bold text-navy-700 dark:text-white">
                      Notification
                    </p>
                    <p className="text-sm font-bold text-navy-700 dark:text-white">
                      Mark all read
                    </p>
                  </div>

                  <button className="flex w-full items-center">
                    <div className="flex h-full w-[85px] items-center justify-center rounded-xl bg-gradient-to-b from-brandLinear to-brand-500 py-4 text-2xl text-white">
                      <BsArrowBarUp />
                    </div>
                    <div className="ml-2 flex h-full w-full flex-col justify-center rounded-lg px-1 text-sm">
                      <p className="mb-1 text-left text-base font-bold text-gray-900 dark:text-white">
                        New Update: An asset reassignment has been made
                      </p>
                      <p className="font-base text-left text-xs text-gray-900 dark:text-white">
                        Check and confirm it now!
                      </p>
                    </div>
                  </button>
                </div>
              }
              classNames={"py-2 top-8 -left-[230px] md:-left-[440px] w-max"}
            />
            <div className="hidden sm:block">
              <LanguageSwitcher className="" />
            </div>
            <div className="sm:hidden">
              <LanguageSwitcher className="max-w-[64px]" />
            </div>
            {hasPortalAccess ? (
              <Dropdown
                button={
                  <div className="flex cursor-pointer items-center gap-1 rounded-xl bg-lightPrimary px-2 py-2 text-xs font-medium text-navy-700 dark:bg-navy-900 dark:text-white sm:px-3">
                    <span className="hidden whitespace-nowrap sm:inline">{activePortal?.name || "Portal"}</span>
                    <span className="whitespace-nowrap sm:hidden">{compactPortalLabel}</span>
                    <MdKeyboardArrowDown className="h-4 w-4" />
                  </div>
                }
                animation="origin-[90%_0%] md:origin-top-right transition-all duration-300 ease-in-out"
                classNames={"top-10 -left-24 w-max"}
                children={
                  <div className="flex w-52 flex-col rounded-[16px] bg-white p-2 shadow-xl shadow-shadow-500 dark:!bg-navy-700 dark:text-white dark:shadow-none">
                    {availablePortals.map((portal) => {
                      const isActive = activePortal?.id === portal.id;
                      return (
                        <button
                          key={portal.id}
                          type="button"
                          onClick={() => handlePortalSwitch(portal)}
                          className={`rounded-xl px-3 py-2 text-left text-sm transition ${
                            isActive
                              ? "bg-lightPrimary font-semibold text-navy-700 dark:bg-navy-600 dark:text-white"
                              : "text-gray-700 hover:bg-lightPrimary dark:text-gray-200 dark:hover:bg-navy-600"
                          }`}
                        >
                          <span className="whitespace-nowrap">{portal.name}</span>
                        </button>
                      );
                    })}
                  </div>
                }
              />
            ) : null}
            <div className="cursor-pointer text-gray-600" onClick={toggleDarkMode}>
              {isDarkMode ? (
                <RiSunFill className="h-4 w-4 text-gray-600 dark:text-white" />
              ) : (
                <RiMoonFill className="h-4 w-4 text-gray-600 dark:text-white" />
              )}
            </div>
            <Dropdown
              button={
                <img
                  className="h-9 w-9 rounded-full object-cover sm:h-10 sm:w-10"
                  src={avatarUrl}
                  alt={displayName}
                  onError={(e) => {
                    e.target.src = avatarDefault;
                  }}
                />
              }
              children={
                <div className="flex w-56 flex-col justify-start rounded-[20px] bg-white bg-cover bg-no-repeat shadow-xl shadow-shadow-500 dark:!bg-navy-700 dark:text-white dark:shadow-none">
                  <div className="p-4">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="text-sm font-bold text-navy-700 dark:text-white">
                          {displayName}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {email}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="h-px w-full bg-gray-200 dark:bg-white/20 " />

                  <div className="flex flex-col p-4">
                    <Link
                      to={profilePath}
                      className="text-sm text-gray-800 dark:text-white hover:dark:text-white"
                    >
                      Profile Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="mt-3 text-sm font-medium text-red-500 transition duration-150 ease-out hover:text-red-600 hover:ease-in"
                    >
                      Log Out
                    </button>
                  </div>
                </div>
              }
              classNames={"py-2 top-8 -left-[180px] w-max"}
            />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
