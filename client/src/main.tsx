import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { AuthProvider } from '@/components/auth-context';
import { AdminAuthProvider } from '@/components/admin-auth';

createRoot(document.getElementById("root")!).render(
	<AuthProvider>
		<AdminAuthProvider>
			<App />
		</AdminAuthProvider>
	</AuthProvider>
);
