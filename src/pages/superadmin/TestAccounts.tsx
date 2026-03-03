import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, UserPlus, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/dateUtils";

interface TestAccount {
  id: string;
  email: string;
  nome: string;
  created_at: string;
  account_id: string;
  company_name: string | null;
  niche: string | null;
  team_size: string | null;
  onboarding_complete: boolean;
  num_etapas: number;
}

const TestAccounts = () => {
  const [testEmail, setTestEmail] = useState("");
  const [testName, setTestName] = useState("");
  const [testPassword, setTestPassword] = useState("Test@123");
  const queryClient = useQueryClient();

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["test-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          email,
          nome,
          created_at,
          account_id,
          company_name,
          niche,
          team_size
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Para cada perfil, buscar o número de etapas
      const accountsWithStats = await Promise.all(
        (data || []).map(async (profile) => {
          const { count: etapasCount } = await supabase
            .from("etapas_funil")
            .select("*", { count: "exact", head: true })
            .eq("account_id", profile.account_id);

          return {
            ...profile,
            onboarding_complete: !!(profile.company_name && profile.niche),
            num_etapas: etapasCount || 0,
          };
        })
      );

      return accountsWithStats as TestAccount[];
    },
  });

  const createTestUser = useMutation({
    mutationFn: async () => {
      if (!testEmail || !testName) {
        throw new Error("Preencha email e nome");
      }

      // Criar usuário via Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
          data: {
            nome: testName,
          },
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Usuário de teste criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["test-accounts"] });
      setTestEmail("");
      setTestName("");
    },
    onError: (error: any) => {
      toast.error("Erro ao criar usuário: " + error.message);
    },
  });

  const deleteTestUser = useMutation({
    mutationFn: async (userId: string) => {
      // Buscar account_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("account_id")
        .eq("id", userId)
        .single();

      if (!profile) throw new Error("Perfil não encontrado");

      // Deletar conta (cascade irá deletar perfis, etapas, etc)
      const { error: deleteAccountError } = await supabase
        .from("accounts")
        .delete()
        .eq("id", profile.account_id);

      if (deleteAccountError) throw deleteAccountError;

      // Deletar usuário do auth (requer service role, então pode falhar)
      // Mas o cascade já deletou os dados principais
    },
    onSuccess: () => {
      toast.success("Conta de teste deletada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["test-accounts"] });
    },
    onError: (error: any) => {
      toast.error("Erro ao deletar conta: " + error.message);
    },
  });

  const generateRandomEmail = () => {
    const random = Math.random().toString(36).substring(7);
    setTestEmail(`teste.${random}@highleads.test`);
    setTestName(`Usuário Teste ${random}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Teste de Cadastro</h1>
        <p className="text-muted-foreground">
          Crie usuários de teste e valide o fluxo de onboarding
        </p>
      </div>

      {/* Criar Usuário de Teste */}
      <Card>
        <CardHeader>
          <CardTitle>Criar Novo Usuário de Teste</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="testEmail">Email</Label>
              <Input
                id="testEmail"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="teste@example.com"
              />
            </div>
            <div>
              <Label htmlFor="testName">Nome</Label>
              <Input
                id="testName"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="João Silva"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="testPassword">Senha</Label>
            <Input
              id="testPassword"
              type="text"
              value={testPassword}
              onChange={(e) => setTestPassword(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Senha padrão para todos os usuários de teste
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={generateRandomEmail}
              variant="outline"
              disabled={createTestUser.isPending}
            >
              Gerar Email Aleatório
            </Button>
            <Button
              onClick={() => createTestUser.mutate()}
              disabled={createTestUser.isPending}
            >
              {createTestUser.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Criar Usuário de Teste
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Contas de Teste */}
      <Card>
        <CardHeader>
          <CardTitle>Todas as Contas ({accounts?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Onboarding</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Nicho</TableHead>
                <TableHead>Etapas</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts?.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.email}</TableCell>
                  <TableCell>{account.nome}</TableCell>
                  <TableCell>{formatDate(account.created_at)}</TableCell>
                  <TableCell>
                    {account.onboarding_complete ? (
                      <Badge className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completo
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Pendente
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {account.company_name || (
                      <span className="text-muted-foreground italic">
                        Não informado
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {account.niche || (
                      <span className="text-muted-foreground italic">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{account.num_etapas} etapas</Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteTestUser.mutate(account.id)}
                      disabled={deleteTestUser.isPending}
                      title="Deletar conta de teste"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Instruções */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-primary">Como Testar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>1.</strong> Clique em "Gerar Email Aleatório" ou digite um
            email manualmente
          </p>
          <p>
            <strong>2.</strong> Clique em "Criar Usuário de Teste"
          </p>
          <p>
            <strong>3.</strong> Abra uma aba anônima e vá para{" "}
            <code className="bg-muted px-2 py-1 rounded">/auth</code>
          </p>
          <p>
            <strong>4.</strong> Faça login com o email criado e senha{" "}
            <code className="bg-muted px-2 py-1 rounded">{testPassword}</code>
          </p>
          <p>
            <strong>5.</strong> Complete o onboarding e verifique se tudo
            funciona
          </p>
          <p>
            <strong>6.</strong> Volte aqui para ver o status atualizado da conta
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestAccounts;
