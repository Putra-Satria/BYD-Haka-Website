
import TopNav from "@/components/TopNav";
import Footer from "@/components/Footer";
import { Mail, Phone, MapPin, Clock, Send } from "lucide-react";
import contactIllustration from "@/assets/contact-illustration-flat.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function Contact() {
  return (
    <div className="min-h-screen bg-white">
      <TopNav isPublic={true} />

      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-64px)]">
        {/* Left Side - Illustration & Info */}
        <div className="w-full bg-white flex items-center justify-center p-8 lg:p-12 relative overflow-hidden">
          {/* Background Decorations */}
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-500/5 rounded-full blur-3xl"></div>

          <div className="max-w-4xl w-full relative z-10 space-y-12 text-center">
            <div className="space-y-4 flex flex-col items-center">
              <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full tracking-wide uppercase">Support</span>
              <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight">Get in Touch</h1>
              <p className="text-gray-600 text-lg leading-relaxed max-w-2xl mx-auto">
                Have questions about career opportunities at Haka Auto? We're here to help you navigate your journey.
              </p>
            </div>

            <div className="relative max-w-md mx-auto">
              <img
                src={contactIllustration}
                alt="Customer Support"
                className="w-full h-auto drop-shadow-2xl hover:scale-105 transition-transform duration-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <div className="flex flex-col items-center gap-3 p-6 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
                <div className="p-3 bg-white rounded-xl shadow-sm text-primary">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Email Us</h3>
                  <p className="text-gray-500 text-sm max-w-[250px] mx-auto">recruitment@hakaauto.com</p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-3 p-6 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
                <div className="p-3 bg-white rounded-xl shadow-sm text-primary">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Visit Us</h3>
                  <p className="text-gray-500 text-sm max-w-[250px] mx-auto">Cyber 2 Tower, Lantai 32, Jakarta Selatan</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
