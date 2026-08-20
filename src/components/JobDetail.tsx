import { ArrowLeft, Building2, MapPin, Globe, Share2, Bookmark, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getJobDescription } from "@/data/jobDescriptions";
import logoHaka from "@/assets/BYD-GRAY.png";
import logoDenza from "@/assets/logo-denza.png";

interface JobDetailProps {
  position: string;
  branch: string;
  location: string;
  onBack: () => void;
  onApply: () => void;
}

export function JobDetail({ position, branch, location, onBack, onApply }: JobDetailProps) {
  const jobInfo = getJobDescription(position);
  const isDenza = branch.toLowerCase().includes("denza");
  const logo = isDenza ? logoDenza : logoHaka;
  const companyName = isDenza ? "Denza Indonesia" : "Haka Auto";

  return (
    <div className="animate-fade-in bg-white h-full">
      {/* Top Navigation / Breadcrumb-ish */}
      <div className="border-b px-6 py-4 flex items-center justify-between sticky top-0 bg-white z-10">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="cursor-pointer hover:text-primary" onClick={onBack}>Job Vacancies</span>
          <span>/</span>
          <span className="text-primary font-medium">Job Detail</span>
        </div>
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-gray-500 hover:text-gray-900"
        >
          <span className="sr-only">Close</span>
          {/* Close icon handled by parent, but nice to have text option or just spacer */}
        </Button>
      </div>

      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8 pb-8 border-b border-gray-100">
          <div className="flex gap-4 items-start">
            <div className="p-2 border rounded-lg bg-white shadow-sm w-16 h-16 flex items-center justify-center shrink-0">
              <img src={logo} alt={companyName} className="w-full h-auto object-contain" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{position}</h1>
              <div className="text-lg font-medium text-primary mb-3">{companyName}</div>

              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Building2 className="w-4 h-4" />
                  <span>{branch}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{location}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>Deadline: 30 days left</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto mt-4 md:mt-0">
            <Button
              onClick={onApply}
              className="flex-1 md:flex-none bg-blue-700 hover:bg-blue-800 text-white px-8"
            >
              Apply
            </Button>
            <Button variant="outline" className="flex-1 md:flex-none px-4">
              <Bookmark className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button variant="outline" size="icon" className="shrink-0">
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Job Description */}
          <div className="lg:col-span-2 space-y-8">
            {/* Notice */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
              <p>
                <strong>Attention:</strong> This recruitment process is free of charge.
                Beware of fraud in the name of the company.
              </p>
            </div>

            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Role Description</h3>
              <ul className="list-decimal list-outside ml-5 space-y-2 text-gray-600 leading-relaxed">
                {jobInfo.description.map((desc, index) => (
                  <li key={index}>{desc}</li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-4">General Requirements</h3>
              <ul className="list-disc list-outside ml-5 space-y-2 text-gray-600 leading-relaxed">
                {jobInfo.generalQualifications.map((qual, index) => (
                  <li key={index}>{qual}</li>
                ))}
              </ul>
            </section>

            {jobInfo.specificQualifications.length > 0 && (
              <section>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Specific Requirements</h3>
                <ul className="list-disc list-outside ml-5 space-y-2 text-gray-600 leading-relaxed">
                  {jobInfo.specificQualifications.map((qual, index) => (
                    <li key={index}>{qual}</li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Benefit</h3>
              <ul className="list-disc list-outside ml-5 space-y-2 text-gray-600 leading-relaxed">
                {jobInfo.benefits.map((benefit, index) => (
                  <li key={index}>{benefit}</li>
                ))}
              </ul>
            </section>
          </div>

          {/* Right Column: Sidebar */}
          <div className="space-y-6">
            <Card className="border shadow-sm">
              <CardHeader className="pb-3 border-b bg-gray-50/50">
                <CardTitle className="text-base font-semibold">About Company</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div>
                  <div className="font-semibold text-gray-900 mb-1">{companyName}</div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {isDenza
                      ? "Denza is a luxury new energy vehicle brand created by BYD, focused on providing premium sustainable mobility solutions."
                      : "Haka Auto is a leading automotive dealership network in Indonesia, committed to excellence in sales and service."}
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                    <span className="text-gray-600">
                      Jl. Raya Bekasi KM 22 Cakung, Jakarta Timur, DKI Jakarta 13910
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Automotive Industry</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <a href="https://hakaauto.co.id" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                      https://hakaauto.co.id
                    </a>
                  </div>
                </div>

                <div className="pt-2">
                  <Button variant="link" className="p-0 h-auto font-semibold text-blue-700">
                    View Company Details →
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}