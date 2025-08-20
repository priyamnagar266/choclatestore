import * as React from "react";
import { Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";

const Checkout = React.lazy(() => import("@/pages/checkout"));
const DeliveryInfo = React.lazy(() => import("@/pages/delivery"));
const NotFound = React.lazy(() => import("@/pages/not-found"));
const LoginFormLazy = React.lazy(async () => ({ default: (await import("@/components/auth-forms")).LoginForm }));
const SignupFormLazy = React.lazy(async () => ({ default: (await import("@/components/auth-forms")).SignupForm }));
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
  React.useEffect(() => { setLocation("/admin/home"); }, [setLocation]);
  return null;
}

function Router() {
  return React.createElement(
    Suspense,
    { fallback: React.createElement("div", null) },
    React.createElement(
      Switch,
      null,
      React.createElement(Route, { path: "/", component: Home }),
      React.createElement(Route, { path: "/checkout", component: Checkout }),
      React.createElement(Route, { path: "/delivery", component: DeliveryInfo }),
      React.createElement(Route, { path: "/login", component: () => React.createElement(LoginFormLazy) }),
      React.createElement(Route, { path: "/signup", component: () => React.createElement(SignupFormLazy) }),
      React.createElement(Route, { path: "/dashboard", component: UserDashboard }),
      React.createElement(Route, { path: "/orders", component: OrderHistory }),
      React.createElement(Route, { path: "/profile", component: ProfileManagement }),
      React.createElement(Route, { path: "/admin", component: AdminRootRedirect }),
      React.createElement(Route, { path: "/admin/dashboard", component: AdminDashboard }),
      React.createElement(Route, { path: "/admin/home", component: AdminHome }),
      React.createElement(Route, { path: "/admin/products", component: AdminProducts }),
      React.createElement(Route, { path: "/admin/orders", component: AdminOrders }),
      React.createElement(Route, { path: "/admin/login", component: AdminLogin }),
      React.createElement(Route, { path: "/admin/overview", component: AdminOverview }),
      React.createElement(Route, { path: "/admin/customers", component: AdminCustomers }),
      React.createElement(Route, { path: "/admin/reports", component: AdminReports }),
      React.createElement(Route, { path: "/admin/settings", component: AdminSettings }),
      React.createElement(Route, { component: NotFound })
    )
  );
}

export default function App() {
  return React.createElement(
    QueryClientProvider,
    { client: queryClient },
    React.createElement(
      TooltipProvider,
      null,
      React.createElement(Toaster, null),
      React.createElement(Router, null)
    )
  );
}
