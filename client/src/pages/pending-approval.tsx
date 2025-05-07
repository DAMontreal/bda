import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Mail, Clock, CheckCircle } from "lucide-react";

export default function PendingApproval() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();

  // Redirect to dashboard if already approved
  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.isApproved) {
      setLocation("/dashboard");
    }
  }, [isLoading, isAuthenticated, user, setLocation]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  if (isLoading) {
    return (
      <div className="container py-10 flex items-center justify-center">
        <div className="animate-spin">
          <Clock className="h-10 w-10 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <div className="max-w-lg mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="w-20 h-20 mx-auto mb-5 bg-amber-100 rounded-full flex items-center justify-center">
              <Clock className="h-10 w-10 text-amber-600" />
            </div>
            <CardTitle className="text-2xl">Compte en attente d'approbation</CardTitle>
            <CardDescription>
              Votre inscription a été prise en compte et est en cours d'examen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="mb-4 text-muted-foreground">
                Merci d'avoir créé un compte sur le Bottin des artistes. Votre profil doit être approuvé par notre équipe avant que vous puissiez accéder à toutes les fonctionnalités.
              </p>
              <p className="mb-4 text-muted-foreground">
                Vous recevrez un email de confirmation dès que votre compte sera validé. Cela peut prendre 24 à 48 heures ouvrables.
              </p>
            </div>

            <div className="border rounded-md p-4 bg-slate-50">
              <h3 className="text-md font-medium flex items-center mb-2">
                <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                Ce qui se passe ensuite :
              </h3>
              <ul className="ml-7 list-disc text-sm space-y-1">
                <li>Notre équipe vérifie votre profil</li>
                <li>Vous recevrez un email quand votre compte sera approuvé</li>
                <li>Vous pourrez alors accéder à votre tableau de bord et à toutes les fonctionnalités</li>
                <li>Vous pourrez compléter votre profil avec vos informations professionnelles</li>
              </ul>
            </div>

            <div className="flex flex-col space-y-3">
              <Button variant="outline" onClick={() => setLocation("/")} className="w-full">
                Retourner à l'accueil
              </Button>
              <Button variant="outline" asChild className="w-full">
                <a 
                  href="mailto:contact@diversiteartistique.org" 
                  className="inline-flex items-center justify-center"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Contacter l'équipe
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}