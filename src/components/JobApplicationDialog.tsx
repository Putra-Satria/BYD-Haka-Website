import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText } from "lucide-react";
import ReCAPTCHA from "react-google-recaptcha";

interface JobApplicationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    jobId?: string;
    jobPosition: string;
    jobBranch: string;
    jobProvince: string;
}

export default function JobApplicationDialog({
    open,
    onOpenChange,
    jobId,
    jobPosition,
    jobBranch,
    jobProvince
}: JobApplicationDialogProps) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [shirtSize, setShirtSize] = useState("");
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);

    // Check if role requires shirt size (Sales Executive & Sales Supervisor only)
    const isSales = ["Sales Executive", "Sales Supervisor"].some(role =>
        jobPosition.toLowerCase().includes(role.toLowerCase())
    );

    useEffect(() => {
        if (open) {
            checkProfile();
        }
    }, [open]);

    const checkProfile = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            onOpenChange(false);
            navigate("/auth");
            return;
        }

        const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", session.user.id)
            .single();

        setProfile(data);
    };

    const onCaptchaChange = (token: string | null) => {
        setCaptchaToken(token);
    };

    const handleApply = async () => {
        if (!captchaToken) {
            toast.error("Please complete the captcha verification");
            return;
        }

        if (isSales && !shirtSize) {
            toast.error("Please select a shirt size");
            return;
        }

        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session || !profile) {
                toast.error("You must be logged in and have a profile");
                return;
            }

            // Check application limit (max 2 in last 3 months)
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

            const { count: applicationCount, error: countError } = await supabase
                .from('applications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', session.user.id)
                .gte('created_at', threeMonthsAgo.toISOString());

            if (countError) {
                console.error("Error checking limit:", countError);
                throw new Error("Failed to verify application limit");
            }

            if (applicationCount !== null && applicationCount >= 2) {
                toast.error("Application limit reached. You can only submit 2 applications every 3 months.");
                onOpenChange(false);
                return;
            }

            // Validate required profile fields
            const requiredFields = [
                { key: 'info_source', label: 'Information Source' },
                { key: 'education_level', label: 'Last Education' },
                { key: 'residential_address', label: 'Residential Address' },
                { key: 'cv_url', label: 'CV' },
            ];

            const missingFields = requiredFields.filter(field => !profile[field.key]);

            if (missingFields.length > 0) {
                toast.error(`Please complete your profile: ${missingFields.map(f => f.label).join(', ')}`);
                return;
            }

            // Calculate age from date_of_birth
            let age = 0;
            if (profile.date_of_birth) {
                const birthDate = new Date(profile.date_of_birth);
                const today = new Date();
                age = today.getFullYear() - birthDate.getFullYear();
                const m = today.getMonth() - birthDate.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                }
            } else {
                toast.error("Please complete Date of Birth in your profile");
                return;
            }

            // Insert application
            const { error } = await supabase
                .from("applications")
                .insert({
                    user_id: session.user.id,
                    job_id: jobId,
                    position: jobPosition,
                    branch: jobBranch,
                    province: jobProvince,

                    // Fields present in 'applications' table
                    age: age,
                    gender: profile.gender || "Other",
                    residential_address: profile.residential_address,
                    expected_salary: profile.expected_salary || 0,
                    has_automotive_experience: profile.has_automotive_experience || false,
                    work_experience_duration: profile.work_experience_duration || "N/A",
                    education_level: profile.education_level,
                    info_source: profile.info_source,
                    cv_url: profile.cv_url,
                    certificate_url: profile.certificate_url || "",

                    // Additional fields
                    admin_notes: isSales ? `Shirt Size: ${shirtSize}` : null
                } as any);

            if (error) throw error;

            toast.success("Application submitted successfully!");
            navigate("/application-success");
            onOpenChange(false);
        } catch (error: any) {
            console.error(error);
            if (error.message.includes("Application limit reached")) {
                toast.error("Application limit reached. You can only submit 2 applications every 3 months.");
            } else {
                toast.error("Failed to submit application: " + error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <div className="flex flex-col items-center text-center space-y-4 pt-4">
                    <div className="bg-green-50 p-4 rounded-full">
                        <FileText className="w-12 h-12 text-green-500" />
                    </div>

                    <DialogHeader>
                        <DialogTitle className="text-2xl text-center">Confirmation</DialogTitle>
                        <DialogDescription className="text-center">
                            Your profile will be sent along with the application for the position you selected
                        </DialogDescription>
                    </DialogHeader>

                    {/* Job Info */}
                    <div className="w-full bg-gray-50 p-3 rounded-md text-sm text-gray-600">
                        <p><strong>Position:</strong> {jobPosition}</p>
                        <p><strong>Location:</strong> {jobBranch}, {jobProvince}</p>
                    </div>

                    {/* Sales Specific: Shirt Size */}
                    {isSales && (
                        <div className="w-full space-y-2 text-left">
                            <Label>Field Shirt Size <span className="text-red-500">*</span></Label>
                            <Select value={shirtSize} onValueChange={setShirtSize}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Size" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="S">S</SelectItem>
                                    <SelectItem value="M">M</SelectItem>
                                    <SelectItem value="L">L</SelectItem>
                                    <SelectItem value="XL">XL</SelectItem>
                                    <SelectItem value="XXL">XXL</SelectItem>
                                    <SelectItem value="XXXL">XXXL</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Real ReCAPTCHA */}
                    <div className="w-full flex justify-center py-2">
                        <ReCAPTCHA
                            sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                            onChange={onCaptchaChange}
                        />
                    </div>
                </div>

                <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-4">
                    <Button
                        variant="outline"
                        className="w-full border-green-600 text-green-600 hover:bg-green-50"
                        onClick={() => navigate("/profile")}
                    >
                        Check My Profile
                    </Button>
                    <Button
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={handleApply}
                        disabled={loading || !captchaToken || (isSales && !shirtSize)}
                    >
                        {loading ? "Sending..." : "Send Application"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
