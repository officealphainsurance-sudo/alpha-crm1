import { TrendingUp } from "lucide-react";
import { PipelineKanban } from "./PipelineKanban";

export { PipelineKanban } from "./PipelineKanban";

export default {
  list: PipelineKanban,
  icon: TrendingUp,
  recordRepresentation: (record: { id: string }) => `Pipeline #${record.id}`,
};
