import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import TopNav from "@/components/TopNav";
import { ApplicationProgress } from "@/components/ApplicationProgress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Building2, Calendar, Briefcase, Video } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";

type ApplicationStatus =
  | 'submitted'
  | 'on_review'
  | 'interview_hc'
  | 'interview_user'
  | 'psikotes'
  | 'test_bidang'
  | 'assessment'
  | 'background_check'
  | 'offering'
  | 'onboarding'
  | 'accepted'
  | 'rejected';

interface Application {
  id: string;
  position: string;
  branch: string;
  province: string;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
  logs?: any[];
  jobs?: {
    job_level: string | null;
  } | null;
}

const statusLabels: Record<ApplicationStatus, string> = {
  submitted: 'Submitted',
  on_review: 'On Review',
  interview_hc: 'HR Interview',
  interview_user: 'User Interview',
  psikotes: 'Psychological Test',
  test_bidang: 'Technical Test',
  assessment: 'Assessment',
  background_check: 'Background Check',
  offering: 'Offering',
  onboarding: 'Onboarding',
  accepted: 'Accepted',
  rejected: 'Rejected',
};

const statusColors: Record<ApplicationStatus, string> = {
  submitted: 'bg-secondary text-secondary-foreground',
  on_review: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  interview_hc: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  interview_user: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  psikotes: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  test_bidang: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  assessment: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  background_check: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  offering: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  onboarding: 'bg-primary/10 text-primary',
  accepted: 'bg-primary text-primary-foreground',
  rejected: 'bg-destructive/10 text-destructive',
};

export default function Applications() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      navigate("/auth");
      return;
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (profile?.full_name) {
      setUserName(profile.full_name);
    }

    // Fetch applications
    const { data: appsData, error: appsError } = await supabase
      .from("applications")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (appsError) {
      console.error("Error fetching applications:", appsError);
    } else {
      // Fetch logs for these applications
      const appIds = appsData.map(app => app.id);
      const { data: logsData, error: logsError } = await supabase
        .from("application_logs" as any)
        .select("*")
        .in("application_id", appIds)
        .order("created_at", { ascending: true });

      if (logsError) {
        console.error("Error fetching logs:", logsError);
      }

      // Fetch jobs to get job_level
      const { data: jobs } = await supabase
        .from("jobs" as any)
        .select("title, job_level");

      const jobsData = jobs as any[];

      const jobsMap = new Map(jobsData?.map(j => [j.title, j]) || []);

      // Merge logs and jobs into applications
      const appsWithLogs = appsData.map(app => ({
        ...app,
        logs: logsData?.filter((log: any) => log.application_id === app.id) || [],
        jobs: jobsMap.get(app.position) || null
      }));

      // Since we modified the Application type locally effectively, we cast to any for now or need to update interface
      setApplications(appsWithLogs as any);

      if (appsWithLogs && appsWithLogs.length > 0) {
        setSelectedApplication(appsWithLogs[0] as any);
      }
    }

    setLoading(false);
  };

  // Notification Popup Logic
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [currentNotification, setCurrentNotification] = useState<any>(null);

  useEffect(() => {
    checkUnreadNotifications();
  }, []);

  const checkUnreadNotifications = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: notifs } = await supabase
      .from("notifications" as any)
      .select("*")
      .eq("user_id", session.user.id)
      .eq("is_read", false)
      .eq("title", "Application Status Update") // Only show our specific status updates
      .order("created_at", { ascending: false })
      .limit(1);

    if (notifs && notifs.length > 0) {
      setCurrentNotification(notifs[0]);
      setNotificationOpen(true);
    }
  };

  const handleCloseNotification = async () => {
    setNotificationOpen(false);
    if (currentNotification) {
      // Mark as read
      await supabase
        .from("notifications" as any)
        .update({ is_read: true })
        .eq("id", currentNotification.id);

      setCurrentNotification(null);
    }
  };
  // ... existing notification logic ...

  // Result Popup Logic (Success/Failure)
  const [resultPopupOpen, setResultPopupOpen] = useState(false);

  useEffect(() => {
    if (selectedApplication) {
      const status = selectedApplication.status;
      if (['offering', 'onboarding', 'accepted', 'rejected'].includes(status)) {
        const hasSeen = localStorage.getItem(`seen_result_${selectedApplication.id}`);
        if (!hasSeen) {
          setResultPopupOpen(true);
          localStorage.setItem(`seen_result_${selectedApplication.id}`, 'true');
        }
      }
    }
  }, [selectedApplication]);

  const getLastStageName = () => {
    if (!selectedApplication || !selectedApplication.logs || selectedApplication.logs.length === 0) return "Previous Stage";

    // Find the last stage before rejection
    // Assuming logs are ordered by created_at asc
    // The last log is likely the rejection itself, so take the one before it?
    // Or just look at the last log's notes or previous status?

    // Simpler approach: Map current status index to previous
    return "Selection Stage";
  };

  const [upcomingInterview, setUpcomingInterview] = useState<any>(null);

  useEffect(() => {
    if (selectedApplication) {
      fetchUpcomingInterview(selectedApplication.id);
    } else {
      setUpcomingInterview(null);
    }
  }, [selectedApplication]);

  const fetchUpcomingInterview = async (appId: string) => {
    // Check if status allows showing interview schedule
    // Only show for: submitted, on_review, interview_hc, interview_user, psikotes, test_bidang
    const visibleStatuses = ['submitted', 'on_review', 'interview_hc', 'interview_user', 'psikotes', 'test_bidang'];

    if (!selectedApplication || !visibleStatuses.includes(selectedApplication.status)) {
      setUpcomingInterview(null);
      return;
    }

    const { data } = await supabase
      .from("interviews" as any)
      .select("*")
      .eq("application_id", appId)
      .gt("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    setUpcomingInterview(data);
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      {/* ... (existing content) ... */}

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* ... (existing content) ... */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">My Applications</h1>
          <p className="text-muted-foreground">
            {userName ? `Hello, ${userName}! ` : ""}Track your job application progress here.
          </p>
        </div>

        {loading ? (
          // ... existing loading skeleton ...
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              {[1, 2].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-8 w-1/3 mb-4" />
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        ) : applications.length === 0 ? (
          // ... existing no applications ...
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Briefcase className="w-16 h-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Applications Yet</h3>
              <p className="text-muted-foreground text-center mb-6">
                You haven't submitted any job applications yet.<br />
                Browse our open positions and start your career journey with Haka Auto!
              </p>
              <button
                onClick={() => navigate("/job-board")}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Browse Jobs
              </button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Applications List */}
            <div className="lg:col-span-1 space-y-4">
              <h2 className="text-lg font-semibold text-foreground mb-3">Your Applications</h2>
              {applications.map((app) => (
                <Card
                  key={app.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${selectedApplication?.id === app.id
                    ? "ring-2 ring-primary shadow-md"
                    : ""
                    }`}
                  onClick={() => setSelectedApplication(app)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-foreground">{app.position}</h3>
                      <Badge className={statusColors[app.status]}>
                        {statusLabels[app.status]}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        <span>{app.branch}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{app.province}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Applied {format(new Date(app.created_at), "MMMM d, yyyy", { locale: enUS })}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Progress Detail */}
            <div className="lg:col-span-2">
              {upcomingInterview && (
                <Card className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-900/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2 text-blue-800 dark:text-blue-300">
                      <Calendar className="w-5 h-5" />
                      Upcoming Schedule
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <h4 className="font-semibold text-lg">{upcomingInterview.interview_type}</h4>
                        <div className="flex items-center gap-3">
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(upcomingInterview.scheduled_at), "EEEE, dd MMMM yyyy", { locale: enUS })}
                          </p>
                          <Badge variant="outline" className="bg-white text-blue-700 border-blue-200">
                            {format(new Date(upcomingInterview.scheduled_at), "HH:mm")} WIB
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-white/50 rounded-lg border border-blue-100">
                        {upcomingInterview.location_url?.startsWith("http") ? (
                          <Video className="w-5 h-5 text-blue-600 mt-0.5" />
                        ) : (
                          <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
                        )}
                        <div className="text-sm">
                          <span className="font-medium block mb-1">Location / Link:</span>
                          {upcomingInterview.location_url?.startsWith("http") ? (
                            <a
                              href={upcomingInterview.location_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 underline hover:text-blue-800 break-all"
                            >
                              {upcomingInterview.location_url}
                            </a>
                          ) : (
                            <span className="text-gray-700">{upcomingInterview.location_url}</span>
                          )}
                        </div>
                      </div>

                      {upcomingInterview.notes && (
                        <div className="text-sm text-gray-600 bg-white/30 p-3 rounded border border-blue-100/50">
                          <span className="font-semibold block mb-1 text-black text-xs uppercase tracking-wider">Notes:</span>
                          {upcomingInterview.notes}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedApplication && (
                <Card>
                  <CardHeader className="border-b border-border">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">{selectedApplication.position}</CardTitle>
                        <p className="text-muted-foreground mt-1">
                          {selectedApplication.branch} • {selectedApplication.province}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {['offering', 'onboarding', 'accepted', 'rejected'].includes(selectedApplication.status) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 gap-1"
                            onClick={() => setResultPopupOpen(true)}
                          >
                            <Briefcase className="w-3 h-3" />
                            View Message
                          </Button>
                        )}
                        <Badge className={statusColors[selectedApplication.status]}>
                          {statusLabels[selectedApplication.status]}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground mt-3">
                      <span>Applied: {format(new Date(selectedApplication.created_at), "MMMM d, yyyy", { locale: enUS })}</span>
                      <span>•</span>
                      <span>Last Update: {format(new Date(selectedApplication.updated_at), "MMMM d, yyyy", { locale: enUS })}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <ApplicationProgress
                      currentStatus={selectedApplication.status}
                      createdDate={format(new Date(selectedApplication.created_at), "dd MMM yyyy", { locale: enUS })}
                      logs={selectedApplication.logs}
                      jobLevel={selectedApplication.jobs?.job_level || undefined}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Success Notification Dialog */}
      <Dialog open={notificationOpen} onOpenChange={(open) => !open && handleCloseNotification()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-teal-600 flex flex-col items-center gap-2">
              <div className="p-3 bg-teal-50 rounded-full">
                <Briefcase className="w-8 h-8 text-teal-600" />
              </div>
              Application Status Update
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted/30 p-4 rounded-md text-sm whitespace-pre-wrap leading-relaxed">
              {currentNotification?.message}
            </div>
          </div>
          <div className="flex justify-center">
            <Button onClick={handleCloseNotification} className="w-full sm:w-auto min-w-[120px] bg-teal-600 hover:bg-teal-700">
              Understood
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Result Popup (Success/Failure) */}
      <Dialog open={resultPopupOpen} onOpenChange={setResultPopupOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center flex flex-col items-center gap-2">
              {['offering', 'onboarding', 'accepted'].includes(selectedApplication?.status || '') ? (
                <>
                  <div className="p-4 bg-green-100 rounded-full animate-bounce">
                    <Briefcase className="w-10 h-10 text-green-600" />
                  </div>
                  <span className="text-green-700 text-xl">Congratulations! You Passed!</span>
                </>
              ) : (
                <>
                  <div className="p-4 bg-red-100 rounded-full">
                    <Briefcase className="w-10 h-10 text-red-600" />
                  </div>
                  <span className="text-red-700 text-xl">Don't Give Up!</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-center">
            {['offering', 'onboarding', 'accepted'].includes(selectedApplication?.status || '') ? (
              <div className="space-y-3">
                <p className="font-semibold text-gray-800">
                  Congratulations {userName}, you have passed the selection!
                </p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Welcome to the <strong>BYD HAKA Auto</strong> family.
                  We are very enthusiastic to welcome you to our team. Please check your email or WhatsApp for further information regarding the Offering Letter and Onboarding.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="font-semibold text-gray-800">
                  We are sorry, {userName}
                </p>
                {applications.some(app => ['offering', 'onboarding', 'accepted'].includes(app.status)) ? (
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Thank you for participating in the selection process.
                    We are sorry, you cannot proceed with the selection process for the position <strong>{selectedApplication?.position}</strong> because you have been <strong>ACCEPTED</strong> for the position <strong>{applications.find(app => ['offering', 'onboarding', 'accepted'].includes(app.status))?.position}</strong>.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Thank you for participating in the selection process at BYD HAKA Auto.
                      However, we must inform you that you <strong>cannot proceed</strong> to the next stage.
                    </p>
                    <p className="text-sm text-gray-500 italic px-4 py-2 bg-gray-50 rounded-lg mx-auto inline-block border border-gray-100">
                      Stopped at stage: {getLastStageName()}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      Don't give up! Keep developing your potential and try again next time.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-center pt-2">
            <Button onClick={() => setResultPopupOpen(false)} className={`w-full sm:w-auto min-w-[120px] ${selectedApplication?.status === 'offering' ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-800 hover:bg-gray-900'}`}>
              Close Message
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

