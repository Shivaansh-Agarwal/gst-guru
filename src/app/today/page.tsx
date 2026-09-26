import QuizRunner from "@/components/QuizRunner";
import { availableModels } from "@/lib/providers";
import { loadGlossary } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function Today() {
  return (
    <>
      <h1 style={{ marginBottom: 8, fontSize: "2rem" }}>Today's 10</h1>
      <p className="muted" style={{ marginBottom: 22, maxWidth: "60ch" }}>
        A mix of questions you're due to review and fresh ones from topics you haven't cracked yet. At least four are real client situations.
      </p>
      <QuizRunner mode="daily" aiReady={(await availableModels()).length > 0} glossary={loadGlossary()} />
    </>
  );
}
