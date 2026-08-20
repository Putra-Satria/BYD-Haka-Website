import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import TopNav from "@/components/TopNav";
import { JobCard } from "@/components/JobCard";
import { useToast } from "@/components/ui/use-toast";

export default function SavedJobs() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [savedJobs, setSavedJobs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchSavedJobs();
    }, []);

    const fetchSavedJobs = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                navigate("/auth");
                return;
            }

            // 1. Fetch saved job IDs
            const { data: savedData, error: savedError } = await supabase
                .from("saved_jobs" as any)
                .select("id, job_id, created_at")
                .eq("user_id", session.user.id);

            if (savedError) throw savedError;

            if (!savedData || savedData.length === 0) {
                setSavedJobs([]);
                return;
            }

            const jobIds = (savedData as any[]).map(item => item.job_id);

            // 2. Fetch job details
            const { data: jobsData, error: jobsError } = await (supabase as any)
                .from("jobs")
                .select("*")
                .in("id", jobIds);

            if (jobsError) throw jobsError;

            // 3. Combine data
            const combinedData = (savedData as any[]).map(saved => {
                const job = jobsData?.find((j: any) => j.id === saved.job_id);
                return job ? { ...saved, jobs: job } : null;
            }).filter(item => item !== null);

            setSavedJobs(combinedData);

        } catch (error: any) {
            console.error("Error fetching saved jobs:", error);
            toast({
                title: "Error",
                description: "Failed to load saved jobs",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <TopNav />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Saved Jobs</h1>

                {isLoading ? (
                    <div className="text-center py-10">Loading...</div>
                ) : savedJobs.length === 0 ? (
                    <div className="text-center py-10">
                        <p className="text-gray-500 mb-4">You haven't saved any jobs yet.</p>
                        <button
                            onClick={() => navigate("/job-board")}
                            className="text-primary hover:underline font-medium"
                        >
                            Browse Jobs
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {savedJobs.map((item) => (
                            <JobCard
                                key={item.id}
                                position={item.jobs.position}
                                branch={item.jobs.branch}
                                location={item.jobs.location}
                                province={item.jobs.province}
                                type={item.jobs.type}
                                job_level={item.jobs.job_level}
                                onDetail={() => navigate(`/job-board/${item.jobs.id}`)}
                            />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
