import BootSequence from "./BootSequence";

type BootPageProps = {
  searchParams: Promise<{ retorno?: string }>;
};

export const dynamic = "force-dynamic";

function safeReturnPath(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/login";
  if (value.startsWith("/inicializacao") || value.startsWith("/auth/")) {
    return "/login";
  }
  return value;
}

export default async function BootPage({ searchParams }: BootPageProps) {
  const { retorno } = await searchParams;
  return <BootSequence returnTo={safeReturnPath(retorno)} />;
}
