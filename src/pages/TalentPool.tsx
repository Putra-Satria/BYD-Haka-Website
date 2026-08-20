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
import { ArrowLeft, Search, Eye, MapPin, Filter, X, RefreshCcw } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription,
    DialogClose
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Reusing types roughly from AdminDashboard or defining locally
interface ApplicationWithProfile {
    id: string;
    user_id: string;
    position: string;
    branch: string;
    province: string;
    status: string;
    created_at: string;
    updated_at: string;
    admin_notes: string | null;
    profiles: {
        full_name: string | null;
        nik: string;
        gender: string | null;
        whatsapp_number: string | null;
    } | null;
}

export default function TalentPool() {
    const { isStaff, loading: authLoading } = useAdminCheck();
    const [applications, setApplications] = useState<ApplicationWithProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedApp, setSelectedApp] = useState<ApplicationWithProfile | null>(null);
    const navigate = useNavigate();

    // Filters
    const [filterBranch, setFilterBranch] = useState("all");
    const [filterPosition, setFilterPosition] = useState("all");
    const [filterMonth, setFilterMonth] = useState("all");
    const [filterYear, setFilterYear] = useState("all");

    // Derived options
    const uniqueBranches = Array.from(new Set(applications.map(app => app.branch))).filter(Boolean).sort();
    const uniquePositions = Array.from(new Set(applications.map(app => app.position))).filter(Boolean).sort();
    const uniqueYears = Array.from(new Set(applications.map(app => new Date(app.updated_at).getFullYear()))).sort((a, b) => b - a);
    const months = [
        { value: "0", label: "January" },
        { value: "1", label: "February" },
        { value: "2", label: "March" },
        { value: "3", label: "April" },
        { value: "4", label: "May" },
        { value: "5", label: "June" },
        { value: "6", label: "July" },
        { value: "7", label: "August" },
        { value: "8", label: "September" },
        { value: "9", label: "October" },
        { value: "10", label: "November" },
        { value: "11", label: "December" },
    ];

    useEffect(() => {
        if (isStaff) {
            fetchRejectedApplications();
        }
    }, [isStaff]);

    const fetchRejectedApplications = async () => {
        setLoading(true);
        // Fetch only rejected applications
        const { data: appsData, error } = await supabase
            .from("applications")
            .select("*")
            .eq("status", "rejected")
            .order("updated_at", { ascending: false });

        if (error) {
            console.error("Error fetching talent pool:", error);
            setLoading(false);
            return;
        }

        if (appsData) {
            const userIds = [...new Set(appsData.map((app) => app.user_id))];
            let profilesData = [];

            if (userIds.length > 0) {
                const { data } = await supabase
                    .from("profiles")
                    .select("user_id, full_name, nik, gender, whatsapp_number")
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

    const handleRestore = async (appId: string) => {
        try {
            const { error } = await supabase
                .from("applications")
                .update({
                    status: "on_review",
                    admin_notes: "Restored from Talent Pool",
                    updated_at: new Date().toISOString()
                })
                .eq("id", appId);

            if (error) throw error;

            toast.success("Candidate restored to active list");
            fetchRejectedApplications();
        } catch (error) {
            console.error("Error restoring candidate:", error);
            toast.error("Failed to restore candidate");
        }
    };

    const filteredApplications = applications.filter((app) => {
        const matchesSearch = (app.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
            app.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
            app.branch.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesBranch = filterBranch === "all" || app.branch === filterBranch;
        const matchesPosition = filterPosition === "all" || app.position === filterPosition;

        const appDate = new Date(app.updated_at);
        const matchesMonth = filterMonth === "all" || appDate.getMonth().toString() === filterMonth;
        const matchesYear = filterYear === "all" || appDate.getFullYear().toString() === filterYear;

        return matchesSearch && matchesBranch && matchesPosition && matchesMonth && matchesYear;
    });

    const resetFilters = () => {
        setFilterBranch("all");
        setFilterPosition("all");
        setFilterMonth("all");
        setFilterYear("all");
        setSearchTerm("");
    };

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
                    <h1 className="text-3xl font-bold text-foreground">Talent Pool</h1>
                    <p className="text-muted-foreground">List of rejected candidates for future reference</p>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <CardTitle>Rejected Candidates ({filteredApplications.length})</CardTitle>
                                {(filterBranch !== "all" || filterPosition !== "all" || filterMonth !== "all" || filterYear !== "all" || searchTerm) && (
                                    <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground hover:text-primary">
                                        <X className="w-4 h-4 mr-2" /> Clear Filters
                                    </Button>
                                )}
                            </div>

                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search name..."
                                        className="pl-8"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Select value={filterBranch} onValueChange={setFilterBranch}>
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Branch" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Branches</SelectItem>
                                            {uniqueBranches.map(branch => (
                                                <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Select value={filterPosition} onValueChange={setFilterPosition}>
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Position" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Positions</SelectItem>
                                            {uniquePositions.map(pos => (
                                                <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Select value={filterMonth} onValueChange={setFilterMonth}>
                                        <SelectTrigger className="w-[140px]">
                                            <SelectValue placeholder="Month" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Months</SelectItem>
                                            {months.map(m => (
                                                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Select value={filterYear} onValueChange={setFilterYear}>
                                        <SelectTrigger className="w-[120px]">
                                            <SelectValue placeholder="Year" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Years</SelectItem>
                                            {uniqueYears.map(year => (
                                                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
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
                                        <TableHead>Candidate</TableHead>
                                        <TableHead>Position</TableHead>
                                        <TableHead>Rejected Date</TableHead>
                                        <TableHead>Notes</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredApplications.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                No candidates found matching your filters.
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
                                                <TableCell className="max-w-xs truncate" title={app.admin_notes || ""}>
                                                    {app.admin_notes || "-"}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                                                                    <RefreshCcw className="w-4 h-4 mr-1" /> Restore
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Restore Candidate?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        This will move <strong>{app.profiles?.full_name}</strong> back to the active list (On Review status).
                                                                        Are you sure you want to proceed?
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleRestore(app.id)}>
                                                                        Confirm Restore
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>

                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <Button variant="outline" size="sm" onClick={() => setSelectedApp(app)}>
                                                                    <Eye className="w-4 h-4 mr-1" /> Details
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent>
                                                                <DialogHeader>
                                                                    <DialogTitle>Candidate Details</DialogTitle>
                                                                </DialogHeader>
                                                                {selectedApp && (
                                                                    <div className="space-y-4">
                                                                        <div className="grid grid-cols-2 gap-4">
                                                                            <div>
                                                                                <label className="text-sm font-medium text-muted-foreground">Name</label>
                                                                                <p>{selectedApp.profiles?.full_name}</p>
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-sm font-medium text-muted-foreground">Status</label>
                                                                                <Badge variant="destructive">Rejected</Badge>
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-sm font-medium text-muted-foreground">Original Application</label>
                                                                                <p>{selectedApp.position} - {selectedApp.branch}</p>
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-sm font-medium text-muted-foreground">Rejection Date</label>
                                                                                <p>{format(new Date(selectedApp.updated_at), "PP")}</p>
                                                                            </div>
                                                                            <div className="col-span-2">
                                                                                <label className="text-sm font-medium text-muted-foreground">Admin Notes</label>
                                                                                <p className="p-3 bg-muted rounded-md text-sm">
                                                                                    {selectedApp.admin_notes || "No notes"}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </DialogContent>
                                                        </Dialog>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
