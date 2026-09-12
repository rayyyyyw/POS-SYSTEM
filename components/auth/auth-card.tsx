import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-2xl py-8 shadow-sm">
      <CardHeader className="gap-3 px-6 sm:px-8">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase">POS System account</p>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="px-6 sm:px-8">{children}</CardContent>
    </Card>
  );
}
