import { redirect } from "next/navigation";

/** Legacy demo entry point retired: use the production analysis workspace. */
export default function DemoPage() {
    redirect("/analyze");
}
