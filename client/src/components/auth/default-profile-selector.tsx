import { useState } from 'react';
import { FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getDefaultProfileImageFilename } from "@/components/ui/default-profile-image";
import { Control } from "react-hook-form";

interface DefaultProfileSelectorProps {
  control: Control<any>;
  name: string;
}

export function DefaultProfileSelector({ control, name }: DefaultProfileSelectorProps) {
  // Pour précharger les images et éviter le clignotement
  const [imagesLoaded, setImagesLoaded] = useState(false);
  
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-3">
          <FormLabel>Image de profil</FormLabel>
          <FormDescription>
            Choisissez une image de profil par défaut. Vous pourrez la changer plus tard.
          </FormDescription>
          
          <FormControl>
            <RadioGroup
              onValueChange={field.onChange}
              defaultValue={field.value}
              className="grid grid-cols-2 sm:grid-cols-4 gap-4"
            >
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="relative">
                  <RadioGroupItem
                    value={getDefaultProfileImageFilename(index)}
                    id={`profile-${index}`}
                    className="peer sr-only"
                  />
                  <label
                    htmlFor={`profile-${index}`}
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-md overflow-hidden">
                      <img
                        src={`/default-profile-images/bottin${index + 1}.jpg`}
                        alt={`Option de profil ${index + 1}`}
                        className="w-full h-full object-cover"
                        onLoad={() => !imagesLoaded && index === 3 && setImagesLoaded(true)}
                      />
                    </div>
                  </label>
                </div>
              ))}
            </RadioGroup>
          </FormControl>
        </FormItem>
      )}
    />
  );
}