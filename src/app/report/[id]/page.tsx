import { ReportCard } from "@/components/report/ReportCard";

interface ReportPageProps {
  params: { id: string };
}

export default function ReportPage({ params }: ReportPageProps) {
  return <ReportCard sessionId={params.id} />;
}
