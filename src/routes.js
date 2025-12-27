import React from "react";

// Admin Imports
import MainDashboard from "views/admin/default";
import Profile from "views/admin/profile";
import Assets from "views/admin/assets";
import Categories from "views/admin/categories";
import Departments from "views/admin/departments";
import Rooms from "views/admin/rooms";
import Handovers from "views/admin/handovers";

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
  },
];
export default routes;
