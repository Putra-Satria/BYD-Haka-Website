import { Link } from "react-router-dom";
import { Mail, Phone, Instagram, Facebook, Youtube, Linkedin } from "lucide-react";

export default function Footer() {
    return (
        <footer className="bg-gray-900 text-white pt-16 pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
                    {/* Brand & Address */}
                    <div className="space-y-6">
                        <Link to="/" className="inline-block">
                            <img
                                src="/haka-logo-white.png"
                                alt="Haka Auto"
                                className="h-8 w-auto brightness-0 invert"
                            />
                        </Link>
                        <div className="space-y-4 text-white/90 text-sm leading-relaxed">
                            <p>
                                <strong>Cyber 2 Tower Lt 32</strong><br />
                                Jl. H R Rasuna Said X-5 No. 13<br />
                                Kuningan Timur, Setiabudi<br />
                                Jakarta Selatan, DKI Jakarta 12950
                            </p>
                        </div>
                        <div className="flex gap-4 text-sm font-medium text-white/80 pt-2">
                            <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                            <Link to="/terms" className="hover:text-white transition-colors">Terms of Use</Link>
                        </div>
                    </div>

                    {/* Opening Hours */}
                    <div className="space-y-6">
                        <h3 className="text-xl font-bold">Opening Hours</h3>
                        <div className="space-y-4 text-white/90 text-sm">
                            <div>
                                <p className="font-semibold mb-1">Head Office</p>
                                <p>Monday - Friday : 08:00 - 17:00</p>
                            </div>
                            <div>
                                <p className="font-semibold mb-1">Branches</p>
                                <p>Monday - Sunday : 08:00 - 17:00</p>
                            </div>
                        </div>

                        <div className="pt-4">
                            <p className="text-sm font-semibold mb-3">Follow Us</p>
                            <div className="flex gap-4">
                                <a href="https://www.instagram.com/career_hakaauto/" className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors">
                                    <Instagram className="w-5 h-5" />
                                </a>
                                {/*<a href="#" className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors">
                                    <Facebook className="w-5 h-5" />
                                </a>*/}
                                <a href="https://www.youtube.com/@BYD_HakaAuto" className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors">
                                    <Youtube className="w-5 h-5" />
                                </a>
                                <a href="https://www.linkedin.com/company/bydhaka/" className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors">
                                    <Linkedin className="w-5 h-5" />
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Contact Us */}
                    <div className="space-y-6">
                        <h3 className="text-xl font-bold">Contact Us</h3>
                        <div className="space-y-4">
                            <a href="tel:08118888234" className="flex items-center gap-3 text-white/90 hover:text-white transition-colors group">
                                <div className="bg-white/10 p-2 rounded-lg group-hover:bg-white/20 transition-colors">
                                    <Phone className="w-5 h-5" />
                                </div>
                                <span className="text-sm">0811 88888 234</span>
                            </a>
                            <a href="mailto:info@hakaauto.com" className="flex items-center gap-3 text-white/90 hover:text-white transition-colors group">
                                <div className="bg-white/10 p-2 rounded-lg group-hover:bg-white/20 transition-colors">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <span className="text-sm">recruitment@hakaauto.com</span>
                            </a>
                        </div>
                    </div>
                </div>

                {/* Copyright */}
                <div className="border-t border-white/10 pt-8 text-center">
                    <p className="text-white/60 text-sm">
                        Copyright by ICT HAKA Auto &copy; {new Date().getFullYear()}
                    </p>
                </div>
            </div>
        </footer>
    );
}
