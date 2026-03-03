import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/dateUtils";
import { useActivityLogs } from "@/hooks/useAnalytics";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  TrendingUp, 
  ShoppingCart, 
  Package, 
  Target, 
  Users as UsersIcon,
  Activity
} from "lucide-react";

interface AccountDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: {
    id?: string;
    nome_empresa: string;
    owner_name: string;
    owner_email: string;
    created_at: string;
    num_users: number;
    num_leads: number;
    total_revenue: number;
    plano: string;
    ativo: boolean;
    niche?: string;
    team_size?: string;
    monthly_revenue?: string;
    main_goal?: string;
    main_challenge?: string;
  } | null;
}

const AccountDetailsDialog = ({ open, onOpenChange, account }: AccountDetailsDialogProps) => {
  const { data: activityLogs, isLoading: isLoadingLogs } = useActivityLogs(account?.id);

  if (!account) return null;

  const getActivityIcon = (actionType: string) => {
    switch (actionType) {
      case 'lead_created':
      case 'lead_stage_changed':
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case 'sale_registered':
        return <ShoppingCart className="h-4 w-4 text-green-500" />;
      case 'product_created':
        return <Package className="h-4 w-4 text-purple-500" />;
      case 'goal_created':
        return <Target className="h-4 w-4 text-orange-500" />;
      case 'team_member_added':
        return <UsersIcon className="h-4 w-4 text-pink-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityDescription = (log: any) => {
    const userName = log.user?.nome || 'Sistema';
    
    switch (log.action_type) {
      case 'lead_created':
        return `${userName} adicionou o lead "${log.details?.lead_name}"`;
      case 'lead_stage_changed':
        return `${userName} moveu o lead "${log.details?.lead_name}" de etapa`;
      case 'sale_registered':
        return `${userName} registrou uma venda de ${formatCurrency(log.details?.amount || 0)}`;
      case 'product_created':
        return `${userName} criou o produto "${log.details?.product_name}"`;
      case 'goal_created':
        return `${userName} criou a meta "${log.details?.goal_name}"`;
      case 'team_member_added':
        return `${log.details?.user_name} entrou na equipe`;
      default:
        return `${userName} realizou uma ação`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{account.nome_empresa}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">
              <FileText className="h-4 w-4 mr-2" />
              Informações
            </TabsTrigger>
            <TabsTrigger value="logs">
              <Activity className="h-4 w-4 mr-2" />
              Logs de Atividade
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-4 space-y-4">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-6">
                {/* Status */}
                <div>
                  <Badge variant={account.ativo ? "default" : "destructive"}>
                    {account.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </div>

                <Separator />

                {/* Informações do Dono */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">Informações do Dono</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Nome</p>
                      <p className="font-medium">{account.owner_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{account.owner_email}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Métricas */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">Métricas</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Usuários</p>
                      <p className="font-medium text-2xl">{account.num_users}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Leads</p>
                      <p className="font-medium text-2xl">{account.num_leads}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Faturamento Total</p>
                      <p className="font-medium text-2xl">{formatCurrency(account.total_revenue)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Data de Cadastro</p>
                      <p className="font-medium">{formatDate(account.created_at)}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Dados do Onboarding */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">Dados do Onboarding</h3>
                  <div className="space-y-4">
                    {account.niche && (
                      <div>
                        <p className="text-sm text-muted-foreground">Nicho</p>
                        <p className="font-medium">{account.niche}</p>
                      </div>
                    )}
                    {account.team_size && (
                      <div>
                        <p className="text-sm text-muted-foreground">Tamanho do Time</p>
                        <p className="font-medium">{account.team_size}</p>
                      </div>
                    )}
                    {account.monthly_revenue && (
                      <div>
                        <p className="text-sm text-muted-foreground">Faturamento Mensal</p>
                        <p className="font-medium">{account.monthly_revenue}</p>
                      </div>
                    )}
                    {account.main_goal && (
                      <div>
                        <p className="text-sm text-muted-foreground">Objetivo Principal</p>
                        <p className="font-medium">{account.main_goal}</p>
                      </div>
                    )}
                    {account.main_challenge && (
                      <div>
                        <p className="text-sm text-muted-foreground">Desafio Principal</p>
                        <p className="font-medium">{account.main_challenge}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Plano */}
                <div>
                  <p className="text-sm text-muted-foreground">Plano</p>
                  <p className="font-medium capitalize">{account.plano}</p>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="logs" className="mt-4">
            <ScrollArea className="h-[500px] pr-4">
              {isLoadingLogs ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : activityLogs && activityLogs.length > 0 ? (
                <div className="space-y-4">
                  {activityLogs.map((log: any) => (
                    <div key={log.id} className="flex gap-4 border-l-2 border-muted pl-4 pb-4">
                      <div className="flex-shrink-0 mt-1">
                        {getActivityIcon(log.action_type)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm">{getActivityDescription(log)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(log.created_at)} às{' '}
                          {new Date(log.created_at).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <Activity className="h-12 w-12 mb-2 opacity-50" />
                  <p>Nenhuma atividade registrada ainda</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AccountDetailsDialog;
