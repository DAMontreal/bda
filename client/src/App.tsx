import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import MessageNotification from "@/components/messages/message-notification";

// Layouts
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

// Pages
import Home from "@/pages/home";
import Artists from "@/pages/artists";
import ArtistProfile from "@/pages/artist-profile";
import Events from "@/pages/events";
import EventDetail from "@/pages/event-detail";
import TrocDam from "@/pages/trocdam";
import TrocAdDetail from "@/pages/troc-ad-detail";
import EditTrocAd from "@/pages/edit-troc-ad";
import About from "@/pages/about";
import Register from "@/pages/register";
import Login from "@/pages/login";
import PasswordReset from "@/pages/password-reset";
import Dashboard from "@/pages/dashboard";
import Messages from "@/pages/messages";
import Admin from "@/pages/admin";
import PendingApproval from "@/pages/pending-approval";

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
          <Route path="/events/:id" component={EventDetail} />
          <Route path="/trocdam" component={TrocDam} />
          <Route path="/troc/:id" component={TrocAdDetail} />
          <Route path="/troc/:id/edit" component={EditTrocAd} />
          <Route path="/about" component={About} />
          <Route path="/register" component={Register} />
          <Route path="/login" component={Login} />
          <Route path="/password-reset" component={PasswordReset} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/messages" component={Messages} />
          <Route path="/messages/:userId" component={Messages} />
          <Route path="/admin" component={Admin} />
          <Route path="/pending-approval" component={PendingApproval} />
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
        <MessageNotification />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
