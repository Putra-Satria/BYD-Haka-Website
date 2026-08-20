import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { User, FileText, Briefcase, GraduationCap, Users, Heart, Pencil, UserCircle, Shield, Mail, Phone, MapPin, Calendar, Fingerprint, Banknote, Car, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import EducationSection from "@/components/profile/EducationSection";
import ExperienceSection from "@/components/profile/ExperienceSection";
import { buildSecureFilePath, logSecurityAudit, validateSecureUpload, getSignedDocumentUrl } from "@/lib/securityHardening";

interface ProfileData {
    id: string;
    full_name: string | null;
    nik: string;
    whatsapp_number: string | null;
    email?: string;
    date_of_birth: string | null;
    gender: string | null;
    residential_address: string | null;
    city_province: string | null;
    expected_salary: number | null;
    current_salary: number | null;
    has_automotive_experience: boolean | null;
    work_experience_duration: string | null;
    education_level: string | null;
    cv_url: string | null;
    certificate_url: string | null;
    avatar_url: string | null;
    info_source: string | null;
}

export default function ProfilePage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [newPhoto, setNewPhoto] = useState<File | null>(null);
    const [newCv, setNewCv] = useState<File | null>(null);
    const [newPaklaring, setNewPaklaring] = useState<File | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [activeSection, setActiveSection] = useState<string>("biodata");
    const [cacheBuster, setCacheBuster] = useState(Date.now());
    const [stats, setStats] = useState({ applicants: 0, jobs: 0, pending: 0 });
    const [educationCount, setEducationCount] = useState(0);
    const [experienceCount, setExperienceCount] = useState(0);

    // Sidebar menu items (static for visual reference)
    const menuItems = [
        { icon: User, label: "Biodata", active: true },
        { icon: GraduationCap, label: "Education" },
        { icon: Briefcase, label: "Experience & Organization" },
        { icon: Users, label: "Family" },
        { icon: Heart, label: "Experience" },
        { icon: FileText, label: "Others" },
    ];

    useEffect(() => {
        const getProfile = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    navigate("/auth");
                    return;
                }

                // Check Role
                const { data: roleData } = await supabase
                    .from("user_roles")
                    .select("role")
                    .eq("user_id", user.id)
                    .eq("role", "admin")
                    .maybeSingle();

                setIsAdmin(!!roleData);

                if (!!roleData) {
                    // Fetch Admin Stats
                    const { count: applicantCount } = await supabase
                        .from('applications')
                        .select('*', { count: 'exact', head: true });

                    const { count: pendingCount } = await supabase
                        .from('applications')
                        .select('*', { count: 'exact', head: true })
                        .in('status', ['submitted', 'on_review']);

                    const { count: jobCount } = await supabase
                        .from('jobs' as any)
                        .select('*', { count: 'exact', head: true })
                        .eq('is_active', true);

                    setStats({
                        applicants: applicantCount || 0,
                        pending: pendingCount || 0,
                        jobs: jobCount || 0
                    });
                }

                const { data, error } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("user_id", user.id)
                    .single();

                if (error) {
                    console.error("Error fetching profile:", error);
                    // Don't return, try to render with metadata if possible
                }

                const meta = user.user_metadata || {};

                // Cast data to any to bypass strict type check for new column 'avatar_url'
                const profileData = data as any;

                if (profileData) {
                    // If profile exists in DB, use it as source of truth.
                    // Do NOT fallback to meta for these fields to avoid "ghost" data reappearing.
                    setProfile({
                        id: user.id,
                        full_name: profileData.full_name || "",
                        nik: profileData.nik || "",
                        whatsapp_number: profileData.whatsapp_number || "",
                        email: user.email,
                        date_of_birth: profileData.date_of_birth || null,
                        gender: profileData.gender || null,
                        residential_address: profileData.residential_address || null,
                        city_province: profileData.city_province || null,
                        expected_salary: profileData.expected_salary || null,
                        current_salary: profileData.current_salary || null,
                        has_automotive_experience: profileData.has_automotive_experience,
                        work_experience_duration: profileData.work_experience_duration || null,
                        education_level: profileData.education_level || null,
                        cv_url: profileData.cv_url || null,
                        certificate_url: profileData.certificate_url || null,
                        avatar_url: profileData.avatar_url || null,
                        info_source: profileData.info_source || null,
                    });
                } else {
                    // Only use metadata if no profile record exists (first time user)
                    setProfile({
                        id: user.id,
                        full_name: meta.full_name || "",
                        nik: meta.nik || "",
                        whatsapp_number: meta.whatsapp_number || "",
                        email: user.email,
                        date_of_birth: meta.date_of_birth || null,
                        gender: meta.gender || null,
                        residential_address: meta.residential_address || null,
                        city_province: meta.city_province || null,
                        expected_salary: meta.expected_salary || null,
                        current_salary: meta.current_salary || null,
                        has_automotive_experience: meta.has_automotive_experience ?? null,
                        work_experience_duration: meta.work_experience_duration || null,
                        education_level: meta.education_level || null,
                        cv_url: null,
                        certificate_url: null,
                        avatar_url: meta.avatar_url || null,
                        info_source: meta.info_source || null,
                    });
                }

                // Check Education Data
                const { count: eduCount } = await supabase
                    .from('profile_educations' as any)
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id);

                setEducationCount(eduCount || 0);

                // Check Experience Data
                const { count: expCount } = await supabase
                    .from('profile_experiences' as any)
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id);

                setExperienceCount(expCount || 0);

            } catch (error) {
                console.error("Error:", error);
            } finally {
                setLoading(false);
            }
        };

        getProfile();
    }, [navigate]);

    // ... handleUpload ...
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
            description: `Profile document ${folder} uploaded with file validation and UUID filename.`,
        });

        return fileName;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;

        // Validation
        const requiredFields = [
            { key: "full_name", label: "Full Name" },
            { key: "nik", label: "NIK" },
            { key: "whatsapp_number", label: "Phone Number" },
            { key: "date_of_birth", label: "Date of Birth" },
            { key: "gender", label: "Gender" },
            { key: "residential_address", label: "Address" },
            { key: "city_province", label: "City" },
        ];

        for (const field of requiredFields) {
            const val = (profile as any)[field.key];
            if (!val || (typeof val === "string" && val.trim() === "")) {
                toast.error(`${field.label} is required`);
                return;
            }
        }

        setUpdating(true);
        try {
            let avatarUrl = profile.avatar_url;
            let cvUrl = profile.cv_url;
            let certificateUrl = profile.certificate_url;

            if (newPhoto) {
                try {
                    avatarUrl = await uploadFile(profile.id, newPhoto, 'photos', 'avatars');
                } catch (uploadErr: any) {
                    console.error("Photo upload failed", uploadErr);
                    toast.error(`Failed to upload photo: ${uploadErr.message}`);
                    setUpdating(false);
                    return;
                }
            }

            if (newCv) {
                try {
                    cvUrl = await uploadFile(profile.id, newCv, 'cv', 'application-documents');
                } catch (uploadErr: any) {
                    toast.error(`Failed to upload CV: ${uploadErr.message}`);
                    setUpdating(false);
                    return;
                }
            }

            if (newPaklaring) {
                try {
                    certificateUrl = await uploadFile(profile.id, newPaklaring, 'certificate', 'application-documents');
                } catch (uploadErr: any) {
                    toast.error(`Failed to upload Certificate: ${uploadErr.message}`);
                    setUpdating(false);
                    return;
                }
            }

            // Convert empty strings to null for optional fields to keep DB clean
            const sanitize = (val: string | null | undefined) => (!val || val.trim() === "") ? null : val;

            const { error } = await supabase
                .from("profiles")
                .update({
                    full_name: profile.full_name,
                    nik: profile.nik,
                    whatsapp_number: profile.whatsapp_number,
                    date_of_birth: sanitize(profile.date_of_birth),
                    gender: sanitize(profile.gender),
                    residential_address: sanitize(profile.residential_address),
                    city_province: sanitize(profile.city_province),
                    expected_salary: profile.expected_salary || null,
                    current_salary: profile.current_salary || null,
                    has_automotive_experience: profile.has_automotive_experience,
                    work_experience_duration: sanitize(profile.work_experience_duration),
                    education_level: sanitize(profile.education_level),
                    avatar_url: avatarUrl,
                    cv_url: cvUrl,
                    certificate_url: certificateUrl,
                    info_source: sanitize(profile.info_source),
                })
                .eq("user_id", profile.id);

            if (error) {
                if (error.code === "23505") {
                    toast.error("NIK already registered by another user. Please check again.");
                } else {
                    toast.error("Failed to update profile");
                }
                console.error("Update error:", error);
                return;
            }

            // Also update metadata
            await supabase.auth.updateUser({
                data: {
                    avatar_url: avatarUrl,
                    cv_url: cvUrl,
                    certificate_url: certificateUrl
                }
            });

            toast.success("Profile updated successfully");

            // Update local state with sanitized values to reflect DB state
            setProfile(prev => prev ? ({
                ...prev,
                full_name: profile.full_name,
                nik: profile.nik,
                whatsapp_number: profile.whatsapp_number,
                date_of_birth: sanitize(profile.date_of_birth),
                gender: sanitize(profile.gender),
                residential_address: sanitize(profile.residential_address),
                city_province: sanitize(profile.city_province),
                expected_salary: profile.expected_salary || null,
                current_salary: profile.current_salary || null,
                has_automotive_experience: profile.has_automotive_experience,
                work_experience_duration: sanitize(profile.work_experience_duration),
                education_level: sanitize(profile.education_level),
                avatar_url: avatarUrl,
                cv_url: cvUrl,
                certificate_url: certificateUrl,
                info_source: sanitize(profile.info_source),
            }) : null);

            setCacheBuster(Date.now()); // Force refresh images/links
            setNewPhoto(null);
            setNewCv(null);
            setNewPaklaring(null);
            setIsEditing(false);
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error("An unexpected error occurred");
        } finally {
            setUpdating(false);
        }
    };
    // ...

    // HELPER TO GET STORAGE URL
    const getStorageUrl = (path: string | null, bucket: string = 'application-documents') => {
        if (!path) return "";
        return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}?t=${cacheBuster}`;
    };

    const handleViewDocument = async (path: string | null) => {
        if (!path) return;
        try {
            const signedUrl = await getSignedDocumentUrl("application-documents", path, 120);
            window.open(signedUrl, "_blank");
        } catch (error) {
            console.error("Failed to open document:", error);
            toast.error("Failed to open document. You might not have access.");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <TopNav />
                <div className="flex-1 flex items-center justify-center">
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const calculateCompleteness = () => {
        if (!profile) return 0;
        const fields = [
            profile.full_name,
            profile.nik,
            profile.whatsapp_number,
            profile.email,
            profile.date_of_birth,
            profile.gender,
            profile.residential_address,
            profile.city_province,
            profile.expected_salary,
            profile.work_experience_duration,
            profile.education_level,
            profile.avatar_url,
            profile.has_automotive_experience !== null ? "ok" : null,
            profile.cv_url,
            profile.certificate_url,
            profile.info_source,
            educationCount > 0 ? "ok" : null, // Check actual education entries
            experienceCount > 0 ? "ok" : null // Check actual experience entries
        ];

        const isFilled = (val: any) => {
            if (val === null || val === undefined) return false;
            if (typeof val === "string") return val.trim().length > 0;
            if (typeof val === "number") return val > 0; // Salary logic
            if (typeof val === "boolean") return true; // true or false is filled
            return false;
        };

        const filled = fields.filter(isFilled).length;
        // Total fields = 18. strict calculation.
        return Math.min(100, Math.round((filled / 18) * 100));
    };

    const completeness = calculateCompleteness();

    // COMPLETENESS CHECKERS
    const isBiodataComplete = () => {
        if (!profile) return false;
        // Required fields
        return !!(
            profile.full_name &&
            profile.nik &&
            profile.whatsapp_number &&
            profile.date_of_birth &&
            profile.gender &&
            profile.residential_address &&
            profile.city_province
        );
    };

    const isEducationComplete = () => educationCount > 0;
    const isExperienceComplete = () => experienceCount > 0;

    const SidebarItem = ({ id, label, icon: Icon, active, alert }: any) => (
        <button
            onClick={() => setActiveSection(id)}
            className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors border-l-4 ${active
                ? "bg-green-50 text-green-700 border-green-600"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-transparent"
                }`}
        >
            <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${active ? "text-green-600" : "text-gray-400"}`} />
                {label}
            </div>
            {alert && (
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            )}
        </button>
    );

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <TopNav />
            <div className="container mx-auto px-4 py-8 flex-1 flex flex-col lg:flex-row gap-8">

                {/* SIDEBAR */}
                <div className="w-full lg:w-64 shrink-0 space-y-6">
                    {/* Completion Status Card - HIDE FOR ADMIN */}
                    {!isAdmin && (
                        <Card>
                            <CardContent className="p-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="font-semibold">Data Completeness</span>
                                    <span className={`font-bold ${completeness >= 100 ? "text-green-600" : "text-orange-500"}`}>
                                        {completeness >= 100 ? "Complete" : `${completeness}%`}
                                    </span>
                                </div>
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ${completeness >= 100 ? "bg-green-600" : "bg-orange-500"}`}
                                        style={{ width: `${completeness}%` }}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    {completeness >= 100
                                        ? "Your profile is complete. Please apply for jobs now!"
                                        : "Please complete your profile to improve your chances."}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Navigation Menu */}
                    <Card className="overflow-hidden">
                        <div className="flex flex-col py-2">
                            {isAdmin ? (
                                <SidebarItem id="biodata" label="Admin Info" icon={UserCircle} active={true} />
                            ) : (
                                <>
                                    <SidebarItem
                                        id="biodata"
                                        label="Personal Info"
                                        icon={User}
                                        active={activeSection === "biodata"}
                                        alert={!isBiodataComplete()}
                                    />
                                    <SidebarItem
                                        id="education"
                                        label="Education"
                                        icon={GraduationCap}
                                        active={activeSection === "education"}
                                        alert={!isEducationComplete()}
                                    />
                                    <SidebarItem
                                        id="experience"
                                        label="Experience"
                                        icon={Briefcase}
                                        active={activeSection === "experience"}
                                        alert={!isExperienceComplete()}
                                    />
                                </>
                            )}
                        </div>
                    </Card>

                    {/* Help Center - NEW FILLER */}
                    {!isAdmin && (
                        <>
                            <Card>
                                <CardContent className="p-4 space-y-4">
                                    <h3 className="font-semibold text-sm flex items-center gap-2 text-gray-700">
                                        <Info className="w-4 h-4 text-blue-500" />
                                        Help Center
                                    </h3>
                                    <div className="text-sm text-gray-600 space-y-2">
                                        <p className="text-xs">Having trouble applying?</p>
                                        <div className="flex items-center gap-2 text-xs font-medium text-gray-900 bg-gray-50 p-2 rounded border border-gray-100">
                                            <Mail className="w-3 h-3 text-gray-500" />
                                            recruitment@hakaauto.com
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-4">
                                    <h3 className="font-semibold text-sm mb-4 text-gray-700">Recruitment Process</h3>
                                    <div className="space-y-4">
                                        {[
                                            { step: "1", label: "Administrative Selection" },
                                            { step: "2", label: "HR & User Interview" },
                                            { step: "3", label: "Psychotest/Assessment & Skill Test" },
                                            { step: "4", label: "Background Check" },
                                            { step: "5", label: "Offering & Onboarding" }
                                        ].map((item, index) => (
                                            <div key={item.step} className="flex items-start gap-3">
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold shrink-0">
                                                        {item.step}
                                                    </div>
                                                    {index < 4 && <div className="w-px h-4 bg-gray-200"></div>}
                                                </div>
                                                <span className="text-xs text-gray-600 font-medium pt-1">{item.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>

                {/* MAIN CONTENT AREA */}
                <div className="flex-1 min-w-0">
                    {/* ADMIN VIEW */}
                    {isAdmin ? (
                        <div className="bg-white rounded-lg shadow h-fit">
                            <div className="p-6 border-b">
                                <h1 className="text-2xl font-bold flex items-center gap-2">
                                    Admin Profile
                                </h1>
                            </div>
                            <div className="p-8">
                                <div className="flex flex-col md:flex-row items-center gap-8 mb-10">
                                    <Avatar className="w-32 h-32 border-4 border-gray-100 shadow-xl">
                                        <AvatarImage src={profile?.avatar_url ? getStorageUrl(profile.avatar_url, 'avatars') : ""} />
                                        <AvatarFallback className="text-4xl bg-primary text-white">
                                            {profile?.full_name?.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="space-y-4 text-center md:text-left flex-1">
                                        <div>
                                            <h2 className="text-3xl font-bold text-gray-900">{profile?.full_name}</h2>
                                            <p className="text-gray-500 font-medium">{profile?.email}</p>
                                        </div>
                                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-semibold border border-green-200">
                                            <Shield className="w-4 h-4" />
                                            Administrator Access
                                        </div>
                                    </div>
                                </div>

                                {/* Admin Stats Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                                    <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100 hover:shadow-md transition-all">
                                        <CardContent className="p-6 flex items-center gap-4">
                                            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                                                <Users className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500 font-medium">Total Applicants</p>
                                                <h3 className="text-2xl font-bold text-gray-900">{stats.applicants}</h3>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100 hover:shadow-md transition-all">
                                        <CardContent className="p-6 flex items-center gap-4">
                                            <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                                                <FileText className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500 font-medium">Pending Review</p>
                                                <h3 className="text-2xl font-bold text-gray-900">{stats.pending}</h3>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100 hover:shadow-md transition-all">
                                        <CardContent className="p-6 flex items-center gap-4">
                                            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                                                <Briefcase className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500 font-medium">Active Jobs</p>
                                                <h3 className="text-2xl font-bold text-gray-900">{stats.jobs}</h3>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Button
                                        onClick={() => navigate("/admin")}
                                        className="h-auto p-4 flex items-center justify-start gap-3 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-primary/30 hover:text-primary shadow-sm"
                                    >
                                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                            <Users className="w-5 h-5" />
                                        </div>
                                        <div className="text-left">
                                            <span className="block font-semibold">Manage Applications</span>
                                            <span className="text-xs text-gray-500 font-normal">Review and process candidates</span>
                                        </div>
                                    </Button>

                                    <Button
                                        onClick={() => navigate("/admin?tab=jobs")}
                                        className="h-auto p-4 flex items-center justify-start gap-3 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-primary/30 hover:text-primary shadow-sm"
                                    >
                                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                            <Briefcase className="w-5 h-5" />
                                        </div>
                                        <div className="text-left">
                                            <span className="block font-semibold">Post New Job</span>
                                            <span className="text-xs text-gray-500 font-normal">Create a new vacancy</span>
                                        </div>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* USER VIEW - Existing Logic */
                        <>
                            {activeSection === "biodata" && (
                                <div className="bg-white rounded-lg shadow">
                                    <div className="p-6 border-b flex justify-between items-center">
                                        <h1 className="text-2xl font-bold flex items-center gap-2">
                                            {isEditing ? "Edit Personal Info" : "Personal Info"}
                                            {isEditing && <span className="text-red-500">*</span>}
                                        </h1>

                                        {!isEditing && (
                                            <Button variant="ghost" className="text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => setIsEditing(true)}>
                                                <Pencil className="w-4 h-4 mr-2" />
                                                Edit Data
                                            </Button>
                                        )}
                                    </div>

                                    <div className="p-6">
                                        {isEditing ? (
                                            /* ================= EDIT FORM ================= */
                                            <form onSubmit={handleSubmit} className="space-y-6">
                                                <div className="space-y-2">
                                                    <Label>Passport Photo *</Label>
                                                    <div className="flex items-center gap-4">
                                                        <Avatar className="w-16 h-16">
                                                            <AvatarImage src={profile?.avatar_url ? getStorageUrl(profile.avatar_url, 'avatars') : ""} />
                                                            <AvatarFallback>{profile?.full_name?.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <Input type="file" accept="image/*" onChange={(e) => setNewPhoto(e.target.files?.[0] || null)} className="max-w-xs" />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="fullName">Full Name *</Label>
                                                        <Input id="fullName" value={profile?.full_name || ""} onChange={(e) => setProfile(prev => prev ? ({ ...prev, full_name: e.target.value.toUpperCase() }) : null)} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="email">Email *</Label>
                                                        <Input id="email" value={profile?.email || ""} disabled className="bg-slate-100" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="nik">NIK *</Label>
                                                        <Input id="nik" value={profile?.nik || ""} onChange={(e) => setProfile(prev => prev ? ({ ...prev, nik: e.target.value.replace(/[^0-9]/g, "") }) : null)} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="dob">Date of Birth *</Label>
                                                        <Input id="dob" type="date" value={profile?.date_of_birth || ""} onChange={(e) => setProfile(prev => prev ? ({ ...prev, date_of_birth: e.target.value }) : null)} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Gender *</Label>
                                                        <div className="flex gap-4 pt-2">
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input type="radio" name="gender" value="male" checked={profile?.gender === "male"} onChange={() => setProfile(prev => prev ? ({ ...prev, gender: "male" }) : null)} className="accent-green-600" />
                                                                <span>Male</span>
                                                            </label>
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input type="radio" name="gender" value="female" checked={profile?.gender === "female"} onChange={() => setProfile(prev => prev ? ({ ...prev, gender: "female" }) : null)} className="accent-green-600" />
                                                                <span>Female</span>
                                                            </label>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="whatsapp">Phone Number *</Label>
                                                        <Input id="whatsapp" value={profile?.whatsapp_number || ""} onChange={(e) => setProfile(prev => prev ? ({ ...prev, whatsapp_number: e.target.value.replace(/[^0-9]/g, "") }) : null)} />
                                                    </div>
                                                    <div className="space-y-2 md:col-span-2">
                                                        <Label htmlFor="address">Domicile Address *</Label>
                                                        <Input id="address" value={profile?.residential_address || ""} onChange={(e) => setProfile(prev => prev ? ({ ...prev, residential_address: e.target.value.toUpperCase() }) : null)} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="city">City *</Label>
                                                        <Input id="city" value={profile?.city_province || ""} onChange={(e) => setProfile(prev => prev ? ({ ...prev, city_province: e.target.value.toUpperCase() }) : null)} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="current_salary">Current/Last Salary (IDR)</Label>
                                                        <Input id="current_salary" type="number" value={profile?.current_salary || ""} onChange={(e) => setProfile(prev => prev ? ({ ...prev, current_salary: parseFloat(e.target.value) || 0 }) : null)} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="salary">Expected Salary (IDR)</Label>
                                                        <Input id="salary" type="number" value={profile?.expected_salary || ""} onChange={(e) => setProfile(prev => prev ? ({ ...prev, expected_salary: parseFloat(e.target.value) || 0 }) : null)} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Automotive Experience?</Label>
                                                        <Select
                                                            value={profile?.has_automotive_experience === true ? "yes" : profile?.has_automotive_experience === false ? "no" : ""}
                                                            onValueChange={(val) => setProfile(prev => prev ? ({ ...prev, has_automotive_experience: val === "yes" }) : null)}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="yes">Yes</SelectItem>
                                                                <SelectItem value="no">No</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Duration</Label>
                                                        <Select value={profile?.work_experience_duration || ""} onValueChange={(val) => setProfile(prev => prev ? ({ ...prev, work_experience_duration: val }) : null)}>
                                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="<1 year/fresh graduate">&lt;1 Year / Fresh Graduate</SelectItem>
                                                                <SelectItem value="1-3 years">1-3 Years</SelectItem>
                                                                <SelectItem value="3-5 years">3-5 Years</SelectItem>
                                                                <SelectItem value=">5 years">&gt;5 Years</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label>Information Source</Label>
                                                        <Select value={profile?.info_source || ""} onValueChange={(val) => setProfile(prev => prev ? ({ ...prev, info_source: val }) : null)}>
                                                            <SelectTrigger><SelectValue placeholder="Select information source" /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="linkedin">LinkedIn</SelectItem>
                                                                <SelectItem value="instagram">Instagram</SelectItem>
                                                                <SelectItem value="tiktok">TikTok</SelectItem>
                                                                <SelectItem value="website">Career Website</SelectItem>
                                                                <SelectItem value="referral">Friend/Employee Referral</SelectItem>
                                                                <SelectItem value="other">Other</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label>Update CV (PDF, Max 5MB)</Label>
                                                        <Input type="file" accept=".pdf" onChange={(e) => setNewCv(e.target.files?.[0] || null)} />
                                                        {profile?.cv_url && (
                                                            <p className="text-xs text-green-600">Current CV: Uploaded</p>
                                                        )}
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label>Update Certificate / Diploma (PDF, Max 5MB)</Label>
                                                        <Input type="file" accept=".pdf" onChange={(e) => setNewPaklaring(e.target.files?.[0] || null)} />
                                                        <p className="text-xs text-muted-foreground">
                                                            *For fresh graduates and first-time job seekers, please attach Diploma / SKL
                                                        </p>
                                                        {profile?.certificate_url && (
                                                            <p className="text-xs text-green-600">Current Certificate: Uploaded</p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex gap-4 pt-4 border-t">
                                                    <Button type="submit" disabled={updating} className="bg-green-600 hover:bg-green-700">
                                                        {updating ? "Saving..." : "Save Changes"}
                                                    </Button>
                                                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)} disabled={updating}>
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </form>
                                        ) : (
                                            /* ================= VIEW MODE ================= */
                                            <div className="space-y-8">
                                                {/* Profile Hero Card */}
                                                <div className="bg-gradient-to-r from-emerald-600 to-green-500 rounded-lg p-6 text-white flex flex-col md:flex-row items-center gap-6 shadow-md">
                                                    <Avatar className="w-32 h-32 border-4 border-white shadow-lg">
                                                        <AvatarImage src={profile?.avatar_url ? getStorageUrl(profile.avatar_url, 'avatars') : ""} />
                                                        <AvatarFallback className="text-3xl font-bold text-green-700 bg-white">
                                                            {profile?.full_name?.charAt(0).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="text-center md:text-left space-y-2">
                                                        <h2 className="text-3xl font-bold">{profile?.full_name}</h2>
                                                        <p className="opacity-90 mt-1 uppercase tracking-wide font-semibold">{profile?.education_level} Graduate</p>
                                                    </div>
                                                </div>

                                                {/* Details Grid */}
                                                <div className="grid grid-cols-1 gap-6">

                                                    {/* Section: Contact & Personal */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Contact Information</h3>
                                                            <div className="space-y-4">
                                                                <div className="flex items-start gap-3">
                                                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-green-600 shadow-sm shrink-0">
                                                                        <Mail className="w-4 h-4" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs text-gray-500">Email Address</p>
                                                                        <p className="font-medium text-gray-900 break-all">{profile?.email}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-start gap-3">
                                                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-green-600 shadow-sm shrink-0">
                                                                        <Phone className="w-4 h-4" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs text-gray-500">Phone / WhatsApp</p>
                                                                        <p className="font-medium text-gray-900">{profile?.whatsapp_number}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-start gap-3">
                                                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-green-600 shadow-sm shrink-0">
                                                                        <MapPin className="w-4 h-4" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs text-gray-500">Domicile Address</p>
                                                                        <p className="font-medium text-gray-900">{profile?.residential_address}</p>
                                                                        <p className="text-sm text-gray-600">{profile?.city_province}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Personal Details</h3>
                                                            <div className="space-y-4">
                                                                <div className="flex items-start gap-3">
                                                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-green-600 shadow-sm shrink-0">
                                                                        <User className="w-4 h-4" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs text-gray-500">Gender</p>
                                                                        <p className="font-medium text-gray-900 capitalize">{profile?.gender || "-"}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-start gap-3">
                                                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-green-600 shadow-sm shrink-0">
                                                                        <Calendar className="w-4 h-4" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs text-gray-500">Date of Birth</p>
                                                                        <p className="font-medium text-gray-900">{formatDate(profile?.date_of_birth)}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-start gap-3">
                                                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-green-600 shadow-sm shrink-0">
                                                                        <Fingerprint className="w-4 h-4" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs text-gray-500">NIK (KTP)</p>
                                                                        <p className="font-medium text-gray-900">{profile?.nik}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Section: Professional */}
                                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Professional Summary</h3>
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                            <div className="flex items-center gap-3">
                                                                <Briefcase className="w-5 h-5 text-gray-400" />
                                                                <div>
                                                                    <p className="text-xs text-gray-500">Experience Duration</p>
                                                                    <p className="font-semibold text-gray-900">{profile?.work_experience_duration || "-"} Years</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <Car className="w-5 h-5 text-gray-400" />
                                                                <div>
                                                                    <p className="text-xs text-gray-500">Automotive Exp.</p>
                                                                    <p className="font-semibold text-gray-900">{profile?.has_automotive_experience ? "Yes" : "No"}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <Banknote className="w-5 h-5 text-gray-400" />
                                                                <div>
                                                                    <p className="text-xs text-gray-500">Expected Salary</p>
                                                                    <p className="font-semibold text-gray-900">IDR {profile?.expected_salary?.toLocaleString('id-ID') || "0"}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Section: Documents */}
                                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Documents</h3>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {/* Resume Card */}
                                                            <div className="bg-white p-3 rounded border border-gray-200 flex items-center gap-3">
                                                                <div className="bg-red-50 p-2 rounded text-red-500">
                                                                    <FileText className="w-5 h-5" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium text-gray-900">Curriculum Vitae</p>
                                                                    {profile?.cv_url ? (
                                                                        <button
                                                                            onClick={() => handleViewDocument(profile.cv_url)}
                                                                            className="text-xs text-green-600 hover:underline block truncate text-left"
                                                                        >
                                                                            View PDF
                                                                        </button>
                                                                    ) : (
                                                                        <p className="text-xs text-red-400 italic">Not Uploaded</p>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Certificate Card */}
                                                            <div className="bg-white p-3 rounded border border-gray-200 flex items-center gap-3">
                                                                <div className="bg-blue-50 p-2 rounded text-blue-500">
                                                                    <FileText className="w-5 h-5" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium text-gray-900">Certificate / Diploma</p>
                                                                    {profile?.certificate_url ? (
                                                                        <button
                                                                            onClick={() => handleViewDocument(profile.certificate_url)}
                                                                            className="text-xs text-green-600 hover:underline block truncate text-left"
                                                                        >
                                                                            View PDF
                                                                        </button>
                                                                    ) : (
                                                                        <p className="text-xs text-red-400 italic">Not Uploaded</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeSection === "education" && profile && (
                                <EducationSection userId={profile.id} />
                            )}

                            {activeSection === "experience" && profile && (
                                <ExperienceSection userId={profile.id} />
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

