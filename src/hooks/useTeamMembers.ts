import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TeamMember {
  id: string;
  nome: string;
  telefone: string | null;
  roles: Array<"admin" | "sdr" | "closer">;
}

export const useTeamMembers = (role?: "sdr" | "closer") => {
  return useQuery({
    queryKey: ["team-members", role],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("account_id")
        .eq("id", user.id)
        .single();

      if (!profile?.account_id) throw new Error("No account found");

      const { data: members, error: membersError } = await supabase
        .from("team_members")
        .select("*")
        .eq("account_id", profile.account_id)
        .order("nome");

      if (membersError) throw membersError;

      const { data: roles, error: rolesError } = await supabase
        .from("team_member_roles")
        .select("team_member_id, role");

      if (rolesError) throw rolesError;

      const membersWithRoles = members.map((member) => ({
        ...member,
        roles: roles
          .filter((r) => r.team_member_id === member.id)
          .map((r) => r.role as "admin" | "sdr" | "closer"),
      }));

      // Filter by role if specified
      if (role) {
        return membersWithRoles.filter((m) => m.roles.includes(role)) as TeamMember[];
      }

      return membersWithRoles as TeamMember[];
    },
  });
};
