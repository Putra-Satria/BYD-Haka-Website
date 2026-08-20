import { useState, useEffect } from "react";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { toast } from "sonner";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, MapPin, Video, User, Clock } from "lucide-react";
import { enUS } from 'date-fns/locale';

const locales = {
    'en-US': enUS,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

interface InterviewEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    resource: {
        type: string;
        location: string;
        notes: string;
        applicantName: string;
        position: string;
        status: string;
    };
}

export function InterviewCalendar() {
    const [events, setEvents] = useState<InterviewEvent[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<InterviewEvent | null>(null);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        fetchInterviews();
    }, []);

    const fetchInterviews = async () => {
        try {
            // 1. Fetch interviews with applications
            const { data: interviewsData, error: interviewsError } = await supabase
                .from("interviews" as any)
                .select(`
                    *,
                    applications (
                        id,
                        position,
                        status,
                        user_id
                    )
                `);

            if (interviewsError) throw interviewsError;

            if (!interviewsData || interviewsData.length === 0) {
                setEvents([]);
                return;
            }

            console.log("Raw Interviews Data:", interviewsData);

            // 2. Extract user_ids to fetch profiles
            const userIds = [...new Set(interviewsData.map((item: any) => item.applications?.user_id).filter(Boolean))];

            let profilesMap = new Map();

            if (userIds.length > 0) {
                const { data: profilesData, error: profilesError } = await supabase
                    .from("profiles")
                    .select("user_id, full_name")
                    .in("user_id", userIds);

                if (profilesError) {
                    console.error("Error fetching profiles:", profilesError);
                    // Continue without profiles if error, or throw? 
                    // Better to show partial data than nothing.
                } else if (profilesData) {
                    profilesMap = new Map(profilesData.map((p: any) => [p.user_id, p]));
                }
            }

            // 3. Merge data
            const formattedEvents: InterviewEvent[] = interviewsData.map((item: any) => {
                const startDate = new Date(item.scheduled_at);
                const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour
                const application = item.applications;
                const profile = application ? profilesMap.get(application.user_id) : null;
                const applicantName = profile?.full_name || "Unknown Applicant";

                return {
                    id: item.id,
                    title: `${item.interview_type} - ${applicantName}`,
                    start: startDate,
                    end: endDate,
                    resource: {
                        type: item.interview_type,
                        location: item.location_url,
                        notes: item.notes,
                        applicantName: applicantName,
                        position: application?.position || "Unknown Role",
                        status: application?.status || "Unknown Status"
                    }
                };
            });

            console.log("Formatted Events:", formattedEvents);
            setEvents(formattedEvents);

        } catch (error: any) {
            console.error("Error fetching interviews:", JSON.stringify(error, null, 2));
            toast.error(`Failed to load interview schedule: ${error.message || 'Unknown error'}`);
        }
    };

    const eventStyleGetter = (event: InterviewEvent) => {
        let backgroundColor = '#3174ad';
        if (event.resource.type === 'HR Interview') backgroundColor = '#2563eb'; // Blue
        if (event.resource.type === 'User Interview') backgroundColor = '#16a34a'; // Green
        if (event.resource.type === 'Psychotes') backgroundColor = '#9333ea'; // Purple
        if (event.resource.type === 'Technical Test') backgroundColor = '#db2777'; // Pink

        return {
            style: {
                backgroundColor,
                borderRadius: '5px',
                opacity: 0.8,
                color: 'white',
                border: '0px',
                display: 'block'
            }
        };
    };

    return (
        <Card className="h-[700px] flex flex-col">
            <CardHeader>
                <CardTitle>Interview Schedule</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-4">
                <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: "100%" }}
                    eventPropGetter={eventStyleGetter}
                    onSelectEvent={(event) => {
                        setSelectedEvent(event);
                        setOpen(true);
                    }}
                    views={['month', 'week', 'day', 'agenda']}
                />

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Interview Details</DialogTitle>
                        </DialogHeader>
                        {selectedEvent && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <User className="w-5 h-5 text-muted-foreground" />
                                    <div>
                                        <p className="font-medium">{selectedEvent.resource.applicantName}</p>
                                        <p className="text-sm text-muted-foreground">{selectedEvent.resource.position}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground">Type</label>
                                        <div><Badge>{selectedEvent.resource.type}</Badge></div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground">Status</label>
                                        <div className="capitalize font-medium text-sm">{selectedEvent.resource.status.replace('_', ' ')}</div>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> Time
                                    </label>
                                    <p className="text-sm">{format(selectedEvent.start, "PPP p")} - {format(selectedEvent.end, "p")}</p>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                        {selectedEvent.resource.location.startsWith('http') ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                                        Location / Link
                                    </label>
                                    {selectedEvent.resource.location.startsWith('http') ? (
                                        <a
                                            href={selectedEvent.resource.location}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                                        >
                                            {selectedEvent.resource.location} <ExternalLink className="w-3 h-3" />
                                        </a>
                                    ) : (
                                        <p className="text-sm">{selectedEvent.resource.location || "No location specified"}</p>
                                    )}
                                </div>

                                {selectedEvent.resource.notes && (
                                    <div className="space-y-1 bg-muted/30 p-3 rounded-md">
                                        <label className="text-xs font-medium text-muted-foreground">Notes</label>
                                        <p className="text-sm italic">{selectedEvent.resource.notes}</p>
                                    </div>
                                )}

                                <div className="flex justify-end pt-2">
                                    <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}
