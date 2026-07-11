import { useState } from "react";
import { useGetList, useUpdate, useCreate, useNotify } from "ra-core";
import { QueryErrorBanner } from "../QueryError";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { TrendingUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { PipelineRecord, PipelineStatus } from "../types";
import { URGENCY_COLORS, QUOTE_TYPE_LABELS } from "../types";
import { formatCurrency } from "../utils";

const COLUMNS: { status: PipelineStatus; label: string; color: string }[] = [
  { status: "open", label: "Open", color: "border-t-blue-400" },
  { status: "quoted", label: "Quoted", color: "border-t-amber-400" },
  { status: "won", label: "Won", color: "border-t-emerald-500" },
  { status: "lost", label: "Lost", color: "border-t-red-400" },
];

export function PipelineKanban() {
  const notify = useNotify();
  const [update] = useUpdate();

  const { data, isPending, refetch, error } = useGetList<PipelineRecord>("pipeline", {
    filter: {},
    pagination: { page: 1, perPage: 500 },
    sort: { field: "created_at", order: "DESC" },
  });

  const records = data ?? [];

  const byStatus = (status: PipelineStatus) =>
    records.filter((r) => r.status === status);

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStatus = destination.droppableId as PipelineStatus;
    const record = records.find((r) => r.id === draggableId);
    if (!record || record.status === newStatus) return;

    try {
      await update("pipeline", {
        id: draggableId,
        data: { status: newStatus },
        previousData: record,
      });
    } catch {
      notify("Failed to move record", { type: "error" });
    }
  };

  const columnTotal = (status: PipelineStatus) =>
    byStatus(status).reduce(
      (sum, r) => sum + (r.estimated_premium ?? 0),
      0,
    );

  return (
    <div className="p-6 space-y-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Pipeline
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {records.length} record{records.length !== 1 ? "s" : ""} in pipeline
          </p>
        </div>
      </div>

      {isPending ? (
        <div className="grid grid-cols-4 gap-4">
          {COLUMNS.map((col) => (
            <div key={col.status} className="space-y-3">
              <Skeleton className="h-8 w-full" />
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      ) : error ? (
        <QueryErrorBanner error={error} label="pipeline" />
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-4 gap-4 overflow-x-auto min-h-96">
            {COLUMNS.map((col) => {
              const items = byStatus(col.status);
              const total = columnTotal(col.status);
              return (
                <div key={col.status} className="flex flex-col gap-2 min-w-52">
                  {/* Column header */}
                  <div
                    className={`rounded-lg border-t-4 bg-muted/40 px-3 py-2 ${col.color}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{col.label}</span>
                      <Badge variant="secondary" className="text-xs">
                        {items.length}
                      </Badge>
                    </div>
                    {total > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatCurrency(total)}/mo est.
                      </p>
                    )}
                  </div>

                  {/* Cards */}
                  <Droppable droppableId={col.status}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex flex-col gap-2 min-h-20 rounded-lg p-1 transition-colors ${
                          snapshot.isDraggingOver ? "bg-muted/60" : ""
                        }`}
                      >
                        {items.map((record, index) => (
                          <Draggable
                            key={record.id}
                            draggableId={record.id}
                            index={index}
                          >
                            {(drag, dragSnapshot) => (
                              <div
                                ref={drag.innerRef}
                                {...drag.draggableProps}
                                {...drag.dragHandleProps}
                              >
                                <PipelineCard
                                  record={record}
                                  isDragging={dragSnapshot.isDragging}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {items.length === 0 && !snapshot.isDraggingOver && (
                          <div className="flex items-center justify-center h-16 text-xs text-muted-foreground border-2 border-dashed rounded-lg">
                            Drop here
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}
    </div>
  );
}

function PipelineCard({
  record,
  isDragging,
}: {
  record: PipelineRecord;
  isDragging: boolean;
}) {
  return (
    <Card
      className={`cursor-grab active:cursor-grabbing transition-shadow text-sm ${
        isDragging ? "shadow-lg rotate-1" : "hover:shadow-sm"
      }`}
    >
      <CardContent className="p-3 space-y-1.5">
        <p className="font-medium leading-tight truncate">
          {record.client_name ?? `Pipeline #${record.id.slice(0, 6)}`}
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {QUOTE_TYPE_LABELS[record.quote_type]}
          </Badge>
          <Badge className={`text-xs ${URGENCY_COLORS[record.urgency]}`}>
            {record.urgency}
          </Badge>
        </div>
        {record.estimated_premium && (
          <p className="text-muted-foreground text-xs">
            {formatCurrency(record.estimated_premium)}/mo est.
          </p>
        )}
        {record.current_carrier && (
          <p className="text-muted-foreground text-xs truncate">
            Current: {record.current_carrier}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
