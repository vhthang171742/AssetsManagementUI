export const DbRoles = {
  Student: "student",
  Instructor: "instructor",
  Worker: "worker",
  Technician: "technician",
  ProductionManager: "productionmanager",
};

// Backward-compatible alias name for existing imports.
export const Roles = DbRoles;

export const RoleSets = {
  AssetsUser: [
    DbRoles.Student,
    DbRoles.Instructor,
    DbRoles.Worker,
    DbRoles.Technician,
    DbRoles.ProductionManager,
  ],
  AssetsManager: [DbRoles.Instructor, DbRoles.Technician, DbRoles.ProductionManager],
  UsersManager: [DbRoles.Instructor, DbRoles.Technician, DbRoles.ProductionManager],
  ProductionUser: [DbRoles.Worker, DbRoles.ProductionManager],
  ProductionManager: [DbRoles.ProductionManager],
  TrainingUser: [DbRoles.Student, DbRoles.Instructor],
  TrainingManager: [DbRoles.Instructor],
  AssignmentManager: [DbRoles.Instructor, DbRoles.Technician],
  MaintenanceUser: [DbRoles.Technician],
  MaintenanceManager: [DbRoles.Technician],
  Admin: [DbRoles.Instructor, DbRoles.Technician, DbRoles.ProductionManager],
  AnyPortalRole: [
    DbRoles.Student,
    DbRoles.Instructor,
    DbRoles.Worker,
    DbRoles.Technician,
    DbRoles.ProductionManager,
  ],
};
