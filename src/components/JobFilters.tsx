import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Building2, Briefcase } from "lucide-react";

interface JobFiltersProps {
  onFilterChange: (filters: {
    province: string;
    branch: string;
    position: string;
  }) => void;
}

const provinces = [
  "All Provinces",
  "DKI Jakarta",
  "Jawa Barat",
  "Jawa Tengah",
  "Jawa Timur",
  "Banten",
  "Sumatera Utara",
  "Sumatera Barat",
  "Sumatera Selatan",
  "Riau",
  "Kepulauan Riau",
  "Lampung",
  "Bengkulu",
  "Jambi",
  "Aceh",
  "Kalimantan Timur",
  "Kalimantan Selatan",
  "Kalimantan Tengah",
  "Kalimantan Barat",
  "Kalimantan Utara",
  "Sulawesi Selatan",
  "Sulawesi Utara",
  "Sulawesi Tengah",
  "Sulawesi Tenggara",
  "Gorontalo",
  "Sulawesi Barat",
  "Bali",
  "Nusa Tenggara Barat",
  "Nusa Tenggara Timur",
  "Maluku",
  "Maluku Utara",
  "Papua",
  "Papua Barat",
  "Papua Tengah",
  "Papua Selatan",
];

const branchesData: Record<string, string[]> = {
  "All Provinces": ["All Branches"],
  "DKI Jakarta": ["All Branches", "BYD Jakarta Pusat", "BYD Jakarta Selatan", "BYD Jakarta Timur", "BYD Jakarta Barat", "BYD Jakarta Utara"],
  "Jawa Barat": ["All Branches", "BYD Bandung", "BYD Bekasi", "BYD Bogor", "BYD Depok", "BYD Cirebon"],
  "Jawa Tengah": ["All Branches", "BYD Semarang", "BYD Solo", "BYD Yogyakarta"],
  "Jawa Timur": ["All Branches", "BYD Surabaya", "BYD Malang", "BYD Sidoarjo", "BYD Gresik"],
  "Banten": ["All Branches", "BYD Tangerang", "BYD Serang", "BYD Cilegon"],
  "Sumatera Utara": ["All Branches", "BYD Medan", "BYD Pematang Siantar"],
  "Sumatera Barat": ["All Branches", "BYD Padang", "BYD Bukittinggi"],
  "Sumatera Selatan": ["All Branches", "BYD Palembang"],
  "Bali": ["All Branches", "BYD Denpasar", "BYD Gianyar"],
  "Kalimantan Timur": ["All Branches", "BYD Balikpapan", "BYD Samarinda"],
};

const positions = [
  "All Positions",
  "Branch Manager",
  "Sales Supervisor",
  "Sales Executive",
  "Administration Head",
  "Admin Sales",
  "Admin Faktur",
  "Admin AR",
  "Admin Service",
  "Cashier",
  "Accounting",
  "Service Manager",
  "Service Advisor",
  "Mechanic",
  "Stock Management",
  "Partman",
  "Customer Relation Officer",
  "Marketing Specialist",
  "HR & GA",
  "In-House Trainer",
];

export function JobFilters({ onFilterChange }: JobFiltersProps) {
  const [selectedProvince, setSelectedProvince] = useState("All Provinces");
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [selectedPosition, setSelectedPosition] = useState("All Positions");

  const handleProvinceChange = (value: string) => {
    setSelectedProvince(value);
    setSelectedBranch("All Branches");
    onFilterChange({
      province: value,
      branch: "All Branches",
      position: selectedPosition,
    });
  };

  const handleBranchChange = (value: string) => {
    setSelectedBranch(value);
    onFilterChange({
      province: selectedProvince,
      branch: value,
      position: selectedPosition,
    });
  };

  const handlePositionChange = (value: string) => {
    setSelectedPosition(value);
    onFilterChange({
      province: selectedProvince,
      branch: selectedBranch,
      position: value,
    });
  };

  const availableBranches = branchesData[selectedProvince] || ["All Branches"];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-slide-in-right">
      {/* Province Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Province
        </label>
        <Select value={selectedProvince} onValueChange={handleProvinceChange}>
          <SelectTrigger className="w-full bg-card hover:bg-muted transition-colors">
            <SelectValue placeholder="Select Province" />
          </SelectTrigger>
          <SelectContent className="max-h-80 bg-popover">
            {provinces.map((province) => (
              <SelectItem key={province} value={province}>
                {province}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Branch Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          Branch
        </label>
        <Select value={selectedBranch} onValueChange={handleBranchChange}>
          <SelectTrigger className="w-full bg-card hover:bg-muted transition-colors">
            <SelectValue placeholder="Select Branch" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            {availableBranches.map((branch) => (
              <SelectItem key={branch} value={branch}>
                {branch}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Position Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-primary" />
          Position
        </label>
        <Select value={selectedPosition} onValueChange={handlePositionChange}>
          <SelectTrigger className="w-full bg-card hover:bg-muted transition-colors">
            <SelectValue placeholder="Select Position" />
          </SelectTrigger>
          <SelectContent className="max-h-80 bg-popover">
            {positions.map((position) => (
              <SelectItem key={position} value={position}>
                {position}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}