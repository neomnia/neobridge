import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, ChevronRight, GitBranch, Globe, Layers, Zap, BookOpen, BarChart4, Shield, Users } from 'lucide-react'

export const metadata = {
  title: "Home",
  description: "NeoBridge unifies your dev stack — connect Vercel, GitHub, Cloudflare and Notion in one platform to manage your projects end-to-end.",
  keywords: ["DevOps", "project management", "Vercel", "GitHub", "Cloudflare", "Notion", "deployment", "developer platform"],
}

const integrations = [
  {
    name: "Vercel",
    description: "Deploy and manage your applications",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
        <path d="M24 22.525H0l12-21.05 12 21.05z" />
      </svg>
    ),
    color: "bg-black text-white dark:bg-white dark:text-black",
  },
  {
    name: "GitHub",
    description: "Create and manage repositories",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
      </svg>
    ),
    color: "bg-gray-900 text-white",
  },
  {
    name: "Cloudflare",
    description: "DNS, domains and edge protection",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
        <path d="M16.5 15.5c.23-.62.14-1.33-.23-1.85-.37-.52-.94-.83-1.57-.83h-.23l-.14-.49c-.28-.99-1.17-1.68-2.19-1.68-.42 0-.83.12-1.18.35l-.17.11-.15-.11c-.22-.16-.47-.24-.74-.24-.68 0-1.23.55-1.23 1.23 0 .14.02.28.07.41l.09.27H8.5c-.76 0-1.38.62-1.38 1.38 0 .76.62 1.38 1.38 1.38h7.5c.62 0 1.17-.37 1.38-.93z" />
      </svg>
    ),
    color: "bg-orange-500 text-white",
  },
  {
    name: "Notion",
    description: "Project docs and knowledge base",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
        <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
      </svg>
    ),
    color: "bg-gray-800 text-white",
  },
]

const features = [
  {
    icon: <Zap className="h-6 w-6" />,
    title: "One-Click Project Setup",
    description: "Spin up a full project stack — GitHub repo, Vercel deployment, Cloudflare DNS and Notion workspace in one go.",
  },
  {
    icon: <Layers className="h-6 w-6" />,
    title: "Unified Dashboard",
    description: "See all your projects, deployments, DNS records and documentation in a single, organised interface.",
  },
  {
    icon: <GitBranch className="h-6 w-6" />,
    title: "Deployment Management",
    description: "Track deployment history, rollback with a click, and monitor build status across all your Vercel projects.",
  },
  {
    icon: <Globe className="h-6 w-6" />,
    title: "DNS & Domain Control",
    description: "Manage Cloudflare zones, add DNS records, and attach custom domains directly from your project dashboard.",
  },
  {
    icon: <BookOpen className="h-6 w-6" />,
    title: "Documentation Sync",
    description: "Auto-create Notion pages for each project. Keep specs, changelogs and runbooks always in sync.",
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: "Access & Permissions",
    description: "Role-based access control across all connected services. Grant the right access to the right people.",
  },
]

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">

      {/* Hero Section */}
      <section className="w-full py-16 md:py-28 lg:py-36 bg-gradient-to-b from-background to-muted">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center text-center space-y-6 max-w-4xl mx-auto">
            <Badge className="bg-brand text-white px-4 py-1 text-sm">Now in Beta</Badge>
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
              Your Dev Stack,{" "}
              <span className="text-brand">Unified</span>
            </h1>
            <p className="max-w-[680px] text-muted-foreground md:text-xl">
              NeoBridge connects Vercel, GitHub, Cloudflare and Notion in one platform.
              Create, deploy, and document your projects — without switching between tools.
            </p>
            <div className="flex flex-col gap-3 min-[400px]:flex-row justify-center">
              <Link href="/auth/register">
                <Button size="lg" className="bg-brand hover:bg-[#B26B27] text-white">
                  Get Started Free <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/features">
                <Button size="lg" variant="outline">
                  Explore Features <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Integration logos */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-8">
              {integrations.map((integration) => (
                <div
                  key={integration.name}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${integration.color} shadow-sm`}
                >
                  <span className="w-5 h-5 flex items-center justify-center">
                    {integration.icon}
                  </span>
                  {integration.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="w-full py-12 md:py-20 bg-background">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center text-center space-y-4 mb-12">
            <Badge className="bg-brand text-white">How It Works</Badge>
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">From idea to production in minutes</h2>
            <p className="max-w-[700px] text-muted-foreground md:text-lg">
              NeoBridge handles all the plumbing between your services so you can focus on building.
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3">
            {[
              { step: "01", title: "Connect your services", description: "Link your Vercel, GitHub, Cloudflare and Notion accounts once. NeoBridge handles the rest." },
              { step: "02", title: "Create a project", description: "Name your project and NeoBridge automatically provisions your repo, deployment, DNS and docs." },
              { step: "03", title: "Ship and manage", description: "Monitor deployments, manage DNS, update docs — all from one dashboard. No more tab hopping." },
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-center text-center space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white font-bold text-lg">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations deep-dive */}
      <section className="w-full py-12 md:py-20 bg-muted">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center text-center space-y-4 mb-12">
            <Badge className="bg-brand text-white">Integrations</Badge>
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">Built for the modern dev stack</h2>
          </div>
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
            {integrations.map((integration) => (
              <Card key={integration.name} className="overflow-hidden">
                <CardContent className="p-6 flex gap-4 items-start">
                  <div className={`flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-lg ${integration.color}`}>
                    {integration.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">{integration.name}</h3>
                    <p className="text-muted-foreground text-sm">{integration.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="w-full py-12 md:py-20 bg-background">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center text-center space-y-4 mb-12">
            <Badge className="bg-brand text-white">Features</Badge>
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">Everything in one place</h2>
            <p className="max-w-[700px] text-muted-foreground md:text-lg">
              Stop juggling between dashboards. NeoBridge gives your team a single control plane for every project.
            </p>
          </div>
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title}>
                <CardContent className="p-6 flex flex-col space-y-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    {feature.icon}
                  </div>
                  <h3 className="font-bold text-lg">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats / Social proof */}
      <section className="w-full py-12 md:py-20 bg-muted">
        <div className="container px-4 md:px-6">
          <div className="mx-auto max-w-4xl grid grid-cols-2 gap-8 md:grid-cols-4 text-center">
            {[
              { value: "4", label: "Integrations" },
              { value: "1-click", label: "Project setup" },
              { value: "100%", label: "API-driven" },
              { value: "Open", label: "Source" },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center space-y-2">
                <span className="text-3xl font-bold text-brand">{stat.value}</span>
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team / collaboration */}
      <section className="w-full py-12 md:py-20 bg-background">
        <div className="container px-4 md:px-6">
          <div className="grid gap-8 lg:grid-cols-2 items-center max-w-5xl mx-auto">
            <div className="flex flex-col space-y-4">
              <Badge className="bg-brand text-white w-fit">Team Ready</Badge>
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">Built for teams, not just solo devs</h2>
              <p className="text-muted-foreground md:text-lg">
                Invite team members, assign roles, and control who can access what across all your connected services.
                NeoBridge keeps your projects secure as your team grows.
              </p>
              <ul className="space-y-3 text-muted-foreground">
                {[
                  "Role-based access control (admin, developer, viewer)",
                  "Audit log for every action across all services",
                  "Per-project permissions",
                  "SSO-ready for enterprise teams",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Users className="h-5 w-5 text-brand mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center justify-center">
              <div className="relative w-full max-w-[400px] h-[320px] rounded-xl overflow-hidden bg-gradient-to-br from-brand/10 to-background border border-brand/20 shadow-xl flex items-center justify-center">
                <div className="grid grid-cols-2 gap-6 p-8">
                  {[
                    { icon: <BarChart4 className="h-8 w-8 text-brand" />, label: "Analytics" },
                    { icon: <GitBranch className="h-8 w-8 text-brand" />, label: "Deployments" },
                    { icon: <Globe className="h-8 w-8 text-brand" />, label: "DNS" },
                    { icon: <BookOpen className="h-8 w-8 text-brand" />, label: "Docs" },
                  ].map((item) => (
                    <div key={item.label} className="flex flex-col items-center gap-2">
                      <div className="h-14 w-14 rounded-full bg-brand/20 flex items-center justify-center">
                        {item.icon}
                      </div>
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="w-full py-16 md:py-24 bg-[#1A1A1A] text-white">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center text-center space-y-6 max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
              Ready to bridge your stack?
            </h2>
            <p className="text-white/70 md:text-xl">
              Join developers and teams who manage their entire infrastructure from one place.
              Start free — no credit card required.
            </p>
            <div className="flex flex-col gap-3 min-[400px]:flex-row justify-center">
              <Link href="/auth/register">
                <Button size="lg" className="bg-brand hover:bg-[#B26B27] text-white">
                  Start for Free <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10 bg-transparent">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
