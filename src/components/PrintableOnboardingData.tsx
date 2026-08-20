import { format } from "date-fns";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { Users } from "lucide-react";

interface PrintableOnboardingDataProps {
    data: any;
    app: any;
}

export const PrintableOnboardingData = ({ data, app }: PrintableOnboardingDataProps) => {
    if (!data || !app) return null;

    const profile = app.profiles || {};
    const avatarUrl = profile.avatar_url
        ? supabase.storage.from('avatars').getPublicUrl(profile.avatar_url).data.publicUrl
        : null;

    return createPortal(
        <div className="printable-area hidden print:block bg-white text-black p-8 font-serif leading-relaxed max-w-[210mm] mx-auto absolute top-0 left-0 w-full min-h-screen z-[9999]">
            {/* Header / Letterhead */}
            <div className="border-b-4 border-emerald-800 pb-4 mb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-emerald-900 tracking-tight">EMPLOYEE DATA SHEET</h1>
                    <p className="text-xs text-gray-500 mt-0.5">CONFIDENTIAL DOCUMENTS</p>
                </div>
                <div className="text-right">
                    <img src="/haka-logo-header.png" alt="HAKA AUTO" className="h-12 w-auto mb-1 ml-auto" />
                    <p className="text-[10px] text-gray-400 mt-0.5">Generated on: {format(new Date(), "PPpp")}</p>
                </div>
            </div>

            {/* Profile Section */}
            <div className="flex gap-6 mb-6 items-start">
                {/* Photo Placeholder */}
                <div className="w-32 h-40 bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden rounded-sm">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt="Photo" className="w-full h-full object-cover" />
                    ) : (
                        <div className="text-center text-gray-300">
                            <Users className="w-8 h-8 mx-auto mb-1 opacity-50" />
                            <span className="text-[10px]">No Photo</span>
                        </div>
                    )}
                </div>

                <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                    <div className="col-span-2 mb-1">
                        <h3 className="text-sm font-bold text-gray-800 border-b border-gray-200 pb-1">I. PERSONAL INFORMATION</h3>
                    </div>

                    <div className="grid grid-cols-[110px_1fr]">
                        <span className="font-semibold text-gray-600">Full Name</span>
                        <span className="uppercase font-bold">{profile.full_name || data.full_name}</span>
                    </div>
                    <div className="grid grid-cols-[110px_1fr]">
                        <span className="font-semibold text-gray-600">NIK (KTP)</span>
                        <span>{data.ktp_number}</span>
                    </div>

                    <div className="grid grid-cols-[110px_1fr]">
                        <span className="font-semibold text-gray-600">Place, DOB</span>
                        <span>{data.birth_place}, {data.birth_date}</span>
                    </div>
                    <div className="grid grid-cols-[110px_1fr]">
                        <span className="font-semibold text-gray-600">Religion</span>
                        <span>{data.religion}</span>
                    </div>

                    <div className="grid grid-cols-[110px_1fr]">
                        <span className="font-semibold text-gray-600">Gender</span>
                        <span className="capitalize">{profile.gender}</span>
                    </div>
                    <div className="grid grid-cols-[110px_1fr]">
                        <span className="font-semibold text-gray-600">Blood Type</span>
                        <span>{data.blood_type}</span>
                    </div>

                    <div className="grid grid-cols-[110px_1fr]">
                        <span className="font-semibold text-gray-600">Marital Status</span>
                        <span className="uppercase">{data.marital_status}</span>
                    </div>
                    <div className="grid grid-cols-[110px_1fr]">
                        <span className="font-semibold text-gray-600">No. of Children</span>
                        <span>{data.children_count}</span>
                    </div>

                    <div className="col-span-2 mt-1">
                        <div className="grid grid-cols-[110px_1fr] mb-1">
                            <span className="font-semibold text-gray-600">KTP Address</span>
                            <span>{data.ktp_address}</span>
                        </div>
                        <div className="grid grid-cols-[110px_1fr]">
                            <span className="font-semibold text-gray-600">Domicile Address</span>
                            <span>{data.domicile_address}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Position Info */}
            <div className="mb-6 text-xs">
                <h3 className="text-sm font-bold text-gray-800 border-b border-gray-200 pb-1 mb-3">II. EMPLOYMENT DETAILS</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    <div className="grid grid-cols-[110px_1fr]">
                        <span className="font-semibold text-gray-600">Position Title</span>
                        <span className="font-bold">{app.position}</span>
                    </div>
                    <div className="grid grid-cols-[110px_1fr]">
                        <span className="font-semibold text-gray-600">Branch/Location</span>
                        <span>{app.branch}</span>
                    </div>
                    <div className="grid grid-cols-[110px_1fr]">
                        <span className="font-semibold text-gray-600">Join Date</span>
                        <span>{format(new Date(app.updated_at), "MMMM d, yyyy")}</span>
                    </div>
                    <div className="grid grid-cols-[110px_1fr]">
                        <span className="font-semibold text-gray-600">Status</span>
                        <span className="uppercase">{app.status}</span>
                    </div>
                </div>
            </div>

            {/* Bank & Tax */}
            <div className="mb-6 text-xs">
                <h3 className="text-sm font-bold text-gray-800 border-b border-gray-200 pb-1 mb-3">III. FINANCIAL & TAX DATA</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    <div className="grid grid-cols-[110px_1fr]">
                        <span className="font-semibold text-gray-600">Bank Name</span>
                        <span>{data.bank_name}</span>
                    </div>
                    <div className="grid grid-cols-[110px_1fr]">
                        <span className="font-semibold text-gray-600">Account Number</span>
                        <span className="font-mono tracking-wide">{data.bank_account_number}</span>
                    </div>
                    <div className="grid grid-cols-[110px_1fr] col-span-2">
                        <span className="font-semibold text-gray-600">Account Holder</span>
                        <span className="uppercase">{data.bank_account_holder}</span>
                    </div>
                    <div className="grid grid-cols-[110px_1fr]">
                        <span className="font-semibold text-gray-600">NPWP</span>
                        <span>{data.npwp_number}</span>
                    </div>
                    <div className="grid grid-cols-[110px_1fr]">
                        <span className="font-semibold text-gray-600">BPJS Ketenagakerjaan</span>
                        <span>{data.bpjs_cair_status === "Sudah Dicairkan" ? "Withdrawn" : "Active"}</span>
                    </div>
                </div>
            </div>

            {/* Emergency Contact */}
            <div className="mb-6 text-xs">
                <h3 className="text-sm font-bold text-gray-800 border-b border-gray-200 pb-1 mb-3">IV. FAMILY & EMERGENCY</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    <div className="grid grid-cols-[110px_1fr]">
                        <span className="font-semibold text-gray-600">Father's Name</span>
                        <span>{data.father_name}</span>
                    </div>
                    <div className="grid grid-cols-[110px_1fr]">
                        <span className="font-semibold text-gray-600">Mother's Name</span>
                        <span>{data.mother_name}</span>
                    </div>
                    <div className="grid grid-cols-[110px_1fr] col-span-2 pt-2">
                        <span className="font-semibold text-gray-600">Emergency Contact</span>
                        <span className="uppercase font-bold">{data.emergency_contact_name}</span>
                    </div>
                    <div className="grid grid-cols-[110px_1fr]">
                        <span className="font-semibold text-gray-600">Relation</span>
                        <span>{data.emergency_contact_relation}</span>
                    </div>
                    <div className="grid grid-cols-[110px_1fr]">
                        <span className="font-semibold text-gray-600">Phone Number</span>
                        <span>{data.emergency_contact_phone}</span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-200 flex justify-between text-[10px] text-gray-500 break-inside-avoid">
                <div className="w-1/3 text-center">
                    <p className="mb-12">Approved By,</p>
                    <p className="font-bold underline">Hariyadi Kaimuddin</p>
                    <p>CEO HAKA Auto</p>
                </div>
                <div className="w-1/3 text-center">
                    <p className="mb-12">Employee,</p>
                    <p className="font-bold underline uppercase">{profile.full_name}</p>
                </div>
            </div>
        </div>,
        document.body
    );
};
