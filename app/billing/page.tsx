import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AppShell } from "@/components/app-shell";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Zap, History, MoveRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export default async function BillingPage() {
    const session = await auth();
    if (!session?.user?.id) return null;

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        include: {
            entitlement: true,
            creditTransactions: {
                orderBy: { createdAt: "desc" },
                take: 5,
            },
        },
    });

    if (!user) return null;

    const creditsUsed = (user.entitlement?.monthlyCredits || 0) - (user.entitlement?.creditsBalance || 0);
    const usagePercentage = user.entitlement?.monthlyCredits
        ? (creditsUsed / user.entitlement.monthlyCredits) * 100
        : 0;

    return (
        <AppShell>
            <div className="p-8 space-y-8 max-w-5xl">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">Billing & Credits</h1>
                    <p className="text-muted-foreground">Manage your subscription, view usage, and buy credits.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Active Plan */}
                    <Card className="col-span-1 border-white/5 bg-card/30 backdrop-blur-xl">
                        <CardHeader>
                            <CardTitle className="flex flex-col gap-1">
                                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Current Plan</span>
                                <span className="text-2xl font-black italic text-primary uppercase">{user.plan}</span>
                            </CardTitle>
                            <CardDescription>Your plan renews on Feb 25, 2026</CardDescription>
                        </CardHeader>
                        <CardFooter className="pt-0">
                            <Button className="w-full gap-2" variant="secondary" asChild>
                                <Link href="/pricing">
                                    Manage Plan <ArrowUpRight className="w-4 h-4" />
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Credits Usage */}
                    <Card className="col-span-2 border-white/5 bg-card/30 backdrop-blur-xl">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-amber-500 fill-amber-500" /> Monthly Credits
                                </CardTitle>
                                <div className="text-sm font-bold">
                                    {user.entitlement?.creditsBalance || 0} / {user.entitlement?.monthlyCredits || 3} <span className="text-muted-foreground font-medium">available</span>
                                </div>
                            </div>
                            <CardDescription>Credits reset at the start of every billing cycle.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Progress value={usagePercentage} className="h-2 bg-white/5" />
                            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                                <p>Usage: {Math.round(usagePercentage)}% of monthly allocation</p>
                                <Button variant="link" className="h-auto p-0 text-primary text-xs font-bold">Buy more credits</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Credit Packs */}
                    <Card className="border-white/5 bg-card/30 backdrop-blur-xl flex flex-col">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold">One-time Top-ups</CardTitle>
                            <CardDescription>Need more renders? Credit packs never expire.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 flex-1">
                            <CreditPackOption amount={50} price={19} />
                            <CreditPackOption amount={200} price={59} />
                            <CreditPackOption amount={500} price={129} featured />
                        </CardContent>
                    </Card>

                    {/* Transaction History */}
                    <Card className="border-white/5 bg-card/30 backdrop-blur-xl">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <History className="w-4 h-4" /> Recent Transactions
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {user.creditTransactions.length === 0 ? (
                                <div className="text-center py-10 text-muted-foreground text-sm">No recent transactions.</div>
                            ) : (
                                user.creditTransactions.map((tx: any) => (
                                    <div key={tx.id} className="flex items-center justify-between text-sm py-2 border-b border-white/5 last:border-0">
                                        <div>
                                            <p className="font-bold uppercase text-[10px] tracking-tight">{tx.type.replace("_", " ")}</p>
                                            <p className="text-muted-foreground text-[10px]">{new Date(tx.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <div className={tx.amount > 0 ? "text-green-400 font-bold" : "text-destructive font-bold"}>
                                            {tx.amount > 0 ? "+" : ""}{tx.amount} Credits
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                        <CardFooter>
                            <Button variant="ghost" className="w-full text-xs gap-2" asChild>
                                <Link href="/dashboard/credits">
                                    View All History <MoveRight className="w-3 h-3" />
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </AppShell>
    );
}

function CreditPackOption({ amount, price, featured = false }: { amount: number, price: number, featured?: boolean }) {
    return (
        <div className={`p-4 rounded-2xl border flex items-center justify-between transition-colors ${featured ? "border-primary bg-primary/5" : "border-white/5 bg-white/5 hover:border-white/10"
            }`}>
            <div>
                <p className="font-black text-lg">{amount} <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Credits</span></p>
                <p className="text-xs text-muted-foreground">${price} one-time</p>
            </div>
            <Button size="sm" className={featured ? "shadow-lg shadow-primary/20" : ""}>
                Buy Pack
            </Button>
        </div>
    );
}
