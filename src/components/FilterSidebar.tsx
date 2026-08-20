import { Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface FilterSidebarProps {
  selectedProvince: string;
  selectedBranch: string;
  selectedPosition: string;
  onProvinceChange: (value: string) => void;
  onBranchChange: (value: string) => void;
  onPositionChange: (value: string) => void;
  provinces: string[];
  branches: string[];
  positions: string[];
}

export default function FilterSidebar({
  selectedProvince,
  selectedBranch,
  selectedPosition,
  onProvinceChange,
  onBranchChange,
  onPositionChange,
  provinces,
  branches,
  positions,
}: FilterSidebarProps) {
  return (
    <aside className="w-full md:w-64 bg-card border-r border-border p-6 space-y-6 h-full">
      <div className="flex items-center gap-2 mb-6">
        <Filter className="h-5 w-5 text-byd-green" />
        <h2 className="text-lg font-semibold">Filter Jobs</h2>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="province-filter">Province</Label>
          <Select value={selectedProvince} onValueChange={onProvinceChange}>
            <SelectTrigger id="province-filter" className="transition-all hover:border-byd-green">
              <SelectValue placeholder="All Provinces" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Provinces">All Provinces</SelectItem>
              {provinces.map((province) => (
                <SelectItem key={province} value={province}>
                  {province}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="branch-filter">Branch/Dealer</Label>
          <Select value={selectedBranch} onValueChange={onBranchChange}>
            <SelectTrigger id="branch-filter" className="transition-all hover:border-byd-green">
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Branches">All Branches</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch} value={branch}>
                  {branch}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="position-filter">Position</Label>
          <Select value={selectedPosition} onValueChange={onPositionChange}>
            <SelectTrigger id="position-filter" className="transition-all hover:border-byd-green">
              <SelectValue placeholder="All Positions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Positions">All Positions</SelectItem>
              {positions.map((position) => (
                <SelectItem key={position} value={position}>
                  {position}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </aside>
  );
}
