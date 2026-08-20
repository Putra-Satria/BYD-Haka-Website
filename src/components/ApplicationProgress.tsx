import { Check, Clock, Circle, X, FileText, Users, Brain, ClipboardList, Shield, Gift, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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

interface ApplicationProgressProps {
  currentStatus: ApplicationStatus;
  className?: string;
  createdDate?: string;
  logs?: any[];
  jobLevel?: string;
}

// Helper to determine if the job is a leader level
const isLeaderLevel = (level?: string) => {
  if (!level) return false;
  const upper = level.toUpperCase();
  return ["EXECUTIVE LEADER", "STRATEGIC LEADER", "OPERATIONAL LEADER", "TECHNICAL LEADER"].includes(upper);
};

// Dynamic stages generator
const getStages = (jobLevel?: string) => {
  const isLeader = isLeaderLevel(jobLevel);
  return [
    { id: 'submitted', label: 'Submitted', icon: FileText },
    { id: 'on_review', label: 'On Review', icon: Clock },
    { id: 'interview_hc', label: 'HR Interview', icon: Users },
    { id: 'interview_user', label: 'User Interview', icon: Users },
    {
      id: 'psikotes',
      label: isLeader ? 'Assessment' : 'Psychological Test',
      icon: isLeader ? ClipboardList : Brain
    },
    { id: 'test_bidang', label: 'Technical Test', icon: ClipboardList },
    { id: 'background_check', label: 'Background Check', icon: Shield },
    { id: 'offering', label: 'Offering', icon: Gift },
    { id: 'onboarding', label: 'Onboarding', icon: Rocket },
  ];
};

const getStageIndex = (status: ApplicationStatus, stages: any[]): number => {
  if (status === 'accepted') return stages.length;
  if (status === 'rejected') return -1;
  if (status === 'assessment') return stages.findIndex((s: any) => s.id === 'psikotes');
  return stages.findIndex((s: any) => s.id === status);
};

export function ApplicationProgress({ currentStatus, className, createdDate, logs = [], jobLevel }: ApplicationProgressProps) {
  const stages = getStages(jobLevel);
  const currentIndex = getStageIndex(currentStatus, stages);
  const isRejected = currentStatus === 'rejected';
  const isAccepted = currentStatus === 'accepted';

  // Calculate the furthest stage reached based on logs
  const maxStageReached = logs.reduce((max, log) => {
    const index = getStageIndex(log.status as ApplicationStatus, stages);
    return index > max ? index : max;
  }, -1);

  // If rejected, show progress up to the last active stage reached
  const displayIndex = isRejected ? maxStageReached : currentIndex;

  const getStageDate = (stageId: string, stageIndex: number) => {
    if (stageId === 'submitted') return createdDate;

    // 1. Try to find exact log for this stage
    // For merged stage (psikotes), also check for 'assessment' log
    let exactLog = logs.find(l => l.status === stageId);

    if (!exactLog && stageId === 'psikotes') {
      exactLog = logs.find(l => l.status === 'assessment');
    }

    if (exactLog) {
      return new Date(exactLog.created_at).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }

    // 2. If no exact log and this stage is completed (index < current),
    // find the first log of a *later* stage to use as fallback
    if (stageIndex < displayIndex) {
      // Find all logs for stages *after* this one
      const laterLogs = logs
        .filter(l => {
          const logStageIndex = getStageIndex(l.status as ApplicationStatus, stages);
          return logStageIndex > stageIndex;
        })
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      // Use the earliest of the later logs
      if (laterLogs.length > 0) {
        return new Date(laterLogs[0].created_at).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      }
    }

    return null;
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-1">Application Progress</h3>
        <p className="text-sm text-muted-foreground">
          {isRejected
            ? "We're sorry, your application was not successful this time."
            : isAccepted
              ? "Congratulations! Your application has been accepted!"
              : "Track your application status below"}
        </p>
      </div>

      {/* Progress Steps - Vertical Timeline */}
      <div className="relative">
        {stages.map((stage, index) => {
          const isCompleted = displayIndex > index;
          const isCurrent = !isRejected && displayIndex === index;
          const isPending = index > displayIndex;
          const Icon = stage.icon;
          const stageDate = getStageDate(stage.id, index);

          return (
            <div key={stage.id} className="relative flex items-start gap-4 pb-8 last:pb-0">
              {/* Vertical Line */}
              {index < stages.length - 1 && (
                <div
                  className={cn(
                    "absolute left-5 top-10 w-0.5 h-full -translate-x-1/2",
                    isCompleted ? "bg-primary" : "bg-border"
                  )}
                />
              )}

              {/* Circle/Icon */}
              <div
                className={cn(
                  "relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300",
                  isCompleted && "bg-primary border-primary text-primary-foreground",
                  isCurrent && "bg-primary/10 border-primary text-primary animate-pulse",
                  isPending && !isRejected && "bg-muted border-border text-muted-foreground",
                  isRejected && "bg-muted border-border text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : isCurrent ? (
                  <Icon className="w-5 h-5" />
                ) : (
                  <Circle className="w-4 h-4" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pt-1.5">
                <div className="flex justify-between items-start">
                  <div>
                    <p
                      className={cn(
                        "font-medium transition-colors",
                        isCompleted && "text-primary",
                        isCurrent && "text-foreground",
                        isPending && "text-muted-foreground"
                      )}
                    >
                      {stage.label}
                    </p>
                    {isCurrent && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Currently at this stage
                      </p>
                    )}
                  </div>

                  {/* Dates */}
                  <div className="text-right">
                    {stageDate && (
                      <p className={cn(
                        "text-xs font-medium",
                        isCurrent ? "text-primary" : "text-muted-foreground"
                      )}>
                        {stageDate}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Final Status */}
        {(isAccepted || isRejected) && (
          <div className="relative flex items-start gap-4 pt-4 border-t border-border mt-4">
            <div
              className={cn(
                "relative z-10 flex items-center justify-center w-10 h-10 rounded-full",
                isAccepted && "bg-primary text-primary-foreground",
                isRejected && "bg-destructive text-destructive-foreground"
              )}
            >
              {isAccepted ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
            </div>
            <div className="flex-1 pt-1.5">
              <p
                className={cn(
                  "font-semibold",
                  isAccepted && "text-primary",
                  isRejected && "text-destructive"
                )}
              >
                {isAccepted ? "Accepted" : "Not Successful"}
              </p>

              {isAccepted ? (
                <p className="text-sm text-muted-foreground mt-0.5">
                  Welcome to Haka Auto! We'll contact you soon.
                </p>
              ) : (
                <div className="mt-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="text-sm text-destructive underline hover:text-destructive/80 font-medium">
                        View Message from HR
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Application Status Update</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 text-sm leading-relaxed text-muted-foreground pt-2">
                        <p>Selamat siang pak/bu,</p>
                        <p>
                          Kami mengucapkan terima kasih sudah mengikuti proses seleksi, meluangkan waktu untuk sharing latar belakang dan pengalaman di perusahaan kami.
                        </p>
                        <p>
                          Setelah melalui evaluasi menyeluruh, dengan ini kami sampaikan bahwa bapak/ibu belum lolos ke tahap berikutnya.
                        </p>
                        <p>
                          Kami menghargai rangkaian proses yang sudah bapak/ibu jalani, dan semoga diberikan kemudahan serta kesehatan selalu.
                        </p>
                        <p className="font-semibold text-foreground pt-2">
                          Salam hangat,<br />
                          Tim Talent Acquisition Haka Auto
                        </p>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
