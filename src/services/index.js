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
