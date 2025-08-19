import React, { Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Eagerly load Home (primary landing) to avoid initial suspense flash
import Home from "@/pages/home";

// Lazily load secondary/user/admin routes to cut initial bundle
const Checkout = React.lazy(() => import("@/pages/checkout"));
const DeliveryInfo = React.lazy(() => import("@/pages/delivery"));
const NotFound = React.lazy(() => import("@/pages/not-found"));
const LoginFormLazy = React.lazy(async () => ({
  default: (await import("@/components/auth-forms")).LoginForm
}));
const SignupFormLazy = React.lazy(async () => ({
  default: (await import("@/components/auth-forms")).SignupForm
}));
const UserDashboard = React.lazy(() => import("@/pages/dashboard"));
const OrderHistory = React.lazy(() => import("@/pages/order-history"));
const ProfileManagement = React.lazy(() => import("@/pages/profile-management"));
const AdminDashboard = React.lazy(() => import("@/pages/admin/dashboard"));
const AdminProducts = React.lazy(() => import("@/pages/admin/products"));
const AdminOrders = React.lazy(() => import("@/pages/admin/orders"));
const AdminLogin = React.lazy(() => import("@/pages/admin-login"));
const AdminOverview = React.lazy(() => import("@/pages/admin/overview"));
const AdminCustomers = React.lazy(() => import("@/pages/admin/customers"));
const AdminReports = React.lazy(() => import("@/pages/admin/reports"));
const AdminSettings = React.lazy(() => import("@/pages/admin/settings"));
const AdminHome = React.lazy(() => import("@/pages/admin/home"));

function AdminRootRedirect() {
  const [, setLocation] = useLocation();
  // Redirect /admin base path to unified admin home page
  setTimeout(() => setLocation('/admin/home'), 0);
  return null;
}

function Router() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm z-50">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/delivery" component={DeliveryInfo} />
        <Route path="/login" component={() => <LoginFormLazy />} />
        <Route path="/signup" component={() => <SignupFormLazy />} />
        <Route path="/dashboard" component={UserDashboard} />
        <Route path="/orders" component={OrderHistory} />
        <Route path="/profile" component={ProfileManagement} />
        <Route path="/admin" component={AdminRootRedirect} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/admin/home" component={AdminHome} />
        <Route path="/admin/products" component={AdminProducts} />
        <Route path="/admin/orders" component={AdminOrders} />
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin/overview" component={AdminOverview} />
        <Route path="/admin/customers" component={AdminCustomers} />
        <Route path="/admin/reports" component={AdminReports} />
        <Route path="/admin/settings" component={AdminSettings} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
