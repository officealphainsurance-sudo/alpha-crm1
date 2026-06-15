import { Users } from "lucide-react";
import { ClientList } from "./ClientList";

export { ClientList } from "./ClientList";
export { ClientShow } from "./ClientShow";
export { ClientCreate } from "./ClientCreate";

export default {
  list: ClientList,
  icon: Users,
  recordRepresentation: (record: { name: string }) => record.name,
};
