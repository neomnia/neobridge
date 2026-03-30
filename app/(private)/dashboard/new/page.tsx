"use client"

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, ArrowRight, ExternalLink, Check,
  Rocket, GitBranch, Globe, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const FRAMEWORKS = [
  { id: 'nextjs',   label: 'Next.js',   icon: '▲', description: 'App Router · SSR · Edge' },
  { id: 'remix',    label: 'Remix',     icon: '💿', description: 'Full-stack web framework' },
  { id: 'astro',    label: 'Astro',     icon: '🚀', description: 'Static + SSR hybrid' },
  { id: 'other',    label: 'Autre',     icon: '📦', description: 'Node.js / static / custom' },
]

const STEPS = ['Configuration', 'Framework', 'Révision']

export default function NewProjectPage() {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [repo, setRepo] = useState('')
  const [framework, setFramework] = useState<string | null>(null)

  const canNext = step === 0 ? name.trim().length >= 2 : step === 1 ? !!framework : true

  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/projects"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nouveau projet</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Déploiement via Vercel</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold border-2 transition-colors',
              i < step  ? 'bg-brand border-brand text-white'
              : i === step ? 'border-brand text-brand'
              : 'border-muted-foreground/30 text-muted-foreground/40',
            )}>
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span className={cn('text-sm', i === step ? 'font-medium' : 'text-muted-foreground/60')}>
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={cn('h-px w-8 mx-1', i < step ? 'bg-brand' : 'bg-border')} />
            )}
          </div>
        ))}
      </div>

      {/* Step 0 — Configuration */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Rocket className="h-4 w-4" /> Nom du projet
            </CardTitle>
            <CardDescription>
              Ce nom sera utilisé comme identifiant dans NeoBridge.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nom</Label>
              <Input
                id="name"
                placeholder="mon-projet"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
              {slug && <p className="text-xs text-muted-foreground font-mono">slug : {slug}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="repo">Dépôt GitHub <span className="text-muted-foreground">(optionnel)</span></Label>
              <div className="relative">
                <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="repo"
                  placeholder="organisation/nom-du-repo"
                  className="pl-9"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1 — Framework */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4" /> Framework
            </CardTitle>
            <CardDescription>Choisissez le framework principal de votre projet.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {FRAMEWORKS.map((fw) => (
                <button
                  key={fw.id}
                  onClick={() => setFramework(fw.id)}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border p-4 text-left transition-colors',
                    framework === fw.id
                      ? 'border-brand bg-brand/5'
                      : 'hover:border-muted-foreground/50',
                  )}
                >
                  <span className="text-2xl">{fw.icon}</span>
                  <div>
                    <p className="font-medium text-sm">{fw.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{fw.description}</p>
                  </div>
                  {framework === fw.id && (
                    <Check className="h-4 w-4 text-brand ml-auto shrink-0 mt-0.5" />
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2 — Révision */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4" /> Récapitulatif
            </CardTitle>
            <CardDescription>Vérifiez les informations avant de créer sur Vercel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border divide-y">
              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-sm text-muted-foreground">Nom</span>
                <span className="text-sm font-medium">{name}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-sm text-muted-foreground">Slug</span>
                <span className="text-sm font-mono">{slug}</span>
              </div>
              {repo && (
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-sm text-muted-foreground">Dépôt</span>
                  <span className="text-sm font-mono">{repo}</span>
                </div>
              )}
              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-sm text-muted-foreground">Framework</span>
                <Badge variant="outline">{FRAMEWORKS.find((f) => f.id === framework)?.label ?? framework}</Badge>
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 border border-dashed p-4 text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Prochaine étape : Vercel</p>
              <p>La provision automatique via l&apos;API Vercel sera disponible prochainement.</p>
              <p>En attendant, créez votre projet directement sur Vercel puis il apparaîtra automatiquement dans NeoBridge.</p>
            </div>

            <a
              href={`https://vercel.com/new${repo ? `?repository-url=https://github.com/${repo}` : ''}`}
              target="_blank" rel="noreferrer"
              className="inline-flex items-center justify-center w-full h-10 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Créer sur Vercel
            </a>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => step > 0 ? setStep(step - 1) : undefined}
          disabled={step === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />Précédent
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canNext}>
            Suivant <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button variant="outline" asChild>
            <Link href="/dashboard/projects">Retour aux projets</Link>
          </Button>
        )}
      </div>
    </div>
  )
}
