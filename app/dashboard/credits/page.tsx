import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AppShell } from "@/components/app-shell";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function CreditsHistoryPage() {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const transactions = await db.creditTransaction.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
    });

    return (
        <AppShell>
            <div className="p-8 space-y-8 max-w-5xl mx-auto">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight italic">Credit <span className="text-primary italic">History</span></h1>
                    <p className="text-muted-foreground">Review your past credit usage, purchases, and rewards.</p>
                </div>

                <div className="bg-card/30 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden p-6">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-white/5 hover:bg-transparent">
                                <TableHead className="text-[10px] font-black uppercase tracking-widest">Date</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest">Type</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest">Description</TableHead>
                                <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.length === 0 ? (
                                <TableRow className="hover:bg-transparent border-0">
                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground text-sm">
                                        No credit transactions found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                transactions.map((tx) => (
                                    <TableRow key={tx.id} className="border-white/5 data-[state=selected]:bg-muted hover:bg-white/[0.02]">
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            {format(new Date(tx.createdAt), "MMM d, yyyy HH:mm")}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-widest border-white/10">
                                                {tx.type.replace(/_/g, " ")}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm font-medium">
                                            {tx.description || "-"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className={`font-black italic ${tx.amount > 0 ? "text-emerald-500" : "text-destructive"}`}>
                                                {tx.amount > 0 ? "+" : ""}{tx.amount}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </AppShell >
    );
}
