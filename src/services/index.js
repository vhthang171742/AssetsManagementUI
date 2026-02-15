/**
 * Services barrel export
 * Import all services from this file for cleaner imports throughout the app
 * 
 * Usage:
 *   import { assetService, roomService, ... } from 'services';
 */

export { default as httpClient } from "./httpClient";
export { assetCategoryService } from "./assetCategoryService";
export { assetService } from "./assetService";
export { departmentService } from "./departmentService";
export { roomService } from "./roomService";
export { handoverService } from "./handoverService";
export { dropdownService } from "./dropdownService";
export { configurationService } from "./configurationService";
export { productionLineService } from "./productionLineService";
export { workerEquipmentService } from "./workerEquipmentService";
export { equipmentUsageService } from "./equipmentUsageService";
// Phase 8: Training Mode Services
export { courseService } from "./courseService";
export { classService } from "./classService";
export { studentEquipmentAssignmentService } from "./studentEquipmentAssignmentService";
export { assetCourseMappingService } from "./assetCourseMappingService";

// Phase 9: Maintenance Management Services
export { maintenanceScheduleService } from "./maintenanceScheduleService";
export { maintenanceRecordService } from "./maintenanceRecordService";
export { sparePartService } from "./sparePartService";
export { maintenanceSparePartUsageService } from "./maintenanceSparePartUsageService";

// Phase 11: Practice Session Logging Services
export { 
  practiceSessionService, 
  practiceErrorLogService, 
  sessionEvaluationService 
} from "./practiceSessionService";

// Phase 12: Competency Evaluation & Certification Services
export {
  competencyProfileService,
  equipmentCompetencyService,
  certificationService,
  skillRankingService
} from "./competencyService";
