import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { JobCard } from "@/components/JobCard";
import FilterSidebar from "@/components/FilterSidebar";
import TopNav from "@/components/TopNav";
import { jobsData } from "@/data/jobsData";
import { Briefcase, ChevronLeft, ChevronRight } from "lucide-react";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";

const ITEMS_PER_PAGE = 15;

export default function Landing() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [filters, setFilters] = useState({
    province: "All Provinces",
    branch: "All Branches",
    position: "All Positions",
  });
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        setIsAdmin(!!roleData);
      }
    };
    checkAdmin();
  }, []);

  // Filter only open jobs
  const openJobs = useMemo(() => {
    return jobsData.filter(job => job.isOpen === true);
  }, []);

  // Apply filters to open jobs
  const filteredJobs = useMemo(() => {
    return openJobs.filter((job) => {
      const provinceMatch = filters.province === "All Provinces" || job.province === filters.province;
      const branchMatch = filters.branch === "All Branches" || job.branch === filters.branch;
      const positionMatch = filters.position === "All Positions" || job.position === filters.position;
      return provinceMatch && branchMatch && positionMatch;
    });
  }, [openJobs, filters]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredJobs.length / ITEMS_PER_PAGE);
  const paginatedJobs = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredJobs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredJobs, currentPage]);

  const handleFilterChange = (newFilters: { province: string; branch: string; position: string }) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page on filter change
  };

  const handleJobDetail = (jobId: string) => {
    navigate(`/auth?redirect=/job/${jobId}`);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    scrollToTop();
  };

  // All 34 Indonesian provinces
  const provinces = [
    "Aceh", "Bali", "Banten", "Bengkulu", "DI Yogyakarta", "DKI Jakarta", "Gorontalo", "Jambi", "Jawa Barat", "Jawa Tengah", "Jawa Timur", "Kalimantan Barat", "Kalimantan Selatan", "Kalimantan Tengah", "Kalimantan Timur", "Kalimantan Utara", "Kepulauan Bangka Belitung", "Kepulauan Riau", "Lampung", "Maluku", "Maluku Utara", "Nusa Tenggara Barat", "Nusa Tenggara Timur", "Papua", "Papua Barat", "Papua Barat Daya", "Papua Pegunungan", "Papua Selatan", "Papua Tengah", "Riau", "Sulawesi Barat", "Sulawesi Selatan", "Sulawesi Tengah", "Sulawesi Tenggara", "Sulawesi Utara", "Sumatera Barat", "Sumatera Selatan", "Sumatera Utara"
  ];

  const branches = useMemo(() => {
    if (filters.province === "All Provinces") {
      return Array.from(new Set(openJobs.map((job) => job.branch))).sort();
    }
    return Array.from(
      new Set(
        openJobs
          .filter((job) => job.province === filters.province)
          .map((job) => job.branch)
      )
    ).sort();
  }, [filters.province, openJobs]);

  const positions = Array.from(new Set(openJobs.map((job) => job.position))).sort();

  return (
    <div className="min-h-screen bg-white">
      <TopNav isPublic={true} />

      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-64px)]">
        {/* Desktop Sidebar - Sticky */}
        <aside className="hidden lg:block w-72 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] overflow-y-auto border-r border-gray-100 bg-gray-50/50 p-6">
          <div className="mb-6">
            <h3 className="font-bold text-gray-900 mb-2">Filter Jobs</h3>
            <p className="text-sm text-gray-500">Refine your search results</p>
          </div>
          <FilterSidebar
            selectedProvince={filters.province}
            selectedBranch={filters.branch}
            selectedPosition={filters.position}
            onProvinceChange={(province) => handleFilterChange({ ...filters, province, branch: "All Branches" })}
            onBranchChange={(branch) => handleFilterChange({ ...filters, branch })}
            onPositionChange={(position) => handleFilterChange({ ...filters, position })}
            provinces={provinces}
            branches={branches}
            positions={positions}
          />
          <div className="mt-8 p-4 bg-primary/5 rounded-xl border border-primary/10">
            <p className="text-xs text-gray-500 leading-relaxed">
              Can't find what you're looking for? Check back soon as we update our openings regularly.
            </p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 w-full bg-white">
          <SEO
            title="Jobs & Careers"
            description="Find the best career opportunities at BYD Haka Auto. Latest job openings for Sales, Service, and Management across all BYD Indonesia branches. Apply now!"
            keywords="byd jobs, haka auto careers, automotive jobs indonesia, byd recruitment, sales executive, electric car mechanic"
          />

          <div className="p-4 sm:p-8 lg:p-12 max-w-[1600px] mx-auto">
            {/* Header Section */}
            <div className="mb-10 lg:mb-14">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-primary text-xs font-bold tracking-wide uppercase mb-4">
                Career Opportunities
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
                Join Our Growing Team
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl leading-relaxed">
                Explore exciting opportunities across Indonesia and be part of the future of automotive retail with BYD Haka Auto.
              </p>
            </div>

            {/* Mobile Filter Sidebar Trigger (Hidden on Desktop) */}
            <div className="lg:hidden mb-8">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <h3 className="font-bold mb-4">Filters</h3>
                <FilterSidebar
                  selectedProvince={filters.province}
                  selectedBranch={filters.branch}
                  selectedPosition={filters.position}
                  onProvinceChange={(province) => handleFilterChange({ ...filters, province, branch: "All Branches" })}
                  onBranchChange={(branch) => handleFilterChange({ ...filters, branch })}
                  onPositionChange={(position) => handleFilterChange({ ...filters, position })}
                  provinces={provinces}
                  branches={branches}
                  positions={positions}
                />
              </div>
            </div>

            {/* Job Listings Grid */}
            <section>
              {paginatedJobs.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-6 lg:gap-8">
                    {paginatedJobs.map((job) => (
                      <JobCard
                        key={job.id}
                        position={job.position}
                        branch={job.branch}
                        location={job.location}
                        province={job.province}
                        type={job.type}
                        onDetail={() => handleJobDetail(job.id)}
                        isAdmin={isAdmin}
                      />
                    ))}
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="mt-16 flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="h-10 w-10 rounded-full border-gray-200 hover:bg-gray-50 hover:text-primary"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      <div className="flex items-center gap-1 mx-2">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`
                                        h-10 w-10 rounded-full text-sm font-medium transition-all
                                        ${currentPage === page
                                ? "bg-primary text-white shadow-lg shadow-primary/30 scale-105"
                                : "text-gray-500 hover:bg-gray-50 hover:text-primary"
                              }
                                    `}
                          >
                            {page}
                          </button>
                        ))}
                      </div>

                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="h-10 w-10 rounded-full border-gray-200 hover:bg-gray-50 hover:text-primary"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                  <div className="bg-white p-4 rounded-full shadow-sm inline-block mb-4">
                    <Briefcase className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">No Positions Found</h3>
                  <p className="text-gray-500">Try adjusting your filters to see more results.</p>
                  <Button
                    variant="link"
                    onClick={() => handleFilterChange({ province: "All Provinces", branch: "All Branches", position: "All Positions" })}
                    className="text-primary mt-2"
                  >
                    Clear All Filters
                  </Button>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}