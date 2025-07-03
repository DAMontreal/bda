import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Link } from "wouter";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Schema for password reset request
const resetRequestSchema = z.object({
  email: z.string().email("Adresse email invalide"),
});

// Schema for password reset
const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token requis"),
  newPassword: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  confirmPassword: z.string().min(1, "Confirmation du mot de passe requise"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type ResetRequestValues = z.infer<typeof resetRequestSchema>;
type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

const PasswordReset = () => {
  const [step, setStep] = useState<"request" | "reset" | "success">("request");
  const [resetToken, setResetToken] = useState("");
  const { toast } = useToast();

  const requestForm = useForm<ResetRequestValues>({
    resolver: zodResolver(resetRequestSchema),
    defaultValues: {
      email: "",
    },
  });

  const resetForm = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onRequestSubmit = async (data: ResetRequestValues) => {
    try {
      const response = await apiRequest("POST", "/api/auth/password-reset-request", data);
      const result = await response.json();
      
      // In development, we get the token back
      if (result.resetToken) {
        setResetToken(result.resetToken);
        resetForm.setValue("token", result.resetToken);
      }
      
      toast({
        title: "Demande envoyée",
        description: "Si cette adresse email existe, vous recevrez un lien de réinitialisation.",
      });
      
      setStep("reset");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
      });
    }
  };

  const onResetSubmit = async (data: ResetPasswordValues) => {
    try {
      await apiRequest("POST", "/api/auth/password-reset", {
        token: data.token,
        newPassword: data.newPassword,
      });
      
      toast({
        title: "Mot de passe réinitialisé",
        description: "Votre mot de passe a été réinitialisé avec succès.",
      });
      
      setStep("success");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la réinitialisation",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/login" className="inline-flex items-center text-gray-600 hover:text-[#FF5500] mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour à la connexion
        </Link>

        {step === "request" && (
          <Card>
            <CardHeader>
              <CardTitle>Réinitialiser le mot de passe</CardTitle>
              <CardDescription>
                Entrez votre adresse email pour recevoir un lien de réinitialisation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...requestForm}>
                <form onSubmit={requestForm.handleSubmit(onRequestSubmit)} className="space-y-4">
                  <FormField
                    control={requestForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adresse email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="votre@email.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-[#FF5500] hover:bg-opacity-90"
                    disabled={requestForm.formState.isSubmitting}
                  >
                    {requestForm.formState.isSubmitting ? "Envoi..." : "Envoyer le lien"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {step === "reset" && (
          <Card>
            <CardHeader>
              <CardTitle>Nouveau mot de passe</CardTitle>
              <CardDescription>
                Entrez le token reçu et votre nouveau mot de passe
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...resetForm}>
                <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-4">
                  <FormField
                    control={resetForm.control}
                    name="token"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Token de réinitialisation</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Token reçu par email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={resetForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nouveau mot de passe</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" placeholder="Nouveau mot de passe" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={resetForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmer le mot de passe</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" placeholder="Confirmer le mot de passe" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-[#FF5500] hover:bg-opacity-90"
                    disabled={resetForm.formState.isSubmitting}
                  >
                    {resetForm.formState.isSubmitting ? "Réinitialisation..." : "Réinitialiser le mot de passe"}
                  </Button>
                </form>
              </Form>
              
              {/* Development helper */}
              {resetToken && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                  <strong>Mode développement:</strong> Token automatiquement rempli
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {step === "success" && (
          <Card>
            <CardHeader className="text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <CardTitle>Mot de passe réinitialisé</CardTitle>
              <CardDescription>
                Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/login">
                <Button className="w-full bg-[#FF5500] hover:bg-opacity-90">
                  Se connecter
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PasswordReset;