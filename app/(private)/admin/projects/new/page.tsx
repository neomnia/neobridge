"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Box, CheckCircle, Github, Globe, FileText, Loader2, Rocket, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

type Step = 'info' | 'integrations' | 'launching' | 'done'

interface ProjectForm {
  name: string
  slug: string
  description: string
  // Integration options
  createVercel: boolean
  framework: string
  createGithub: boolean
  githubOrg: string
  githubPrivate: boolean
  createNotion: boolean
  notionDatabaseId: string
  setupDomain: boolean
  domain: string
}

const FRAMEWORKS = [
  { value: 'nextjs', label: 'Next.js' },
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue.js' },
  { value: 'nuxt', label: 'Nuxt' },
  { value: 'svelte', label: 'SvelteKit' },
  { value: 'remix', label: 'Remix' },
  { value: 'astro', label: 'Astro' },
  { value: '', label: 'Autre / Non défini' },
]

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function NewProjectPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('info')
  const [form, setForm] = useState<ProjectForm>({
    name: '', slug: '', description: '',
    createVercel: true, framework: 'nextjs',
    createGithub: true, githubOrg: '', githubPrivate: true,
    createNotion: false, notionDatabaseId: '',
    setupDomain: false, domain: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [setupResult, setSetupResult] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const setField = (key: keyof ProjectForm, value: any) => {
    setForm(prev => {
      const next = { ...prev, [key]: value }
      if (key === 'name' && !prev.slug) {
        next.slug = slugify(value)
      }
      return next
    })
    if (errors[key]) setErrors(prev => { const e = { ...prev }; delete e[key]; return e })
  }

  const validateInfo = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Le nom est requis'
    if (!form.slug.trim()) e.slug = 'Le slug est requis'
    else if (!/^[a-z0-9-]+$/.test(form.slug)) e.slug = 'Uniquement lettres minuscules, chiffres et tirets'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleLaunch = async () => {
    setIsSubmitting(true)
    try {
      // 1. Create project in DB
      const createRes = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          description: form.description || undefined,
        }),
      })
      const createData = await createRes.json()
      if (!createData.success) {
        setErrors({ global: createData.error || 'Erreur création projet' })
        setIsSubmitting(false)
        return
      }

      const projectId = createData.data.id
      setStep('launching')

      // 2. Run setup steps
      const steps: string[] = []
      if (form.createVercel) steps.push('vercel')
      if (form.createGithub) steps.push('github')
      if (form.createNotion) steps.push('notion')
      if (form.setupDomain && form.domain) steps.push('cloudflare')

      const setupRes = await fetch(`/api/projects/${projectId}/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          steps,
          framework: form.framework || undefined,
          githubOrg: form.githubOrg || undefined,
          notionDatabaseId: form.notionDatabaseId || undefined,
          domain: form.domain || undefined,
        }),
      })
      const setupData = await setupRes.json()
      setSetupResult({ projectId, ...setupData })
      setStep('done')
    } catch (err: any) {
      setErrors({ global: err.message || 'Erreur inattendue' })
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/projects">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Projets
          </Link>
        </Button>
      </div>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold">Nouveau projet</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Créez un projet et connectez automatiquement Vercel, GitHub, Cloudflare et Notion.
        </p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 text-sm">
        {(['info', 'integrations', 'launching', 'done'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step === s ? 'bg-brand text-white' :
              ['launching', 'done'].includes(step) || i < ['info','integrations','launching','done'].indexOf(step)
                ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
            }`}>
              {i + 1}
            </div>
            <span className={step === s ? 'font-medium' : 'text-muted-foreground'}>
              {s === 'info' ? 'Infos' : s === 'integrations' ? 'Intégrations' : s === 'launching' ? 'Lancement' : 'Terminé'}
            </span>
            {i < 3 && <div className="h-px w-6 bg-border" />}
          </div>
        ))}
      </div>

      {/* ── Step 1: Info ─────────────────────────────────────────────────────── */}
      {step === 'info' && (
        <Card>
          <CardHeader>
            <CardTitle>Informations du projet</CardTitle>
            <CardDescription>Définissez le nom et l'identifiant unique de votre projet.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du projet *</Label>
              <Input
                id="name"
                placeholder="Mon Super Projet"
                value={form.name}
                onChange={e => setField('name', e.target.value)}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug (identifiant URL) *</Label>
              <div className="flex gap-2">
                <Input
                  id="slug"
                  placeholder="mon-super-projet"
                  value={form.slug}
                  onChange={e => setField('slug', slugify(e.target.value))}
                  className={`font-mono text-sm ${errors.slug ? 'border-destructive' : ''}`}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setField('slug', slugify(form.name))}
                >
                  Auto
                </Button>
              </div>
              {errors.slug && <p className="text-xs text-destructive">{errors.slug}</p>}
              <p className="text-xs text-muted-foreground">
                Utilisé comme nom de repo GitHub, projet Vercel, etc.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea
                id="desc"
                placeholder="Brève description du projet..."
                value={form.description}
                onChange={e => setField('description', e.target.value)}
                rows={3}
              />
            </div>

            {errors.global && (
              <div className="rounded-md bg-destructive/10 text-destructive px-3 py-2 text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {errors.global}
              </div>
            )}

            <Button
              className="w-full bg-brand hover:bg-brand/90"
              onClick={() => { if (validateInfo()) setStep('integrations') }}
            >
              Suivant
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Integrations ──────────────────────────────────────────────── */}
      {step === 'integrations' && (
        <div className="space-y-4">
          {/* Vercel */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Box className="h-4 w-4" />
                  <CardTitle className="text-base">Vercel</CardTitle>
                </div>
                <Switch
                  checked={form.createVercel}
                  onCheckedChange={v => setField('createVercel', v)}
                />
              </div>
              <CardDescription>Créer un projet Vercel pour le déploiement</CardDescription>
            </CardHeader>
            {form.createVercel && (
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Framework</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                    value={form.framework}
                    onChange={e => setField('framework', e.target.value)}
                  >
                    {FRAMEWORKS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
              </CardContent>
            )}
          </Card>

          {/* GitHub */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Github className="h-4 w-4" />
                  <CardTitle className="text-base">GitHub</CardTitle>
                </div>
                <Switch
                  checked={form.createGithub}
                  onCheckedChange={v => setField('createGithub', v)}
                />
              </div>
              <CardDescription>Créer un dépôt GitHub pour le code source</CardDescription>
            </CardHeader>
            {form.createGithub && (
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Organisation GitHub (optionnel)</Label>
                  <Input
                    placeholder="mon-org (laisser vide = compte personnel)"
                    value={form.githubOrg}
                    onChange={e => setField('githubOrg', e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="github-private"
                    checked={form.githubPrivate}
                    onCheckedChange={v => setField('githubPrivate', v)}
                  />
                  <Label htmlFor="github-private" className="text-sm cursor-pointer">Dépôt privé</Label>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Domain / Cloudflare */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <CardTitle className="text-base">Domaine Cloudflare</CardTitle>
                </div>
                <Switch
                  checked={form.setupDomain}
                  onCheckedChange={v => setField('setupDomain', v)}
                />
              </div>
              <CardDescription>Connecter un domaine Cloudflare à ce projet Vercel</CardDescription>
            </CardHeader>
            {form.setupDomain && (
              <CardContent>
                <div className="space-y-1">
                  <Label className="text-xs">Nom de domaine</Label>
                  <Input
                    placeholder="monprojet.com"
                    value={form.domain}
                    onChange={e => setField('domain', e.target.value)}
                    className="text-sm font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Le domaine doit déjà être dans votre compte Cloudflare.
                  </p>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Notion */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <CardTitle className="text-base">Notion</CardTitle>
                </div>
                <Switch
                  checked={form.createNotion}
                  onCheckedChange={v => setField('createNotion', v)}
                />
              </div>
              <CardDescription>Créer une page de suivi dans Notion</CardDescription>
            </CardHeader>
            {form.createNotion && (
              <CardContent>
                <div className="space-y-1">
                  <Label className="text-xs">ID de base de données Notion (optionnel)</Label>
                  <Input
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value={form.notionDatabaseId}
                    onChange={e => setField('notionDatabaseId', e.target.value)}
                    className="text-sm font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Laisser vide pour utiliser la base par défaut configurée.
                  </p>
                </div>
              </CardContent>
            )}
          </Card>

          {errors.global && (
            <div className="rounded-md bg-destructive/10 text-destructive px-3 py-2 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {errors.global}
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('info')} className="flex-1">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <Button
              className="flex-1 bg-brand hover:bg-brand/90"
              onClick={handleLaunch}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4 mr-2" />
              )}
              Créer et configurer
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Launching ─────────────────────────────────────────────────── */}
      {step === 'launching' && (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-brand mx-auto" />
            <h3 className="text-lg font-semibold">Configuration en cours...</h3>
            <p className="text-muted-foreground text-sm">
              Création du projet Vercel, du dépôt GitHub, et des ressources associées.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Step 4: Done ──────────────────────────────────────────────────────── */}
      {step === 'done' && setupResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <CardTitle>Projet créé !</CardTitle>
            </div>
            <CardDescription>
              Voici le résultat de la configuration automatique.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Success items */}
            {setupResult.setupState?.vercelCreated && (
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle className="h-4 w-4" />
                <span>Projet Vercel créé : <strong>{setupResult.data?.vercelProjectName}</strong></span>
              </div>
            )}
            {setupResult.setupState?.githubCreated && (
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle className="h-4 w-4" />
                <span>Dépôt GitHub créé : <strong>{setupResult.data?.githubRepoFullName}</strong></span>
              </div>
            )}
            {setupResult.setupState?.notionCreated && (
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle className="h-4 w-4" />
                <span>Page Notion créée</span>
              </div>
            )}
            {setupResult.setupState?.domainLinked && (
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle className="h-4 w-4" />
                <span>DNS Cloudflare configuré : <strong>{form.domain}</strong></span>
              </div>
            )}

            {/* Errors */}
            {setupResult.errors && Object.keys(setupResult.errors).length > 0 && (
              <div className="rounded-md bg-orange-50 border border-orange-200 p-3 space-y-1">
                <p className="text-sm font-medium text-orange-800">Avertissements :</p>
                {Object.entries(setupResult.errors).map(([k, v]) => (
                  <p key={k} className="text-xs text-orange-700">
                    <span className="font-medium capitalize">{k}</span> : {String(v)}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
          <CardContent className="pt-0 flex gap-3">
            <Button
              className="flex-1 bg-brand hover:bg-brand/90"
              onClick={() => router.push(`/admin/projects/${setupResult.projectId}`)}
            >
              Ouvrir le projet
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <Link href="/admin/projects">Tous les projets</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
