
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import TopNav from "@/components/TopNav";
import { JobCard } from "@/components/JobCard";
import { useToast } from "@/hooks/use-toast";
import { Briefcase } from "lucide-react";
import FilterBar from "@/components/FilterBar";
import heroBg from "@/assets/job-board-hero-new.jpg";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const ITEMS_PER_PAGE = 15;

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [filters, setFilters] = useState({
    province: "All Provinces",
    branch: "All Branches",
    position: "All Positions",
  });

  useEffect(() => {
    const checkAdmin = async (userId: string) => {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      setIsAdmin(!!roleData);
    };

    const fetchJobs = async () => {
      const { data, error } = await (supabase as any)
        .from("jobs")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching jobs:", error);
        toast({
          title: "Error fetching jobs",
          description: "Could not load job listings.",
          variant: "destructive"
        });
      } else {
        setJobs(data || []);
      }
      setLoading(false);
    }

    // Auth Check
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdmin(session.user.id);
      } else {
        setIsAdmin(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdmin(session.user.id);
      }
      if (!session) {
        navigate("/auth");
      }
    });

    // Fetch jobs immediately
    fetchJobs();

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchTerm]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // 1. Check Filters
      const matchProvince =
        filters.province === "All Provinces" || job.province === filters.province;
      const matchBranch =
        filters.branch === "All Branches" || job.branch === filters.branch;
      const matchPosition =
        filters.position === "All Positions" || job.position === filters.position;

      // 2. Check Search Term (Global Search)
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        (job.position && job.position.toLowerCase().includes(term)) ||
        (job.branch && job.branch.toLowerCase().includes(term)) ||
        (job.location && job.location.toLowerCase().includes(term)) ||
        (job.province && job.province.toLowerCase().includes(term));

      return matchProvince && matchBranch && matchPosition && matchSearch;
    });
  }, [filters, jobs, searchTerm]);

  // Calculate Pagination
  const totalPages = Math.ceil(filteredJobs.length / ITEMS_PER_PAGE);
  const paginatedJobs = filteredJobs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleJobDetail = (jobId: string) => {
    navigate(`/job-board/${jobId}`);
  };

  // Provinces (Derived from jobs to only show relevant ones, or stick to static list? 
  // Sticking to static list ensures UI consistency even if no jobs in that region yet)
  const provinces = [
    "Aceh",
    "Bali",
    "Banten",
    "Bengkulu",
    "DI Yogyakarta",
    "DKI Jakarta",
    "Gorontalo",
    "Jambi",
    "Jawa Barat",
    "Jawa Tengah",
    "Jawa Timur",
    "Kalimantan Barat",
    "Kalimantan Selatan",
    "Kalimantan Tengah",
    "Kalimantan Timur",
    "Kalimantan Utara",
    "Kepulauan Bangka Belitung",
    "Kepulauan Riau",
    "Lampung",
    "Maluku",
    "Maluku Utara",
    "Nusa Tenggara Barat",
    "Nusa Tenggara Timur",
    "Papua",
    "Papua Barat",
    "Papua Barat Daya",
    "Papua Pegunungan",
    "Papua Selatan",
    "Papua Tengah",
    "Riau",
    "Sulawesi Barat",
    "Sulawesi Selatan",
    "Sulawesi Tengah",
    "Sulawesi Tenggara",
    "Sulawesi Utara",
    "Sumatera Barat",
    "Sumatera Selatan",
    "Sumatera Utara",
  ];

  // Dynamic Branches based on fetched jobs
  const branches = useMemo(() => {
    if (filters.province === "All Provinces") {
      return Array.from(new Set(jobs.map((job) => job.branch))).sort();
    }
    return Array.from(
      new Set(
        jobs
          .filter((job) => job.province === filters.province)
          .map((job) => job.branch)
      )
    ).sort();
  }, [filters.province, jobs]);

  // Dynamic Positions based on fetched jobs
  const positions = Array.from(new Set(jobs.map((job) => job.position))).sort();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav isPublic={false} />

      {/* Hero Section */}
      <div className="relative py-12 pb-24 px-4 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src={heroBg}
            alt="Hero Background"
            className="w-full h-full object-cover"
          />
          {/* Green Overlay - Using teal/emerald mix to match brand but darken image */}
          <div className="absolute inset-0 bg-[#00A572]/90 mix-blend-multiply" />
          {/* Gradient to ensure text separation if needed, or just the color overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent" />
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none z-10" />

        <div className="max-w-7xl mx-auto space-y-4 relative z-10 text-white">
          <h1 className="text-3xl md:text-4xl font-bold">Careers</h1>
          <p className="max-w-2xl text-white/90 text-lg">
            We open equal opportunities for both young talents and professionals. Choose the category that suits your work experience!
          </p>
        </div>
      </div>

      {/* Main Content with overlapping FilterBar */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20 pb-12">
        <FilterBar
          selectedProvince={filters.province}
          selectedBranch={filters.branch}
          selectedPosition={filters.position}
          onProvinceChange={(value) =>
            setFilters({ ...filters, province: value, branch: "All Branches" })
          }
          onBranchChange={(value) => setFilters({ ...filters, branch: value })}
          onPositionChange={(value) => setFilters({ ...filters, position: value })}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          provinces={provinces}
          branches={branches}
          positions={positions}
        />

        <div className="mt-8 space-y-6">
          {/* Results Count & Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">
              ({filteredJobs.length}) Jobs available
            </h2>
          </div>

          {/* Job Grid - UPDATED TO 4 COLUMNS (xl:grid-cols-4) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedJobs.length > 0 ? (
              paginatedJobs.map((job, index) => (
                <div
                  key={job.id}
                  style={{
                    animationDelay: `${index * 50}ms`,
                  }}
                >
                  <JobCard
                    position={job.position}
                    branch={job.branch}
                    location={job.location}
                    province={job.province}
                    type={job.type}
                    onDetail={() => handleJobDetail(job.id)}
                    isAdmin={isAdmin}
                  />
                </div>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-center bg-white rounded-lg border border-gray-100 shadow-sm">
                <Briefcase className="h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  No job vacancies found
                </h3>
                <p className="text-gray-500">
                  {jobs.length === 0
                    ? "No active job vacancies at the moment."
                    : "Try changing your search filters to see other positions"
                  }
                </p>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {filteredJobs.length > ITEMS_PER_PAGE && (
            <div className="flex justify-center mt-8">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) handlePageChange(currentPage - 1);
                      }}
                      className={
                        currentPage === 1
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>

                  {/* Page Numbers */}
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const page = i + 1;
                    if (totalPages > 10 && Math.abs(currentPage - page) > 2 && page !== 1 && page !== totalPages) {
                      if (Math.abs(currentPage - page) === 3) return <PaginationItem key={page}><span className="px-2">...</span></PaginationItem>;
                      return null;
                    }

                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          href="#"
                          isActive={currentPage === page}
                          onClick={(e) => {
                            e.preventDefault();
                            handlePageChange(page);
                          }}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages) handlePageChange(currentPage + 1);
                      }}
                      className={
                        currentPage === totalPages
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
