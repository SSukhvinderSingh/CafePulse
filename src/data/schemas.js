/**
 * @typedef {{id:string,name:string,category:string,unit:string,stock:number,parLevel:number,costPerUnit:number,pricePerUnit:number,tags:{taste:string[],dietary:string[],notes:string[]},requiresEquipment:string[],flavorNotes:string}} Ingredient
 * @typedef {{id:string,name:string,available:boolean}} Equipment
 * @typedef {{ingredientId:string,name:string,qty:number,unit:string,unitCost:number,lineCost:number}} BOMLine
 * @typedef {{name:string,description:string,bom:BOMLine[],price:number,cost:number,baristaSteps:string[],prepMinutes:number,allergens:string[],source:'gemini'|'mock'}} CustomOrder
 * @typedef {{id:string,customer:string,orderName:string,bom:BOMLine[],price:number,prepMinutes:number,createdAt:number,startedAt:number|null,dueAt:number,status:'queued'|'brewing'|'ready'|'done',source:string}} Ticket
 * @typedef {{id:string,ts:number,temperature:number,noise:number,cleanliness:number,seating:number,coffee:number,comment?:string}} Telemetry
 * @typedef {{id:string,ts:number,category:string,severity:'low'|'med'|'high',message:string,suggestedAction:string,source:string}} Alert
 */

export const DIMENSIONS = ['temperature', 'noise', 'cleanliness', 'seating', 'coffee'];
export const CATEGORIES = [...DIMENSIONS, 'other'];
export const SEVERITIES = ['low', 'med', 'high'];

/** Structural validator for a model-produced order. Pure; does not check stock. */
export function isOrderShape(o) {
  return !!o && typeof o.name === 'string' && o.name.length > 0 &&
    typeof o.description === 'string' &&
    Array.isArray(o.bom) && o.bom.length >= 2 &&
    o.bom.every((l) => typeof l.ingredientId === 'string' && Number.isFinite(l.qty) && l.qty > 0) &&
    Array.isArray(o.baristaSteps) && o.baristaSteps.length >= 3 &&
    Number.isFinite(o.prepMinutes) && o.prepMinutes > 0;
}

export function isAlertShape(a) {
  return !!a && CATEGORIES.includes(a.category) && SEVERITIES.includes(a.severity) &&
    typeof a.message === 'string' && typeof a.suggestedAction === 'string';
}
