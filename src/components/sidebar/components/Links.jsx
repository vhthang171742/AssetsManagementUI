/* eslint-disable */
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import DashIcon from "components/icons/DashIcon";
import { useAuth } from "context/AuthContext";
import { MdExpandMore } from "react-icons/md";
// chakra imports

// Menu item groups configuration
const MENU_GROUPS = [
  {
    id: "asset-management",
    label: "Asset Management",
    items: ["departments", "categories", "assets", "rooms", "production-lines", "handovers", "worker-equipment", "equipment-usage"]
  },
  {
    id: "training",
    label: "Training Mode",
    items: ["courses", "classes", "asset-course-mappings", "student-equipment-assignments"]
  },
  {
    id: "maintenance",
    label: "Maintenance",
    items: ["spare-parts", "maintenance-schedules", "maintenance-records", "maintenance-spare-part-usages"]
  },
  {
    id: "admin",
    label: "Administration",
    items: ["users", "portal-access", "configuration"]
  }
];

export function SidebarLinks(props) {
  // Chakra color mode
  let location = useLocation();
  const { userRoles } = useAuth();
  const [expandedGroups, setExpandedGroups] = useState(new Set(["asset-management"]));

  const { routes } = props;

  // verifies if routeName is the one active (in browser input)
  const activeRoute = (routeName) => {
    return location.pathname.includes(routeName);
  };

  const toggleGroup = (groupId) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const canAccessRoute = (route) => {
    const requiredRoles = Array.isArray(route.requiredRoles) ? route.requiredRoles : [];
    return requiredRoles.length === 0 ||
      (userRoles || []).some((userRole) =>
        requiredRoles.some(
          (requiredRole) =>
            (requiredRole || "").toLowerCase() === (userRole || "").toLowerCase()
        )
      );
  };

  const renderMenuItem = (route) => {
    return (
      <Link key={route.path} to={route.layout + "/" + route.path}>
        <div className="relative mb-3 flex hover:cursor-pointer">
          <li className="my-[3px] flex cursor-pointer items-center px-8">
            <span
              className={`${
                activeRoute(route.path) === true
                  ? "font-bold text-brand-500 dark:text-white"
                  : "font-medium text-gray-600"
              }`}
            >
              {route.icon ? route.icon : <DashIcon />}
            </span>
            <p
              className={`leading-1 ml-4 flex ${
                activeRoute(route.path) === true
                  ? "font-bold text-navy-700 dark:text-white"
                  : "font-medium text-gray-600"
              }`}
            >
              {route.name}
            </p>
          </li>
          {activeRoute(route.path) ? (
            <div className="absolute right-0 top-px h-9 w-1 rounded-lg bg-brand-500 dark:bg-brand-400" />
          ) : null}
        </div>
      </Link>
    );
  };

  const renderGroup = (group) => {
    const groupRoutes = routes.filter(
      (route) =>
        (route.layout === "/admin" ||
          route.layout === "/auth" ||
          route.layout === "/rtl") &&
        route.sidebar !== false &&
        group.items.includes(route.path) &&
        canAccessRoute(route)
    ).sort(
      (a, b) => group.items.indexOf(a.path) - group.items.indexOf(b.path)
    );

    if (groupRoutes.length === 0) return null;

    const isExpanded = expandedGroups.has(group.id);
    const hasActiveItem = groupRoutes.some((route) => activeRoute(route.path));

    return (
      <div key={group.id}>
        <button
          onClick={() => toggleGroup(group.id)}
          className={`w-full flex items-center justify-between px-8 py-2 mb-2 rounded transition-colors ${
            hasActiveItem
              ? "bg-blue-50 dark:bg-blue-900/20"
              : "hover:bg-gray-100 dark:hover:bg-white/5"
          }`}
        >
          <span
            className={`flex items-center gap-3 font-medium ${
              hasActiveItem
                ? "text-navy-700 dark:text-white"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            {group.label}
          </span>
          <MdExpandMore
            className={`h-5 w-5 transition-transform ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        </button>
        {isExpanded && (
          <div className="space-y-0">
            {groupRoutes.map((route) => renderMenuItem(route))}
          </div>
        )}
      </div>
    );
  };

  // Dashboard and other ungrouped pages
  const dashboardRoute = routes.find(
    (r) =>
      (r.layout === "/admin" || r.layout === "/auth" || r.layout === "/rtl") &&
      r.sidebar !== false &&
      r.path === "default" &&
      canAccessRoute(r)
  );

  return (
    <>
      {dashboardRoute && renderMenuItem(dashboardRoute)}
      {MENU_GROUPS.map((group) => renderGroup(group))}
    </>
  );
}

export default SidebarLinks;
