import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { PlusCircle, Pencil, Trash2, Briefcase, Calendar, Building2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Experience {
    id: string;
    position: string;
    job_level: string;
    company: string;
    division: string;
    industry: string;
    employment_type: string;
    start_month: string;
    start_year: string;
    end_month: string;
    end_year: string;
    is_current: boolean;
    net_salary: number;
    leaving_reason: string;
    subordinates_count: number;
    job_description: string;
}

export default function ExperienceSection({ userId }: { userId: string }) {
    const [experiences, setExperiences] = useState<Experience[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState<string | null>(null);

    // Form State
    const [position, setPosition] = useState("");
    const [jobLevel, setJobLevel] = useState("");
    const [company, setCompany] = useState("");
    const [division, setDivision] = useState("");
    const [industry, setIndustry] = useState("");
    const [employmentType, setEmploymentType] = useState("");
    const [startMonth, setStartMonth] = useState("");
    const [startYear, setStartYear] = useState("");
    const [endMonth, setEndMonth] = useState("");
    const [endYear, setEndYear] = useState("");
    const [isCurrent, setIsCurrent] = useState(false);
    const [netSalary, setNetSalary] = useState("");
    const [leavingReason, setLeavingReason] = useState("");
    const [subordinatesCount, setSubordinatesCount] = useState("");
    const [jobDescription, setJobDescription] = useState("");

    const jobLevels = ["Staff", "Supervisor", "Manager", "General Manager", "Director", "Internship"];
    const employmentTypes = ["Full Time", "Contract", "Freelance", "Internship"];
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const years = Array.from({ length: 50 }, (_, i) => (new Date().getFullYear() - i).toString());

    useEffect(() => {
        fetchExperiences();
    }, [userId]);

    const fetchExperiences = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("profile_experiences" as any)
            .select("*")
            .eq("user_id", userId)
            .order("start_year", { ascending: false });

        if (error) {
            console.error("Error fetching experiences:", error);
            toast.error("Failed to load experience history");
        } else {
            setExperiences((data as any) || []);
        }
        setLoading(false);
    };

    const handleEdit = (exp: Experience) => {
        setIsEditing(true);
        setCurrentId(exp.id);

        setPosition(exp.position);
        setJobLevel(exp.job_level);
        setCompany(exp.company);
        setDivision(exp.division);
        setIndustry(exp.industry);
        setEmploymentType(exp.employment_type);
        setStartMonth(exp.start_month);
        setStartYear(exp.start_year);
        setEndMonth(exp.end_month || "");
        setEndYear(exp.end_year || "");
        setIsCurrent(exp.is_current);
        setNetSalary(exp.net_salary.toString());
        setLeavingReason(exp.leaving_reason || "");
        setSubordinatesCount(exp.subordinates_count.toString());
        setJobDescription(exp.job_description);
    };

    const handleAddNew = () => {
        setIsEditing(true);
        setCurrentId(null);
        resetForm();
    };

    const handleCancel = () => {
        setIsEditing(false);
        setCurrentId(null);
        resetForm();
    };

    const resetForm = () => {
        setPosition("");
        setJobLevel("");
        setCompany("");
        setDivision("");
        setIndustry("");
        setEmploymentType("");
        setStartMonth("");
        setStartYear("");
        setEndMonth("");
        setEndYear("");
        setIsCurrent(false);
        setNetSalary("");
        setLeavingReason("");
        setSubordinatesCount("0");
        setJobDescription("");
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this experience entry?")) return;

        const { error } = await supabase
            .from("profile_experiences" as any)
            .delete()
            .eq("id", id);

        if (error) {
            toast.error("Failed to delete entry");
        } else {
            toast.success("Entry deleted");
            fetchExperiences();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const payload = {
            user_id: userId,
            position,
            job_level: jobLevel,
            company,
            division,
            industry,
            employment_type: employmentType,
            start_month: startMonth,
            start_year: startYear,
            end_month: isCurrent ? null : endMonth,
            end_year: isCurrent ? null : endYear,
            is_current: isCurrent,
            net_salary: parseFloat(netSalary.replace(/[^0-9.]/g, '')),
            leaving_reason: leavingReason,
            subordinates_count: parseInt(subordinatesCount) || 0,
            job_description: jobDescription
        };

        let error;
        if (currentId) {
            const { error: updateError } = await supabase
                .from("profile_experiences" as any)
                .update(payload)
                .eq("id", currentId);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from("profile_experiences" as any)
                .insert(payload);
            error = insertError;
        }

        if (error) {
            console.error(error);
            toast.error("Failed to save experience");
        } else {
            toast.success("Experience saved successfully");
            setIsEditing(false);
            fetchExperiences();
            resetForm();
        }
    };

    if (loading) return <div>Loading experiences...</div>;

    return (
        <Card className="w-full bg-white shadow-sm border-gray-100">
            <CardContent className="p-6">
                {!isEditing ? (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center border-b pb-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Employment History<span className="text-red-500">*</span></h2>
                                <p className="text-sm text-gray-500">max 3</p>
                            </div>
                            <Button onClick={handleAddNew} variant="ghost" className="text-green-600 hover:text-green-700 hover:bg-green-50 font-semibold gap-2">
                                <PlusCircle className="w-5 h-5" />
                                Add
                            </Button>
                        </div>

                        {experiences.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                <Briefcase className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                                <h3 className="text-lg font-medium text-gray-900">No employment history</h3>
                                <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1">
                                    Please add your work experience, max 3 latest entries.
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {experiences.map((exp) => (
                                    <div key={exp.id} className="relative bg-white border border-gray-100 rounded-xl p-5 hover:shadow-md transition-shadow group">
                                        <div className="absolute top-4 right-4 flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleEdit(exp)}>
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(exp.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>

                                        <div className="flex flex-col md:flex-row gap-4 items-start">
                                            {/* Icon Placeholder */}
                                            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                                                <Briefcase className="w-6 h-6 text-green-600" />
                                            </div>

                                            <div className="flex-1 space-y-2">
                                                {/* Header Info */}
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                                            {exp.position}
                                                        </span>
                                                        <span className="text-xs text-gray-500 flex items-center gap-1">
                                                            <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                                                            {exp.job_level}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-lg font-bold text-gray-900 leading-tight">
                                                        {exp.company}
                                                    </h3>
                                                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-gray-600">
                                                        <span className="flex items-center gap-1.5">
                                                            <Calendar className="w-3.5 h-3.5" />
                                                            {exp.start_month} {exp.start_year} - {exp.is_current ? "Present" : `${exp.end_month} ${exp.end_year}`}
                                                        </span>
                                                        <span className="flex items-center gap-1.5">
                                                            <Building2 className="w-3.5 h-3.5" />
                                                            {exp.industry} | {exp.division}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Details Section */}
                                                <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-3 mt-3 border border-gray-100">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                                                        <div>
                                                            <span className="font-semibold text-gray-700 block text-xs uppercase tracking-wide opacity-75 mb-0.5">Salary</span>
                                                            <p className="text-gray-800 font-medium">IDR {exp.net_salary.toLocaleString('id-ID')}</p>
                                                        </div>
                                                        <div>
                                                            <span className="font-semibold text-gray-700 block text-xs uppercase tracking-wide opacity-75 mb-0.5">Status</span>
                                                            <p className="text-gray-800 font-medium">{exp.employment_type}</p>
                                                        </div>
                                                        {exp.leaving_reason && (
                                                            <div className="sm:col-span-2 mt-1">
                                                                <span className="font-semibold text-gray-700 block text-xs uppercase tracking-wide opacity-75 mb-0.5">Reason for Leaving</span>
                                                                <p className="text-gray-800 font-medium">{exp.leaving_reason}</p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {exp.job_description && (
                                                        <div className="pt-2 border-t border-gray-200/60 mt-2">
                                                            <span className="font-semibold text-gray-700 block text-xs uppercase tracking-wide opacity-75 mb-1">Job Description</span>
                                                            <div className="text-gray-700 whitespace-pre-line pl-3 border-l-2 border-green-200">
                                                                {exp.job_description}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    /* FORM MODE */
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="border-b pb-4 mb-4">
                            <h2 className="text-xl font-bold text-gray-800">
                                {currentId ? "Edit Employment History" : "Add Employment History"}
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left Column */}
                            <div className="space-y-2">
                                <Label>Position <span className="text-red-500">*</span></Label>
                                <Input value={position} onChange={e => setPosition(e.target.value.toUpperCase())} placeholder="Enter Position" required />
                            </div>

                            <div className="space-y-2">
                                <Label>Start Date <span className="text-red-500">*</span></Label>
                                <div className="flex gap-2">
                                    <Select value={startMonth} onValueChange={setStartMonth} required>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Month" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Select value={startYear} onValueChange={setStartYear} required>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Year" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Job Level <span className="text-red-500">*</span></Label>
                                <Select value={jobLevel} onValueChange={setJobLevel} required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {jobLevels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>End Date <span className="text-red-500">*</span></Label>
                                <div className="flex gap-2">
                                    <Select value={endMonth} onValueChange={setEndMonth} disabled={isCurrent}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Month" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Select value={endYear} onValueChange={setEndYear} disabled={isCurrent}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Year" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center space-x-2 mt-2">
                                    <Checkbox id="currentExp" checked={isCurrent} onCheckedChange={(c) => setIsCurrent(c as boolean)} />
                                    <Label htmlFor="currentExp">Present</Label>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Company <span className="text-red-500">*</span></Label>
                                <Input value={company} onChange={e => setCompany(e.target.value.toUpperCase())} placeholder="Enter company/institution name" required />
                            </div>

                            <div className="space-y-2">
                                <Label>Net Salary <span className="text-red-500">*</span></Label>
                                <Input
                                    type="number"
                                    value={netSalary}
                                    onChange={e => setNetSalary(e.target.value)}
                                    placeholder="Rp 1.000.000"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Division <span className="text-red-500">*</span></Label>
                                <Input value={division} onChange={e => setDivision(e.target.value.toUpperCase())} placeholder="Select/Type" required />
                            </div>

                            <div className="space-y-2">
                                <Label>Reason for Leaving</Label>
                                <Select value={leavingReason} onValueChange={setLeavingReason}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Resign">Resign</SelectItem>
                                        <SelectItem value="Contract End">Contract Ended</SelectItem>
                                        <SelectItem value="Layoff">Layoff</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Industry <span className="text-red-500">*</span></Label>
                                <Input value={industry} onChange={e => setIndustry(e.target.value.toUpperCase())} placeholder="Select" required />
                            </div>

                            <div className="space-y-2">
                                <Label>Number of Subordinates <span className="text-red-500">*</span></Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        value={subordinatesCount}
                                        onChange={e => setSubordinatesCount(e.target.value)}
                                        placeholder="0"
                                    />
                                    <span>People</span>
                                </div>
                                <div className="flex items-center space-x-2 mt-1">
                                    <Checkbox
                                        id="noSub"
                                        checked={subordinatesCount === "0"}
                                        onCheckedChange={(c) => c ? setSubordinatesCount("0") : setSubordinatesCount("")}
                                    />
                                    <Label htmlFor="noSub">No subordinates</Label>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Employment Status <span className="text-red-500">*</span></Label>
                                <Select value={employmentType} onValueChange={setEmploymentType} required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {employmentTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2 mt-6">
                            <Label>Job Description <span className="text-red-500">*</span></Label>
                            <Textarea
                                value={jobDescription}
                                onChange={e => setJobDescription(e.target.value.toUpperCase())}
                                placeholder="Explain your responsibilities and achievements..."
                                className="min-h-[150px]"
                                required
                            />
                        </div>

                        <div className="flex gap-4 pt-4 border-t mt-4">
                            <Button type="submit" className="bg-primary hover:bg-primary/90 w-full md:w-auto">
                                Save Changes
                            </Button>
                            <Button type="button" variant="outline" onClick={handleCancel} className="w-full md:w-auto">
                                Cancel
                            </Button>
                        </div>
                    </form>
                )}
            </CardContent>
        </Card>
    );
}
