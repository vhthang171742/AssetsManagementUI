import React from "react";
import { RoleSets } from "constants/authorization";
import { TranslationKeys as K } from "i18n/translationKeys";

// Admin Imports
import MainDashboard from "views/admin/default";
import Assets from "views/admin/assets";
import Categories from "views/admin/categories";
import Departments from "views/admin/departments";
import Rooms from "views/admin/rooms";
import Handovers from "views/admin/handovers";
import AllAssetItems from "views/admin/allAssetItems";
import Configuration from "views/admin/configuration";
import Users from "views/admin/users";
import PortalAccess from "views/admin/portalAccess";
import ProductionLines from "views/admin/productionLines";
import ProductionOrders from "views/admin/productionOrders";
import ProductionSteps from "views/admin/productionSteps";
import WorkerEquipment from "views/admin/workerEquipment";
import EquipmentUsage from "views/admin/equipmentUsage";
import WorkingTime from "views/admin/workingTime";

// Training Mode Imports
import Courses from "views/admin/courses";
import Classes from "views/admin/classes";
import StudentEquipmentAssignments from "views/admin/studentEquipmentAssignments";
import AssetCourseMappings from "views/admin/assetCourseMappings";

// Maintenance Management Imports (Phase 9)
import MaintenanceSchedules from "views/admin/maintenanceSchedules";
import MaintenanceRecords from "views/admin/maintenanceRecords";

// Auth Imports
import SignIn from "views/auth/SignIn";

// Icon Imports
import {
  MdHome,
  MdLock,
  MdStorefront,
  MdCategory,
  MdApartment,
  MdMeetingRoom,
  MdAssignment,
  MdSettings,
  MdPeople,
  MdFactory,
  MdPerson2,
  MdListAlt,
  MdPlaylistAddCheck,
  MdDataUsage,
  MdSchedule,
  MdSchool,
  MdGroups,
  MdAssignmentInd,
  MdAccountTree,
  MdBuild,
  MdInventory2,
  MdEventNote,
  MdHistory,
  MdAdminPanelSettings,
} from "react-icons/md";

const routes = [
  {
    name: "Dashboard",
    translationKey: K.ROUTE_DASHBOARD,
    layout: "/admin",
    path: "default",
    icon: <MdHome className="h-6 w-6" />,
    component: <MainDashboard />,
    requiredRoles: RoleSets.AnyPortalRole,
  },
  {
    name: "Assets",
    translationKey: K.ROUTE_ASSETS,
    layout: "/admin",
    path: "assets",
    icon: <MdStorefront className="h-6 w-6" />,
    component: <Assets />,
    requiredRoles: RoleSets.AssetsUser,
  },
  {
    name: "Categories",
    translationKey: K.ROUTE_CATEGORIES,
    layout: "/admin",
    path: "categories",
    icon: <MdCategory className="h-6 w-6" />,
    component: <Categories />,
    requiredRoles: RoleSets.AssetsUser,
  },
  {
    name: "Departments",
    translationKey: K.ROUTE_DEPARTMENTS,
    layout: "/admin",
    path: "departments",
    icon: <MdApartment className="h-6 w-6" />,
    component: <Departments />,
    requiredRoles: RoleSets.AssetsUser,
  },
  {
    name: "Class Room",
    translationKey: K.ROUTE_ROOMS,
    layout: "/admin",
    path: "rooms",
    icon: <MdMeetingRoom className="h-6 w-6" />,
    component: <Rooms />,
    requiredRoles: RoleSets.AssetsUser,
  },
  {
    name: "Handovers",
    translationKey: K.ROUTE_HANDOVERS,
    layout: "/admin",
    path: "handovers",
    icon: <MdAssignment className="h-6 w-6" />,
    component: <Handovers />,
    requiredRoles: RoleSets.AssetsUser,
  },
  {
    name: "All Asset Items",
    translationKey: K.ROUTE_ASSET_ITEMS,
    layout: "/admin",
    path: "asset-items",
    icon: <MdListAlt className="h-6 w-6" />,
    component: <AllAssetItems />,
    requiredRoles: RoleSets.AssetsUser,
  },
  {
    name: "Configuration",
    translationKey: K.ROUTE_CONFIGURATION,
    layout: "/admin",
    path: "configuration",
    icon: <MdSettings className="h-6 w-6" />,
    component: <Configuration />,
    requiredRoles: RoleSets.UsersManager,
  },
  {
    name: "Users",
    translationKey: K.ROUTE_USERS,
    layout: "/admin",
    path: "users",
    icon: <MdPeople className="h-6 w-6" />,
    component: <Users />,
    requiredRoles: RoleSets.UsersManager,
  },
  {
    name: "Portal Access",
    translationKey: K.ROUTE_PORTAL_ACCESS,
    layout: "/admin",
    path: "portal-access",
    icon: <MdAdminPanelSettings className="h-6 w-6" />,
    component: <PortalAccess />,
    requiredRoles: RoleSets.UsersManager,
  },
  {
    name: "Production Lines",
    translationKey: K.ROUTE_PRODUCTION_LINES,
    layout: "/admin",
    path: "production-lines",
    icon: <MdFactory className="h-6 w-6" />,
    component: <ProductionLines />,
    requiredRoles: RoleSets.ProductionUser,
  },
  {
    name: "Production Orders",
    translationKey: K.ROUTE_PRODUCTION_ORDERS,
    layout: "/admin",
    path: "production-orders",
    icon: <MdListAlt className="h-6 w-6" />,
    component: <ProductionOrders />,
    requiredRoles: RoleSets.ProductionUser,
  },
  {
    name: "Production Steps",
    translationKey: K.ROUTE_PRODUCTION_STEPS,
    layout: "/admin",
    path: "production-steps",
    icon: <MdPlaylistAddCheck className="h-6 w-6" />,
    component: <ProductionSteps />,
    requiredRoles: RoleSets.ProductionUser,
  },
  {
    name: "Worker Equipment",
    translationKey: K.ROUTE_WORKER_EQUIPMENT,
    layout: "/admin",
    path: "worker-equipment",
    icon: <MdPerson2 className="h-6 w-6" />,
    component: <WorkerEquipment />,
    requiredRoles: RoleSets.AssetsUser,
  },
  {
    name: "Equipment Usage",
    translationKey: K.ROUTE_EQUIPMENT_USAGE,
    layout: "/admin",
    path: "equipment-usage",
    icon: <MdDataUsage className="h-6 w-6" />,
    component: <EquipmentUsage />,
    requiredRoles: RoleSets.AssetsUser,
  },
  {
    name: "Working Time",
    translationKey: K.ROUTE_WORKING_TIME,
    layout: "/admin",
    path: "working-time",
    icon: <MdSchedule className="h-6 w-6" />,
    component: <WorkingTime />,
    requiredRoles: RoleSets.ProductionManager,
  },
  {
    name: "Courses",
    translationKey: K.ROUTE_COURSES,
    layout: "/admin",
    path: "courses",
    icon: <MdSchool className="h-6 w-6" />,
    component: <Courses />,
    requiredRoles: RoleSets.TrainingUser,
  },
  {
    name: "Classes",
    translationKey: K.ROUTE_CLASSES,
    layout: "/admin",
    path: "classes",
    icon: <MdGroups className="h-6 w-6" />,
    component: <Classes />,
    requiredRoles: RoleSets.TrainingUser,
  },
  {
    name: "Student Assignments",
    translationKey: K.ROUTE_STUDENT_ASSIGNMENTS,
    layout: "/admin",
    path: "student-equipment-assignments",
    icon: <MdAssignmentInd className="h-6 w-6" />,
    component: <StudentEquipmentAssignments />,
    requiredRoles: RoleSets.AssignmentManager,
  },
  {
    name: "Asset Mappings",
    translationKey: K.ROUTE_ASSET_MAPPINGS,
    layout: "/admin",
    path: "asset-course-mappings",
    icon: <MdAccountTree className="h-6 w-6" />,
    component: <AssetCourseMappings />,
    requiredRoles: RoleSets.TrainingUser,
  },
  {
    name: "Maintenance Schedules",
    translationKey: K.ROUTE_MAINTENANCE_SCHEDULES,
    layout: "/admin",
    path: "maintenance-schedules",
    icon: <MdEventNote className="h-6 w-6" />,
    component: <MaintenanceSchedules />,
    requiredRoles: RoleSets.MaintenanceUser,
  },
  {
    name: "Maintenance Records",
    translationKey: K.ROUTE_MAINTENANCE_RECORDS,
    layout: "/admin",
    path: "maintenance-records",
    icon: <MdHistory className="h-6 w-6" />,
    component: <MaintenanceRecords />,
    requiredRoles: RoleSets.MaintenanceUser,
  },
  {
    name: "Sign In",
    translationKey: K.ROUTE_SIGN_IN,
    layout: "/auth",
    path: "sign-in",
    icon: <MdLock className="h-6 w-6" />,
    component: <SignIn />,
    sidebar: false, // Hide from sidebar
  },
];
export default routes;
