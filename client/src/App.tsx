import * as React from "react";
import { Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import AboutUsPage from "@/pages/AboutUsPage";
import Layout from "@/components/layout";
import { CartProvider } from "@/context/CartContext";

const Checkout = React.lazy(() => import("@/pages/checkout"));
const DeliveryInfo = React.lazy(() => import("@/pages/delivery"));
const NotFound = React.lazy(() => import("@/pages/not-found"));
const ProductsPage = React.lazy(() => import("@/pages/products"));
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
const AdminTestimonials = React.lazy(() => import("@/pages/admin/testimonials"));

function AdminRootRedirect() {
  const [, setLocation] = useLocation();
  React.useEffect(() => { setLocation("/admin/home"); }, [setLocation]);
  return null;
}

function Router() {
  return (
    <Suspense fallback={<div />}>
      <Layout>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/about" component={AboutUsPage} />
          <Route path="/checkout" component={Checkout} />
          <Route path="/delivery" component={DeliveryInfo} />
          <Route path="/login" component={() => <LoginFormLazy />} />
          <Route path="/signup" component={() => <SignupFormLazy />} />
          <Route path="/dashboard" component={UserDashboard} />
          <Route path="/orders" component={OrderHistory} />
          <Route path="/profile" component={ProfileManagement} />
          <Route path="/products" component={ProductsPage} />
          <Route path="/admin" component={AdminRootRedirect} />
          <Route path="/admin/dashboard" component={AdminDashboard} />
          <Route path="/admin/home" component={AdminHome} />
          <Route path="/admin/products" component={AdminProducts} />
          <Route path="/admin/orders" component={AdminOrders} />
          <Route path="/admin/testimonials" component={AdminTestimonials} />
          <Route path="/admin/login" component={AdminLogin} />
          <Route path="/admin/overview" component={AdminOverview} />
          <Route path="/admin/customers" component={AdminCustomers} />
          <Route path="/admin/reports" component={AdminReports} />
          <Route path="/admin/settings" component={AdminSettings} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </Suspense>
  );
}


export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </CartProvider>
    </QueryClientProvider>
  );
}
