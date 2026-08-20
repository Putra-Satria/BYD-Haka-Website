import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import PageTransition from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Home, Map as MapIcon, RotateCcw } from "lucide-react";
import lostCar from "@/assets/404-car.png";
import { motion } from "framer-motion";

const NotFound = () => {
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", window.location.pathname);
  }, []);

  return (
    <PageTransition>
      <div className="flex min-h-screen flex-col items-center justify-center bg-green-50/50 p-4 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
          className="relative mb-8 max-w-md w-full"
        >
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 -mr-8 -mt-8 h-24 w-24 rounded-full bg-primary/10 blur-xl animate-pulse"></div>
          <div className="absolute bottom-0 left-0 -ml-8 -mb-8 h-32 w-32 rounded-full bg-blue-100/50 blur-xl"></div>

          <img
            src={lostCar}
            alt="Lost Car Illustration"
            className="w-full h-auto drop-shadow-xl"
          />
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="max-w-xl space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-600 text-xs font-bold tracking-wide uppercase">
            <MapIcon className="w-3 h-3" />
            Off Road Detected
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 tracking-tight">
            Oops! Dead End.
          </h1>

          <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
            Looks like you've driven off the map. This route doesn't exist in our navigation system.
          </p>

          <div className="pt-6 flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate("/")}
              className="group bg-primary hover:bg-primary/90 text-white rounded-full px-8 shadow-lg hover:shadow-primary/30 transition-all hover:-translate-y-1"
            >
              <Home className="mr-2 h-5 w-5 group-hover:animate-bounce" />
              Return to Garage
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={() => window.history.back()}
              className="rounded-full px-8 border-2 hover:bg-gray-50"
            >
              <RotateCcw className="mr-2 h-5 w-5 group-hover:-rotate-180 transition-transform duration-500" />
              Go Back
            </Button>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default NotFound;
