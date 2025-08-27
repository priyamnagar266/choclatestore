import * as React from "react";
import { Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import PageTransition from "@/components/PageTransition";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
const PoliciesPage = React.lazy(() => import("@/pages/policies"));
import AboutUsPage from "@/pages/AboutUsPage";
import Layout from "@/components/layout";
import { CartProvider } from "@/context/CartContext";

const Checkout = React.lazy(() => import("@/pages/checkout"));
const DeliveryInfo = React.lazy(() => import("@/pages/delivery"));
const NotFound = React.lazy(() => import("@/pages/not-found"));
const ProductsPage = React.lazy(() => import("@/pages/products"));
const FAQPage = React.lazy(() => import("@/pages/faq"));
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
  const [location] = useLocation();
  const isAdminRoute = location.startsWith('/admin');
  return (
    <Suspense fallback={<div />}>
      {isAdminRoute ? (
        <PageTransition location={location}>
          <Switch>
            <Route path="/admin">{() => <AdminRootRedirect />}</Route>
            <Route path="/admin/dashboard">{() => <AdminDashboard />}</Route>
            <Route path="/admin/home">{() => <AdminHome />}</Route>
            <Route path="/admin/products">{() => <AdminProducts />}</Route>
            <Route path="/admin/orders">{() => <AdminOrders />}</Route>
            <Route path="/admin/testimonials">{() => <AdminTestimonials />}</Route>
            <Route path="/admin/login">{() => <AdminLogin />}</Route>
            <Route path="/admin/overview">{() => <AdminOverview />}</Route>
            <Route path="/admin/customers">{() => <AdminCustomers />}</Route>
            <Route path="/admin/reports">{() => <AdminReports />}</Route>
            <Route path="/admin/settings">{() => <AdminSettings />}</Route>
            <Route>{() => <NotFound />}</Route>
          </Switch>
        </PageTransition>
      ) : (
        <Layout>
          <PageTransition location={location}>
            <Switch>
              <Route path="/">{() => <Home />}</Route>
              <Route path="/about">{() => <AboutUsPage />}</Route>
              <Route path="/checkout">{() => <Checkout />}</Route>
              <Route path="/delivery">{() => <DeliveryInfo />}</Route>
              <Route path="/products">{() => <ProductsPage />}</Route>
              <Route path="/faq">{() => <FAQPage />}</Route>
              <Route path="/policies">{() => <PoliciesPage />}</Route>
              <Route path="/login">{() => <LoginFormLazy />}</Route>
              <Route path="/signup">{() => <SignupFormLazy />}</Route>
              <Route path="/dashboard">{() => <UserDashboard />}</Route>
              <Route path="/order-history">{() => <OrderHistory />}</Route>
              <Route path="/orders">{() => <OrderHistory />}</Route>
              <Route path="/profile-management">{() => <ProfileManagement />}</Route>
              <Route path="/not-found">{() => <NotFound />}</Route>
              <Route>{() => <NotFound />}</Route>
            </Switch>
          </PageTransition>
        </Layout>
      )}
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
