import { Building2 } from "lucide-react";
import { CarrierList } from "./CarrierList";

export { CarrierList } from "./CarrierList";
export { CarrierCreate } from "./CarrierCreate";

export default {
  list: CarrierList,
  icon: Building2,
  recordRepresentation: (record: { carrier_name: string }) => record.carrier_name,
};
