"use client";

import { useParams } from "next/navigation";
import { ThreadView } from "@/components/Inbox";

export default function HostMessageThread() {
  return <ThreadView bookingId={useParams<{ id: string }>().id} role="host" />;
}
