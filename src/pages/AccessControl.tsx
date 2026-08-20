import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";

import TopNav from "@/components/TopNav";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Skeleton } from "@/components/ui/skeleton";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Label } from "@/components/ui/label";

import { toast } from "sonner";

import {
  Building2,
  LockKeyhole,
  Pencil,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";


// ============================================================
// DIVISION
// ============================================================

const DEPARTMENTS = [
  "Sales",
  "After Sales / Service",
  "Finance & Accounting",
  "Human Resources",
  "Marketing & Digital",
  "IT & Technology",
  "Operations",
  "Parts & Accessories",
  "Customer Relations",
  "General Affairs",
];


// ============================================================
// TYPES
// ============================================================

type AppRole =
  | "admin"
  | "recruiter"
  | "user";

interface ManagedUser {
  id: string;
  user_id: string;

  full_name: string;
  email: string;

  role: AppRole;

  department: string;

  is_fixed_employee: boolean;

  created_at: string;
}


// ============================================================
// ROLE BADGE
// ============================================================

const roleBadge = (role: AppRole) => {
  if (role === "admin") {
    return (
      <Badge className="bg-purple-100 text-purple-700 border border-purple-200 gap-1">
        <Shield className="w-3 h-3" />
        Admin
      </Badge>
    );
  }

  if (role === "recruiter") {
    return (
      <Badge className="bg-blue-100 text-blue-700 border border-blue-200 gap-1">
        <ShieldCheck className="w-3 h-3" />
        HRD / Recruiter
      </Badge>
    );
  }

  return (
    <Badge className="bg-slate-100 text-slate-700 border border-slate-200 gap-1">
      <Users className="w-3 h-3" />
      User
    </Badge>
  );
};


// ============================================================
// DIVISION BADGE
// ============================================================

const departmentBadge = (department: string) => {
  if (!department || department === "-") {
    return (
      <Badge
        variant="outline"
        className="text-slate-400 gap-1"
      >
        <Building2 className="w-3 h-3" />
        Not Assigned
      </Badge>
    );
  }

  return (
    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 gap-1">
      <Building2 className="w-3 h-3" />
      {department}
    </Badge>
  );
};


// ============================================================
// COMPONENT
// ============================================================

export default function AccessControl() {
  const {
    isAdmin,
    isRecruiter,
    loading: authLoading,
  } = useAdminCheck();


  // ============================================================
  // DB
  //
  // as any dipakai karena department / access_disabled mungkin
  // belum masuk generated Supabase types.ts
  // ============================================================

  const db = supabase as any;


  // ============================================================
  // STATE
  // ============================================================

  const [users, setUsers] =
    useState<ManagedUser[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [departmentFilter, setDepartmentFilter] =
    useState("all");

  const [roleFilter, setRoleFilter] =
    useState("all");


  // ============================================================
  // EDIT STATE
  // ============================================================

  const [editOpen, setEditOpen] =
    useState(false);

  const [editingUser, setEditingUser] =
    useState<ManagedUser | null>(null);

  const [editRole, setEditRole] =
    useState<AppRole>("user");

  const [editDepartment, setEditDepartment] =
    useState("");


  // ============================================================
  // ADD STATE
  // ============================================================

  const [addOpen, setAddOpen] =
    useState(false);

  const [addingUser, setAddingUser] =
    useState(false);

  const [addForm, setAddForm] =
    useState({
      full_name: "",
      email: "",
      password: "",
      department: "",
      role: "user" as AppRole,
    });


  // ============================================================
  // DELETE STATE
  // ============================================================

  const [deleteOpen, setDeleteOpen] =
    useState(false);

  const [deletingUser, setDeletingUser] =
    useState<ManagedUser | null>(null);

  const [deleting, setDeleting] =
    useState(false);


  // ============================================================
  // FETCH USERS
  // ============================================================

  const fetchUsers = async () => {
    setLoading(true);

    try {
      // ========================================================
      // CURRENT LOGIN USER
      // ========================================================

      const {
        data: sessionData,
      } =
        await supabase.auth.getSession();

      setCurrentUserId(
        sessionData.session?.user.id ?? null
      );


      // ========================================================
      // ACCEPTED APPLICATION
      // ========================================================

      const {
        data: acceptedApplications,
        error: applicationsError,
      } =
        await db
          .from("applications")
          .select("user_id")
          .eq("status", "accepted");

      if (applicationsError) {
        throw applicationsError;
      }


      const acceptedIds =
        (acceptedApplications ?? [])
          .map((row: any) => row.user_id)
          .filter(
            (id: unknown): id is string =>
              typeof id === "string"
          );


      const fixedEmployeeIds =
        new Set<string>(acceptedIds);


      // ========================================================
      // USER ROLES
      // ========================================================

      const {
        data: roleRows,
        error: rolesError,
      } =
        await db
          .from("user_roles")
          .select("user_id, role");

      if (rolesError) {
        throw rolesError;
      }


      const rolesByUser =
        new Map<string, AppRole[]>();


      (roleRows ?? []).forEach((row: any) => {
        if (!row.user_id) return;

        const current =
          rolesByUser.get(row.user_id) ?? [];

        current.push(
          row.role as AppRole
        );

        rolesByUser.set(
          row.user_id,
          current
        );
      });


      // ========================================================
      // ADMIN + HRD SELALU INTERNAL
      // ========================================================

      const privilegedIds =
        (roleRows ?? [])
          .filter(
            (row: any) =>
              row.role === "admin" ||
              row.role === "recruiter"
          )
          .map(
            (row: any) =>
              row.user_id
          );


      // ========================================================
      // PROFILES
      // ========================================================

      const {
        data: profileRows,
        error: profilesError,
      } =
        await db
          .from("profiles")
          .select(`
            user_id,
            full_name,
            email,
            department,
            access_disabled,
            created_at
          `);

      if (profilesError) {
        throw profilesError;
      }


      // ========================================================
      // PROFILE ACTIVE
      // ========================================================

      const activeProfiles =
        (profileRows ?? []).filter(
          (profile: any) =>
            profile.access_disabled !== true
        );


      const profileMap =
        new Map<string, any>();


      activeProfiles.forEach((profile: any) => {
        if (!profile.user_id) return;

        profileMap.set(
          profile.user_id,
          profile
        );
      });


      // ========================================================
      // USER YANG DITAMBAH MANUAL KE ACCESS CONTROL
      //
      // Kalau department sudah ada → dianggap internal
      // ========================================================

      const manuallyAddedIds =
        activeProfiles
          .filter(
            (profile: any) =>
              typeof profile.department === "string" &&
              profile.department.trim().length > 0
          )
          .map(
            (profile: any) =>
              profile.user_id
          );


      // ========================================================
      // VISIBLE USERS
      // ========================================================

      const visibleUserIds =
        Array.from(
          new Set<string>([
            ...acceptedIds,
            ...privilegedIds,
            ...manuallyAddedIds,
          ])
        )
          .filter(
            (userId) =>
              profileMap.has(userId)
          );


      // ========================================================
      // BUILD USERS
      // ========================================================

      const managedUsers: ManagedUser[] =
        visibleUserIds.map((userId) => {
          const profile =
            profileMap.get(userId);

          const roles =
            rolesByUser.get(userId) ?? [];


          // ====================================================
          // ROLE PRIORITY
          // ====================================================

          let role: AppRole = "user";

          if (roles.includes("admin")) {
            role = "admin";
          } else if (
            roles.includes("recruiter")
          ) {
            role = "recruiter";
          }


          return {
            id: userId,

            user_id: userId,

            full_name:
              profile?.full_name ||
              "Unknown User",

            email:
              profile?.email ||
              "-",

            role,

            department:
              profile?.department ||
              "-",

            is_fixed_employee:
              fixedEmployeeIds.has(userId),

            created_at:
              profile?.created_at ||
              new Date().toISOString(),
          };
        });


      // ========================================================
      // SORTING
      // ========================================================

      const roleOrder: Record<AppRole, number> = {
        admin: 1,
        recruiter: 2,
        user: 3,
      };


      managedUsers.sort((a, b) => {
        const roleDiff =
          roleOrder[a.role] -
          roleOrder[b.role];

        if (roleDiff !== 0) {
          return roleDiff;
        }

        return a.full_name.localeCompare(
          b.full_name
        );
      });


      setUsers(managedUsers);

    } catch (error: any) {
      console.error(
        "Access Control fetch error:",
        error
      );

      toast.error(
        error?.message ||
        "Gagal mengambil data Access Control."
      );

      setUsers([]);

    } finally {
      setLoading(false);
    }
  };


  // ============================================================
  // LOAD
  // ============================================================

  useEffect(() => {
    if (authLoading) return;

    if (
      isAdmin ||
      isRecruiter
    ) {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [
    authLoading,
    isAdmin,
    isRecruiter,
  ]);


  // ============================================================
  // OPEN EDIT
  // ============================================================

  const openEdit = (
    user: ManagedUser
  ) => {
    // Tidak edit diri sendiri
    if (
      user.user_id === currentUserId
    ) {
      toast.error(
        "Anda tidak dapat mengubah role akun sendiri."
      );

      return;
    }


    // HRD tidak boleh edit admin
    if (
      isRecruiter &&
      !isAdmin &&
      user.role === "admin"
    ) {
      toast.error(
        "HRD tidak dapat mengubah akun Administrator."
      );

      return;
    }


    setEditingUser(user);

    setEditRole(user.role);

    setEditDepartment(
      user.department === "-"
        ? ""
        : user.department
    );

    setEditOpen(true);
  };


  // ============================================================
  // SAVE EDIT
  // ============================================================

  const saveEdit = async () => {
    if (!editingUser) return;


    if (!editDepartment) {
      toast.error(
        "Division wajib dipilih."
      );

      return;
    }


    // HR tidak boleh set admin
    if (
      isRecruiter &&
      !isAdmin &&
      editRole === "admin"
    ) {
      toast.error(
        "HRD tidak dapat memberikan role Admin."
      );

      return;
    }


    try {
      // ========================================================
      // UPDATE DIVISION
      // ========================================================

      if (
        editDepartment !==
        editingUser.department
      ) {
        const {
          error: profileError,
        } =
          await db
            .from("profiles")
            .update({
              department:
                editDepartment,

              access_disabled:
                false,
            })
            .eq(
              "user_id",
              editingUser.user_id
            );


        if (profileError) {
          throw profileError;
        }
      }


      // ========================================================
      // UPDATE ROLE
      // ========================================================

      if (
        editRole !==
        editingUser.role
      ) {
        // Cek apakah user_roles memiliki baris untuk user ini
        const {
          data: existingRoles,
          error: roleFetchErr,
        } = await db
          .from("user_roles")
          .select("id, role")
          .eq("user_id", editingUser.user_id);

        if (roleFetchErr) {
          throw roleFetchErr;
        }

        if (existingRoles && existingRoles.length > 0) {
          const { error: roleError } = await db
            .from("user_roles")
            .update({
              role: editRole,
            })
            .eq("user_id", editingUser.user_id);

          if (roleError) {
            throw roleError;
          }
        } else {
          const { error: insertRoleError } = await db
            .from("user_roles")
            .insert({
              user_id: editingUser.user_id,
              role: editRole,
            });

          if (insertRoleError) {
            throw insertRoleError;
          }
        }
      }


      toast.success(
        `Access ${editingUser.full_name} berhasil diperbarui.`
      );


      setEditOpen(false);
      setEditingUser(null);

      await fetchUsers();

    } catch (error: any) {
      console.error(
        "Update Access Control error:",
        error
      );

      toast.error(
        error?.message ||
        "Gagal memperbarui Access Control."
      );
    }
  };


  // ============================================================
  // ADD USER
  //
  // CATATAN:
  // Add User di sini berarti memasukkan ACCOUNT YANG SUDAH ADA
  // di Supabase / profiles ke Access Control.
  //
  // Jadi tidak membuat auth.users baru.
  // ============================================================

  const handleAddUser = async () => {
    if (
      !addForm.full_name.trim() ||
      !addForm.email.trim() ||
      !addForm.department ||
      !addForm.role
    ) {
      toast.error("Semua field (Nama, Email, Divisi, Role) wajib diisi.");
      return;
    }

    if (isRecruiter && !isAdmin && addForm.role === "admin") {
      toast.error("HRD tidak dapat menambahkan role Admin.");
      return;
    }

    setAddingUser(true);

    try {
      const normalizedEmail = addForm.email.trim().toLowerCase();

      // 1. Cari profile user di database (case-insensitive ilike search)
      const { data: profile, error: profileError } = await db
        .from("profiles")
        .select(`
          user_id,
          full_name,
          email,
          department,
          access_disabled
        `)
        .ilike("email", normalizedEmail)
        .maybeSingle();

      if (profileError) throw profileError;

      // 2. Jika User SUDAH TERDAFTAR di database -> Langsung update Divisi & Assign Role!
      if (profile) {
        const { data: roleRows, error: roleFetchError } = await db
          .from("user_roles")
          .select("role")
          .eq("user_id", profile.user_id);

        if (roleFetchError) throw roleFetchError;

        const currentRoles: AppRole[] = (roleRows ?? []).map((row: any) => row.role as AppRole);
        let currentRole: AppRole = "user";
        if (currentRoles.includes("admin")) currentRole = "admin";
        else if (currentRoles.includes("recruiter")) currentRole = "recruiter";

        if (isRecruiter && !isAdmin && currentRole === "admin") {
          throw new Error("HRD tidak dapat menambahkan atau mengubah akun Administrator.");
        }

        const { error: updateProfileError } = await db
          .from("profiles")
          .update({
            full_name: addForm.full_name.trim(),
            department: addForm.department,
            access_disabled: false,
          })
          .eq("user_id", profile.user_id);

        if (updateProfileError) throw updateProfileError;

        if (currentRole !== addForm.role) {
          if (currentRoles.length === 0) {
            const { error: insertRoleError } = await db
              .from("user_roles")
              .insert({
                user_id: profile.user_id,
                role: addForm.role,
              });
            if (insertRoleError) throw insertRoleError;
          } else {
            const { error: updateRoleError } = await db
              .from("user_roles")
              .update({ role: addForm.role })
              .eq("user_id", profile.user_id)
              .eq("role", currentRole);
            if (updateRoleError) throw updateRoleError;
          }
        }

        toast.success(`${addForm.full_name} berhasil ditambahkan/diperbarui di Access Control.`);
        setAddOpen(false);
        setAddForm({
          full_name: "",
          email: "",
          password: "",
          department: "",
          role: "user",
        });
        await fetchUsers();
        return;
      }

      // 3. Jika User BELUM ada di profiles -> Panggil Edge Function atau Server Endpoint untuk buat akun baru di Supabase Auth
      if (!addForm.password || addForm.password.length < 6) {
        throw new Error("Password minimal 6 karakter wajib diisi untuk pendaftaran akun baru.");
      }

      // Try Edge Function first
      try {
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke("create-user", {
          body: {
            email: normalizedEmail,
            password: addForm.password,
            full_name: addForm.full_name.trim(),
            department: addForm.department,
            role: addForm.role,
          },
        });

        if (!edgeError && edgeData?.success) {
          toast.success(`${addForm.full_name} berhasil dibuat dan ditambahkan ke Access Control.`);
          setAddOpen(false);
          setAddForm({
            full_name: "",
            email: "",
            password: "",
            department: "",
            role: "user",
          });
          await fetchUsers();
          return;
        }
      } catch (e) {
        // Edge Function not deployed, try local Express backend server
      }

      // Fallback to Express backend server (http://localhost:3001/api/admin/create-user)
      try {
        const res = await fetch("http://localhost:3001/api/admin/create-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: normalizedEmail,
            password: addForm.password,
            full_name: addForm.full_name.trim(),
            department: addForm.department,
            role: addForm.role,
          }),
        });

        const contentType = res.headers.get("content-type") || "";
        let resData: any = {};

        if (contentType.includes("application/json")) {
          resData = await res.json();
        } else {
          const rawText = await res.text();
          console.warn("Backend server returned non-JSON response:", rawText);
          throw new Error("Server backend belum aktif atau URL endpoint salah.");
        }

        if (res.ok && resData.success) {
          toast.success(`${addForm.full_name} berhasil dibuat di Supabase Auth & ditambahkan ke Access Control.`);
          setAddOpen(false);
          setAddForm({
            full_name: "",
            email: "",
            password: "",
            department: "",
            role: "user",
          });
          await fetchUsers();
          return;
        }

        if (resData?.error) {
          throw new Error(resData.error);
        }
      } catch (serverErr: any) {
        if (serverErr.message && !serverErr.message.includes("Failed to fetch")) {
          throw serverErr;
        }
      }

      throw new Error("Gagal membuat akun baru. Pastikan Service Role Key server aktif atau deploy Edge Function create-user.");
    } catch (error: any) {
      console.error("Add user error:", error);
      toast.error(error?.message || "Gagal menambahkan user.");
    } finally {
      setAddingUser(false);
    }
  };


  // ============================================================
  // OPEN DELETE
  // ============================================================

  const openDelete = (
    user: ManagedUser
  ) => {
    // Tidak boleh delete diri sendiri
    if (
      user.user_id ===
      currentUserId
    ) {
      toast.error(
        "Anda tidak dapat menghapus access akun sendiri."
      );

      return;
    }


    // HR tidak boleh delete Admin
    if (
      isRecruiter &&
      !isAdmin &&
      user.role === "admin"
    ) {
      toast.error(
        "HRD tidak dapat menghapus akun Administrator."
      );

      return;
    }


    setDeletingUser(user);
    setDeleteOpen(true);
  };


  // ============================================================
  // DELETE / REMOVE ACCESS
  // ============================================================

  const handleDeleteUser = async () => {
    if (!deletingUser) return;


    setDeleting(true);


    try {
      // ========================================================
      // SAFETY
      // ========================================================

      if (
        deletingUser.user_id ===
        currentUserId
      ) {
        throw new Error(
          "Anda tidak dapat menghapus access akun sendiri."
        );
      }


      if (
        isRecruiter &&
        !isAdmin &&
        deletingUser.role === "admin"
      ) {
        throw new Error(
          "HRD tidak dapat menghapus Administrator."
        );
      }


      // ========================================================
      // REMOVE PRIVILEGED ROLE
      //
      // Kalau Admin/HR dihapus dari Access Control
      // role dikembalikan menjadi USER.
      // ========================================================

      if (
        deletingUser.role !== "user"
      ) {
        const {
          error: roleError,
        } =
          await db
            .from("user_roles")
            .update({
              role: "user",
            })
            .eq(
              "user_id",
              deletingUser.user_id
            )
            .eq(
              "role",
              deletingUser.role
            );


        if (roleError) {
          throw roleError;
        }
      }


      // ========================================================
      // HIDE DARI ACCESS CONTROL
      //
      // ACCOUNT AUTH + recruitment history TIDAK DIHAPUS.
      // ========================================================

      const {
        error: profileError,
      } =
        await db
          .from("profiles")
          .update({
            access_disabled:
              true,

            department:
              null,
          })
          .eq(
            "user_id",
            deletingUser.user_id
          );


      if (profileError) {
        throw profileError;
      }


      toast.success(
        `${deletingUser.full_name} berhasil dihapus dari Access Control.`
      );


      setDeleteOpen(false);
      setDeletingUser(null);


      await fetchUsers();

    } catch (error: any) {
      console.error(
        "Delete Access Control error:",
        error
      );


      toast.error(
        error?.message ||
        "Gagal menghapus user dari Access Control."
      );

    } finally {
      setDeleting(false);
    }
  };


  // ============================================================
  // FILTER
  // ============================================================

  const filteredUsers =
    useMemo(() => {
      return users.filter((user) => {
        const search =
          searchTerm
            .trim()
            .toLowerCase();


        const matchSearch =
          user.full_name
            .toLowerCase()
            .includes(search)
          ||
          user.email
            .toLowerCase()
            .includes(search);


        const matchDepartment =
          departmentFilter === "all"
          ||
          user.department ===
          departmentFilter;


        const matchRole =
          roleFilter === "all"
          ||
          user.role === roleFilter;


        return (
          matchSearch &&
          matchDepartment &&
          matchRole
        );
      });

    }, [
      users,
      searchTerm,
      departmentFilter,
      roleFilter,
    ]);


  // ============================================================
  // STATS
  // ============================================================

  const totalUsers =
    users.length;


  const totalFixedEmployees =
    users.filter(
      (user) =>
        user.is_fixed_employee
    ).length;


  const totalDepartments =
    new Set(
      users
        .map(
          (user) =>
            user.department
        )
        .filter(
          (department) =>
            department !== "-"
        )
    ).size;


  // ============================================================
  // AUTH LOADING
  // ============================================================

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <TopNav />

        <main className="max-w-7xl mx-auto px-4 py-8">
          <Skeleton className="h-10 w-80 mb-4" />

          <Skeleton className="h-6 w-96 mb-8" />

          <Skeleton className="h-64 w-full rounded-xl" />
        </main>
      </div>
    );
  }


  // ============================================================
  // APPLICANT BLOCK
  // ============================================================

  if (
    !isAdmin &&
    !isRecruiter
  ) {
    return (
      <Navigate
        to="/job-board"
        replace
      />
    );
  }


  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="min-h-screen bg-slate-50">

      <TopNav />


      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">


        {/* ====================================================
            HEADER
        ==================================================== */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">

          <div>

            <div className="flex flex-wrap items-center gap-3">

              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Access Control
              </h1>


              <Badge className="bg-blue-100 text-blue-700 border border-blue-200">
                Internal User Management
              </Badge>

            </div>


            <p className="text-slate-500 mt-2">
              Kelola division dan role internal employee.
            </p>


            {isRecruiter && !isAdmin && (

              <p className="text-sm text-amber-600 mt-2">

                HRD dapat mengelola User dan HRD / Recruiter,
                tetapi tidak dapat mengelola Administrator.

              </p>

            )}

          </div>


          {/* ==================================================
              ADD USER

              ADMIN + HRD SAMA-SAMA PUNYA BUTTON
          ================================================== */}

          <Button
            className="gap-2"
            onClick={() => {
              setAddForm({
                full_name: "",
                email: "",
                department: "",
                role: "user",
              });

              setAddOpen(true);
            }}
          >

            <UserPlus className="w-4 h-4" />

            Add User

          </Button>

        </div>


        {/* ====================================================
            STATS
        ==================================================== */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">


          <Card className="border-l-4 border-l-blue-500">

            <CardContent className="p-5 flex items-center gap-4">

              <Users className="w-7 h-7 text-blue-600" />

              <div>

                <p className="text-sm text-slate-500">
                  Total Internal User
                </p>

                <h3 className="text-2xl font-bold">
                  {totalUsers}
                </h3>

              </div>

            </CardContent>

          </Card>


          <Card className="border-l-4 border-l-green-500">

            <CardContent className="p-5 flex items-center gap-4">

              <UserCheck className="w-7 h-7 text-green-600" />

              <div>

                <p className="text-sm text-slate-500">
                  Fixed Employee
                </p>

                <h3 className="text-2xl font-bold">
                  {totalFixedEmployees}
                </h3>

              </div>

            </CardContent>

          </Card>


          <Card className="border-l-4 border-l-emerald-500">

            <CardContent className="p-5 flex items-center gap-4">

              <Building2 className="w-7 h-7 text-emerald-600" />

              <div>

                <p className="text-sm text-slate-500">
                  Total Division
                </p>

                <h3 className="text-2xl font-bold">
                  {totalDepartments}
                </h3>

              </div>

            </CardContent>

          </Card>

        </div>


        {/* ====================================================
            FILTER
        ==================================================== */}

        <Card className="mb-6">

          <CardContent className="p-4">

            <div className="flex flex-col lg:flex-row gap-3">

              <div className="relative flex-1">

                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                <Input
                  placeholder="Cari nama atau email..."
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(
                      event.target.value
                    )
                  }
                  className="pl-10"
                />

              </div>


              <Select
                value={departmentFilter}
                onValueChange={setDepartmentFilter}
              >

                <SelectTrigger className="w-full lg:w-[220px]">

                  <SelectValue placeholder="Semua Division" />

                </SelectTrigger>


                <SelectContent>

                  <SelectItem value="all">
                    Semua Division
                  </SelectItem>

                  {DEPARTMENTS.map((department) => (
                    <SelectItem
                      key={department}
                      value={department}
                    >
                      {department}
                    </SelectItem>
                  ))}

                </SelectContent>

              </Select>


              <Select
                value={roleFilter}
                onValueChange={setRoleFilter}
              >

                <SelectTrigger className="w-full lg:w-[190px]">

                  <SelectValue placeholder="Semua Role" />

                </SelectTrigger>


                <SelectContent>

                  <SelectItem value="all">
                    Semua Role
                  </SelectItem>

                  <SelectItem value="user">
                    User
                  </SelectItem>

                  <SelectItem value="recruiter">
                    HRD / Recruiter
                  </SelectItem>

                  <SelectItem value="admin">
                    Admin
                  </SelectItem>

                </SelectContent>

              </Select>

            </div>

          </CardContent>

        </Card>


        {/* ====================================================
            TABLE
        ==================================================== */}

        <Card>

          <CardContent className="p-0">

            {loading ? (

              <div className="p-8 space-y-4">

                {[1, 2, 3, 4].map((item) => (
                  <Skeleton
                    key={item}
                    className="h-14 w-full"
                  />
                ))}

              </div>

            ) : (

              <div className="overflow-x-auto">

                <Table>

                  <TableHeader>

                    <TableRow className="bg-slate-50 hover:bg-slate-50">

                      <TableHead>
                        Name
                      </TableHead>

                      <TableHead>
                        Email
                      </TableHead>

                      <TableHead>
                        Division
                      </TableHead>

                      <TableHead>
                        Role
                      </TableHead>

                      <TableHead className="text-center">
                        Action
                      </TableHead>

                    </TableRow>

                  </TableHeader>


                  <TableBody>

                    {filteredUsers.length === 0 ? (

                      <TableRow>

                        <TableCell
                          colSpan={5}
                          className="text-center py-12 text-slate-400"
                        >

                          Tidak ada internal user ditemukan.

                        </TableCell>

                      </TableRow>

                    ) : (

                      filteredUsers.map((user) => {

                        const isSelf =
                          user.user_id ===
                          currentUserId;


                        const canManage =
                          !isSelf
                          &&
                          (
                            isAdmin
                            ||
                            (
                              isRecruiter
                              &&
                              user.role !== "admin"
                            )
                          );


                        return (

                          <TableRow key={user.user_id}>


                            <TableCell>

                              <div className="flex items-center gap-3">

                                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">

                                  {user.full_name
                                    .charAt(0)
                                    .toUpperCase()}

                                </div>


                                <div>

                                  <p className="font-semibold">
                                    {user.full_name}
                                  </p>


                                  {user.is_fixed_employee && (

                                    <p className="text-xs text-green-600">
                                      Fixed Employee
                                    </p>

                                  )}

                                </div>

                              </div>

                            </TableCell>


                            <TableCell>
                              {user.email}
                            </TableCell>


                            <TableCell>

                              {departmentBadge(
                                user.department
                              )}

                            </TableCell>


                            <TableCell>

                              {roleBadge(
                                user.role
                              )}

                            </TableCell>


                            {/* =================================
                                ACTION
                            ================================= */}

                            <TableCell>

                              <div className="flex items-center justify-center gap-2">

                                {canManage ? (

                                  <>
                                    {/* EDIT */}

                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="gap-1"
                                      onClick={() =>
                                        openEdit(user)
                                      }
                                    >

                                      <Pencil className="w-4 h-4" />

                                      Edit

                                    </Button>


                                    {/* DELETE */}

                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
                                      onClick={() =>
                                        openDelete(user)
                                      }
                                    >

                                      <Trash2 className="w-4 h-4" />

                                      Delete

                                    </Button>
                                  </>

                                ) : (

                                  <Badge
                                    variant="outline"
                                    className="text-slate-400 gap-1"
                                  >

                                    <LockKeyhole className="w-3 h-3" />

                                    Protected

                                  </Badge>

                                )}

                              </div>

                            </TableCell>

                          </TableRow>

                        );

                      })

                    )}

                  </TableBody>

                </Table>

              </div>

            )}

          </CardContent>

        </Card>

      </main>


      {/* ======================================================
          ADD USER DIALOG
      ====================================================== */}

      <Dialog
        open={addOpen}
        onOpenChange={setAddOpen}
      >

        <DialogContent className="sm:max-w-md">

          <DialogHeader>

            <DialogTitle className="flex items-center gap-2">

              <UserPlus className="w-5 h-5" />

              Add User to Access Control

            </DialogTitle>

          </DialogHeader>


          <div className="space-y-4">


            <div>

              <Label>
                Full Name
              </Label>

              <Input
                value={addForm.full_name}
                onChange={(event) =>
                  setAddForm((prev) => ({
                    ...prev,
                    full_name:
                      event.target.value,
                  }))
                }
                placeholder="Nama lengkap"
                className="mt-1"
              />

            </div>


            <div>

              <Label>
                Email
              </Label>

              <Input
                type="email"
                value={addForm.email}
                onChange={(event) =>
                  setAddForm((prev) => ({
                    ...prev,
                    email:
                      event.target.value,
                  }))
                }
                placeholder="user@haka.com"
                className="mt-1"
              />
            </div>

            <div>
              <Label>
                Password
              </Label>

              <Input
                type="password"
                value={addForm.password}
                onChange={(event) =>
                  setAddForm((prev) => ({
                    ...prev,
                    password:
                      event.target.value,
                  }))
                }
                placeholder="Minimal 6 karakter"
                className="mt-1"
              />

              <p className="text-xs text-slate-400 mt-1">
                Wajib untuk pendaftaran akun baru di Supabase.
              </p>
            </div>


            <div>

              <Label>
                Division
              </Label>

              <Select
                value={addForm.department}
                onValueChange={(value) =>
                  setAddForm((prev) => ({
                    ...prev,
                    department:
                      value,
                  }))
                }
              >

                <SelectTrigger className="mt-1">

                  <SelectValue placeholder="Pilih Division" />

                </SelectTrigger>


                <SelectContent>

                  {DEPARTMENTS.map((department) => (

                    <SelectItem
                      key={department}
                      value={department}
                    >

                      {department}

                    </SelectItem>

                  ))}

                </SelectContent>

              </Select>

            </div>


            <div>

              <Label>
                Role
              </Label>

              <Select
                value={addForm.role}
                onValueChange={(value) =>
                  setAddForm((prev) => ({
                    ...prev,
                    role:
                      value as AppRole,
                  }))
                }
              >

                <SelectTrigger className="mt-1">

                  <SelectValue placeholder="Pilih Role" />

                </SelectTrigger>


                <SelectContent>

                  <SelectItem value="user">
                    User
                  </SelectItem>

                  <SelectItem value="recruiter">
                    HRD / Recruiter
                  </SelectItem>


                  {/* ADMIN HANYA BISA DIPILIH ADMIN */}

                  {isAdmin && (

                    <SelectItem value="admin">
                      Admin
                    </SelectItem>

                  )}

                </SelectContent>

              </Select>


              {isRecruiter && !isAdmin && (

                <p className="text-xs text-slate-500 mt-1">

                  HRD hanya dapat menambahkan User
                  atau HRD / Recruiter.

                </p>

              )}

            </div>

          </div>


          <DialogFooter>

            <Button
              variant="outline"
              onClick={() =>
                setAddOpen(false)
              }
            >

              Cancel

            </Button>


            <Button
              onClick={handleAddUser}
              disabled={addingUser}
            >

              {addingUser
                ? "Adding..."
                : "Add User"}

            </Button>

          </DialogFooter>

        </DialogContent>

      </Dialog>


      {/* ======================================================
          EDIT DIALOG
      ====================================================== */}

      <Dialog
        open={editOpen}
        onOpenChange={setEditOpen}
      >

        <DialogContent className="sm:max-w-md">

          <DialogHeader>

            <DialogTitle>
              Edit Access
            </DialogTitle>

          </DialogHeader>


          {editingUser && (

            <div className="space-y-4">


              <div>

                <Label>
                  Name
                </Label>

                <Input
                  disabled
                  value={editingUser.full_name}
                  className="mt-1"
                />

              </div>


              <div>

                <Label>
                  Email
                </Label>

                <Input
                  disabled
                  value={editingUser.email}
                  className="mt-1"
                />

              </div>


              <div>

                <Label>
                  Division
                </Label>

                <Select
                  value={editDepartment}
                  onValueChange={setEditDepartment}
                >

                  <SelectTrigger className="mt-1">

                    <SelectValue placeholder="Pilih Division" />

                  </SelectTrigger>


                  <SelectContent>

                    {DEPARTMENTS.map((department) => (

                      <SelectItem
                        key={department}
                        value={department}
                      >

                        {department}

                      </SelectItem>

                    ))}

                  </SelectContent>

                </Select>

              </div>


              <div>

                <Label>
                  Role
                </Label>

                <Select
                  value={editRole}
                  onValueChange={(value) =>
                    setEditRole(
                      value as AppRole
                    )
                  }
                >

                  <SelectTrigger className="mt-1">

                    <SelectValue placeholder="Pilih Role" />

                  </SelectTrigger>


                  <SelectContent>

                    <SelectItem value="user">
                      User
                    </SelectItem>

                    <SelectItem value="recruiter">
                      HRD / Recruiter
                    </SelectItem>


                    {isAdmin && (

                      <SelectItem value="admin">
                        Admin
                      </SelectItem>

                    )}

                  </SelectContent>

                </Select>

              </div>

            </div>

          )}


          <DialogFooter>

            <Button
              variant="outline"
              onClick={() =>
                setEditOpen(false)
              }
            >

              Cancel

            </Button>


            <Button
              onClick={saveEdit}
            >

              Save Changes

            </Button>

          </DialogFooter>

        </DialogContent>

      </Dialog>


      {/* ======================================================
          DELETE DIALOG
      ====================================================== */}

      <Dialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      >

        <DialogContent className="sm:max-w-md">

          <DialogHeader>

            <DialogTitle className="text-red-600 flex items-center gap-2">

              <Trash2 className="w-5 h-5" />

              Delete User Access

            </DialogTitle>

          </DialogHeader>


          {deletingUser && (

            <div className="space-y-3">

              <p className="text-slate-600">

                Yakin ingin menghapus

                {" "}

                <strong>
                  {deletingUser.full_name}
                </strong>

                {" "}

                dari Access Control?

              </p>


              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">

                Account Authentication dan history recruitment
                tidak dihapus. User hanya dihapus dari Access Control
                dan privileged role akan dicabut.

              </div>

            </div>

          )}


          <DialogFooter>

            <Button
              variant="outline"
              onClick={() =>
                setDeleteOpen(false)
              }
            >

              Cancel

            </Button>


            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={deleting}
            >

              <Trash2 className="w-4 h-4 mr-2" />

              {deleting
                ? "Deleting..."
                : "Delete"}

            </Button>

          </DialogFooter>

        </DialogContent>

      </Dialog>

    </div>
  );
}