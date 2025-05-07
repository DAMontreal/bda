import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Info } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { disciplines } from "@/lib/utils";
import { DefaultProfileSelector } from "@/components/auth/default-profile-selector";
import { getDefaultProfileImageFilename } from "@/components/ui/default-profile-image";

// Extend the insert schema with validation rules
const registerSchema = insertUserSchema.extend({
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  confirmPassword: z.string(),
  defaultProfileImage: z.string().default(() => getDefaultProfileImageFilename()),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const Register = () => {
  const [, navigate] = useLocation();
  const { isAuthenticated, register } = useAuth();

  // Redirect if already authenticated
  if (isAuthenticated) {
    navigate("/dashboard");
  }

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      bio: "",
      discipline: "",
      location: "",
      website: "",
      socialMedia: {},
      defaultProfileImage: getDefaultProfileImageFilename()
    }
  });

  const { handleSubmit, formState } = form;
  const { isSubmitting } = formState;

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      await register(data);
      // Redirect to pending approval page
      navigate("/pending-approval");
    } catch (error) {
      console.error("Registration error:", error);
    }
  };



  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Inscription</CardTitle>
          <CardDescription>
            Créez votre profil d'artiste sur le Bottin des artistes DAM
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <h2 className="font-semibold text-lg">Informations de compte</h2>
                
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom d'utilisateur*</FormLabel>
                      <FormControl>
                        <Input placeholder="nom_utilisateur" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresse email*</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="votre@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mot de passe*</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="********" {...field} />
                      </FormControl>
                      <FormDescription>
                        Au moins 8 caractères
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmer le mot de passe*</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="********" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="space-y-4">
                <h2 className="font-semibold text-lg">Informations personnelles</h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prénom*</FormLabel>
                        <FormControl>
                          <Input placeholder="Prénom" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom*</FormLabel>
                        <FormControl>
                          <Input placeholder="Nom" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Sélecteur d'image de profil par défaut */}
                <DefaultProfileSelector 
                  control={form.control} 
                  name="defaultProfileImage" 
                />
                
                <FormField
                  control={form.control}
                  name="discipline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discipline artistique</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez votre discipline" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {disciplines.map(discipline => (
                            <SelectItem key={discipline.value} value={discipline.value}>
                              {discipline.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Localisation</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Montréal, QC" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Biographie</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Parlez un peu de vous et de votre pratique artistique..." 
                          className="resize-none" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Site web</FormLabel>
                      <FormControl>
                        <Input placeholder="https://www.votresite.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <Alert variant="outline">
                <Info className="h-4 w-4" />
                <AlertTitle>Information</AlertTitle>
                <AlertDescription>
                  Votre compte devra être approuvé par un administrateur avant que vous puissiez vous connecter.
                  Vous pourrez compléter votre profil et ajouter des médias après l'approbation.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                <Button type="submit" className="w-full bg-dam-orange hover:bg-[#e88a1e]" disabled={isSubmitting}>
                  {isSubmitting ? "Inscription en cours..." : "S'inscrire"}
                </Button>
                
                <div className="text-center text-sm">
                  Vous avez déjà un compte?{" "}
                  <Link href="/login" className="text-dam-orange hover:underline">
                    Se connecter
                  </Link>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
