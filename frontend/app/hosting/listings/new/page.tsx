"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ListingForm from "@/components/ListingForm";
import LoginPrompt from "@/components/LoginPrompt";
import { post } from "@/lib/api";
import type { ListingDetail, ListingInput } from "@/lib/types";
import { useUser } from "@/lib/user";

export default function NewListing() {
  const router = useRouter();
  const { user, ready, refresh } = useUser();
  if (!ready) return null;
  if (!user) return <LoginPrompt title="Hosting" text="Log in to create a listing." />;

  const create = async (data: ListingInput) => {
    const listing = await post<ListingDetail>("/listings", data);
    await refresh(); // first listing turns a guest into a host
    toast.success("Your listing is live!");
    router.push(`/hosting/listings/${listing.id}`);
  };

  return (
    <>
      <h1 className="mx-auto max-w-3xl px-6 pt-10 text-[32px] font-semibold">Create a listing</h1>
      <ListingForm submitLabel="Publish listing" onSubmit={create} onBack={() => router.push("/hosting")} />
    </>
  );
}
