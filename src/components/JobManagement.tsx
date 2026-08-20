
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Edit, Trash2, Plus, UploadCloud, Eye, EyeOff } from "lucide-react";
import { jobsData } from "@/data/jobsData";
import { getJobDescription } from "@/data/jobDescriptions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function JobManagement() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingJob, setEditingJob] = useState<any | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        title: "",
        position: "",
        branch: "",
        location: "",
        province: "",
        type: "Full Time",
        job_level: "STAFF",
        description: "",
        general_requirements: "",
        specific_requirements: "",
        benefits: "",
        is_active: true
    });

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        setLoading(true);
        const { data, error } = await (supabase as any).from("jobs").select("*").order("created_at", { ascending: false });

        if (error) {
            console.error(error);
            toast.error("Failed to fetch jobs");
        } else {
            setJobs(data || []);
        }
        setLoading(false);
    };

    const toggleStatus = async (job: any) => {
        const newStatus = !job.is_active;
        const { error } = await (supabase as any)
            .from("jobs")
            .update({ is_active: newStatus })
            .eq("id", job.id);

        if (error) {
            toast.error("Failed to update status");
        } else {
            toast.success(`Job ${newStatus ? 'activated' : 'closed'}`);
            fetchJobs();
        }
    };

    const handleImportJobs = async () => {
        if (!confirm("This will import missing jobs from the hardcoded list. Are you sure?")) return;
        setLoading(true);

        try {
            // 1. Fetch existing jobs to avoid duplicates
            const { data: existingJobs, error: fetchError } = await (supabase as any)
                .from("jobs")
                .select("position, branch, location");

            if (fetchError) throw fetchError;

            // Create a set of unique keys for existing jobs
            const existingKeys = new Set(existingJobs?.map((j: any) => `${j.position}-${j.branch}-${j.location}`));

            const mappedJobs = jobsData
                .filter(job => !existingKeys.has(`${job.position}-${job.branch}-${job.location}`))
                .map(job => {
                    const desc = getJobDescription(job.position);
                    return {
                        title: job.position, // Using position as title for now
                        position: job.position,
                        branch: job.branch,
                        location: job.location,
                        province: job.province,
                        type: job.type || "Full Time",
                        job_level: "STAFF", // Default value as per schema requirements
                        description: desc.description,
                        general_requirements: desc.generalQualifications,
                        specific_requirements: desc.specificQualifications,
                        benefits: desc.benefits,
                        is_active: job.isOpen !== false
                    };
                });

            if (mappedJobs.length === 0) {
                toast.info("All jobs are already imported. No new jobs to add.");
            } else {
                // Batch insert is more efficient but keep it simple
                const { error } = await (supabase as any).from("jobs").insert(mappedJobs);

                if (error) throw error;

                toast.success(`Successfully imported ${mappedJobs.length} new jobs!`);
                fetchJobs();
            }
        } catch (err: any) {
            console.error(err);
            toast.error("Import failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this job?")) return;

        const { error } = await (supabase as any).from("jobs").delete().eq("id", id);
        if (error) {
            toast.error("Failed to delete job");
        } else {
            toast.success("Job deleted");
            fetchJobs();
        }
    };

    const handleSubmit = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            // Parse textarea content into arrays
            const descriptionArray = formData.description.split('\n').filter(line => line.trim() !== "");
            const generalReqArray = formData.general_requirements.split('\n').filter(line => line.trim() !== "");
            const specificReqArray = formData.specific_requirements.split('\n').filter(line => line.trim() !== "");
            const benefitsArray = formData.benefits.split('\n').filter(line => line.trim() !== "");

            const payload = {
                title: formData.title,
                position: formData.position,
                branch: formData.branch,
                location: formData.location,
                province: formData.province,
                type: formData.type,
                job_level: formData.job_level,
                description: descriptionArray,
                general_requirements: generalReqArray,
                specific_requirements: specificReqArray,
                benefits: benefitsArray,
                is_active: formData.is_active
            };

            let error;
            if (editingJob) {
                const { error: updateError } = await (supabase as any)
                    .from("jobs")
                    .update(payload)
                    .eq("id", editingJob.id);
                error = updateError;
            } else {
                const { error: insertError } = await (supabase as any)
                    .from("jobs")
                    .insert(payload);
                error = insertError;
            }

            if (error) {
                toast.error("Failed to save job: " + error.message);
            } else {
                toast.success(editingJob ? "Job updated" : "Job created");
                setIsDialogOpen(false);
                fetchJobs();
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const openDialog = (job?: any) => {
        if (job) {
            setEditingJob(job);
            setFormData({
                title: job.title,
                position: job.position,
                branch: job.branch,
                location: job.location,
                province: job.province,
                type: job.type,
                job_level: job.job_level || "STAFF",
                description: job.description?.join('\n') || "",
                general_requirements: job.general_requirements?.join('\n') || "",
                specific_requirements: job.specific_requirements?.join('\n') || "",
                benefits: job.benefits?.join('\n') || "",
                is_active: job.is_active
            });
        } else {
            setEditingJob(null);
            setFormData({
                title: "",
                position: "",
                branch: "",
                location: "",
                province: "",
                type: "Full Time",
                job_level: "STAFF",
                description: "",
                general_requirements: "",
                specific_requirements: "",
                benefits: "",
                is_active: true
            });
        }
        setIsDialogOpen(true);
    };

    const filteredJobs = jobs.filter(job =>
        job.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.branch.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="w-full md:w-1/3">
                    <Input
                        placeholder="Search jobs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <Button variant="outline" onClick={handleImportJobs} disabled={loading}>
                        <UploadCloud className="w-4 h-4 mr-2" />
                        Import Existing Data
                    </Button>
                    <Button onClick={() => openDialog()} className="bg-green-600 hover:bg-green-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Add New Job
                    </Button>
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Position</TableHead>
                            <TableHead>Branch</TableHead>
                            <TableHead>Province</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
                            </TableRow>
                        ) : filteredJobs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    No jobs found. Click "Import Existing Data" to seed the database.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredJobs.map(job => (
                                <TableRow key={job.id}>
                                    <TableCell className="font-medium">{job.position}</TableCell>
                                    <TableCell>{job.branch}</TableCell>
                                    <TableCell>{job.province}</TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded-full text-xs ${job.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {job.is_active ? 'Active' : 'Closed'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => toggleStatus(job)}
                                                title={job.is_active ? "Close Job" : "Activate Job"}
                                            >
                                                {job.is_active ?
                                                    <Eye className="w-4 h-4 text-green-600" /> :
                                                    <EyeOff className="w-4 h-4 text-gray-400" />
                                                }
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => openDialog(job)}>
                                                <Edit className="w-4 h-4 text-blue-600" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete(job.id)}>
                                                <Trash2 className="w-4 h-4 text-red-600" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingJob ? "Edit Job" : "Create New Job"}</DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Job Title / Position</Label>
                            <Input
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value, position: e.target.value })}
                                placeholder="e.g. Sales Executive"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Branch Name</Label>
                            <Input
                                value={formData.branch}
                                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                                placeholder="e.g. BYD Haka Cibubur"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>City / Location</Label>
                            <Input
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                placeholder="e.g. Cibubur"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Province</Label>
                            <Select
                                value={formData.province}
                                onValueChange={(value) => setFormData({ ...formData, province: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select province" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DKI Jakarta">DKI Jakarta</SelectItem>
                                    <SelectItem value="Jawa Barat">Jawa Barat</SelectItem>
                                    <SelectItem value="Jawa Tengah">Jawa Tengah</SelectItem>
                                    <SelectItem value="Jawa Timur">Jawa Timur</SelectItem>
                                    <SelectItem value="Banten">Banten</SelectItem>
                                    <SelectItem value="DI Yogyakarta">DI Yogyakarta</SelectItem>
                                    <SelectItem value="Bali">Bali</SelectItem>
                                    <SelectItem value="Sumatera Utara">Sumatera Utara</SelectItem>
                                    <SelectItem value="Sumatera Barat">Sumatera Barat</SelectItem>
                                    <SelectItem value="Sumatera Selatan">Sumatera Selatan</SelectItem>
                                    <SelectItem value="Riau">Riau</SelectItem>
                                    <SelectItem value="Kepulauan Riau">Kepulauan Riau</SelectItem>
                                    <SelectItem value="Lampung">Lampung</SelectItem>
                                    <SelectItem value="Kalimantan Barat">Kalimantan Barat</SelectItem>
                                    <SelectItem value="Kalimantan Timur">Kalimantan Timur</SelectItem>
                                    <SelectItem value="Kalimantan Selatan">Kalimantan Selatan</SelectItem>
                                    <SelectItem value="Kalimantan Tengah">Kalimantan Tengah</SelectItem>
                                    <SelectItem value="Sulawesi Selatan">Sulawesi Selatan</SelectItem>
                                    <SelectItem value="Sulawesi Utara">Sulawesi Utara</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Job Level</Label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={formData.job_level}
                                onChange={(e) => setFormData({ ...formData, job_level: e.target.value })}
                            >
                                <option value="EXECUTIVE LEADER">EXECUTIVE LEADER</option>
                                <option value="STRATEGIC LEADER">STRATEGIC LEADER</option>
                                <option value="OPERATIONAL LEADER">OPERATIONAL LEADER</option>
                                <option value="TECHNICAL LEADER">TECHNICAL LEADER</option>
                                <option value="STAFF">STAFF</option>
                                <option value="NON-STAFF">NON-STAFF</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-4 pt-4">
                            <div className="flex items-center space-x-2">
                                <Switch
                                    checked={formData.is_active}
                                    onCheckedChange={(c) => setFormData({ ...formData, is_active: c })}
                                />
                                <Label>Active / Open for Applications</Label>
                            </div>
                        </div>

                        <div className="md:col-span-2 space-y-2">
                            <Label>Job Description (One per line)</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={4}
                                placeholder="- Task 1&#10;- Task 2"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>General Requirements (One per line)</Label>
                            <Textarea
                                value={formData.general_requirements}
                                onChange={(e) => setFormData({ ...formData, general_requirements: e.target.value })}
                                rows={4}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Specific Requirements (One per line)</Label>
                            <Textarea
                                value={formData.specific_requirements}
                                onChange={(e) => setFormData({ ...formData, specific_requirements: e.target.value })}
                                rows={4}
                            />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <Label>Benefits (One per line)</Label>
                            <Textarea
                                value={formData.benefits}
                                onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                                rows={3}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting}>
                            {isSubmitting ? "Saving..." : (editingJob ? "Update Job" : "Create Job")}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
