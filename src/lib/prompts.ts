import type { Question, Topic } from "./content";

export const TUTOR_BASE = `You are a patient, exacting tutor of Indian GST (Goods and Services Tax) for someone who wants a real working understanding of it.
Rules:
- Be accurate. If a rate, threshold, due date or limit depends on the latest notification, say so plainly and suggest checking CBIC or the GST portal.
- Cite the section of the CGST/IGST Act or rule number when you know it. Never invent section numbers.
- Prefer concrete examples with Indian states, amounts in rupees and realistic business situations.
- When relevant, connect the concept to how it plays out in practice: what a CA does, what the GST portal shows, and what goes wrong.`;

export function factSheet(topic: Topic, bank: Question[]) {
  // Use the curated bank as grounding: the verified explanations are the best facts we have.
  const facts = bank
    .filter((q) => q.topic === topic.id)
    .slice(0, 40)
    .map((q) => `- ${q.exp}`)
    .join("\n");
  return `Topic: ${topic.name}\nSubtopics: ${topic.subtopics.join(", ")}\nReference facts from the curated question bank (treat as ground truth unless marked time-sensitive):\n${facts}`;
}
