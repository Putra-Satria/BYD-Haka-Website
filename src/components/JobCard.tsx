import { MapPin, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import logoHaka from "@/assets/BYD-GRAY.png";
import logoDenza from "@/assets/logo-denza.png";

interface JobCardProps {
  position: string;
  branch: string;
  location: string;
  province: string;
  type?: string;
  job_level?: string;
  onDetail?: () => void;
  isAdmin?: boolean;
}

export function JobCard({
  position,
  branch,
  location,
  province,
  type = "Full Time",
  job_level,
  onDetail,
  isAdmin = false,
}: JobCardProps) {
  const isDenza = branch.toLowerCase().includes("denza");
  const logo = isDenza ? logoDenza : logoHaka;

  return (
    <Card className="group hover:-translate-y-1 transition-all duration-300 bg-white border border-gray-100 shadow-sm hover:shadow-xl rounded-2xl overflow-hidden">
      <CardContent className="p-6">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 flex items-center gap-4">
              {/* Logo */}
              <div className="flex-shrink-0 p-2 bg-gray-50 rounded-lg">
                <img
                  src={logo}
                  alt={isDenza ? "Denza Logo" : "Haka Logo"}
                  className={`w-auto object-contain ${isDenza ? "h-10" : "h-5"}`}
                />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary transition-colors mb-2 line-clamp-2">
                  {position}
                </h3>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span>{branch}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span>{location}, {province}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer - Pushed to bottom if needed */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-auto">
            <div className="flex gap-2">
              <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                {type}
              </div>
              {job_level && (
                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100">
                  {job_level}
                </div>
              )}
            </div>

            {!isAdmin && (
              <Button
                onClick={onDetail}
                size="sm"
                className="bg-white hover:bg-primary text-primary hover:text-white border border-primary/20 hover:border-primary transition-all rounded-full font-bold px-4"
              >
                Apply Now
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
