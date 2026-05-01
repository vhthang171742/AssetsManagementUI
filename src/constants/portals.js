import { RoleSets, Roles } from "./authorization";
import { TranslationKeys as K } from "i18n/translationKeys";

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
    translationKey: K.PORTAL_ADMIN_NAME,
    path: "/admin",
    description: "Manage assets, users, configuration, production and training operations.",
    requiredRoles: [Roles.Admin],
    requiredGroups: ["admins"],
  },
  {
    id: PortalIds.Student,
    name: "Student Portal",
    translationKey: K.PORTAL_STUDENT_NAME,
    path: "/student",
    description: "View assigned assets, check in/check out and track usage history with training calendar.",
    requiredRoles: [Roles.TrainingUser, Roles.TrainingManager, Roles.Admin],
    requiredGroups: ["students"],
  },
  {
    id: PortalIds.Teacher,
    name: "Teacher Portal",
    translationKey: K.PORTAL_TEACHER_NAME,
    path: "/teacher",
    description: "Monitor student asset usage, classes and training execution progress.",
    requiredRoles: [Roles.TrainingManager, Roles.Admin],
    requiredGroups: ["teachers", "instructors", "trainers"],
  },
  {
    id: PortalIds.Maintainer,
    name: "Maintainer Portal",
    translationKey: K.PORTAL_MAINTAINER_NAME,
    path: "/maintainer",
    description: "Handle maintenance schedules, repair records and spare part activities.",
    requiredRoles: RoleSets.MaintenanceUser,
    requiredGroups: ["maintainers"],
  },
];
