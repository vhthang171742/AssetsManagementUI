import { RoleSets, Roles } from "./authorization";

export const PortalIds = {
  Admin: "admin",
  Student: "student",
  Teacher: "teacher",
  Maintainer: "maintainer",
};

export const PortalConfigs = [
  {
    id: PortalIds.Admin,
    name: "Admin Portal",
    path: "/admin",
    description: "Manage assets, users, configuration, production and training operations.",
    requiredRoles: RoleSets.AnyPortalRole,
    requiredGroups: ["admins"],
  },
  {
    id: PortalIds.Student,
    name: "Student Portal",
    path: "/student",
    description: "View assigned assets, check in/check out and track usage history with training calendar.",
    requiredRoles: [Roles.TrainingUser, Roles.TrainingManager, Roles.Admin],
    requiredGroups: ["students"],
  },
  {
    id: PortalIds.Teacher,
    name: "Teacher Portal",
    path: "/teacher",
    description: "Monitor student asset usage, classes and training execution progress.",
    requiredRoles: [Roles.TrainingManager, Roles.Admin],
    requiredGroups: ["teachers", "instructors", "trainers"],
  },
  {
    id: PortalIds.Maintainer,
    name: "Maintainer Portal",
    path: "/maintainer",
    description: "Handle maintenance schedules, repair records and spare part activities.",
    requiredRoles: RoleSets.MaintenanceUser,
    requiredGroups: ["maintainers"],
  },
];
