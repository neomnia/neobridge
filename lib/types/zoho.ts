/**
 * Types Zoho partagés entre server components, client components et API routes.
 * Ce fichier évite les imports depuis @/app/api/... dans les composants.
 */

export interface ZohoProjectLink {
  zohoProjectId: string
  zohoProjectName: string
  teamId: string
  projectId: string
  projectName: string
  linkedAt: string
}
