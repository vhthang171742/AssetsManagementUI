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

export { assetCategoryService } from "./assetCategoryService";
export { assetService } from "./assetService";
export { departmentService } from "./departmentService";
export { roomService } from "./roomService";
export { handoverService } from "./handoverService";
