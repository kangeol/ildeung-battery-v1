import { createConversationState } from "./smart-consult-conversation.js?v=faq-v1";
import { copy } from "./conversation-copy.js";

export function findEntry(id, index) {
  if (typeof id !== "string" || id.length > 180 || !/^[a-z0-9-]+\/[a-z0-9-]+(?:\/[a-z0-9-]+)?$/.test(id)) return null;
  return index.vehicles.find(item => item.id === id) || null;
}
export function entryState(entry) {
  return {...createConversationState(), manufacturer:entry.manufacturerId,manufacturerName:entry.manufacturerName,
    vehicleFamily:entry.vehicle,selectedVehicleKey:`${entry.manufacturerId}|${entry.vehicle}`,detailModels:entry.details,detailModel:entry.details.length===1?entry.details[0]:"",
    previousQuestion:{field:"year",prompt:copy.year,choices:[]}};
}
