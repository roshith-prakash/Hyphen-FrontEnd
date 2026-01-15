import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DarkModeProvider } from "./context/DarkModeContext.tsx";
import { UserProvider } from "./context/UserContext.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";

//Creating the Queryclient instance
const client = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")).render(
  <StrictMode>
    {/* The query client provider that provides the client for child components. */}
    <QueryClientProvider client={client}>
      <DarkModeProvider>
        <AuthProvider>
          <UserProvider>
            <App />
          </UserProvider>
        </AuthProvider>
      </DarkModeProvider>
    </QueryClientProvider>
  </StrictMode>
);