import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Layout, Type, Smile, BarChart3, Clock, ArrowUpRight } from "lucide-react";

import { getAllTemplates } from "@/lib/template-system/registry";
import Link from "next/link";

export default function TemplatesPage() {
    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Templates Library</h1>
                <p className="text-muted-foreground">Start with a professional base and customize with your code.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {getAllTemplates().map((template) => (
                    <Card key={template.id} className="group border-white/5 bg-card/30 backdrop-blur-xl hover:border-primary/20 transition-all overflow-hidden flex flex-col">
                        <div className={`aspect-video bg-gradient-to-br ${template.thumbnailGradient || 'from-zinc-800 to-black'} flex items-center justify-center`}>
                            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur shadow-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <CardHeader className="p-6 flex-1">
                            <div className="flex items-center justify-between mb-2">
                                <Badge variant="outline" className="text-[10px] uppercase border-white/10 text-muted-foreground flex-shrink-0">
                                    {template.schema.category}
                                </Badge>
                                <div className="flex gap-1 overflow-hidden flex-wrap justify-end">
                                    {template.schema.tags.map(tag => (
                                        <span key={tag} className="text-[10px] text-primary/60 font-medium">#{tag}</span>
                                    ))}
                                </div>
                            </div>
                            <CardTitle className="text-xl font-bold line-clamp-1">{template.schema.name}</CardTitle>
                            <CardDescription className="text-sm leading-relaxed mt-2 line-clamp-3">
                                {template.schema.description}
                            </CardDescription>
                        </CardHeader>
                        <CardFooter className="px-6 pb-6 pt-0 mt-auto">
                            <Link href={`/studio/template/${template.id}`} className="w-full">
                                <Button className="w-full gap-2 h-10 font-semibold group-hover:bg-primary group-hover:text-primary-foreground transition-colors" variant="outline">
                                    Use Template <ArrowUpRight className="w-4 h-4 ml-auto" />
                                </Button>
                            </Link>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            {/* Suggest a template CTA */}
            <div className="mt-12 p-8 rounded-2xl border border-white/5 bg-primary/5 text-center">
                <h3 className="text-lg font-bold mb-2">Need a specific template?</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                    We are constantly adding new starter files. Tell us what you want to see next in the library.
                </p>
                <Button variant="link" className="text-primary font-bold">Suggest a Template</Button>
            </div>
        </div>
    );
}
