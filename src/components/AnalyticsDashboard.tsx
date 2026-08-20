import { useMemo } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format, subDays, startOfDay, isAfter, parseISO } from "date-fns";

interface AnalyticsDashboardProps {
    applications: any[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function AnalyticsDashboard({ applications }: AnalyticsDashboardProps) {

    // 1. Applications Trend (Last 30 Days)
    const trendData = useMemo(() => {
        const last30Days = Array.from({ length: 30 }, (_, i) => {
            const date = subDays(new Date(), 29 - i);
            return {
                date: format(date, "MMM dd"),
                rawDate: startOfDay(date),
                count: 0
            };
        });

        applications.forEach(app => {
            const appDate = startOfDay(new Date(app.created_at));
            const dayEntry = last30Days.find(d => d.rawDate.getTime() === appDate.getTime());
            if (dayEntry) {
                dayEntry.count += 1;
            }
        });

        return last30Days;
    }, [applications]);

    // 2. Recruitment Funnel
    const funnelData = useMemo(() => {
        const statusCounts: Record<string, number> = {
            'Applied': 0,
            'HR Interview': 0,
            'User Interview': 0,
            'Psikotes/Test': 0,
            'Offering': 0,
            'Accepted': 0
        };

        applications.forEach(app => {
            statusCounts['Applied']++; // All applicants started here

            if (['interview_hc', 'interview_user', 'psikotes', 'test_bidang', 'offering', 'accepted', 'onboarding'].includes(app.status)) {
                statusCounts['HR Interview']++;
            }
            if (['interview_user', 'psikotes', 'test_bidang', 'offering', 'accepted', 'onboarding'].includes(app.status)) {
                statusCounts['User Interview']++;
            }
            if (['psikotes', 'test_bidang', 'offering', 'accepted', 'onboarding'].includes(app.status)) {
                statusCounts['Psikotes/Test']++;
            }
            if (['offering', 'accepted', 'onboarding'].includes(app.status)) {
                statusCounts['Offering']++;
            }
            if (['accepted', 'onboarding'].includes(app.status)) {
                statusCounts['Accepted']++;
            }
        });

        return Object.keys(statusCounts).map(status => ({
            name: status,
            value: statusCounts[status]
        }));
    }, [applications]);

    // 3. Job Distribution
    const jobData = useMemo(() => {
        const counts: Record<string, number> = {};
        applications.forEach(app => {
            const pos = app.position || "Unknown";
            counts[pos] = (counts[pos] || 0) + 1;
        });

        return Object.keys(counts)
            .map(pos => ({ name: pos, value: counts[pos] }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // Top 5
    }, [applications]);

    const totalApplications = applications.length;
    const totalAccepted = applications.filter(a => a.status === 'accepted' || a.status === 'onboarding').length;
    const conversionRate = totalApplications > 0 ? ((totalAccepted / totalApplications) * 100).toFixed(1) : "0";

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Applicants</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalApplications}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Hired</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">{totalAccepted}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Conversion Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{conversionRate}%</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Trend Chart */}
                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle>Application Trend (30 Days)</CardTitle>
                        <CardDescription>Daily number of new applications received</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <Tooltip />
                                <Area type="monotone" dataKey="count" stroke="#8884d8" fillOpacity={1} fill="url(#colorCount)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Funnel Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Recruitment Funnel</CardTitle>
                        <CardDescription>Candidate progression through stages</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={funnelData} layout="vertical" margin={{ left: 40 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                                <Tooltip />
                                <Bar dataKey="value" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={30} label={{ position: 'right', fill: '#666' }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Job Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle>Top 5 Jobs</CardTitle>
                        <CardDescription>Distribution of applicants by position</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={jobData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {jobData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
