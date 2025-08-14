import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import Checkout from "@/pages/checkout";
import DeliveryInfo from "@/pages/delivery";
import NotFound from "@/pages/not-found";
import { LoginForm, SignupForm } from "@/components/auth-forms";
import UserDashboard from "@/pages/dashboard";
import OrderHistory from "@/pages/order-history";
import ProfileManagement from "@/pages/profile-management";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminProducts from "@/pages/admin/products";
import AdminOrders from "@/pages/admin/orders";
import AdminLogin from "@/pages/admin-login";
import AdminOverview from "@/pages/admin/overview";
import AdminCustomers from "@/pages/admin/customers";
import AdminReports from "@/pages/admin/reports";
import AdminSettings from "@/pages/admin/settings";
import AdminHome from "@/pages/admin/home";

function AdminRootRedirect() {
  const [, setLocation] = useLocation();
  // Redirect /admin base path to unified admin home page
  setTimeout(() => setLocation('/admin/home'), 0);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/delivery" component={DeliveryInfo} />
      <Route path="/login" component={() => <LoginForm />} />
      <Route path="/signup" component={() => <SignupForm />} />
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
