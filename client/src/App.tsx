import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";

// Layouts
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

// Pages
import Home from "@/pages/home";
import Artists from "@/pages/artists";
import ArtistProfile from "@/pages/artist-profile";
import Events from "@/pages/events";
import TrocDam from "@/pages/trocdam";
import About from "@/pages/about";
import Register from "@/pages/register";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Messages from "@/pages/messages";
import Admin from "@/pages/admin";

// Auth Provider
import { AuthProvider } from "@/hooks/use-auth";

function Router() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow pt-16">
<Switch>
  <Route path="/" component={Home} />
  <Route path="/artists" component={Artists} />
  <Route path="/artists/:id" component={ArtistProfile} />
  <Route path="/events" component={Events} />
  <Route path="/trocdam" component={TrocDam} />
  <Route path="/about" component={About} />
  <Route path="/register" component={Register} />
  <Route path="/login" component={Login} />
  <Route path="/dashboard" component={Dashboard} />
  <Route path="/messages/:id" component={Messages} /> {/* ✅ nouvelle route dynamique */}
  <Route path="/messages" component={Messages} />
  <Route path="/admin" component={Admin} />
  <Route component={NotFound} />
</Switch>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
