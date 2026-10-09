"use client";

import { useParams } from "next/navigation";
import { ThreadView } from "@/components/Inbox";

export default function MessageThread() {
  return <ThreadView bookingId={useParams<{ id: string }>().id} role="guest" />;
}
