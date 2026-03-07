import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SubmitClient } from "./submit-client";
import { AppShell } from "@/components/app-shell";

export const metadata = {
    title: "Submit a Template | TSX Studio",
    description: "Share your elite caption templates with the network and earn rendering energy.",
};

export default async function SubmitTemplatePage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/login?callbackUrl=/templates/submit");
    }

    return (
        <AppShell>
            <div className="p-8 pb-32">
                <div className="max-w-4xl mx-auto mb-16">
                    <h1 className="text-6xl font-black italic uppercase tracking-tighter">
                        Submit <br /><span className="text-primary italic">Template.</span>
                    </h1>
                    <p className="text-muted-foreground mt-4 text-lg italic font-medium max-w-xl">
                        Upload your TSX code and preview video. Once verified by admins, it joins the global template network. Earn credits every time someone uses it.
                    </p>
                </div>
                <SubmitClient />
            </div>
        </AppShell>
    );
}
