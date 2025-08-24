import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { AuthProvider } from '@/components/auth-context';
import { AdminAuthProvider } from '@/components/admin-auth';
import { HelmetProvider } from 'react-helmet-async';

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
	<AuthProvider>
		<AdminAuthProvider>
			<App />
		</AdminAuthProvider>
	</AuthProvider>
  </HelmetProvider>
);
