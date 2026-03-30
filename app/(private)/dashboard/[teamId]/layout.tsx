export default async function TeamLayout({
  children,
}: {
  children: React.ReactNode
  params: Promise<{ teamId: string }>
}) {
  return <>{children}</>
}
