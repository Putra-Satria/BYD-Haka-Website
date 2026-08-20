
import TopNav from "@/components/TopNav";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Briefcase, Users, Award, TrendingUp, ArrowRight, CheckCircle2 } from "lucide-react";
import homeHero from "@/assets/home-hero-flat.png";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <TopNav isPublic={true} />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            {/* Left Content */}
            <div className="lg:w-1/2 space-y-8 animate-fade-in-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold tracking-wide uppercase">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                We are Hiring
              </div>
              <h1 className="text-4xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-110%">
                Build Your Career with <br />
                <span className="text-primary">HAKA Auto</span>
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed max-w-xl">
                Join Indonesia's leading automotive dealership network. Drive innovation in the electric vehicle revolution and grow with a dynamic team.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button
                  size="lg"
                  onClick={() => navigate('/lowongan')}
                  className="bg-primary hover:bg-primary/90 text-white rounded-full px-8 py-6 text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
                >
                  <Briefcase className="mr-2 h-5 w-5" />
                  View Open Positions
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate('/tentang-kami')}
                  className="rounded-full px-8 py-6 text-lg border-2 hover:bg-gray-50 transition-colors"
                >
                  Learn More About Us
                </Button>
              </div>

              <div className="pt-8 flex items-center gap-8 text-gray-500 text-sm font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <span>Professional Growth</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <span>Inclusive Culture</span>
                </div>
              </div>
            </div>

            {/* Right Image */}
            <div className="lg:w-1/2 relative animate-fade-in-right">
              <div className="relative z-10 p-4">
                <img
                  src={homeHero}
                  alt="Career at Haka Auto"
                  className="w-full h-auto object-contain transform hover:scale-105 transition-transform duration-500 ease-out"
                />
              </div>
              {/* Decorative elements */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-primary/5 to-transparent rounded-full blur-3xl -z-10"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-gray-50 border-y border-gray-100">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: "35+", label: "Branch Locations" },
              { number: "500+", label: "Team Members" },
              { number: "15+", label: "Provinces" },
              { number: "20+", label: "Career Paths" }
            ].map((stat, idx) => (
              <div key={idx} className="text-center space-y-2">
                <div className="text-4xl lg:text-5xl font-extrabold text-primary tracking-tight">{stat.number}</div>
                <div className="text-sm lg:text-base text-gray-500 font-medium uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Join Us? (Features) */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">Why Join HAKA Auto?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Discover the benefits of working with a forward-thinking automotive leader dedicated to excellence and sustainability.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                title: "Dynamic Team Culture",
                desc: "Work with passionate professionals in a collaborative environment that values innovation and growth."
              },
              {
                icon: Award,
                title: "Career Development",
                desc: "Access comprehensive training programs and clear career progression pathways to reach your full potential."
              },
              {
                icon: TrendingUp,
                title: "Industry Leader",
                desc: "Be part of Indonesia's fastest-growing automotive network at the forefront of electric vehicle technology."
              }
            ].map((feature, idx) => (
              <div key={idx} className="group p-8 rounded-3xl bg-white border border-gray-100 shadow-lg shadow-gray-100/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                  <feature.icon className="w-8 h-8 text-primary group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* New CTA Section */}
      <section className="py-20 bg-primary overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('/bg-pattern.svg')] opacity-10"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-black opacity-10 rounded-full blur-3xl -ml-20 -mb-20"></div>

        <div className="container mx-auto px-4 relative z-10 text-center space-y-8">
          <h2 className="text-3xl lg:text-5xl font-bold text-white tracking-tight">Ready to Start Your Journey?</h2>
          <p className="text-lg text-green-50 max-w-2xl mx-auto px-4">
            Explore our current openings and find the perfect role that matches your skills and aspirations.
          </p>
          <Button
            size="lg"
            onClick={() => navigate('/lowongan')}
            className="bg-white text-primary hover:bg-gray-50 font-bold rounded-full px-10 py-7 text-lg shadow-2xl transition-all hover:scale-105"
          >
            Browse Open Positions
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>
      <Footer />
    </div>
  );
}
