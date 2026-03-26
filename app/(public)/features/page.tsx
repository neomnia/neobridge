import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GitBranch, Globe, BookOpen, Layers, Shield, Users, Zap, BarChart4, GitMerge, FileCode, Bell, Lock } from "lucide-react"

export const metadata = {
  title: "Features",
  description: "Discover all NeoBridge features: unified project management across Vercel, GitHub, Cloudflare and Notion — deployments, DNS, repositories and documentation in one place.",
  keywords: ["features", "Vercel", "GitHub", "Cloudflare", "Notion", "deployment management", "DNS", "project management"],
}

const featureGroups = [
  {
    category: "Vercel",
    badge: "Deployments",
    color: "bg-black text-white dark:bg-white dark:text-black",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M24 22.525H0l12-21.05 12 21.05z" />
      </svg>
    ),
    features: [
      { icon: <Zap className="h-5 w-5" />, title: "Deployment Tracking", description: "Monitor all your Vercel deployments in real-time — status, build logs and performance metrics.", items: ["Build status & logs", "Deployment history", "Preview URLs", "Performance metrics"] },
      { icon: <GitBranch className="h-5 w-5" />, title: "Project Management", description: "Create and configure Vercel projects linked to your GitHub repos, with custom domains set up automatically.", items: ["Create projects via API", "Domain configuration", "Environment variables", "Team access control"] },
    ],
  },
  {
    category: "GitHub",
    badge: "Repositories",
    color: "bg-gray-900 text-white",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
      </svg>
    ),
    features: [
      { icon: <FileCode className="h-5 w-5" />, title: "Repository Management", description: "Create repositories in user accounts or organisations, configure access and keep everything organised.", items: ["Create user/org repos", "Branch management", "Collaborator access", "Webhook configuration"] },
      { icon: <GitMerge className="h-5 w-5" />, title: "Organisation Control", description: "List and manage organisations, invite team members and configure repository visibility settings.", items: ["List organisations", "Member management", "Visibility settings", "Access token management"] },
    ],
  },
  {
    category: "Cloudflare",
    badge: "DNS & Domains",
    color: "bg-orange-500 text-white",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M16.5 15.5c.23-.62.14-1.33-.23-1.85-.37-.52-.94-.83-1.57-.83h-.23l-.14-.49c-.28-.99-1.17-1.68-2.19-1.68-.42 0-.83.12-1.18.35l-.17.11-.15-.11c-.22-.16-.47-.24-.74-.24-.68 0-1.23.55-1.23 1.23 0 .14.02.28.07.41l.09.27H8.5c-.76 0-1.38.62-1.38 1.38 0 .76.62 1.38 1.38 1.38h7.5c.62 0 1.17-.37 1.38-.93z" />
      </svg>
    ),
    features: [
      { icon: <Globe className="h-5 w-5" />, title: "Zone Management", description: "Look up and manage Cloudflare zones, set up DNS records and point custom domains to your deployments.", items: ["Zone lookup by domain", "DNS record CRUD", "Proxy status control", "TTL management"] },
      { icon: <Shield className="h-5 w-5" />, title: "Edge Protection", description: "Automatically configure Cloudflare to proxy and protect your Vercel deployments at the edge.", items: ["Auto Vercel DNS setup", "Proxy configuration", "SSL/TLS management", "DDoS protection"] },
    ],
  },
  {
    category: "Notion",
    badge: "Documentation",
    color: "bg-gray-800 text-white",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933z" />
      </svg>
    ),
    features: [
      { icon: <BookOpen className="h-5 w-5" />, title: "Auto-Documentation", description: "Automatically create Notion pages for each NeoBridge project — specs, changelogs and runbooks pre-structured.", items: ["Auto project pages", "Database integration", "Template-based setup", "Workspace management"] },
      { icon: <Layers className="h-5 w-5" />, title: "Knowledge Management", description: "Search your Notion workspace, link databases to projects and keep documentation in sync as you ship.", items: ["Workspace search", "Database linking", "Page templates", "Cross-project docs"] },
    ],
  },
]

const platformFeatures = [
  {
    icon: <Users className="h-6 w-6" />,
    title: "Team & Roles",
    description: "Invite team members, assign admin/developer/viewer roles and control access per project.",
  },
  {
    icon: <Bell className="h-6 w-6" />,
    title: "Notifications",
    description: "Get alerted on failed deployments, DNS changes and repository events — via email or in-app.",
  },
  {
    icon: <BarChart4 className="h-6 w-6" />,
    title: "Project Analytics",
    description: "Track deployment frequency, uptime and team activity across all your connected services.",
  },
  {
    icon: <Lock className="h-6 w-6" />,
    title: "Secure Credential Storage",
    description: "API tokens for Vercel, GitHub, Cloudflare and Notion are stored encrypted and never exposed.",
  },
]

export default function FeaturesPage() {
  return (
    <div className="container py-12 md:py-20">
      {/* Header */}
      <div className="mx-auto max-w-3xl text-center mb-16">
        <Badge className="bg-brand text-white mb-4">Features</Badge>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">
          Everything you need to manage your dev stack
        </h1>
        <p className="text-lg text-muted-foreground">
          NeoBridge integrates with Vercel, GitHub, Cloudflare and Notion to give you a single
          control plane for every project your team runs.
        </p>
      </div>

      {/* Per-integration feature sections */}
      <div className="space-y-16 mb-16">
        {featureGroups.map((group) => (
          <div key={group.category}>
            <div className="flex items-center gap-3 mb-8">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${group.color}`}>
                {group.icon}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{group.category}</h2>
                <p className="text-sm text-muted-foreground">{group.badge}</p>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {group.features.map((feature) => (
                <Card key={feature.title}>
                  <CardHeader>
                    <div className="flex items-center gap-2 text-brand mb-2">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
                      {feature.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Platform features */}
      <div>
        <div className="text-center mb-10">
          <Badge className="bg-brand text-white mb-3">Platform</Badge>
          <h2 className="text-2xl font-bold">Built-in platform capabilities</h2>
          <p className="text-muted-foreground mt-2">Beyond integrations, NeoBridge includes everything to run your team smoothly.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {platformFeatures.map((feature) => (
            <Card key={feature.title}>
              <CardContent className="p-6 flex flex-col space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  {feature.icon}
                </div>
                <h3 className="font-bold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
