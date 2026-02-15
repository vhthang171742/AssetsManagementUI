import React from "react";

// Admin Imports
import MainDashboard from "views/admin/default";
import Profile from "views/admin/profile";
import Assets from "views/admin/assets";
import Categories from "views/admin/categories";
import Departments from "views/admin/departments";
import Rooms from "views/admin/rooms";
import Handovers from "views/admin/handovers";
import Configuration from "views/admin/configuration";
import Users from "views/admin/users";
import ProductionLines from "views/admin/productionLines";
import WorkerEquipment from "views/admin/workerEquipment";
import EquipmentUsage from "views/admin/equipmentUsage";

// Training Mode Imports
import Courses from "views/admin/courses";
import Classes from "views/admin/classes";
import StudentEquipmentAssignments from "views/admin/studentEquipmentAssignments";
import AssetCourseMappings from "views/admin/assetCourseMappings";

// Auth Imports
import SignIn from "views/auth/SignIn";

// Icon Imports
import {
  MdHome,
  MdPerson,
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
  MdDataUsage,
  MdSchool,
} from "react-icons/md";

const routes = [
  {
    name: "Dashboard",
    layout: "/admin",
    path: "default",
    icon: <MdHome className="h-6 w-6" />,
    component: <MainDashboard />,
  },
  {
    name: "Assets",
    layout: "/admin",
    path: "assets",
    icon: <MdStorefront className="h-6 w-6" />,
    component: <Assets />,
  },
  {
    name: "Categories",
    layout: "/admin",
    path: "categories",
    icon: <MdCategory className="h-6 w-6" />,
    component: <Categories />,
  },
  {
    name: "Departments",
    layout: "/admin",
    path: "departments",
    icon: <MdApartment className="h-6 w-6" />,
    component: <Departments />,
  },
  {
    name: "Rooms",
    layout: "/admin",
    path: "rooms",
    icon: <MdMeetingRoom className="h-6 w-6" />,
    component: <Rooms />,
  },
  {
    name: "Handovers",
    layout: "/admin",
    path: "handovers",
    icon: <MdAssignment className="h-6 w-6" />,
    component: <Handovers />,
  },
  {
    name: "Configuration",
    layout: "/admin",
    path: "configuration",
    icon: <MdSettings className="h-6 w-6" />,
    component: <Configuration />,
  },
  {
    name: "Users",
    layout: "/admin",
    path: "users",
    icon: <MdPeople className="h-6 w-6" />,
    component: <Users />,
  },
  {
    name: "Production Lines",
    layout: "/admin",
    path: "production-lines",
    icon: <MdFactory className="h-6 w-6" />,
    component: <ProductionLines />,
  },
  {
    name: "Worker Equipment",
    layout: "/admin",
    path: "worker-equipment",
    icon: <MdPerson2 className="h-6 w-6" />,
    component: <WorkerEquipment />,
  },
  {
    name: "Equipment Usage",
    layout: "/admin",
    path: "equipment-usage",
    icon: <MdDataUsage className="h-6 w-6" />,
    component: <EquipmentUsage />,
  },
  {
    name: "Courses",
    layout: "/admin",
    path: "courses",
    icon: <MdSchool className="h-6 w-6" />,
    component: <Courses />,
  },
  {
    name: "Classes",
    layout: "/admin",
    path: "classes",
    icon: <MdSchool className="h-6 w-6" />,
    component: <Classes />,
  },
  {
    name: "Student Assignments",
    layout: "/admin",
    path: "student-equipment-assignments",
    icon: <MdSchool className="h-6 w-6" />,
    component: <StudentEquipmentAssignments />,
  },
  {
    name: "Asset Mappings",
    layout: "/admin",
    path: "asset-course-mappings",
    icon: <MdSchool className="h-6 w-6" />,
    component: <AssetCourseMappings />,
  },
  {
    name: "Profile",
    layout: "/admin",
    path: "profile",
    icon: <MdPerson className="h-6 w-6" />,
    component: <Profile />,
  },
  {
    name: "Sign In",
    layout: "/auth",
    path: "sign-in",
    icon: <MdLock className="h-6 w-6" />,
    component: <SignIn />,
    sidebar: false, // Hide from sidebar
  },
];
export default routes;
