import Link from "next/link";
export default function NotFound() {
  return (
    <>
      <h1 style={{ marginBottom: 12 }}>Nothing here</h1>
      <p>
        That page doesn't exist. <Link href="/">Go to today's set</Link>.
      </p>
    </>
  );
}
