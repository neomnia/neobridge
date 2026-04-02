import { serviceApiRepository } from '@/lib/services'

const RAILWAY_GRAPHQL_URL = 'https://backboard.railway.com/graphql/v2'

export type RailwayAuthMode = 'token' | 'project-token' | 'oauth'

export interface RailwayScopeInfo {
  mode: RailwayAuthMode
  projectId?: string
  environmentId?: string
  projectName?: string
}

export interface RailwayProjectSummary {
  id: string
  name: string
  description: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export interface RailwayServiceSummary {
  id: string
  name: string
  icon?: string | null
}

export interface RailwayEnvironmentSummary {
  id: string
  name: string
}

export interface RailwayProjectSnapshot extends RailwayProjectSummary {
  services: RailwayServiceSummary[]
  environments: RailwayEnvironmentSummary[]
}

function looksLikeProjectToken(token?: string | null) {
  return Boolean(
    token && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token),
  )
}

async function getRailwayStoredConfig(environment: 'production' | 'test' | 'sandbox' = 'production') {
  const cfg = await serviceApiRepository.getConfig('railway' as any, environment) as any
  if (!cfg?.config) {
    throw new Error('Railway configuration not found in NeoBridge')
  }

  const token = cfg.config.projectToken || cfg.config.apiKey || cfg.config.accessToken
  const mode: RailwayAuthMode = cfg.metadata?.authMode === 'project-token' || looksLikeProjectToken(token)
    ? 'project-token'
    : cfg.metadata?.authMode === 'oauth' || cfg.config.accessToken
      ? 'oauth'
      : 'token'

  if (!token && !(cfg.config.clientId && cfg.config.clientSecret)) {
    throw new Error('Railway token is missing from NeoBridge configuration')
  }

  return {
    id: cfg.id as string | undefined,
    token: token as string | undefined,
    mode,
    config: cfg.config,
    metadata: cfg.metadata || {},
  }
}

export async function railwayGraphQLRequest<T>(
  query: string,
  variables?: Record<string, unknown>,
  environment: 'production' | 'test' | 'sandbox' = 'production',
) {
  const cfg = await getRailwayStoredConfig(environment)
  if (!cfg.token) {
    throw new Error('Railway token missing. Save a project/account token or complete OAuth first.')
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (cfg.mode === 'project-token') {
    headers['Project-Access-Token'] = cfg.token
  } else {
    headers['Authorization'] = `Bearer ${cfg.token}`
  }

  const response = await fetch(RAILWAY_GRAPHQL_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  })

  const payload = await response.json().catch(() => null) as { data?: T; errors?: Array<{ message?: string }> } | null

  if (!response.ok || !payload) {
    throw new Error(`Railway API request failed (${response.status})`)
  }

  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).filter(Boolean).join(' | ') || 'Railway GraphQL error')
  }

  if (!payload.data) {
    throw new Error('Railway API returned no data')
  }

  return payload.data
}

export async function getRailwayScopeInfo(environment: 'production' | 'test' | 'sandbox' = 'production'): Promise<RailwayScopeInfo> {
  const cfg = await getRailwayStoredConfig(environment)

  if (cfg.mode !== 'project-token') {
    return {
      mode: cfg.mode,
      projectId: cfg.metadata?.projectId,
      environmentId: cfg.metadata?.environmentId,
      projectName: cfg.metadata?.projectName,
    }
  }

  const data = await railwayGraphQLRequest<{ projectToken: { projectId: string; environmentId: string } }>(
    'query { projectToken { projectId environmentId } }',
    undefined,
    environment,
  )

  return {
    mode: 'project-token',
    projectId: data.projectToken?.projectId,
    environmentId: data.projectToken?.environmentId,
    projectName: cfg.metadata?.projectName,
  }
}

export async function listRailwayProjects(environment: 'production' | 'test' | 'sandbox' = 'production') {
  const scope = await getRailwayScopeInfo(environment)

  if (scope.mode === 'project-token' && scope.projectId) {
    return [await getRailwayProject(scope.projectId, environment)]
  }

  const data = await railwayGraphQLRequest<{
    projects: { edges: Array<{ node: RailwayProjectSummary }> }
  }>(
    'query { projects { edges { node { id name description createdAt updatedAt } } } }',
    undefined,
    environment,
  )

  return data.projects?.edges?.map((edge) => edge.node) ?? []
}

export async function getRailwayProject(
  projectId?: string,
  environment: 'production' | 'test' | 'sandbox' = 'production',
): Promise<RailwayProjectSnapshot> {
  const scope = await getRailwayScopeInfo(environment)
  const targetProjectId = projectId || scope.projectId

  if (!targetProjectId) {
    throw new Error('Railway projectId is required')
  }

  const data = await railwayGraphQLRequest<{
    project: {
      id: string
      name: string
      description: string | null
      createdAt?: string | null
      updatedAt?: string | null
      services: { edges: Array<{ node: RailwayServiceSummary }> }
      environments: { edges: Array<{ node: RailwayEnvironmentSummary }> }
    }
  }>(
    `query railwayProject($id: String!) {
      project(id: $id) {
        id
        name
        description
        createdAt
        updatedAt
        services {
          edges { node { id name icon } }
        }
        environments {
          edges { node { id name } }
        }
      }
    }`,
    { id: targetProjectId },
    environment,
  )

  return {
    id: data.project.id,
    name: data.project.name,
    description: data.project.description,
    createdAt: data.project.createdAt,
    updatedAt: data.project.updatedAt,
    services: data.project.services?.edges?.map((edge) => edge.node) ?? [],
    environments: data.project.environments?.edges?.map((edge) => edge.node) ?? [],
  }
}

export async function createRailwayProject(
  input: { name: string; description?: string },
  environment: 'production' | 'test' | 'sandbox' = 'production',
) {
  const scope = await getRailwayScopeInfo(environment)
  if (scope.mode === 'project-token') {
    throw new Error('A Railway project token cannot create a brand new project. Use an account or workspace token for that.')
  }

  const data = await railwayGraphQLRequest<{
    projectCreate: { id: string; name: string; description?: string | null }
  }>(
    `mutation createRailwayProject($input: ProjectCreateInput!) {
      projectCreate(input: $input) { id name description }
    }`,
    { input },
    environment,
  )

  return data.projectCreate
}

export async function updateRailwayProject(
  projectId: string,
  input: { name?: string; description?: string },
  environment: 'production' | 'test' | 'sandbox' = 'production',
) {
  const data = await railwayGraphQLRequest<{
    projectUpdate: { id: string; name: string; description?: string | null }
  }>(
    `mutation updateRailwayProject($id: String!, $input: ProjectUpdateInput!) {
      projectUpdate(id: $id, input: $input) { id name description }
    }`,
    { id: projectId, input },
    environment,
  )

  return data.projectUpdate
}

export async function createRailwayService(
  input: { projectId: string; name: string; repo?: string; image?: string },
  environment: 'production' | 'test' | 'sandbox' = 'production',
) {
  const source = input.repo
    ? { repo: input.repo }
    : input.image
      ? { image: input.image }
      : undefined

  const data = await railwayGraphQLRequest<{
    serviceCreate: { id: string; name: string }
  }>(
    `mutation createRailwayService($input: ServiceCreateInput!) {
      serviceCreate(input: $input) { id name }
    }`,
    {
      input: {
        projectId: input.projectId,
        name: input.name,
        ...(source ? { source } : {}),
      },
    },
    environment,
  )

  return data.serviceCreate
}

export async function getRailwayVariables(
  input: { projectId: string; environmentId?: string; serviceId?: string; unrendered?: boolean },
  environment: 'production' | 'test' | 'sandbox' = 'production',
) {
  const scope = await getRailwayScopeInfo(environment)
  const targetEnvironmentId = input.environmentId || scope.environmentId

  if (!targetEnvironmentId) {
    throw new Error('Railway environmentId is required to read variables')
  }

  const data = await railwayGraphQLRequest<{
    variables: Record<string, string>
  }>(
    `query railwayVariables($projectId: String!, $environmentId: String!, $serviceId: String, $unrendered: Boolean) {
      variables(projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId, unrendered: $unrendered)
    }`,
    {
      projectId: input.projectId,
      environmentId: targetEnvironmentId,
      serviceId: input.serviceId,
      unrendered: input.unrendered ?? false,
    },
    environment,
  )

  return {
    projectId: input.projectId,
    environmentId: targetEnvironmentId,
    serviceId: input.serviceId,
    variables: data.variables || {},
  }
}

export async function upsertRailwayVariables(
  input: {
    projectId: string
    environmentId?: string
    serviceId?: string
    variables: Record<string, string>
    replace?: boolean
  },
  environment: 'production' | 'test' | 'sandbox' = 'production',
) {
  const scope = await getRailwayScopeInfo(environment)
  const targetEnvironmentId = input.environmentId || scope.environmentId

  if (!targetEnvironmentId) {
    throw new Error('Railway environmentId is required to update variables')
  }

  await railwayGraphQLRequest<{ variableCollectionUpsert: boolean }>(
    `mutation railwayVariableCollectionUpsert($input: VariableCollectionUpsertInput!) {
      variableCollectionUpsert(input: $input)
    }`,
    {
      input: {
        projectId: input.projectId,
        environmentId: targetEnvironmentId,
        serviceId: input.serviceId,
        variables: input.variables,
        replace: input.replace ?? false,
      },
    },
    environment,
  )

  return {
    success: true,
    projectId: input.projectId,
    environmentId: targetEnvironmentId,
    serviceId: input.serviceId,
    variableCount: Object.keys(input.variables || {}).length,
  }
}

export async function buildRailwayContextSummary(
  projectId?: string,
  environment: 'production' | 'test' | 'sandbox' = 'production',
) {
  const scope = await getRailwayScopeInfo(environment)
  const snapshot = await getRailwayProject(projectId || scope.projectId, environment)
  const services = snapshot.services.map((service) => service.name).slice(0, 8).join(', ') || 'no services detected'
  const environments = snapshot.environments.map((env) => env.name).join(', ') || 'no environments detected'

  return `Railway project ${snapshot.name} (${snapshot.id}) is available. Environments: ${environments}. Services: ${services}. Current auth mode: ${scope.mode}.`
}
