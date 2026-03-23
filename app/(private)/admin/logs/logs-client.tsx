"use client"

import { useState, useEffect } from "react"
import { getSystemLogs, deleteSystemLogs, type LogFilter } from "@/app/actions/logs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Trash2, RefreshCw, Filter } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

export function LogsClient() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<LogFilter>({
    category: "all",
    level: "all",
    search: ""
  })

  const fetchLogs = async () => {
    setLoading(true)
    try {
      // Convert "all" to undefined for the action
      const actionFilters: LogFilter = {
        ...filters,
        category: filters.category === "all" ? undefined : filters.category,
        level: filters.level === "all" ? undefined : filters.level,
      }
      
      const result = await getSystemLogs(actionFilters)
      if (result.success) {
        setLogs(result.data || [])
      } else {
        toast.error("Failed to fetch logs")
      }
    } catch (error) {
      console.error(error)
      toast.error("An error occurred while fetching logs")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, []) // Initial load only, manual refresh for filter changes to avoid debounce complexity for now

  const handleFilterChange = (key: keyof LogFilter, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const applyFilters = () => {
    fetchLogs()
  }

  const clearFilters = () => {
    setFilters({
      category: "all",
      level: "all",
      search: ""
    })
    // We need to trigger fetch after state update, but state update is async.
    // simpler to just call fetchLogs with cleared filters directly or use effect on filters (but likely want manual trigger)
    setTimeout(() => {
        // This is a bit hacky, better to move fetch out or pass params.
        // For now, let's just reload page or simple trigger
        window.location.reload() 
    }, 100)
  }

  const handleDeleteLogs = async () => {
    if (!confirm("Are you sure you want to delete ALL logs matching current filters?")) return
    
    try {
      const actionFilters: LogFilter = {
         ...filters,
        category: filters.category === "all" ? undefined : filters.category,
        level: filters.level === "all" ? undefined : filters.level,
      }

      await deleteSystemLogs(actionFilters)
      toast.success("Logs deleted")
      fetchLogs()
    } catch (error) {
      toast.error("Failed to delete logs")
    }
  }

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "info": return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Info</Badge>
      case "warning": return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Warning</Badge>
      case "error": return <Badge variant="destructive">Error</Badge>
      case "critical": return <Badge variant="destructive" className="animate-pulse">Critical</Badge>
      case "success": return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Success</Badge>
      default: return <Badge variant="secondary">{level}</Badge>
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/50 p-4 rounded-lg">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Select 
            value={filters.level} 
            onValueChange={(v) => handleFilterChange("level", v)}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="success">Success</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            value={filters.category} 
            onValueChange={(v) => handleFilterChange("category", v)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="auth">Auth</SelectItem>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="payment">Payment</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Search logs..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            className="w-full sm:w-[200px]"
          />
          
          <Button variant="secondary" onClick={applyFilters}>
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" size="icon" onClick={fetchLogs} title="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="destructive" size="icon" onClick={handleDeleteLogs} title="Delete matching logs">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Date</TableHead>
              <TableHead className="w-[100px]">Level</TableHead>
              <TableHead className="w-[120px]">Category</TableHead>
              <TableHead>Message</TableHead>
              <TableHead className="w-[150px]">User</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No logs found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss")}
                  </TableCell>
                  <TableCell>{getLevelBadge(log.level)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {log.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[400px] truncate" title={log.message}>
                    {log.message}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {log.user ? log.user.email : log.userId ? "ID: " + log.userId.substring(0, 8) : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="text-xs text-center text-muted-foreground">
        Showing last 1000 logs
      </div>
    </div>
  )
}
