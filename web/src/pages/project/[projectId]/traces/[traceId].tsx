import { TracePage } from "@/src/components/trace2/TracePage";
import { useRouter } from "next/router";

export default function Trace() {
  const router = useRouter();
  const traceId = router.query.traceId as string;

  console.log("[Trace Page] router.query:", router.query);
  console.log("[Trace Page] traceId:", traceId);
  console.log("[Trace Page] projectId:", router.query.projectId);

  const timestamp =
    router.query.timestamp && typeof router.query.timestamp === "string"
      ? new Date(decodeURIComponent(router.query.timestamp))
      : undefined;

  return <TracePage traceId={traceId} timestamp={timestamp} />;
}
