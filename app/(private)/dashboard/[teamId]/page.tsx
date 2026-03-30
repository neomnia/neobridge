import { redirect } from 'next/navigation'

/**
 * /dashboard/[teamId] — redirects to the main dashboard.
 * The Panoptique on /dashboard aggregates all teams/projects globally.
 */
export default async function TeamPage() {
  redirect('/dashboard')
}
