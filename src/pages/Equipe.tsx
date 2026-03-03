import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, Users, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";

interface TeamMember {
  id: string;
  nome: string;
  telefone: string | null;
  roles: Array<"admin" | "sdr" | "closer">;
}

const Equipe = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    roles: [] as Array<"admin" | "sdr" | "closer">,
  });

  const queryClient = useQueryClient();

  // Debug: Log user info
  useEffect(() => {
    console.log("User:", user);
  }, [user]);

  // Buscar perfil atual e account_id
  const { data: currentProfile } = useQuery({
    queryKey: ["current-profile"],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Buscar roles do usuário atual
  const { data: userRoles = [] } = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const isAdmin = userRoles.some((r) => r.role === "admin");

  // Debug: Log profile info e roles
  useEffect(() => {
    console.log("Current Profile:", currentProfile);
    console.log("User roles:", userRoles);
    console.log("Is Admin:", isAdmin);
  }, [currentProfile, userRoles, isAdmin]);

  const { data: teamMembers = [], isLoading } = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      if (!currentProfile?.account_id) return [];

      const { data: membersData, error: membersError } = await supabase
        .from("team_members")
        .select("*")
        .eq("account_id", currentProfile.account_id)
        .order("nome");

      if (membersError) throw membersError;

      const { data: rolesData, error: rolesError } = await supabase
        .from("team_member_roles")
        .select("team_member_id, role");

      if (rolesError) throw rolesError;

      const membersWithRoles = membersData.map((member) => ({
        ...member,
        roles: rolesData
          .filter((r) => r.team_member_id === member.id)
          .map((r) => r.role as "admin" | "sdr" | "closer"),
      }));

      return membersWithRoles as TeamMember[];
    },
    enabled: !!currentProfile?.account_id,
  });

  const createMember = useMutation({
    mutationFn: async (data: typeof formData) => {
      console.log("Creating member with data:", data);
      console.log("Current profile:", currentProfile);
      
      if (!currentProfile?.account_id) {
        console.error("Missing account_id. Current profile:", currentProfile);
        throw new Error("Account ID não encontrado");
      }

      // Criar membro da equipe
      const { data: memberData, error: memberError } = await supabase
        .from("team_members")
        .insert({
          nome: data.nome,
          telefone: data.telefone || null,
          account_id: currentProfile.account_id,
        })
        .select()
        .single();

      console.log("Member created:", memberData, "Error:", memberError);

      if (memberError) throw memberError;
      if (!memberData) throw new Error("Erro ao criar membro");

      // Adicionar roles
      if (data.roles.length > 0) {
        const rolesInsert = data.roles.map((role) => ({
          team_member_id: memberData.id,
          role: role,
        }));

        console.log("Inserting roles:", rolesInsert);

        const { error: rolesError } = await supabase
          .from("team_member_roles")
          .insert(rolesInsert);

        console.log("Roles error:", rolesError);

        if (rolesError) throw rolesError;
      }

      return memberData.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast.success("Membro adicionado com sucesso!");
      handleCloseDialog();
    },
    onError: (error: Error) => {
      console.error("Error creating member:", error);
      toast.error("Erro ao adicionar membro: " + error.message);
    },
  });

  const updateMember = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      if (!isAdmin) throw new Error("Sem permissão para editar");

      // Atualizar membro
      const { error: memberError } = await supabase
        .from("team_members")
        .update({
          nome: data.nome,
          telefone: data.telefone || null,
        })
        .eq("id", id);

      if (memberError) throw memberError;

      // Atualizar roles
      if (data.roles) {
        // Deletar roles antigas
        await supabase
          .from("team_member_roles")
          .delete()
          .eq("team_member_id", id);

        // Inserir novas roles
        if (data.roles.length > 0) {
          const rolesInsert = data.roles.map((role: string) => ({
            team_member_id: id,
            role: role,
          }));

          const { error: rolesError } = await supabase
            .from("team_member_roles")
            .insert(rolesInsert);

          if (rolesError) throw rolesError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast.success("Membro atualizado com sucesso!");
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  const deleteMember = useMutation({
    mutationFn: async (id: string) => {
      if (!isAdmin) throw new Error("Apenas administradores podem remover membros");

      const { error } = await supabase.from("team_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast.success("Membro removido com sucesso!");
      setDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error("Erro ao remover: " + error.message);
    },
  });

  const handleOpenDialog = (member?: TeamMember) => {
    if (member) {
      if (!isAdmin) {
        toast.error("Você não tem permissão para editar");
        return;
      }

      setEditingMember(member);
      setFormData({
        nome: member.nome,
        telefone: member.telefone || "",
        roles: member.roles || [],
      });
    } else {
      if (!isAdmin) {
        toast.error("Apenas administradores podem adicionar membros");
        return;
      }
      setEditingMember(null);
      setFormData({
        nome: "",
        telefone: "",
        roles: [],
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingMember(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (formData.roles.length === 0) {
      toast.error("Selecione pelo menos uma função");
      return;
    }

    if (editingMember) {
      updateMember.mutate({ id: editingMember.id, ...formData });
    } else {
      createMember.mutate(formData);
    }
  };

  const handleDeleteClick = (id: string) => {
    if (!isAdmin) {
      toast.error("Apenas administradores podem remover membros");
      return;
    }
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deletingId) {
      deleteMember.mutate(deletingId);
    }
  };

  const getRolesBadges = (roles: string[]) => {
    const badges = {
      admin: { label: "Admin", variant: "default" as const },
      sdr: { label: "SDR", variant: "secondary" as const },
      closer: { label: "Closer", variant: "secondary" as const },
    };
    return roles.map((role) => badges[role as keyof typeof badges] || badges.sdr);
  };

  const toggleRole = (role: "admin" | "sdr" | "closer") => {
    setFormData((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }));
  };

  if (isLoading || !currentProfile) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!currentProfile.account_id) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-destructive mb-4">Erro: Perfil sem conta associada</p>
          <p className="text-muted-foreground text-sm">Por favor, entre em contato com o suporte</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Equipe</h1>
          <p className="text-muted-foreground">Gerencie os colaboradores da sua equipe comercial</p>
        </div>

        {isAdmin && currentProfile?.account_id && (
          <Button onClick={() => handleOpenDialog()} className="gap-2 btn-premium">
            <Plus className="h-4 w-4" />
            Adicionar Colaborador
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <p className="metric-label">Total de Colaboradores</p>
          </div>
          <p className="metric-value text-primary">{teamMembers.length}</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-warning/10 rounded-lg">
              <Users className="h-5 w-5 text-warning" />
            </div>
            <p className="metric-label">SDRs</p>
          </div>
          <p className="metric-value text-warning">
            {teamMembers.filter((m) => m.roles.includes("sdr")).length}
          </p>
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-success/10 rounded-lg">
              <Users className="h-5 w-5 text-success" />
            </div>
            <p className="metric-label">Closers</p>
          </div>
          <p className="metric-value text-success">
            {teamMembers.filter((m) => m.roles.includes("closer")).length}
          </p>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-md overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Telefone</th>
              <th>Funções</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {teamMembers.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhum colaborador encontrado
                </td>
              </tr>
            ) : (
              teamMembers.map((member) => {
                const badges = getRolesBadges(member.roles);

                return (
                  <tr key={member.id}>
                    <td className="font-semibold">{member.nome}</td>
                    <td className="text-sm">{member.telefone || "-"}</td>
                    <td>
                      <div className="flex gap-1 flex-wrap">
                        {badges.length > 0 ? (
                          badges.map((badge, idx) => (
                            <Badge key={idx} variant={badge.variant}>
                              {badge.label}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">Sem função</span>
                        )}
                      </div>
                    </td>
                      <td>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/profile/${member.id}`)}
                            title="Ver Perfil"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDialog(member)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(member.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMember ? "Editar Membro" : "Adicionar Colaborador"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="telefone">Telefone (opcional)</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div>
                <Label>Funções *</Label>
                <div className="space-y-3 mt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="role-admin"
                      checked={formData.roles.includes("admin")}
                      onCheckedChange={() => toggleRole("admin")}
                    />
                    <Label htmlFor="role-admin" className="font-normal cursor-pointer">
                      Admin - Acesso total ao sistema
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="role-sdr"
                      checked={formData.roles.includes("sdr")}
                      onCheckedChange={() => toggleRole("sdr")}
                    />
                    <Label htmlFor="role-sdr" className="font-normal cursor-pointer">
                      SDR - Gestão de leads
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="role-closer"
                      checked={formData.roles.includes("closer")}
                      onCheckedChange={() => toggleRole("closer")}
                    />
                    <Label htmlFor="role-closer" className="font-normal cursor-pointer">
                      Closer - Gestão de calls e vendas
                    </Label>
                  </div>
                </div>
                {formData.roles.length === 0 && (
                  <p className="text-xs text-destructive mt-2">
                    Selecione pelo menos uma função
                  </p>
                )}
              </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="btn-premium"
                disabled={formData.roles.length === 0 || !currentProfile?.account_id}
              >
                {editingMember ? "Salvar" : "Adicionar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este membro? Esta ação não pode ser desfeita e todos os dados de performance associados serão mantidos para histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Equipe;
