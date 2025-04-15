import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const testimonials = [
  {
    id: 1,
    quote: "Grâce au Bottin des artistes, j'ai pu trouver des collaborateurs pour mon album et augmenter ma visibilité dans le milieu musical québécois.",
    name: "Marie Dupont",
    role: "Musicienne",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=120&q=80",
  },
  {
    id: 2,
    quote: "DAM m'a offert une plateforme pour présenter mon travail et rencontrer d'autres artistes. J'ai même été invité à participer à plusieurs expositions grâce aux connexions établies ici.",
    name: "Jean Tremblay",
    role: "Artiste visuel",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=120&q=80",
  },
  {
    id: 3,
    quote: "La visibilité offerte par le Bottin et les opportunités de réseautage ont été essentielles pour développer ma carrière de chorégraphe à Montréal.",
    name: "Sophia Patel",
    role: "Danseuse et chorégraphe",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=crop&w=120&q=80",
  },
];

const Testimonials = () => {
  return (
    <section className="py-16 bg-black text-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Témoignages d'artistes</h2>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Découvrez comment Diversité Artistique Montréal a aidé les artistes à faire avancer leur
            carrière
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <Card
              key={testimonial.id}
              className="bg-black border border-[#FF5500] p-6 rounded-lg relative"
            >
              <CardContent className="p-0">
                <div className="text-[#FF5500] text-4xl absolute -top-5 left-5">"</div>
                <p className="mb-6 pt-4">{testimonial.quote}</p>
                <div className="flex items-center">
                  <Avatar className="h-12 w-12 mr-4">
                    <AvatarImage src={testimonial.image} alt={testimonial.name} />
                    <AvatarFallback>
                      {testimonial.name.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-bold">{testimonial.name}</h4>
                    <p className="text-sm text-gray-300">{testimonial.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
