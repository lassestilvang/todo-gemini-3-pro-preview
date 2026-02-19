import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Todo Gemini | App",
  description: "Manage your tasks efficiently with Todo Gemini."
};

import { redirect } from "next/navigation";

export default function Home() {
  redirect("/inbox");
}
