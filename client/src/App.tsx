import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import Checkout from "@/pages/checkout";
import DeliveryInfo from "@/pages/delivery";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/components/auth-context";
import { LoginForm, SignupForm } from "@/components/auth-forms";
import UserDashboard from "@/pages/dashboard";
import OrderHistory from "@/pages/order-history";
import ProfileManagement from "@/pages/profile-management";

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
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
