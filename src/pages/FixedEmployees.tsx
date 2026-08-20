
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { maskNik } from "@/lib/securityHardening";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import TopNav from "@/components/TopNav";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Search, MapPin, FileText, Loader2, Download } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { PrintableOnboardingData } from "@/components/PrintableOnboardingData";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface ApplicationWithProfile {
    id: string;
    user_id: string;
    position: string;
    branch: string;
    province: string;
    status: string;
    created_at: string;
    updated_at: string;
    profiles: {
        full_name: string | null;
        nik: string;
        gender: string | null;
        whatsapp_number: string | null;
        avatar_url: string | null;
    } | null;
}

export default function FixedEmployees() {
    const { isAdmin, loading: authLoading } = useAdminCheck();
    const [applications, setApplications] = useState<ApplicationWithProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const navigate = useNavigate();

    // Onboarding Data State
    const [onboardingOpen, setOnboardingOpen] = useState(false);
    const [onboardingData, setOnboardingData] = useState<any>(null);
    const [onboardingLoading, setOnboardingLoading] = useState(false);
    const [selectedAppForOnboarding, setSelectedAppForOnboarding] = useState<ApplicationWithProfile | null>(null);

    useEffect(() => {
        if (isAdmin) {
            fetchFixedEmployees();
        }
    }, [isAdmin]);

    const fetchFixedEmployees = async () => {
        setLoading(true);
        // Fetch accepted applications
        const { data: appsData, error } = await supabase
            .from("applications")
            .select("*")
            .eq("status", "accepted")
            .order("updated_at", { ascending: false });

        if (error) {
            console.error("Error fetching fixed employees:", error);
            setLoading(false);
            return;
        }

        if (appsData) {
            const userIds = [...new Set(appsData.map((app) => app.user_id))];
            let profilesData = [];

            if (userIds.length > 0) {
                const { data } = await supabase
                    .from("profiles")
                    .select("user_id, full_name, nik, gender, whatsapp_number, avatar_url")
                    .in("user_id", userIds);
                profilesData = data || [];
            }

            const profilesMap = new Map(profilesData.map((p) => [p.user_id, p]));

            const appsWithProfiles = appsData.map((app) => ({
                ...app,
                profiles: profilesMap.get(app.user_id) || null,
            }));

            setApplications(appsWithProfiles as ApplicationWithProfile[]);
        }
        setLoading(false);
    };

    const fetchOnboardingData = async (userId: string) => {
        setOnboardingLoading(true);
        setOnboardingOpen(true);
        const { data } = await supabase
            .from("employees" as any)
            .select("*")
            .eq("user_id", userId)
            .maybeSingle();

        setOnboardingData(data);
        setOnboardingLoading(false);
    };

    const filteredApplications = applications.filter((app) =>
        (app.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        app.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.branch.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (authLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <Skeleton className="h-8 w-48 mx-auto mb-4" />
                    <Skeleton className="h-4 w-32 mx-auto" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <TopNav />
            <main className="container mx-auto px-4 py-8 max-w-7xl">
                <div className="mb-8">
                    <Button variant="ghost" className="mb-4 pl-0 hover:bg-transparent hover:text-primary" onClick={() => navigate("/admin")}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                    </Button>
                    <h1 className="text-3xl font-bold text-foreground">Fixed Employees</h1>
                    <p className="text-muted-foreground">List of accepted employees and their data</p>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Fixed Employees ({filteredApplications.length})</CardTitle>
                            <div className="relative w-72">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search name, position..."
                                    className="pl-8"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <Skeleton key={i} className="h-12 w-full" />
                                ))}
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Employee Name</TableHead>
                                        <TableHead>Position</TableHead>
                                        <TableHead>Accepted Date</TableHead>
                                        <TableHead>WA/HP</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredApplications.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                No fixed employees found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredApplications.map((app) => (
                                            <TableRow key={app.id}>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium">{app.profiles?.full_name || "Unknown"}</p>
                                                        <p className="text-xs text-muted-foreground">{maskNik(app.profiles?.nik)}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium">{app.position}</p>
                                                        <div className="flex items-center text-xs text-muted-foreground gap-1">
                                                            <MapPin className="w-3 h-3" />
                                                            {app.branch}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {format(new Date(app.updated_at), "MMM d, yyyy")}
                                                </TableCell>
                                                <TableCell>
                                                    {app.profiles?.whatsapp_number || "-"}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-teal-600 border-teal-200 hover:bg-green-50"
                                                        onClick={() => {
                                                            setSelectedAppForOnboarding(app);
                                                            fetchOnboardingData(app.user_id);
                                                        }}
                                                    >
                                                        <FileText className="w-4 h-4 mr-1" /> View Employee Data
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Onboarding Data Modal (Copied from AdminDashboard) */}
                <Dialog open={onboardingOpen} onOpenChange={setOnboardingOpen}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Employee Onboarding Data</DialogTitle>
                        </DialogHeader>
                        {onboardingLoading ? (
                            <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
                        ) : onboardingData ? (
                            <div className="space-y-8">
                                {/* Personal Data */}
                                <div>
                                    <h3 className="text-lg font-semibold text-primary mb-4 border-b pb-2">Personal Data</h3>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div><label className="text-sm text-muted-foreground">Full Name</label><p className="font-medium">{selectedAppForOnboarding?.profiles?.full_name}</p></div>
                                        <div><label className="text-sm text-muted-foreground">KTP Number</label><p className="font-medium">{maskNik(onboardingData.ktp_number)}</p></div>
                                        <div><label className="text-sm text-muted-foreground">KK Number</label><p className="font-medium">{onboardingData.kk_number}</p></div>
                                        <div><label className="text-sm text-muted-foreground">NPWP</label><p className="font-medium">{onboardingData.npwp_number}</p></div>
                                        <div><label className="text-sm text-muted-foreground">Birth Place/Date</label><p className="font-medium">{onboardingData.birth_place}, {onboardingData.birth_date}</p></div>
                                        <div><label className="text-sm text-muted-foreground">Religion</label><p className="font-medium">{onboardingData.religion}</p></div>
                                        <div><label className="text-sm text-muted-foreground">Blood Type</label><p className="font-medium">{onboardingData.blood_type}</p></div>
                                        <div><label className="text-sm text-muted-foreground">Marital Status</label><p className="font-medium">{onboardingData.marital_status}</p></div>
                                        <div><label className="text-sm text-muted-foreground">Children</label><p className="font-medium">{onboardingData.children_count}</p></div>
                                        <div><label className="text-sm text-muted-foreground">SIM A</label><p className="font-medium">{onboardingData.has_sim_a}</p></div>
                                        <div><label className="text-sm text-muted-foreground">KTP Address</label><p className="font-medium">{onboardingData.ktp_address}</p></div>
                                        <div><label className="text-sm text-muted-foreground">Domicile Address</label><p className="font-medium">{onboardingData.domicile_address}</p></div>
                                    </div>
                                </div>

                                {/* Bank Data */}
                                <div>
                                    <h3 className="text-lg font-semibold text-primary mb-4 border-b pb-2">Bank Account</h3>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div><label className="text-sm text-muted-foreground">Bank Name</label><p className="font-medium">{onboardingData.bank_name}</p></div>
                                        <div><label className="text-sm text-muted-foreground">Account Number</label><p className="font-medium">{onboardingData.bank_account_number}</p></div>
                                        <div><label className="text-sm text-muted-foreground">Account Holder</label><p className="font-medium">{onboardingData.bank_account_holder}</p></div>
                                        <div><label className="text-sm text-muted-foreground">BPJS Cair Status</label><p className="font-medium">{onboardingData.bpjs_cair_status}</p></div>
                                    </div>
                                </div>

                                {/* Family Data */}
                                <div>
                                    <h3 className="text-lg font-semibold text-primary mb-4 border-b pb-2">Family & Emergency</h3>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div><label className="text-sm text-muted-foreground">Emergency Contact</label><p className="font-medium">{onboardingData.emergency_contact_name} ({onboardingData.emergency_contact_relation})</p></div>
                                        <div><label className="text-sm text-muted-foreground">Emergency Phone</label><p className="font-medium">{onboardingData.emergency_contact_phone}</p></div>
                                        <div><label className="text-sm text-muted-foreground">Father's Name</label><p className="font-medium">{onboardingData.father_name}</p></div>
                                        <div><label className="text-sm text-muted-foreground">Mother's Name</label><p className="font-medium">{onboardingData.mother_name}</p></div>
                                        <div><label className="text-sm text-muted-foreground">Medical History</label><p className="font-medium">{onboardingData.medical_history}</p></div>
                                    </div>
                                </div>

                                {/* Files */}
                                <div>
                                    <h3 className="text-lg font-semibold text-primary mb-4 border-b pb-2">Uploaded Documents</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {Object.keys(onboardingData).filter(k => k.endsWith('_url') && onboardingData[k]).map(key => (
                                            <Button
                                                key={key}
                                                variant="outline"
                                                className="w-full justify-start overflow-hidden"
                                                onClick={() => window.open(onboardingData[key], '_blank')}
                                            >
                                                <FileText className="mr-2 h-4 w-4" />
                                                {key.replace('_url', '').toUpperCase().replace(/_/g, ' ')}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex justify-end pt-4 border-t mt-4">
                                    <Button
                                        className="bg-emerald-700 hover:bg-emerald-800 text-white gap-2"
                                        onClick={() => {
                                            const originalTitle = document.title;
                                            const candidateName = selectedAppForOnboarding?.profiles?.full_name || "Employee";
                                            document.title = `Onboarding Data - ${candidateName}`;
                                            window.print();

                                            // Restore title after a small delay
                                            setTimeout(() => {
                                                document.title = originalTitle;
                                            }, 100);
                                        }}
                                    >
                                        <Download className="w-4 h-4" />
                                        Export PDF
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                No onboarding data submitted yet.
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Hidden Printable Component */}
                <div className="printable-area hidden">
                    <PrintableOnboardingData data={onboardingData} app={selectedAppForOnboarding} />
                </div>
            </main>
        </div>
    );
}
