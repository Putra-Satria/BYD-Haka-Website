import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";
import { buildSecureFilePath, logSecurityAudit, validateSecureUpload } from "@/lib/securityHardening";
import { Eye, EyeOff, Mail, CheckCircle2, RefreshCw } from "lucide-react";
import TopNav from "@/components/TopNav";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import authIllustration from "@/assets/auth-illustration.png";
import Footer from "@/components/Footer";
import { provinces } from "@/data/provinces"; // Import provinces
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

const MAX_PDF_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

const registerSchema = z.object({
  nik: z.string().length(16, "NIK must be 16 digits").regex(/^\d+$/, "NIK must be numbers"),
  fullName: z.string().min(3, "Full name must be at least 3 characters"),
  email: z.string().email({ message: "Invalid email" }),
  password: z.string()
    .min(8, { message: "Password must be at least 8 characters" })
    .max(16, { message: "Password must be at most 16 characters" })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, {
      message: "Password must contain uppercase, lowercase, number, and symbol"
    }),
  confirmPassword: z.string(),
  residentialAddress: z.string().min(3, "Address required"),
  cityProvince: z.string().min(3, "Province required"),
  dateOfBirth: z.string().min(1, "Date of birth required"),
  gender: z.enum(["male", "female"], { required_error: "Gender required" }),
  whatsappNumber: z.string().min(10, "Valid WhatsApp number required"),
  expectedSalary: z.number().positive("Valid salary required"),
  hasAutomotiveExperience: z.boolean(),
  workExperienceDuration: z.string().min(1, "Experience duration required"),
  educationLevel: z.string().min(1, "Education level required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");
  const [isLogin, setIsLogin] = useState(mode !== "register");
  const [loading, setLoading] = useState(false);
  const [is2FASent, setIs2FASent] = useState(false);

  useEffect(() => {
    setIsLogin(mode !== "register");
  }, [mode]);

  // Login form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Register form state
  const [nik, setNik] = useState("");
  const [fullName, setFullName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [residentialAddress, setResidentialAddress] = useState("");
  const [cityProvince, setCityProvince] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [expectedSalary, setExpectedSalary] = useState("");
  const [hasAutomotiveExperience, setHasAutomotiveExperience] = useState<string>("");
  const [workExperienceDuration, setWorkExperienceDuration] = useState("");

  const [educationLevel, setEducationLevel] = useState("");
  const [emailError, setEmailError] = useState(false); // Add email error state

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const calculateStrength = (pass: string) => {
    let strength = 0;
    if (pass.length >= 8) strength++;
    if (/[a-z]/.test(pass)) strength++;
    if (/[A-Z]/.test(pass)) strength++;
    if (/\d/.test(pass)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pass)) strength++;
    return strength;
  };

  const passwordStrength = calculateStrength(registerPassword);

  const formatRupiah = (value: string) => {
    const numberString = value.replace(/[^,\d]/g, "").toString();
    const split = numberString.split(",");
    const sisa = split[0].length % 3;
    let rupiah = split[0].substr(0, sisa);
    const ribuan = split[0].substr(sisa).match(/\d{3}/gi);

    if (ribuan) {
      const separator = sisa ? "." : "";
      rupiah += separator + ribuan.join(".");
    }

    rupiah = split[1] !== undefined ? rupiah + "," + split[1] : rupiah;
    return "Rp " + rupiah;
  };

  const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setExpectedSalary(formatRupiah(e.target.value));
  };

  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^0-9]/g, "");
    if (value.startsWith("62")) {
      value = "0" + value.slice(2);
    } else if (value.length > 0 && !value.startsWith("0")) {
      value = "0" + value;
    }
    setWhatsappNumber(value);
  };

  const handleNikChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setNik(value);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    setRegisterEmail(value);
    // Simple regex check for invalid format to trigger red border logic if needed immediately, 
    // or just rely on blur/submit. User asked for "jika ada ... maka border input field akan merah"
    // We can check validity here or on blur. Let's reset error on change.
    if (value.includes("@")) setEmailError(false);
  };

  const handleEmailBlur = () => {
    if (!registerEmail) return;
    const isValid = z.string().email().safeParse(registerEmail).success;
    setEmailError(!isValid);
  };

  // Forgot Password State
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);



  const [cvFile, setCvFile] = useState<File | null>(null);
  const [paklaringFile, setPaklaringFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [cvError, setCvError] = useState("");
  const [paklaringError, setPaklaringError] = useState("");
  const [photoError, setPhotoError] = useState("");

  const handleCvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_PDF_SIZE) {
        setCvError("File size exceeds 5MB limit");
        setCvFile(null);
        e.target.value = "";
      } else {
        setCvError("");
        setCvFile(file);
      }
    }
  };

  const handlePaklaringChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_PDF_SIZE) {
        setPaklaringError("File size exceeds 5MB limit");
        setPaklaringFile(null);
        e.target.value = "";
      } else {
        setPaklaringError("");
        setPaklaringFile(file);
      }
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_IMAGE_SIZE) {
        setPhotoError("File size exceeds 2MB limit");
        setPhotoFile(null);
        e.target.value = "";
      } else {
        setPhotoError("");
        setPhotoFile(file);
      }
    }
  };

  const checkUserRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const roles = data?.map((item) => item.role) || [];
    const { data: { session } } = await supabase.auth.getSession();
    const email = (session?.user?.email || "").toLowerCase();

    const isAdmin = roles.includes("admin") || email.includes("admin");
    const isRecruiter = roles.includes("recruiter") || email.includes("recruiter") || email.includes("hrd");

    if (isAdmin || isRecruiter) {
      navigate("/admin");
    } else {
      navigate("/job-board");
    }
  };

  useEffect(() => {
    // 1. Initial Session Check on Mount
    const checkActiveSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const is2FAPending = sessionStorage.getItem("haka_2fa_pending") === "true";

      if (session?.user) {
        // If 2FA is currently pending and user hasn't completed email link click yet
        if (is2FAPending) {
          setIs2FASent(true);
          setEmail(session.user.email || "");
          return;
        }

        // If user is authenticated and 2FA is not pending, go straight to dashboard
        await checkUserRole(session.user.id);
      }
    };

    checkActiveSession();

    // 2. Auth State Event Listener (Fires when user clicks email link)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION")) {
        const is2FAPending = sessionStorage.getItem("haka_2fa_pending") === "true";
        const isNewUserRegistration = sessionStorage.getItem("haka_new_user_reg") === "true";

        // Case A: Newly registered user clicking email confirmation link
        if (isNewUserRegistration) {
          sessionStorage.removeItem("haka_new_user_reg");
          sessionStorage.removeItem("haka_2fa_pending");
          setIs2FASent(false);
          toast.success("Account & email verified successfully! Welcome to HAKA Auto!");
          await checkUserRole(session.user.id);
          return;
        }

        // Case B: Existing user clicking 2FA email magic link
        if (is2FAPending && event === "SIGNED_IN") {
          sessionStorage.removeItem("haka_2fa_pending");
          setIs2FASent(false);
          toast.success("2-Step security verification completed! Welcome back.");
          await checkUserRole(session.user.id);
          return;
        }

        // Case C: Standard authenticated user
        if (!is2FAPending) {
          setIs2FASent(false);
          await checkUserRole(session.user.id);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = loginSchema.parse({ email, password });
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

      if (error) throw error;

      // Check if user is a newly registered user (logged in right after signup)
      const isNewUserRegistration = sessionStorage.getItem("haka_new_user_reg") === "true";

      if (isNewUserRegistration) {
        // Newly registered user DOES NOT need 2FA again on first login!
        sessionStorage.removeItem("haka_new_user_reg");
        sessionStorage.removeItem("haka_2fa_pending");
        toast.success("Login successful! Welcome to HAKA Auto.");
        if (data.user) {
          await checkUserRole(data.user.id);
        }
        return;
      }

      // Existing User Login -> Requires 2FA Security Verification Link!
      sessionStorage.setItem("haka_2fa_pending", "true");

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: validated.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth?2fa_verified=true`,
        },
      });

      if (otpError) {
        if (otpError.message.toLowerCase().includes("rate limit")) {
          setIs2FASent(true);
          toast.warning("Supabase email rate limit reached. Please check your email inbox for the link or wait 1 minute.");
        } else {
          throw otpError;
        }
      } else {
        setIs2FASent(true);
        toast.success("Password verified! Security verification link sent to your email.");
      }
    } catch (error: any) {
      console.error("Login Check Error:", error);
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else if (error instanceof Error) {
        if (error.message.includes("Email not confirmed")) {
          toast.error("Please verify your email address from your inbox before logging in.");
        } else if (error.message.includes("Invalid login credentials")) {
          toast.error("Invalid email or password.");
        } else if (error.message.toLowerCase().includes("rate limit")) {
          toast.error("Supabase Email Rate Limit Exceeded. Please wait 1 minute before requesting a new link.");
        } else {
          toast.error(error.message || "An error occurred during login");
        }
      } else {
        toast.error("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (userId: string, file: File, folder: string, bucket: string = 'application-documents'): Promise<string> => {
    const documentType = bucket === "avatars" ? "photo" : folder === "cv" ? "cv" : "certificate";
    const validation = validateSecureUpload(file, documentType);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    const fileName = buildSecureFilePath(userId, file, folder);

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined,
      });

    if (uploadError) {
      await logSecurityAudit({
        action: "UPLOAD_DOCUMENT",
        targetUserId: userId,
        documentPath: `${bucket}/${fileName}`,
        status: "failed",
        description: `Failed to upload ${folder}: ${uploadError.message}`,
      });
      throw new Error(`Failed to upload ${folder}: ${uploadError.message}`);
    }

    await logSecurityAudit({
      action: "UPLOAD_DOCUMENT",
      targetUserId: userId,
      documentPath: `${bucket}/${fileName}`,
      status: "success",
      description: `Registered applicant uploaded ${folder} with file validation and UUID filename.`,
    });

    return fileName;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Custom validation for files
    if (!cvFile && !cvError) {
      toast.error("Please upload your CV");
      return;
    }
    if (!paklaringFile && !paklaringError) {
      toast.error("Please upload your Paklaring/Certificate");
      return;
    }
    if (!photoFile && !photoError) {
      toast.error("Please upload your Pass Foto");
      return;
    }

    if (cvError || paklaringError || photoError) {
      toast.error("Please fix file upload errors before submitting");
      return;
    }

    try {
      const parsedSalary = parseFloat(expectedSalary.replace(/[^0-9]/g, ''));

      const validated = registerSchema.parse({
        nik,
        fullName,
        email: registerEmail,
        password: registerPassword,
        confirmPassword,
        residentialAddress,
        cityProvince,
        dateOfBirth,
        gender,
        whatsappNumber,
        expectedSalary: parsedSalary,
        hasAutomotiveExperience: hasAutomotiveExperience === "yes",
        workExperienceDuration,
        educationLevel,
      });

      setLoading(true);

      // 1. Generate Temp ID for File Uploads (Since we don't have user ID yet)
      const tempId = self.crypto.randomUUID();

      // 2. Upload Files FIRST
      let cvUrl = "";
      let paklaringUrl = "";
      let photoUrl = "";

      try {
        // Upload immediately using the temp ID
        // Note: RLS must allow public INSERT for this to work
        cvUrl = await uploadFile(tempId, cvFile!, 'cv', 'application-documents');
        paklaringUrl = await uploadFile(tempId, paklaringFile!, 'certificate', 'application-documents');
        photoUrl = await uploadFile(tempId, photoFile!, 'photos', 'avatars');

      } catch (fileError: any) {
        console.error("Pre-registration file upload failed:", fileError);
        toast.error(`File upload failed: ${fileError.message}. Please try again.`);
        setLoading(false);
        return; // Stop registration if files fail
      }

      const metadata = {
        nik: validated.nik,
        full_name: validated.fullName,
        residential_address: validated.residentialAddress,
        city_province: validated.cityProvince,
        date_of_birth: validated.dateOfBirth,
        gender: validated.gender,
        whatsapp_number: validated.whatsappNumber,
        expected_salary: validated.expectedSalary,
        has_automotive_experience: validated.hasAutomotiveExperience,
        work_experience_duration: validated.workExperienceDuration,
        education_level: validated.educationLevel,
        // Pass the uploaded file URLs to metadata
        cv_url: cvUrl,
        certificate_url: paklaringUrl,
        avatar_url: photoUrl,
        info_source: "website",
      };

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/auth?type=signup`,
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        sessionStorage.setItem("haka_new_user_reg", "true");
        toast.success("Registration successful! Please check your email to verify your account.");
        setIsLogin(true); // Switch to login view
      }

    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else if (error instanceof Error) {
        toast.error(error.message);
      }
      console.error(error);
    } finally {
      setLoading(false);
    }
  };


  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error("Please enter your email address");
      return;
    }

    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast.success("Password reset link sent! Please check your email.");
      setShowForgotPassword(false);
      setResetEmail("");
    } catch (error: any) {
      console.error("Reset password error:", error);
      toast.error(error.message || "Failed to send reset link");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <TopNav isPublic={true} />

      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-64px)]">
        {/* Left Side - Illustration */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 bg-white sticky top-[64px] h-[calc(100vh-64px)]">
          <div className="max-w-xl">
            <img
              src={authIllustration}
              alt="Haka Auto Talent Hunt"
              className="w-full h-auto object-contain animate-fade-in"
            />
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full lg:w-1/2 bg-white p-6 lg:p-12">
          <div className={`w-full ${isLogin ? 'max-w-md' : 'max-w-2xl'} space-y-8 animate-fade-in m-auto`}>

            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-primary tracking-tight">
                {isLogin ? "Login" : "Register"}
              </h2>
              {/* <p className="text-muted-foreground">
                {isLogin ? "Welcome back!" : "Create your account"}
              </p> */}
            </div>

            <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-6">
              {isLogin ? (
                is2FASent ? (
                  /* 2FA EMAIL VERIFICATION SENT VIEW */
                  <div className="space-y-6 text-center py-2">
                    <div className="mx-auto w-16 h-16 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
                      <Mail className="w-8 h-8 text-blue-600 animate-bounce" />
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Security Verification Sent</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Password verified! We've sent a 2-step login verification link to:
                      </p>
                      <div className="mt-2.5 inline-block px-3.5 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs font-semibold text-blue-700">
                        {email}
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 text-left space-y-2.5 shadow-sm">
                      <div className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span><strong>Step 1 (Password):</strong> Confirmed & Verified.</span>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <Mail className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <span><strong>Step 2 (Email Link):</strong> Open your email inbox on your phone or laptop and click the <strong>Log In</strong> link to complete verification and enter your dashboard.</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2.5 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={async () => {
                          setLoading(true);
                          try {
                            const { error: resendErr } = await supabase.auth.signInWithOtp({
                              email: email,
                              options: { emailRedirectTo: `${window.location.origin}/` },
                            });
                            if (resendErr) throw resendErr;
                            toast.success("Security verification link re-sent!");
                          } catch (err: any) {
                            toast.error(err.message || "Failed to resend link");
                          } finally {
                            setLoading(false);
                          }
                        }}
                        disabled={loading}
                        className="w-full gap-2 border-gray-300 text-slate-700"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Resend Verification Link
                      </Button>

                      <button
                        type="button"
                        onClick={() => setIs2FASent(false)}
                        className="text-xs font-medium text-slate-500 hover:text-slate-700 underline mt-1"
                      >
                        Back to Login Form
                      </button>
                    </div>
                  </div>
                ) : (
                  /* STANDARD LOGIN FORM */
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  </div>
                )
              ) : (
                /* REGISTER FORM */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* SAME REGISTER FIELDS BUT STYLED */}
                  <div className="space-y-4">
                    {/* Account & Personal */}
                    <div className="space-y-2">
                      <Label htmlFor="regEmail">Email *</Label>
                      <Input
                        id="regEmail"
                        type="email"
                        value={registerEmail}
                        onChange={handleEmailChange}
                        onBlur={handleEmailBlur}
                        required
                        className={`bg-gray-50 border-gray-200 ${emailError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nik">NIK KTP (16 Digits) *</Label>
                      <Input id="nik" value={nik} onChange={handleNikChange} maxLength={16} required className="bg-gray-50 border-gray-200" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value.toUpperCase())} required className="bg-gray-50 border-gray-200" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="regPass">Password *</Label>
                      <div className="relative">
                        <Input
                          id="regPass"
                          type={showPassword ? "text" : "password"}
                          value={registerPassword}
                          onChange={e => setRegisterPassword(e.target.value)}
                          required
                          className="bg-gray-50 border-gray-200 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>

                      {/* Strength Meter */}
                      <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden mt-2">
                        <div
                          className={`h-full transition-all duration-300 ${passwordStrength <= 2 ? 'bg-red-500' :
                              passwordStrength <= 4 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                          style={{ width: `${(passwordStrength / 5) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        *Password must be at least 8 characters (combination of numbers, uppercase, lowercase, and special characters #$^+=!*()@%&))
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="regConfirm">Confirm Password *</Label>
                      <div className="relative">
                        <Input
                          id="regConfirm"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          required
                          className="bg-gray-50 border-gray-200 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Details */}
                    <div className="space-y-2">
                      <Label htmlFor="whatsapp">WhatsApp Number *</Label>
                      <Input id="whatsapp" value={whatsappNumber} onChange={handleWhatsappChange} type="tel" required className="bg-gray-50 border-gray-200" placeholder="08..." />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dob">Date of Birth *</Label>
                      <Input id="dob" type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} required className="bg-gray-50 border-gray-200" />
                    </div>
                    <div className="space-y-2">
                      <Label>Gender *</Label>
                      <Select value={gender} onValueChange={setGender} required>
                        <SelectTrigger className="bg-gray-50 border-gray-200">
                          <SelectValue placeholder="Select Gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="province">Province *</Label>
                      <Select value={cityProvince} onValueChange={setCityProvince} required>
                        <SelectTrigger className="bg-gray-50 border-gray-200">
                          <SelectValue placeholder="Select Province" />
                        </SelectTrigger>
                        <SelectContent>
                          {provinces.map((province) => (
                            <SelectItem key={province} value={province}>
                              {province}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Address *</Label>
                      <Input id="address" value={residentialAddress} onChange={e => setResidentialAddress(e.target.value.toUpperCase())} required className="bg-gray-50 border-gray-200" />
                    </div>
                  </div>

                  {/* Full width fields for complex sections */}
                  <div className="col-span-1 md:col-span-2 space-y-4 border-t pt-4 mt-2">
                    <h3 className="font-semibold text-gray-900">Experience & Education</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="salary">Expected Salary *</Label>
                        <Input id="salary" value={expectedSalary} onChange={handleSalaryChange} required className="bg-gray-50 border-gray-200" placeholder="Rp 0" />
                      </div>
                      <div className="space-y-2">
                        <Label>Education Level *</Label>
                        <Select value={educationLevel} onValueChange={setEducationLevel} required>
                          <SelectTrigger className="bg-gray-50 border-gray-200"><SelectValue placeholder="Select Level" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sma">SMA/SMK</SelectItem>
                            <SelectItem value="d3">D3</SelectItem>
                            <SelectItem value="s1">S1</SelectItem>
                            <SelectItem value="s2">S2</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Experience Duration *</Label>
                        <Select value={workExperienceDuration} onValueChange={setWorkExperienceDuration} required>
                          <SelectTrigger className="bg-gray-50 border-gray-200"><SelectValue placeholder="Select Duration" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="<1">&lt; 1 Year</SelectItem>
                            <SelectItem value="1-3">1 - 3 Years</SelectItem>
                            <SelectItem value="3-5">3 - 5 Years</SelectItem>
                            <SelectItem value=">5">&gt; 5 Years</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Automotive Experience? *</Label>
                        <Select value={hasAutomotiveExperience} onValueChange={setHasAutomotiveExperience} required>
                          <SelectTrigger className="bg-gray-50 border-gray-200"><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-2 space-y-4 border-t pt-4">
                    <h3 className="font-semibold text-gray-900">Documents</h3>
                    <div className="space-y-2">
                      <Label>CV (PDF, Max 5MB) *</Label>
                      <Input type="file" accept=".pdf" onChange={handleCvChange} required className={`bg-gray-50 border-gray-200 ${cvError ? 'border-red-500' : ''}`} />
                      {cvError && <p className="text-red-500 text-xs">{cvError}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Experience Certificate / Paklaring (PDF, Max 5MB) *</Label>
                      <Input type="file" accept=".pdf" onChange={handlePaklaringChange} required className={`bg-gray-50 border-gray-200 ${paklaringError ? 'border-red-500' : ''}`} />
                      {paklaringError && <p className="text-red-500 text-xs">{paklaringError}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Passport Photo (Image, Max 2MB) *</Label>
                      <Input type="file" accept="image/*" onChange={handlePhotoChange} required className={`bg-gray-50 border-gray-200 ${photoError ? 'border-red-500' : ''}`} />
                      {photoError && <p className="text-red-500 text-xs">{photoError}</p>}
                    </div>
                  </div>

                </div>
              )}

              <div className="space-y-4 pt-2">
                <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
                  {loading ? "Processing..." : isLogin ? "Login" : "Register"}
                </Button>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm font-bold text-primary">
                    {isLogin ? "Don't have an account?" : "Already have an account?"}
                  </span>
                  <Button
                    type="button"
                    variant="default"
                    onClick={() => setIsLogin(!isLogin)}
                    className="bg-primary hover:bg-primary/90 text-white min-w-[100px]"
                  >
                    {isLogin ? "Register" : "Login"}
                  </Button>
                </div>
              </div>
            </form>


          </div>
        </div>
      </div>
      <Footer />

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter your email address and we'll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resetEmail">Email</Label>
              <Input
                id="resetEmail"
                type="email"
                placeholder="Enter your email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForgotPassword(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={resetLoading}>
                {resetLoading ? "Sending..." : "Send Reset Link"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
