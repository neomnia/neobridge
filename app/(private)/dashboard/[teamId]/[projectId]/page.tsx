import { redirect } from 'next/navigation'

export default async function ProjectRoot({
  params,
}: {
  params: Promise<{ teamId: string; projectId: string }>
}) {
  const { teamId, projectId } = await params
  redirect(`/dashboard/${teamId}/${projectId}/infrastructure`)
}
