import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function JobHeader() {
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Try to get full name from profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .single();
        
        setUserName(profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || "Candidate");
      }
    };
    
    fetchUserData();
  }, []);

  return (
    <div className="flex items-center justify-between mb-4 sm:mb-6">
      <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
        Hello, {userName}
      </h2>
      <div className="flex items-center gap-2 sm:gap-4">
        <button className="p-2 hover:bg-accent rounded-full transition-colors">
          <Bell className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
