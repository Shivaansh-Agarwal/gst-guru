import { redirect } from "next/navigation";

// Study notes now live in the topic's Learn tab.
export default async function Notes({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/topics/${id}?tab=learn#notes`);
}
