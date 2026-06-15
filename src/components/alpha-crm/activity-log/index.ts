import { Activity } from "lucide-react";
import { ActivityLogList } from "./ActivityLogList";

export { ActivityLogList } from "./ActivityLogList";

export default {
  list: ActivityLogList,
  icon: Activity,
  recordRepresentation: (record: { id: string }) => `Log #${record.id}`,
};
