
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, MapPin, Globe, Share2, Bookmark, Clock, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getJobDescription } from "@/data/jobDescriptions";
import TopNav from "@/components/TopNav";
import logoHaka from "@/assets/BYD-GRAY.png";
import logoDenza from "@/assets/logo-denza.png";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import JobApplicationDialog from "@/components/JobApplicationDialog";
import { supabase } from "@/integrations/supabase/client";

const JobDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [showApplyDialog, setShowApplyDialog] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [job, setJob] = useState<any>(null);
    const [isLoadingJob, setIsLoadingJob] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [hasApplied, setHasApplied] = useState(false);

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);

            if (session?.user) {
                const { data } = await supabase
                    .from("user_roles")
                    .select("role")
                    .eq("user_id", session.user.id)
                    .eq("role", "admin")
                    .maybeSingle();

                if (data) setIsAdmin(true);
            }
        };
        checkUser();
    }, []);

    useEffect(() => {
        const fetchJob = async () => {
            if (!id) return;
            setIsLoadingJob(true);
            const { data, error } = await (supabase as any)
                .from("jobs")
                .select("*")
                .eq("id", id)
                .maybeSingle();

            if (error) {
                console.error("Error fetching job:", error);
                toast({
                    title: "Error",
                    description: "Could not load job details.",
                    variant: "destructive"
                });
            } else {
                setJob(data);
            }
            setIsLoadingJob(false);
        };

        fetchJob();
    }, [id]);

    useEffect(() => {
        const checkSavedStatus = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user && id && job) {
                const { data } = await supabase
                    .from('saved_jobs' as any)
                    .select('*')
                    .eq('user_id', session.user.id)
                    .eq('job_id', id)
                    .maybeSingle();

                if (data) setIsSaved(true);
            }
        };

        checkSavedStatus();
    }, [id, job]);

    useEffect(() => {
        const checkAppliedStatus = async () => {
            if (user && job) {
                // Check by position and branch (primary check for existing apps)
                const { data: byDetails } = await supabase
                    .from('applications' as any)
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('position', job.position)
                    .eq('branch', job.branch)
                    .maybeSingle();

                if (byDetails) {
                    setHasApplied(true);
                    return;
                }

                // Check by job_id (for newer apps that might have unique ID but modified details)
                if (id) {
                    const { data: byId } = await supabase
                        .from('applications' as any)
                        .select('id')
                        .eq('user_id', user.id)
                        .eq('job_id', id)
                        .maybeSingle();

                    if (byId) setHasApplied(true);
                }
            }
        };
        checkAppliedStatus();
    }, [id, user, job]);

    const handleSave = async () => {
        if (!user) {
            toast({
                title: "Login Required",
                description: "Please login to save this job",
                variant: "destructive",
            });
            navigate("/auth");
            return;
        }

        setIsSaving(true);
        try {
            if (isSaved) {
                // Unsave
                const { error } = await supabase
                    .from('saved_jobs' as any)
                    .delete()
                    .eq('user_id', user.id)
                    .eq('job_id', id);

                if (error) throw error;
                setIsSaved(false);
                toast({
                    title: "Removed",
                    description: "Job removed from saved list",
                });
            } else {
                // Save
                const { error } = await supabase
                    .from('saved_jobs' as any)
                    .insert([{ user_id: user.id, job_id: id }]);

                if (error) throw error;
                setIsSaved(true);
                toast({
                    title: "Saved",
                    description: "Job successfully saved",
                });
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleApply = () => {
        if (!user) {
            toast({
                title: "Authentication Required",
                description: "Please login to apply for this job",
                variant: "destructive",
            });
            navigate("/auth");
            return;
        }
        setShowApplyDialog(true);
    };

    if (isLoadingJob) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-xl text-gray-600">Loading Job Details...</h1>
                </div>
            </div>
        );
    }

    if (!job) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900">Job not found</h1>
                    <Button onClick={() => navigate("/job-board")} className="mt-4">
                        Back to Job Board
                    </Button>
                </div>
            </div>
        );
    }

    // Fallback if structured data is empty/null, trying to look friendly
    // Note: Since we are moving to DB, we rely on the DB columns. 
    // The previous code relied on getJobDescription helper. 
    // We should prefer DB data if available, but for now the import logic mapped it correctly.
    // However, if the job was CREATED manually via Admin, it might store arrays directly.
    // Let's use the DB fields directly.
    const descriptionList = Array.isArray(job.description) ? job.description : (job.description ? [job.description] : []);
    const generalReqList = Array.isArray(job.general_requirements) ? job.general_requirements : (job.general_requirements ? [job.general_requirements] : []);
    const specificReqList = Array.isArray(job.specific_requirements) ? job.specific_requirements : (job.specific_requirements ? [job.specific_requirements] : []);
    const benefitsList = Array.isArray(job.benefits) ? job.benefits : (job.benefits ? [job.benefits] : []);


    const isDenza = job.branch?.toLowerCase().includes("denza");
    const logo = isDenza ? logoDenza : logoHaka;
    const companyName = isDenza ? "Denza Indonesia" : "Haka Auto";

    return (
        <div className="min-h-screen bg-gray-50">
            <TopNav isPublic={false} />

            {/* Application Dialog */}
            {!isAdmin && (
                <JobApplicationDialog
                    open={showApplyDialog}
                    onOpenChange={setShowApplyDialog}
                    jobId={job.id}
                    jobPosition={job.position}
                    jobBranch={job.branch}
                    jobProvince={job.province}
                />
            )}

            {/* Breadcrumb / Top Bar */}
            <div className="bg-white border-b sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span
                            className="cursor-pointer hover:text-primary transition-colors font-medium"
                            onClick={() => navigate("/job-board")}
                        >
                            Jobs
                        </span>
                        <span>/</span>
                        <span className="text-gray-900 font-medium">Job Detail</span>
                    </div>

                    <div className="flex items-center gap-3">
                        {isAdmin && (
                            <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium border border-amber-200">
                                Admin View
                            </span>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate("/job-board")}
                            className="text-gray-500 hover:text-white-900"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:p-10 mb-8 animate-fade-in relative overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

                    <div className="flex flex-col md:flex-row justify-between items-start gap-6 relative z-10">
                        <div className="flex gap-6 items-start">
                            <div className="p-4 border rounded-xl bg-white shadow-sm w-20 h-20 md:w-24 md:h-24 flex items-center justify-center shrink-0">
                                <img src={logo} alt={companyName} className="w-full h-auto object-contain" />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2 leading-tight">{job.position}</h1>
                                <div className="text-lg font-medium text-primary mb-4">{companyName}</div>

                                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
                                        <Building2 className="w-4 h-4 text-gray-400" />
                                        <span>{job.branch}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
                                        <MapPin className="w-4 h-4 text-gray-400" />
                                        <span>{job.location}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
                                        <Clock className="w-4 h-4 text-gray-400" />
                                        <span>{job.type || "Full Time"}</span>
                                    </div>
                                    {job.job_level && (
                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                                            <Briefcase className="w-4 h-4 text-blue-500" />
                                            <span>{job.job_level}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 w-full md:w-auto mt-4 md:mt-2">
                            {!isAdmin && (
                                <>
                                    <Button
                                        onClick={handleApply}
                                        size="lg"
                                        disabled={hasApplied}
                                        className={`flex-1 md:flex-none text-white shadow-lg hover:shadow-xl transition-all ${hasApplied
                                            ? "bg-green-600 hover:bg-green-600 opacity-90 cursor-not-allowed"
                                            : "bg-primary hover:bg-primary-glow"
                                            }`}
                                    >
                                        {hasApplied ? "Applied" : "Apply Now"}
                                    </Button>
                                    <Button
                                        variant={isSaved ? "default" : "outline"}
                                        size="lg"
                                        className={`flex-1 md:flex-none ${isSaved ? "bg-green-700 hover:bg-green-800 text-white" : ""}`}
                                        onClick={handleSave}
                                        disabled={isSaving}
                                    >
                                        <Bookmark className={`w-4 h-4 mr-2 ${isSaved ? "fill-current" : ""}`} />
                                        {isSaved ? "Saved" : "Save"}
                                    </Button>
                                </>
                            )}
                            <Button variant="outline" size="icon" className="shrink-0 h-11 w-11">
                                <Share2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Content */}
                    <div className="lg:col-span-2 space-y-8 animate-fade-in delay-75">
                        {/* Job Description Sections */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:p-8 space-y-8">
                            {descriptionList.length > 0 && (
                                <section>
                                    <h3 className="text-xl font-bold text-gray-900 mb-4 border-l-4 border-primary pl-4">Role Description</h3>
                                    <div className="prose max-w-none text-gray-600">
                                        <ul className="list-decimal list-outside ml-5 space-y-2 leading-relaxed">
                                            {descriptionList.map((desc: string, index: number) => (
                                                <li key={index}>{desc}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </section>
                            )}

                            <hr className="border-gray-100" />

                            {generalReqList.length > 0 && (
                                <section>
                                    <h3 className="text-xl font-bold text-gray-900 mb-4 border-l-4 border-primary pl-4">General Requirements</h3>
                                    <div className="prose max-w-none text-gray-600">
                                        <ul className="list-disc list-outside ml-5 space-y-2 leading-relaxed">
                                            {generalReqList.map((qual: string, index: number) => (
                                                <li key={index}>{qual}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </section>
                            )}

                            {specificReqList.length > 0 && (
                                <>
                                    <hr className="border-gray-100" />
                                    <section>
                                        <h3 className="text-xl font-bold text-gray-900 mb-4 border-l-4 border-primary pl-4">Specific Requirements</h3>
                                        <div className="prose max-w-none text-gray-600">
                                            <ul className="list-disc list-outside ml-5 space-y-2 leading-relaxed">
                                                {specificReqList.map((qual: string, index: number) => (
                                                    <li key={index}>{qual}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </section>
                                </>
                            )}

                            <hr className="border-gray-100" />

                            {benefitsList.length > 0 && (
                                <section>
                                    <h3 className="text-xl font-bold text-gray-900 mb-4 border-l-4 border-primary pl-4">Benefit</h3>
                                    <div className="prose max-w-none text-gray-600">
                                        <ul className="list-disc list-outside ml-5 space-y-2 leading-relaxed">
                                            {benefitsList.map((benefit: string, index: number) => (
                                                <li key={index}>{benefit}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </section>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Sidebar */}
                    <div className="space-y-6 animate-fade-in delay-100">
                        {/* Company Card */}
                        <Card className="border-gray-100 shadow-sm overflow-hidden sticky top-24">
                            <CardHeader className="bg-gray-50/80 border-b border-gray-100 pb-4">
                                <CardTitle className="text-lg font-bold text-gray-900">About Company</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6">
                                <div>
                                    <h4 className="font-bold text-gray-900 mb-2">{companyName}</h4>
                                    <p className="text-sm text-gray-600 leading-relaxed text-justify">
                                        {isDenza
                                            ? "Denza is a luxury new energy vehicle brand created by BYD (Build Your Dreams) and Mercedes-Benz, focused on providing premium sustainable mobility solutions."
                                            : "HAKA AUTO is a leading automotive dealer network in Indonesia, committed to excellence in sales and after-sales service of BYD vehicles."}
                                    </p>
                                </div>

                                <div className="space-y-4 pt-2">
                                    <div className="flex items-start gap-3 text-sm group">
                                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                                            <MapPin className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900">Head Office</div>
                                            <div className="text-gray-500 text-xs mt-0.5">
                                                Cyber 2 Tower, Jl. H. R. Rasuna Said No.13, RT.7/RW.2, Kuningan, Kuningan Tim., Kecamatan Setiabudi, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12950
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 text-sm group">
                                        <div className="p-2 bg-green-50 text-green-600 rounded-lg group-hover:bg-green-100 transition-colors">
                                            <Building2 className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900">Industry</div>
                                            <div className="text-gray-500 text-xs mt-0.5">Automotive & Dealership</div>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 text-sm group">
                                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-100 transition-colors">
                                            <Globe className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900">Website</div>
                                            <a href="https://hakaauto.co.id" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs mt-0.5 block">
                                                https://hakaauto.co.id
                                            </a>
                                        </div>
                                    </div>
                                </div>

                                <Button variant="outline" className="w-full text-blue-700 hover:text-blue-800 hover:bg-blue-50 border-blue-200" onClick={() => window.open('https://hakaauto.co.id', '_blank')}>
                                    View Company Profile
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default JobDetailPage;
