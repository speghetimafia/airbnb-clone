"use client";

import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import ListingForm, { toInput } from "@/components/ListingForm";
import { put } from "@/lib/api";
import type { ListingDetail, ListingInput } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { useUser } from "@/lib/user";

export default function EditListing() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useUser();
  const { data: listing, error } = useApi<ListingDetail>(`/listings/${id}`);

  if (error) return <p className="p-20 text-center">{error}</p>;
  if (!listing) return <div className="mx-auto mt-10 h-96 max-w-3xl animate-pulse rounded-xl bg-soft" />;
  if (user?.id !== listing.host.id) return <p className="p-20 text-center">Only the host can edit this listing.</p>;

  const save = async (data: ListingInput) => {
    await put(`/listings/${id}`, data);
    toast.success("Changes saved");
    router.push("/hosting");
  };

  return (
    <>
      <h1 className="mx-auto max-w-3xl px-6 pt-10 text-[32px] font-semibold">Edit listing</h1>
      <ListingForm initial={toInput(listing)} submitLabel="Save changes" onSubmit={save} onBack={() => router.push("/hosting")} />
    </>
  );
}
