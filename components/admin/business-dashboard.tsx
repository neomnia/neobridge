"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardStats } from "@/components/admin/dashboard-stats"
import { DashboardPayments } from "@/components/admin/dashboard-payments"
import { DashboardInvoices } from "@/components/admin/dashboard-invoices"
import { AdminSubscriptions } from "@/components/admin/admin-subscriptions"
import { PaymentSettings } from "@/components/admin/payment-settings"

export function BusinessDashboard() {
  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="overview" className="data-[state=active]:bg-brand data-[state=active]:text-white">
          Overview
        </TabsTrigger>
        <TabsTrigger value="payments" className="data-[state=active]:bg-brand data-[state=active]:text-white">
          <span className="hidden sm:inline">Recent Orders</span>
          <span className="sm:hidden">Orders</span>
        </TabsTrigger>
        <TabsTrigger value="stripe" className="data-[state=active]:bg-brand data-[state=active]:text-white">
          <span className="hidden sm:inline">Payment Settings</span>
          <span className="sm:hidden">Payments</span>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview"><DashboardStats /></TabsContent>
      <TabsContent value="payments">
        <div className="space-y-6">
          <DashboardPayments />
          <DashboardInvoices />
          <AdminSubscriptions />
        </div>
      </TabsContent>
      <TabsContent value="stripe"><PaymentSettings /></TabsContent>
    </Tabs>
  )
}
