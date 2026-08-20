import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import TopNav from "@/components/TopNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { buildSecureFilePath, logSecurityAudit, validateSecureUpload } from "@/lib/securityHardening";

// Validation schema
const applicationSchema = z.object({
  fullName: z.string().min(2, "Full name is required").max(100, "Name too long"),
  nik: z.string().length(16, "NIK must be 16 digits").regex(/^\d+$/, "NIK must be numbers"),
  residentialAddress: z.string().min(3, "Domicile address is required").max(200, "Address too long"),
  cityProvince: z.string().min(3, "City and Province is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["male", "female"], { required_error: "Select gender" }),
  whatsappNumber: z.string().min(10, "Invalid WhatsApp number").regex(/^[0-9+]+$/, "WhatsApp number must be digits"),
  expectedSalary: z.number().positive("Enter valid salary"),
  hasAutomotiveExperience: z.boolean(),
  workExperienceDuration: z.string().min(1, "Select work experience duration"),
  educationLevel: z.string().min(1, "Select last education"),
  infoSource: z.string().min(1, "Select information source"),
});

export default function ApplicationForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");

  // Get job details from URL params
  const position = searchParams.get("position") || "";
  const branch = searchParams.get("branch") || "";
  const province = searchParams.get("province") || "";

  // Form state
  const [fullName, setFullName] = useState("");
  const [nik, setNik] = useState("");
  const [residentialAddress, setResidentialAddress] = useState("");
  const [cityProvince, setCityProvince] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [expectedSalary, setExpectedSalary] = useState("");
  const [hasAutomotiveExperience, setHasAutomotiveExperience] = useState<string>("");
  const [workExperienceDuration, setWorkExperienceDuration] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [infoSource, setInfoSource] = useState("");

  const [cvFile, setCvFile] = useState<File | null>(null);
  const [paklaringFile, setPaklaringFile] = useState<File | null>(null);

  // Existing files from profile
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [paklaringUrl, setPaklaringUrl] = useState<string | null>(null);

  // Check authentication & Autofill
  useEffect(() => {
    const initData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please login to apply for a job",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }
      setUserId(session.user.id);
      setUserEmail(session.user.email || "");

      // Autofill from Profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name || "");
        setNik(profile.nik || "");
        setResidentialAddress(profile.residential_address || "");
        setCityProvince(profile.city_province || "");
        setDateOfBirth(profile.date_of_birth || "");
        setGender(profile.gender || "");
        setWhatsappNumber(profile.whatsapp_number || "");
        setExpectedSalary(profile.expected_salary?.toString() || "");
        setHasAutomotiveExperience(profile.has_automotive_experience ? "yes" : "no");
        setWorkExperienceDuration(profile.work_experience_duration || "");
        setEducationLevel(profile.education_level || "");
        setInfoSource(profile.info_source || "");
        // Files
        if (profile.cv_url) setCvUrl(profile.cv_url);
        if (profile.certificate_url) setPaklaringUrl(profile.certificate_url);
      }
    };
    initData();
  }, [navigate, toast]);

  const uploadFile = async (file: File, folder: string): Promise<string> => {
    if (!userId) throw new Error("User not authenticated");

    const documentType = folder === "cv" ? "cv" : "certificate";
    const validation = validateSecureUpload(file, documentType);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    const fileName = buildSecureFilePath(userId, file, folder);

    const { error: uploadError } = await supabase.storage
      .from('application-documents')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined,
      });

    if (uploadError) {
      await logSecurityAudit({
        action: "UPLOAD_DOCUMENT",
        targetUserId: userId,
        documentPath: fileName,
        status: "failed",
        description: `Failed to upload ${folder}: ${uploadError.message}`,
      });
      throw new Error(`Failed to upload ${folder}: ${uploadError.message}`);
    }

    await logSecurityAudit({
      action: "UPLOAD_DOCUMENT",
      targetUserId: userId,
      documentPath: fileName,
      status: "success",
      description: `Applicant uploaded ${folder} with validated file type and UUID filename.`,
    });

    return fileName;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) {
      navigate('/auth');
      return;
    }

    // Validate required files (If URL exists, file input is optional)
    if (!cvFile && !cvUrl) {
      toast({
        title: "CV Required",
        description: "Please upload your latest CV",
        variant: "destructive",
      });
      return;
    }

    if (!paklaringFile && !paklaringUrl) {
      toast({
        title: "Certificate Required",
        description: "Please upload your Experience Certificate / Diploma",
        variant: "destructive",
      });
      return;
    }

    // Validate file sizes
    const maxSize = 5 * 1024 * 1024;
    if (cvFile && cvFile.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "CV size max 5MB",
        variant: "destructive",
      });
      return;
    }
    if (paklaringFile && paklaringFile.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "Certificate size max 5MB",
        variant: "destructive",
      });
      return;
    }

    // Parse salary
    const parsedSalary = parseFloat(expectedSalary.replace(/[^0-9]/g, ''));

    // Validate form data
    const validationResult = applicationSchema.safeParse({
      fullName,
      nik,
      residentialAddress,
      cityProvince,
      dateOfBirth,
      gender,
      whatsappNumber,
      expectedSalary: parsedSalary,
      hasAutomotiveExperience: hasAutomotiveExperience === "yes",
      workExperienceDuration,
      educationLevel,
      infoSource,
    });

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast({
        title: "Validation Failed",
        description: firstError.message,
        variant: "destructive",
      });
      return;
    }

    // Check application limit (max 2 in last 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { count: applicationCount, error: countError } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', threeMonthsAgo.toISOString());

    if (countError) {
      console.error("Error checking application limit:", countError);
      toast({
        title: "An Error Occurred",
        description: "Failed to verify application limit. Please try again.",
        variant: "destructive",
      });
      return;
    }

    if (applicationCount !== null && applicationCount >= 2) {
      toast({
        title: "Application Limit Reached",
        description: `Sorry, you have reached the limit of 2 applications in the last 3 months.`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Determine final URLs (upload new or keep existing)
      let finalCvUrl = cvUrl;
      let finalPaklaringUrl = paklaringUrl;

      if (cvFile) {
        finalCvUrl = await uploadFile(cvFile, 'cv');
      }
      if (paklaringFile) {
        finalPaklaringUrl = await uploadFile(paklaringFile, 'certificate');
      }

      if (!finalCvUrl || !finalPaklaringUrl) {
        throw new Error("Failed to process documents");
      }

      // Insert application record
      const { error: insertError } = await supabase
        .from('applications')
        .insert({
          user_id: userId,
          position,
          branch,
          province,
          info_source: infoSource,

          // New/Renamed fields
          nik,
          whatsapp_number: whatsappNumber,
          date_of_birth: dateOfBirth,
          city_province: cityProvince,

          residential_address: residentialAddress,
          age: new Date().getFullYear() - new Date(dateOfBirth).getFullYear(), // Approximate

          gender,
          expected_salary: parsedSalary,
          has_automotive_experience: hasAutomotiveExperience === "yes",
          work_experience_duration: workExperienceDuration,
          education_level: educationLevel,
          cv_url: finalCvUrl,
          certificate_url: finalPaklaringUrl,
        });

      if (insertError) {
        throw new Error(insertError.message);
      }

      toast({
        title: "Application Submitted",
        description: "Your application has been successfully submitted!",
      });

      navigate("/application-success");
    } catch (error) {
      console.error("Application submission error:", error);
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav isPublic={false} />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 text-primary hover:text-primary-glow"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card className="shadow-strong">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
            <CardTitle className="text-2xl lg:text-3xl text-primary">
              Job Application Form
            </CardTitle>
            <p className="text-muted-foreground mt-2">
              Please fill in your personal data completely and correctly
            </p>
            {position && (
              <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                <p className="text-sm font-medium">
                  Position applied for: <span className="text-primary">{position}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {branch}, {province}
                </p>
              </div>
            )}
          </CardHeader>

          <CardContent className="p-6 lg:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Personal Data</h3>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter full name"
                    required
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nik">KTP NIK *</Label>
                  <Input
                    id="nik"
                    value={nik}
                    onChange={(e) => setNik(e.target.value)}
                    placeholder="16 digits NIK"
                    required
                    maxLength={16}
                    pattern="\d{16}"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="domicile">Domicile Address *</Label>
                  <Input
                    id="domicile"
                    value={residentialAddress}
                    onChange={(e) => setResidentialAddress(e.target.value)}
                    placeholder="Current complete residential address"
                    required
                    maxLength={200}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cityProvince">City and Province *</Label>
                  <Input
                    id="cityProvince"
                    value={cityProvince}
                    onChange={(e) => setCityProvince(e.target.value)}
                    placeholder="e.g. Magelang-Central Java, Banjarmasin-South Kalimantan"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth *</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Gender *</Label>
                    <RadioGroup value={gender} onValueChange={setGender} required>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="male" id="male" />
                        <Label htmlFor="male" className="font-normal cursor-pointer">Male</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="female" id="female" />
                        <Label htmlFor="female" className="font-normal cursor-pointer">Female</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    value={userEmail}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp Number *</Label>
                  <Input
                    id="whatsapp"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="e.g. 081234567890"
                    required
                    type="tel"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expectedSalary">Expected Salary *</Label>
                  <Input
                    id="expectedSalary"
                    value={expectedSalary}
                    onChange={(e) => setExpectedSalary(e.target.value)}
                    placeholder="e.g. 5.500.000, 6.200.000"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter nominal number
                  </p>
                </div>
              </div>

              {/* Experience */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Work Experience</h3>

                <div className="space-y-2">
                  <Label>Have automotive experience? *</Label>
                  <RadioGroup value={hasAutomotiveExperience} onValueChange={setHasAutomotiveExperience} required>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="expYes" />
                      <Label htmlFor="expYes" className="font-normal cursor-pointer">YES</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="expNo" />
                      <Label htmlFor="expNo" className="font-normal cursor-pointer">NO</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="yearsExp">How long is your work experience related to this position? *</Label>
                  <Select value={workExperienceDuration} onValueChange={setWorkExperienceDuration} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select experience duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="<1 year/fresh graduate">&lt;1 Year / Fresh Graduate</SelectItem>
                      <SelectItem value="1-3 years">1-3 Years</SelectItem>
                      <SelectItem value="3-5 years">3-5 Years</SelectItem>
                      <SelectItem value=">5 years">&gt;5 Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Education */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Education</h3>

                <div className="space-y-2">
                  <Label htmlFor="education">Last Education *</Label>
                  <Select value={educationLevel} onValueChange={setEducationLevel} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select last education" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sma">SMA / SMK</SelectItem>
                      <SelectItem value="d3">D3</SelectItem>
                      <SelectItem value="s1">S1</SelectItem>
                      <SelectItem value="s2">S2</SelectItem>
                      <SelectItem value="s3">S3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Job Info Source */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Vacancy Information</h3>
                <div className="space-y-2">
                  <Label htmlFor="jobSource">Where did you find this vacancy? *</Label>
                  <Select value={infoSource} onValueChange={setInfoSource} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select information source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="website">Career Website</SelectItem>
                      <SelectItem value="referral">Friend/Employee Referral</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Documents */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Documents</h3>

                <div className="space-y-2">
                  <Label htmlFor="cv">Please Upload your latest CV *</Label>
                  {cvUrl && (
                    <div className="text-sm text-green-600 mb-1 flex items-center">
                      ✓ CV available from profile
                    </div>
                  )}
                  <Input
                    id="cv"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                    required={!cvUrl}
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload 1 supported file: PDF. Max 5 MB.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paklaring">Please Upload your latest Experience Certificate (Paklaring) *</Label>
                  {paklaringUrl && (
                    <div className="text-sm text-green-600 mb-1 flex items-center">
                      ✓ Certificate available from profile
                    </div>
                  )}
                  <Input
                    id="paklaring"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setPaklaringFile(e.target.files?.[0] || null)}
                    required={!paklaringUrl}
                  />
                  <p className="text-xs text-muted-foreground">
                    *For fresh graduates and first-time job seekers, please attach Diploma / SKL
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Upload 1 supported file: PDF. Max 5 MB.
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-4 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-primary-glow px-8"
                >
                  {isSubmitting ? "Sending..." : "Submit Application"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
