import { redirect } from "next/navigation";

// The proxy sends "/" to /dashboard or /login based on the session; this is
// only a fallback. /dashboard is itself protected (proxy + server check).
export default function Home() {
  redirect("/dashboard");
}
