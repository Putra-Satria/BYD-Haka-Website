import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { PlusCircle, Pencil, Trash2, GraduationCap, Link as LinkIcon, FileText, Calendar, MapPin } from "lucide-react";
import { toast } from "sonner";

interface Education {
    id: string;
    degree: string;
    major: string;
    institution: string;
    city: string;
    gpa: number;
    start_year: string;
    end_year: string;
    is_current: boolean;
    thesis_title: string;
    link: string;
}

export default function EducationSection({ userId }: { userId: string }) {
    const [educations, setEducations] = useState<Education[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState<string | null>(null);

    // Form State
    const [degree, setDegree] = useState("");
    const [major, setMajor] = useState("");
    const [institution, setInstitution] = useState("");
    const [city, setCity] = useState("");
    const [gpa, setGpa] = useState("");
    const [startYear, setStartYear] = useState("");
    const [endYear, setEndYear] = useState("");
    const [isCurrent, setIsCurrent] = useState(false);
    const [thesisTitle, setThesisTitle] = useState("");
    const [link, setLink] = useState("");

    useEffect(() => {
        fetchEducations();
    }, [userId]);

    const fetchEducations = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("profile_educations" as any)
            .select("*")
            .eq("user_id", userId)
            .order("start_year", { ascending: false });

        if (error) {
            console.error("Error fetching educations:", error);
            toast.error("Failed to load education history");
        } else {
            setEducations((data as any) || []);
        }
        setLoading(false);
    };

    const handleEdit = (edu: Education) => {
        setIsEditing(true);
        setCurrentId(edu.id);

        setDegree(edu.degree);
        setMajor(edu.major);
        setInstitution(edu.institution);
        setCity(edu.city);
        setGpa(edu.gpa?.toString() || "");
        setStartYear(edu.start_year);
        setEndYear(edu.end_year || "");
        setIsCurrent(edu.is_current);
        setThesisTitle(edu.thesis_title || "");
        setLink(edu.link || "");
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
        setDegree("");
        setMajor("");
        setInstitution("");
        setCity("");
        setGpa("");
        setStartYear("");
        setEndYear("");
        setIsCurrent(false);
        setThesisTitle("");
        setLink("");
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this education entry?")) return;

        const { error } = await supabase
            .from("profile_educations" as any)
            .delete()
            .eq("id", id);

        if (error) {
            toast.error("Failed to delete entry");
        } else {
            toast.success("Entry deleted");
            fetchEducations();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const payload = {
            user_id: userId,
            degree,
            major,
            institution,
            city,
            gpa: parseFloat(gpa),
            start_year: startYear,
            end_year: isCurrent ? null : endYear,
            is_current: isCurrent,
            thesis_title: thesisTitle,
            link
        };

        let error;
        if (currentId) {
            const { error: updateError } = await supabase
                .from("profile_educations" as any)
                .update(payload)
                .eq("id", currentId);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from("profile_educations" as any)
                .insert(payload);
            error = insertError;
        }

        if (error) {
            console.error(error);
            toast.error("Failed to save education");
        } else {
            toast.success("Education saved successfully");
            setIsEditing(false);
            fetchEducations();
            resetForm();
        }
    };

    // Years generator
    const years = Array.from({ length: 50 }, (_, i) => (new Date().getFullYear() - i).toString());

    if (loading) return <div>Loading education data...</div>;

    return (
        <Card className="w-full bg-white shadow-sm border-gray-100">
            <CardContent className="p-6">
                {!isEditing ? (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center border-b pb-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Education<span className="text-red-500">*</span></h2>
                                <p className="text-sm text-gray-500">max 3</p>
                            </div>
                            <Button onClick={handleAddNew} variant="ghost" className="text-green-600 hover:text-green-700 hover:bg-green-50 font-semibold gap-2">
                                <PlusCircle className="w-5 h-5" />
                                Add
                            </Button>
                        </div>

                        {educations.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                <GraduationCap className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                                <h3 className="text-lg font-medium text-gray-900">No education data</h3>
                                <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1">
                                    Please add your education history, max 3 latest entries.
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {educations.map((edu) => (
                                    <div key={edu.id} className="relative bg-white border border-gray-100 rounded-xl p-5 hover:shadow-md transition-shadow group">
                                        <div className="absolute top-4 right-4 flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleEdit(edu)}>
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(edu.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>

                                        <div className="flex flex-col md:flex-row gap-4 items-start">
                                            {/* Icon Placeholder */}
                                            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                                                <GraduationCap className="w-6 h-6 text-green-600" />
                                            </div>

                                            <div className="flex-1 space-y-2">
                                                {/* Header Info */}
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                                            {edu.degree}
                                                        </span>
                                                        <span className="text-xs text-gray-500 flex items-center gap-1">
                                                            <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                                                            {edu.major}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-lg font-bold text-gray-900 leading-tight">
                                                        {edu.institution}
                                                    </h3>
                                                    <div className="flex items-center gap-3 mt-1.5 text-sm text-gray-600">
                                                        <span className="flex items-center gap-1.5">
                                                            <Calendar className="w-3.5 h-3.5" />
                                                            {edu.start_year} - {edu.is_current ? "Present" : edu.end_year}
                                                        </span>
                                                        <span className="flex items-center gap-1.5">
                                                            <MapPin className="w-3.5 h-3.5" />
                                                            {edu.city}
                                                        </span>
                                                        <span className="flex items-center gap-1.5 font-medium text-green-700">
                                                            GPA: {edu.gpa}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Thesis / Link Section */}
                                                {(edu.thesis_title || edu.link) && (
                                                    <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-2 mt-3 border border-gray-100">
                                                        {edu.thesis_title && (
                                                            <div className="flex gap-2.5 items-start">
                                                                <FileText className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                                                                <div>
                                                                    <span className="font-semibold text-gray-700 block text-xs uppercase tracking-wide opacity-75 mb-0.5">Final Project</span>
                                                                    <p className="text-gray-800 font-medium">{edu.thesis_title}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {edu.link && (
                                                            <div className="flex gap-2.5 items-start">
                                                                <LinkIcon className="w-4 h-4 text-gray-400 mt-1 shrink-0" />
                                                                <div>
                                                                    <span className="font-semibold text-gray-700 block text-xs uppercase tracking-wide opacity-75 mb-0.5">Portfolio / Link</span>
                                                                    <a href={edu.link} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline break-all">
                                                                        {edu.link}
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
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
                                {currentId ? "Edit Education" : "Add Education"}
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Degree <span className="text-red-500">*</span></Label>
                                <Select value={degree} onValueChange={setDegree} required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Degree" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="SMA/SMK">SMA / SMK</SelectItem>
                                        <SelectItem value="D3">D3</SelectItem>
                                        <SelectItem value="D4">D4</SelectItem>
                                        <SelectItem value="S1">S1</SelectItem>
                                        <SelectItem value="S2">S2</SelectItem>
                                        <SelectItem value="S3">S3</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Major <span className="text-red-500">*</span></Label>
                                <Input value={major} onChange={e => setMajor(e.target.value.toUpperCase())} placeholder="e.g. Computer Science" required />
                            </div>

                            <div className="space-y-2">
                                <Label>Institution Name <span className="text-red-500">*</span></Label>
                                <Input value={institution} onChange={e => setInstitution(e.target.value.toUpperCase())} placeholder="Campus / School Name" required />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>IPK <span className="text-red-500">*</span></Label>
                                    <Input type="number" step="0.01" max="4.00" value={gpa} onChange={e => setGpa(e.target.value)} placeholder="0.00" required />
                                </div>
                                <div className="space-y-2">
                                    <Label>City <span className="text-red-500">*</span></Label>
                                    <Input value={city} onChange={e => setCity(e.target.value.toUpperCase())} placeholder="City Name" required />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Start Year <span className="text-red-500">*</span></Label>
                                <Select value={startYear} onValueChange={setStartYear} required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Graduation Year <span className="text-red-500">*</span></Label>
                                <Select value={endYear} onValueChange={setEndYear} disabled={isCurrent}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <div className="flex items-center space-x-2 mt-2">
                                    <Checkbox id="current" checked={isCurrent} onCheckedChange={(c) => setIsCurrent(c as boolean)} />
                                    <Label htmlFor="current">Until Now</Label>
                                </div>
                            </div>



                            <div className="space-y-2 md:col-span-2">
                                <Label>Thesis / Final Project Title <span className="text-red-500">*</span></Label>
                                <Input value={thesisTitle} onChange={e => setThesisTitle(e.target.value.toUpperCase())} placeholder="Enter Thesis Title" required />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label>Link (Optional)</Label>
                                <Input value={link} onChange={e => setLink(e.target.value)} type="url" placeholder="https://" />
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4">
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
