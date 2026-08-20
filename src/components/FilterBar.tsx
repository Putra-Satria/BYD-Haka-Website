import { Search } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface FilterBarProps {
    selectedProvince: string;
    selectedBranch: string;
    selectedPosition: string;
    onProvinceChange: (value: string) => void;
    onBranchChange: (value: string) => void;
    onPositionChange: (value: string) => void;
    provinces: string[];
    branches: string[];
    positions: string[];
    searchTerm?: string;
    onSearchChange?: (term: string) => void;
}

export default function FilterBar({
    selectedProvince,
    selectedBranch,
    selectedPosition,
    onProvinceChange,
    onBranchChange,
    onPositionChange,
    provinces,
    branches,
    positions,
    searchTerm = "",
    onSearchChange,
}: FilterBarProps) {
    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-4 items-center">
            {/* Search Input */}
            <div className="relative flex-1 w-full relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                    placeholder="Find the job you want..."
                    className="pl-10 border-gray-200"
                    value={searchTerm}
                    onChange={(e) => onSearchChange?.(e.target.value)}
                />
            </div>

            {/* Filters */}
            <div className="w-full lg:w-48">
                <Select value={selectedBranch !== "All Branches" ? selectedBranch : undefined} onValueChange={onBranchChange}>
                    <SelectTrigger className="w-full border-gray-200">
                        <SelectValue placeholder="All Branches" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="All Branches">All Branches</SelectItem>
                        {branches.map((branch) => (
                            <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="w-full lg:w-48">
                <Select value={selectedPosition !== "All Positions" ? selectedPosition : undefined} onValueChange={onPositionChange}>
                    <SelectTrigger className="w-full border-gray-200">
                        <SelectValue placeholder="All Positions" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="All Positions">All Positions</SelectItem>
                        {positions.map((pos) => (
                            <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="w-full lg:w-48">
                <Select value={selectedProvince !== "All Provinces" ? selectedProvince : undefined} onValueChange={onProvinceChange}>
                    <SelectTrigger className="w-full border-gray-200">
                        <SelectValue placeholder="All Provinces" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="All Provinces">All Provinces</SelectItem>
                        {provinces.map((prov) => (
                            <SelectItem key={prov} value={prov}>{prov}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Button className="w-full lg:w-auto px-8 bg-green-700 hover:bg-green-800 text-white">
                Search
            </Button>
        </div>
    );
}
