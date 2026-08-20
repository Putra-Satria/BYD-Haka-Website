import carBanner from "@/assets/car-banner.jpg";

export function WelcomeBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary-glow to-primary p-8 md:p-10 shadow-strong animate-fade-in-up">
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex-1 text-white">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 drop-shadow-lg">
            Welcome to Haka Auto Talent Hunt
          </h1>
          <p className="text-base md:text-lg text-white/90 max-w-2xl leading-relaxed">
            Discover exciting career opportunities at Haka Auto across Indonesia. 
            Join our team of professionals driving the future of electric mobility and 
            sustainable automotive innovation.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <p className="text-2xl font-bold">50+</p>
              <p className="text-sm text-white/80">Open Positions</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <p className="text-2xl font-bold">34</p>
              <p className="text-sm text-white/80">Provinces</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <p className="text-2xl font-bold">100+</p>
              <p className="text-sm text-white/80">Dealers</p>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 w-full md:w-auto">
          <img
            src={carBanner}
            alt="Haka Auto Vehicles"
            className="w-full md:w-96 h-auto rounded-xl shadow-2xl object-cover animate-scale-in"
          />
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -z-0" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -z-0" />
    </div>
  );
}
