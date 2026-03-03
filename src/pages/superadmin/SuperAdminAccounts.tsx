import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, UserCheck, Ban, CheckCircle, Trash2, Edit, FileText, Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/dateUtils";
import { toast } from "sonner";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AccountDetailsDialog from "@/components/AccountDetailsDialog";
import EditAccountDialog from "@/components/EditAccountDialog";
import DeleteAccountDialog from "@/components/DeleteAccountDialog";
import { GrantAccessDialog } from "@/components/GrantAccessDialog";
import { HealthScoreBadge } from "@/components/HealthScoreBadge";

interface Account {
  id: string;
  nome_empresa: string;
  owner_name: string;
  owner_email: string;
  created_at: string;
  num_users: number;
  num_leads: number;
  total_revenue: number;
  plano: string;
  ativo: boolean;
  health_score?: number;
}

const SuperAdminAccounts = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [detailsAccount, setDetailsAccount] = useState<Account | null>(null);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [deleteAccount, setDeleteAccount] = useState<{ id: string; name: string } | null>(null);
  const [grantAccessAccount, setGrantAccessAccount] = useState<{ id: string; name: string } | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["super-admin-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_accounts_with_stats");
      if (error) throw error;
      
      // Buscar dados de onboarding dos owners
      const accountsWithOnboarding = await Promise.all(
        (data as Account[]).map(async (account) => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("niche, team_size, monthly_revenue, main_goal, main_challenge")
            .eq("email", account.owner_email)
            .single();
          
          return {
            ...account,
            ...profileData,
          };
        })
      );
      
      return accountsWithOnboarding;
    },
  });

  const impersonateMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Buscar o owner da conta
      const { data: account } = await supabase
        .from("accounts")
        .select("owner_id")
        .eq("id", accountId)
        .single();

      if (!account) throw new Error("Conta não encontrada");

      // Criar sessão de impersonate
      const { error } = await supabase
        .from("impersonate_sessions")
        .insert({
          super_admin_id: user.id,
          target_user_id: account.owner_id,
          account_id: accountId,
        });

      if (error) throw error;
      return { targetUserId: account.owner_id, accountId };
    },
    onSuccess: ({ accountId }) => {
      toast.success("Modo impersonate ativado");
      // Armazenar no localStorage para mostrar a barra de retorno
      localStorage.setItem("impersonate_mode", "true");
      localStorage.setItem("impersonate_account", accountId);
      navigate("/");
    },
    onError: (error) => {
      toast.error("Erro ao entrar no modo impersonate: " + error.message);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("accounts")
        .update({ ativo: !ativo })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-accounts"] });
      toast.success("Status da conta atualizado");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar conta: " + error.message);
    },
  });

  const editAccountMutation = useMutation({
    mutationFn: async (data: { id: string; nome_empresa: string; plano: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("accounts")
        .update({
          nome_empresa: data.nome_empresa,
          plano: data.plano,
          ativo: data.ativo,
        })
        .eq("id", data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-accounts"] });
      toast.success("Conta atualizada com sucesso");
      setEditAccount(null);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar conta: " + error.message);
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("accounts")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-accounts"] });
      toast.success("Conta excluída com sucesso");
      setDeleteAccount(null);
    },
    onError: (error) => {
      toast.error("Erro ao excluir conta: " + error.message);
    },
  });

  const filteredAccounts = accounts?.filter(
    (acc) =>
      acc.nome_empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.owner_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.owner_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8 bg-background min-h-screen">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Gerenciamento de Contas</h1>
          <p className="text-muted-foreground mt-1">
            Visualize e gerencie todas as contas da plataforma
          </p>
        </div>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Buscar Contas</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Buscar por empresa, email ou nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Todas as Contas ({filteredAccounts?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b hover:bg-transparent">
                  <TableHead className="font-semibold">Empresa</TableHead>
                  <TableHead className="font-semibold">Dono</TableHead>
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold">Plano</TableHead>
                  <TableHead className="font-semibold">Cadastro</TableHead>
                  <TableHead className="font-semibold text-center">Usuários</TableHead>
                  <TableHead className="font-semibold text-center">Leads</TableHead>
                  <TableHead className="font-semibold text-right">Faturamento</TableHead>
                  <TableHead className="font-semibold text-center">Health</TableHead>
                  <TableHead className="font-semibold text-center">Status</TableHead>
                  <TableHead className="font-semibold text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts?.map((account) => (
                  <TableRow key={account.id} className="hover:bg-muted/30 border-b border-border/50">
                    <TableCell className="font-medium py-4">{account.nome_empresa}</TableCell>
                    <TableCell className="text-sm">{account.owner_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{account.owner_email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {account.plano || "free"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(account.created_at)}</TableCell>
                    <TableCell className="text-center">{account.num_users}</TableCell>
                    <TableCell className="text-center">{account.num_leads}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(account.total_revenue)}</TableCell>
                    <TableCell className="text-center">
                      <HealthScoreBadge score={account.health_score || 0} showLabel={false} />
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={account.ativo ? "default" : "destructive"}>
                        {account.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Ver detalhes"
                          className="h-8 w-8"
                          onClick={() => setDetailsAccount(account)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Impersonate"
                          className="h-8 w-8"
                          onClick={() => impersonateMutation.mutate(account.id)}
                        >
                          <UserCheck className="h-4 w-4 text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Liberar Acesso Manual"
                          className="h-8 w-8"
                          onClick={() => setGrantAccessAccount({ id: account.id, name: account.nome_empresa })}
                        >
                          <Gift className="h-4 w-4 text-success" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Editar"
                          className="h-8 w-8"
                          onClick={() => setEditAccount(account)}
                        >
                          <Edit className="h-4 w-4 text-warning" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={account.ativo ? "Desativar" : "Ativar"}
                          className="h-8 w-8"
                          onClick={() =>
                            toggleActiveMutation.mutate({
                              id: account.id,
                              ativo: account.ativo,
                            })
                          }
                        >
                          {account.ativo ? (
                            <Ban className="h-4 w-4 text-warning" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-success" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Excluir"
                          className="h-8 w-8"
                          onClick={() => setDeleteAccount({ id: account.id, name: account.nome_empresa })}
                        >
                          <Trash2 className="h-4 w-4 text-danger" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AccountDetailsDialog
        open={!!detailsAccount}
        onOpenChange={(open) => !open && setDetailsAccount(null)}
        account={detailsAccount}
      />

      <EditAccountDialog
        open={!!editAccount}
        onOpenChange={(open) => !open && setEditAccount(null)}
        account={editAccount}
        onSave={(data) => editAccountMutation.mutate(data)}
      />

      <DeleteAccountDialog
        open={!!deleteAccount}
        onOpenChange={(open) => !open && setDeleteAccount(null)}
        accountName={deleteAccount?.name || ""}
        onConfirm={() => deleteAccount && deleteAccountMutation.mutate(deleteAccount.id)}
      />

      <GrantAccessDialog
        open={!!grantAccessAccount}
        onOpenChange={(open) => !open && setGrantAccessAccount(null)}
        accountId={grantAccessAccount?.id || ""}
        accountName={grantAccessAccount?.name || ""}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["super-admin-accounts"] })}
      />
    </div>
  );
};

export default SuperAdminAccounts;
