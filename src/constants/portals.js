import { RoleSets } from "./authorization";
import { TranslationKeys as K } from "i18n/translationKeys";

export const PortalIds = {
  Admin: "admin",
  Student: "student",
  Teacher: "teacher",
  Maintainer: "maintainer",
  Worker: "worker",
  ProductionManager: "production-manager",
};

export const PortalConfigs = [
  {
    id: PortalIds.Admin,
    name: "Admin Portal",
    translationKey: K.PORTAL_ADMIN_NAME,
    path: "/admin",
    description: "Manage assets, users, configuration, production and training operations.",
    requiredRoles: RoleSets.Admin,
    requiredGroups: ["admins"],
  },
  {
    id: PortalIds.Student,
    name: "Student Portal",
    translationKey: K.PORTAL_STUDENT_NAME,
    path: "/student",
    description: "View assigned assets, check in/check out and track usage history with training calendar.",
    requiredRoles: RoleSets.TrainingUser,
    requiredGroups: ["students"],
  },
  {
    id: PortalIds.Teacher,
    name: "Teacher Portal",
    translationKey: K.PORTAL_TEACHER_NAME,
    path: "/teacher",
    description: "Monitor student asset usage, classes and training execution progress.",
    requiredRoles: RoleSets.TrainingManager,
    requiredGroups: ["teachers", "instructors", "trainers"],
  },
  {
    id: PortalIds.Maintainer,
    name: "Technician Portal",
    translationKey: K.PORTAL_MAINTAINER_NAME,
    path: "/maintainer",
    description: "Handle maintenance schedules, repair records and spare part activities.",
    requiredRoles: RoleSets.MaintenanceUser,
    requiredGroups: ["maintainers"],
  },
  {
    id: PortalIds.Worker,
    name: "Worker Portal",
    translationKey: K.PORTAL_WORKER_NAME,
    path: "/worker",
    description: "View your assigned equipment, log shift sessions and track usage history.",
    requiredRoles: RoleSets.ProductionUser,
    requiredGroups: ["workers"],
  },
  {
    id: PortalIds.ProductionManager,
    name: "Production Manager Portal",
    translationKey: K.PORTAL_PRODUCTION_MANAGER_NAME,
    path: "/production-manager",
    description: "Oversee production lines, worker assignments and equipment usage.",
    requiredRoles: RoleSets.ProductionManager,
    requiredGroups: ["productionmanagers"],
  },
];
