/**
 * API Service - Backward Compatibility Layer
 * 
 * This file maintains backward compatibility with the old API structure.
 * For new code, import services directly:
 * 
 *   OLD (deprecated):
 *   import { assetService } from 'services/api';
 * 
 *   NEW (preferred):
 *   import { assetService } from 'services';
 *   // or
 *   import assetService from 'services/assetService';
 */

import userServiceDefault from "./userService";

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

export const userService = userServiceDefault;
