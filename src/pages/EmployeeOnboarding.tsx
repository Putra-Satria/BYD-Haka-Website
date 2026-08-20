import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { getSignedDocumentUrl, maskNik, resolveFileUrl } from "@/lib/securityHardening";
import TopNav from "@/components/TopNav"; // Fixed import path
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";

export default function EmployeeOnboarding() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm();

    // Register select fields manually for validation
    useEffect(() => {
        register("blood_type", { required: true });
        register("marital_status", { required: true });
        register("has_sim_a", { required: true });
        register("bpjs_cair_status", { required: true });
        register("emergency_contact_relation", { required: true });
    }, [register]);

    // File states
    const [files, setFiles] = useState<{ [key: string]: File | null }>({
        ktp: null,
        kk: null,
        npwp: null,
        bank: null,
        ijazah: null,
        offering: null
    });

    const [existingFiles, setExistingFiles] = useState<{ [key: string]: string | null }>({
        ktp: null,
        kk: null,
        npwp: null,
        bank: null,
        ijazah: null,
        offering: null
    });

    const [profile, setProfile] = useState<any>(null);
    const bankSelection = watch("bank_selection");

    const TOP_BANKS = [
        "Bank Mandiri",
        "Bank Rakyat Indonesia (BRI)",
        "Bank Central Asia (BCA)",
        "Bank Negara Indonesia (BNI)",
        "Bank Tabungan Negara (BTN)",
        "Bank CIMB Niaga",
        "Bank Syariah Indonesia (BSI)",
        "Bank Danamon",
        "Bank Permata",
        "Bank OCBC NISP"
    ];

    useEffect(() => {
        checkEligibility();
    }, []);

    const checkEligibility = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            navigate("/auth");
            return;
        }

        setUserId(session.user.id);

        // Fetch Profile Data
        const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", session.user.id)
            .single();

        setProfile({
            ...profileData,
            email: session.user.email
        });

        // Check application status
        const { data: appData } = await supabase
            .from("applications")
            .select("status")
            .eq("user_id", session.user.id)
            .in("status", ["offering", "onboarding", "accepted"])
            .maybeSingle();

        if (!appData) {
            toast.error("You are not eligible for this page.");
            navigate("/dashboard");
            return;
        }

        // Check if data already exists in EMPLOYEES table
        const { data: rawData } = await supabase
            .from("employees" as any)
            .select("*")
            .eq("user_id", session.user.id)
            .maybeSingle();

        const existingData = rawData as any;

        if (existingData) {
            Object.keys(existingData).forEach(key => {
                setValue(key, existingData[key]);
            });

            // Set existing file URLs using resolveFileUrl to ensure full HTTPS URL
            setExistingFiles({
                ktp: resolveFileUrl(existingData.ktp_url, 'documents'),
                kk: resolveFileUrl(existingData.kk_url, 'documents'),
                npwp: resolveFileUrl(existingData.npwp_url, 'documents'),
                bank: resolveFileUrl(existingData.cover_buku_rekening_url, 'documents'),
                ijazah: resolveFileUrl(existingData.ijazah_url, 'documents'),
                offering: resolveFileUrl(existingData.offering_letter_url, 'documents')
            });
        }

        setLoading(false);
    };

    const handleViewDocument = async (path: string | null, bucket: string = 'documents') => {
        if (!path) return;
        try {
            const url = await getSignedDocumentUrl(bucket, path, 300);
            window.open(url, '_blank');
        } catch (error) {
            console.error("Error opening document:", error);
            toast.error("Could not open file");
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
        if (e.target.files && e.target.files[0]) {
            setFiles(prev => ({ ...prev, [key]: e.target.files![0] }));
        }
    };

    const uploadFile = async (file: File, path: string) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${path}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        return resolveFileUrl(fileName, 'documents');
    };

    const onSubmit = async (data: any) => {
        setSubmitting(true);
        try {
            // 1. Upload Files
            const fileUrls: any = {};

            const uploadPromises = Object.entries(files).map(async ([key, file]) => {
                if (file) {
                    const url = await uploadFile(file, key);
                    // Map key to DB column
                    if (key === 'bank') fileUrls['cover_buku_rekening_url'] = url;
                    else if (key === 'offering') fileUrls['offering_letter_url'] = url;
                    else fileUrls[`${key}_url`] = url;
                }
            });

            await Promise.all(uploadPromises);

            // Determine final bank name
            const finalBankName = data.bank_selection === "Other" ? data.bank_name_manual : data.bank_selection;

            // 2. Insert/Update Data
            const payload = {
                user_id: userId,
                // explicit merge from profile for hidden fields
                whatsapp_number: profile?.whatsapp_number,
                email: profile?.email,
                ktp_number: profile?.nik,
                ktp_address: profile?.residential_address,
                birth_date: profile?.date_of_birth,

                // Form data
                ...data,
                bank_name: finalBankName,
                ...fileUrls,
                children_count: parseInt(data.children_count) || 0,
                updated_at: new Date().toISOString()
            };

            // Cleanup
            delete payload.bank_selection;
            delete payload.bank_name_manual;

            const { error } = await supabase
                .from("employees" as any)
                .upsert(payload);

            if (error) throw error;

            toast.success("Data saved successfully!");
            // Refresh data to show updates
            checkEligibility();

        } catch (error: any) {
            console.error("Submission error:", error);
            toast.error(error.message || "Failed to submit data");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="min-h-screen bg-gray-50/50">
            <TopNav />

            <main className="container max-w-4xl mx-auto py-8 px-4">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">New Employee Onboarding Form</h1>
                    <p className="text-gray-500 mt-2">Please complete the following form for onboarding process.</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

                    {/* PERSONAL DATA */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl text-primary">PERSONAL DATA</CardTitle>
                            <p className="text-sm text-gray-500">
                                Some data has been populated from your Applicant Profile.
                            </p>
                        </CardHeader>
                        <CardContent className="grid gap-6">
                            {/* Read Only / Hidden Fields Summary */}
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800 grid md:grid-cols-2 gap-4">
                                <div>
                                    <span className="font-semibold block">Full Name:</span>
                                    {profile?.full_name}
                                </div>
                                <div>
                                    <span className="font-semibold block">Email:</span>
                                    {profile?.email}
                                </div>
                                <div>
                                    <span className="font-semibold block">KTP No:</span>
                                    {maskNik(profile?.nik)}
                                </div>
                                <div>
                                    <span className="font-semibold block">WhatsApp No:</span>
                                    {profile?.whatsapp_number}
                                </div>
                                <div>
                                    <span className="font-semibold block">Date of Birth:</span>
                                    {profile?.date_of_birth}
                                </div>
                                <div className="md:col-span-2">
                                    <span className="font-semibold block">KTP Address:</span>
                                    {profile?.residential_address}
                                </div>
                            </div>

                            <Separator />

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>FAMILY CARD NUMBER (KK) *</Label>
                                    <Input {...register("kk_number", { required: true })} className="uppercase" onInput={(e) => (e.target as HTMLInputElement).value = (e.target as HTMLInputElement).value.replace(/[^0-9]/g, '')} />
                                </div>
                                <div className="space-y-2">
                                    <Label>NPWP NUMBER *</Label>
                                    <Input {...register("npwp_number", { required: true })} className="uppercase" onInput={(e) => (e.target as HTMLInputElement).value = (e.target as HTMLInputElement).value.replace(/[^0-9]/g, '')} />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label>DOMICILE ADDRESS *</Label>
                                    <Input {...register("domicile_address", { required: true })} className="uppercase" onInput={(e) => (e.target as HTMLInputElement).value = (e.target as HTMLInputElement).value.toUpperCase()} />
                                </div>
                                <div className="space-y-2">
                                    <Label>PLACE OF BIRTH *</Label>
                                    <Input {...register("birth_place", { required: true })} className="uppercase" onInput={(e) => (e.target as HTMLInputElement).value = (e.target as HTMLInputElement).value.toUpperCase()} />
                                </div>
                                <div className="space-y-2">
                                    <Label>RELIGION *</Label>
                                    <Input {...register("religion", { required: true })} className="uppercase" onInput={(e) => (e.target as HTMLInputElement).value = (e.target as HTMLInputElement).value.toUpperCase()} />
                                </div>
                                <div className="space-y-2">
                                    <Label>BLOOD TYPE *</Label>
                                    <Select onValueChange={v => setValue("blood_type", v)} value={watch("blood_type") || ""}>
                                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="A">A</SelectItem>
                                            <SelectItem value="B">B</SelectItem>
                                            <SelectItem value="AB">AB</SelectItem>
                                            <SelectItem value="O">O</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>MARITAL STATUS *</Label>
                                    <Select onValueChange={v => setValue("marital_status", v)} value={watch("marital_status") || ""}>
                                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="SINGLE">SINGLE</SelectItem>
                                            <SelectItem value="MARRIED">MARRIED</SelectItem>
                                            <SelectItem value="DIVORCED">DIVORCED</SelectItem>
                                            <SelectItem value="WIDOWED">WIDOWED</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>NUMBER OF CHILDREN</Label>
                                    <Input {...register("children_count")} type="number" defaultValue={0} />
                                </div>
                                <div className="space-y-2">
                                    <Label>DRIVER'S LICENSE (SIM A) *</Label>
                                    <Select onValueChange={v => setValue("has_sim_a", v)} value={watch("has_sim_a") || ""}>
                                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="YES">YES</SelectItem>
                                            <SelectItem value="NO">NO</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label>ARE YOU CURRENTLY IN PROCESS OF WITHDRAWING BPJS KETENAGAKERJAAN? *</Label>
                                    <Select onValueChange={v => setValue("bpjs_cair_status", v)} value={watch("bpjs_cair_status") || ""}>
                                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Yes">Yes</SelectItem>
                                            <SelectItem value="No">No</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="md:col-span-2 pt-4">
                                    <Separator className="mb-4" />
                                    <h3 className="font-semibold mb-4">Bank Account Details (Payroll)</h3>
                                </div>

                                <div className="space-y-2">
                                    <Label>BANK NAME *</Label>
                                    <Select
                                        onValueChange={v => setValue("bank_selection", v)}
                                        value={watch("bank_selection") || "Bank Mandiri"}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Bank" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TOP_BANKS.map((bank) => (
                                                <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                                            ))}
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {bankSelection === "Other" && (
                                    <div className="space-y-2 animate-fade-in">
                                        <Label>ENTER BANK NAME *</Label>
                                        <Input {...register("bank_name_manual", { required: true })} placeholder="Enter bank name..." className="uppercase" onInput={(e) => (e.target as HTMLInputElement).value = (e.target as HTMLInputElement).value.toUpperCase()} />
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label>BANK ACCOUNT NUMBER *</Label>
                                    <Input {...register("bank_account_number", { required: true })} className="uppercase" onInput={(e) => (e.target as HTMLInputElement).value = (e.target as HTMLInputElement).value.replace(/[^0-9]/g, '')} />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label>ACCOUNT HOLDER NAME *</Label>
                                    <Input {...register("bank_account_holder", { required: true })} className="uppercase" onInput={(e) => (e.target as HTMLInputElement).value = (e.target as HTMLInputElement).value.toUpperCase()} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* FAMILY DETAILS */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl text-primary">FAMILY DETAILS</CardTitle>
                            <p className="text-sm text-gray-500">In this section, please fill in your family information.</p>
                        </CardHeader>
                        <CardContent className="grid gap-6">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>EMERGENCY CONTACT FULL NAME *</Label>
                                    <Input {...register("emergency_contact_name", { required: true })} className="uppercase" onInput={(e) => (e.target as HTMLInputElement).value = (e.target as HTMLInputElement).value.toUpperCase()} />
                                </div>
                                <div className="space-y-2">
                                    <Label>EMERGENCY CONTACT RELATIONSHIP *</Label>
                                    <Select onValueChange={v => setValue("emergency_contact_relation", v)} value={watch("emergency_contact_relation") || ""}>
                                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="HUSBAND">HUSBAND</SelectItem>
                                            <SelectItem value="WIFE">WIFE</SelectItem>
                                            <SelectItem value="CHILD">CHILD</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>EMERGENCY CONTACT PHONE NUMBER *</Label>
                                    <Input {...register("emergency_contact_phone", { required: true })} className="uppercase" onInput={(e) => (e.target as HTMLInputElement).value = (e.target as HTMLInputElement).value.replace(/[^0-9]/g, '')} />
                                </div>
                                <div className="space-y-2">
                                    {/* Empty Spacer */}
                                </div>
                                <div className="space-y-2">
                                    <Label>FATHER'S NAME *</Label>
                                    <Input {...register("father_name", { required: true })} className="uppercase" onInput={(e) => (e.target as HTMLInputElement).value = (e.target as HTMLInputElement).value.toUpperCase()} />
                                </div>
                                <div className="space-y-2">
                                    <Label>MOTHER'S NAME *</Label>
                                    <Input {...register("mother_name", { required: true })} className="uppercase" onInput={(e) => (e.target as HTMLInputElement).value = (e.target as HTMLInputElement).value.toUpperCase()} />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label>MEDICAL HISTORY *</Label>
                                    <Input {...register("medical_history", { required: true })} placeholder="Enter '-' if none" className="uppercase" onInput={(e) => (e.target as HTMLInputElement).value = (e.target as HTMLInputElement).value.toUpperCase()} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* DOCUMENT UPLOADS */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl text-primary">DOCUMENT UPLOADS</CardTitle>
                            <p className="text-sm text-gray-500">In this section, please upload the required documents.</p>
                        </CardHeader>
                        <CardContent className="grid gap-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>NPWP Card Photo *</Label>
                                    <p className="text-xs text-muted-foreground">DJP ONLINE HOME PAGE SCREENSHOT REQUIRED</p>
                                    <div className="border-2 border-dashed rounded-lg p-6 hover:bg-gray-50 transition-colors cursor-pointer text-center">
                                        <Input type="file" className="hidden" id="npwp-upload" onChange={(e) => handleFileChange(e, 'npwp')} accept="image/*,.pdf" />
                                        <Label htmlFor="npwp-upload" className="cursor-pointer flex flex-col items-center">
                                            <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                            <span className="text-sm font-medium text-gray-900">
                                                {files.npwp ? files.npwp.name : (existingFiles.npwp ? "Change File (Already Uploaded)" : "Click to upload")}
                                            </span>
                                        </Label>
                                    </div>
                                    {existingFiles.npwp && (
                                        <button type="button" onClick={() => handleViewDocument(existingFiles.npwp, 'documents')} className="text-xs text-blue-600 hover:underline mt-1 block text-left">
                                            View Current File
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label>KTP Photo *</Label>
                                    <div className="border-2 border-dashed rounded-lg p-6 hover:bg-gray-50 transition-colors cursor-pointer text-center">
                                        <Input type="file" className="hidden" id="ktp-upload" onChange={(e) => handleFileChange(e, 'ktp')} accept="image/*,.pdf" />
                                        <Label htmlFor="ktp-upload" className="cursor-pointer flex flex-col items-center">
                                            <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                            <span className="text-sm font-medium text-gray-900">
                                                {files.ktp ? files.ktp.name : (existingFiles.ktp ? "Change File (Already Uploaded)" : "Click to upload")}
                                            </span>
                                        </Label>
                                    </div>
                                    {existingFiles.ktp && (
                                        <button type="button" onClick={() => handleViewDocument(existingFiles.ktp, 'documents')} className="text-xs text-blue-600 hover:underline mt-1 block text-left">
                                            View Current File
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label>Family Card (KK) Photo *</Label>
                                    <div className="border-2 border-dashed rounded-lg p-6 hover:bg-gray-50 transition-colors cursor-pointer text-center">
                                        <Input type="file" className="hidden" id="kk-upload" onChange={(e) => handleFileChange(e, 'kk')} accept="image/*,.pdf" />
                                        <Label htmlFor="kk-upload" className="cursor-pointer flex flex-col items-center">
                                            <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                            <span className="text-sm font-medium text-gray-900">
                                                {files.kk ? files.kk.name : (existingFiles.kk ? "Change File (Already Uploaded)" : "Click to upload")}
                                            </span>
                                        </Label>
                                    </div>
                                    {existingFiles.kk && (
                                        <button type="button" onClick={() => handleViewDocument(existingFiles.kk, 'documents')} className="text-xs text-blue-600 hover:underline mt-1 block text-left">
                                            View Current File
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label>Bank Account Cover Photo *</Label>
                                    <p className="text-xs text-muted-foreground">Or Mobile Banking Screenshot (Must display Account No & Name)</p>
                                    <div className="border-2 border-dashed rounded-lg p-6 hover:bg-gray-50 transition-colors cursor-pointer text-center">
                                        <Input type="file" className="hidden" id="bank-upload" onChange={(e) => handleFileChange(e, 'bank')} accept="image/*,.pdf" />
                                        <Label htmlFor="bank-upload" className="cursor-pointer flex flex-col items-center">
                                            <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                            <span className="text-sm font-medium text-gray-900">
                                                {files.bank ? files.bank.name : (existingFiles.bank ? "Change File (Already Uploaded)" : "Click to upload")}
                                            </span>
                                        </Label>
                                    </div>
                                    {existingFiles.bank && (
                                        <button type="button" onClick={() => handleViewDocument(existingFiles.bank, 'documents')} className="text-xs text-blue-600 hover:underline mt-1 block text-left">
                                            View Current File
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label>Latest Diploma Photo *</Label>
                                    <div className="border-2 border-dashed rounded-lg p-6 hover:bg-gray-50 transition-colors cursor-pointer text-center">
                                        <Input type="file" className="hidden" id="ijazah-upload" onChange={(e) => handleFileChange(e, 'ijazah')} accept="image/*,.pdf" />
                                        <Label htmlFor="ijazah-upload" className="cursor-pointer flex flex-col items-center">
                                            <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                            <span className="text-sm font-medium text-gray-900">
                                                {files.ijazah ? files.ijazah.name : (existingFiles.ijazah ? "Change File (Already Uploaded)" : "Click to upload")}
                                            </span>
                                        </Label>
                                    </div>
                                    {existingFiles.ijazah && (
                                        <button type="button" onClick={() => handleViewDocument(existingFiles.ijazah, 'documents')} className="text-xs text-blue-600 hover:underline mt-1 block text-left">
                                            View Current File
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label>Offering Letter (Signed) *</Label>
                                    <div className="border-2 border-dashed rounded-lg p-6 hover:bg-gray-50 transition-colors cursor-pointer text-center">
                                        <Input type="file" className="hidden" id="offering-upload" onChange={(e) => handleFileChange(e, 'offering')} accept="image/*,.pdf" />
                                        <Label htmlFor="offering-upload" className="cursor-pointer flex flex-col items-center">
                                            <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                            <span className="text-sm font-medium text-gray-900">
                                                {files.offering ? files.offering.name : (existingFiles.offering ? "Change File (Already Uploaded)" : "Click to upload")}
                                            </span>
                                        </Label>
                                    </div>
                                    {existingFiles.offering && (
                                        <button type="button" onClick={() => handleViewDocument(existingFiles.offering, 'documents')} className="text-xs text-blue-600 hover:underline mt-1 block text-left">
                                            View Current File
                                        </button>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                        {submitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Submitting...
                            </>
                        ) : "Submit Data"}
                    </Button>

                </form>
            </main>
        </div>
    );
}
