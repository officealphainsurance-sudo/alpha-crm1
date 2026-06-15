import { ClipboardList } from "lucide-react";
import { FollowUpList } from "./FollowUpList";

export { FollowUpList } from "./FollowUpList";

export default {
  list: FollowUpList,
  icon: ClipboardList,
  recordRepresentation: (record: { id: string }) => `Follow-Up #${record.id}`,
};
