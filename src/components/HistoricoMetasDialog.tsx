import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, TrendingUp, Calendar, Trash2, Edit, Download, FileSpreadsheet } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDeleteMeta } from "@/hooks/useMetas";
import { toast } from "sonner";
import { EditarMetaHistoricoDialog } from "./EditarMetaHistoricoDialog";
import * as XLSX from 'xlsx';

interface HistoricoMetasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MetaHistorico {
  id: string;
  nome: string;
  valor_mensal: number;
  mes: number;
  ano: number;
  start_date: string;
  end_date: string;
  created_at: string;
  dias_trabalho?: number[];
  faturamento?: number;
  taxa_atingimento?: number;
}

export const HistoricoMetasDialog = ({ open, onOpenChange }: HistoricoMetasDialogProps) => {
  const [editingMeta, setEditingMeta] = useState<MetaHistorico | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const deleteMeta = useDeleteMeta();
  const queryClient = useQueryClient();
  const { data: metasHistorico = [], isLoading } = useQuery({
    queryKey: ["metas-historico"],
    queryFn: async () => {
      // Buscar metas anteriores (inativas ou já finalizadas)
      const hoje = new Date().toISOString().split('T')[0];
      
      const { data: metas, error } = await supabase
        .from("metas")
        .select("*")
        .or(`ativo.eq.false,end_date.lt.${hoje}`)
        .order("created_at", { ascending: false })
        .limit(12);

      if (error) throw error;

      // Para cada meta, buscar o faturamento real do período
      const metasComFaturamento = await Promise.all(
        (metas || []).map(async (meta) => {
          const { data: vendas, error: vendasError } = await supabase
            .from("vendas")
            .select("valor_final")
            .gte("data_fechamento", meta.start_date)
            .lte("data_fechamento", meta.end_date);

          if (vendasError) {
            console.error("Erro ao buscar vendas:", vendasError);
            return {
              ...meta,
              faturamento: 0,
              taxa_atingimento: 0
            };
          }

          const faturamento = vendas?.reduce((sum, v) => sum + v.valor_final, 0) || 0;
          const taxa_atingimento = meta.valor_mensal > 0 
            ? (faturamento / meta.valor_mensal) * 100 
            : 0;

          return {
            ...meta,
            faturamento,
            taxa_atingimento
          };
        })
      );

      return metasComFaturamento as MetaHistorico[];
    },
    enabled: open,
  });

  // Preparar dados para o gráfico
  const chartData = metasHistorico.slice(0, 6).reverse().map((meta) => ({
    nome: meta.nome.substring(0, 10),
    Meta: meta.valor_mensal,
    Faturamento: meta.faturamento || 0,
  }));

  // Calcular estatísticas gerais
  const stats = {
    totalMetas: metasHistorico.length,
    metasAtingidas: metasHistorico.filter(m => (m.taxa_atingimento || 0) >= 100).length,
    taxaMediaAtingimento: metasHistorico.length > 0
      ? metasHistorico.reduce((sum, m) => sum + (m.taxa_atingimento || 0), 0) / metasHistorico.length
      : 0,
  };

  const handleDeleteMeta = async (metaId: string) => {
    try {
      await deleteMeta.mutateAsync(metaId);
      toast.success("Meta excluída com sucesso!");
    } catch (error) {
      toast.error("Erro ao excluir meta");
    }
  };

  const handleExportExcel = () => {
    const exportData = metasHistorico.map((meta) => ({
      "Nome": meta.nome,
      "Período": `${format(new Date(meta.start_date), "dd/MM/yyyy")} - ${format(new Date(meta.end_date), "dd/MM/yyyy")}`,
      "Meta (R$)": meta.valor_mensal,
      "Faturamento (R$)": meta.faturamento || 0,
      "Taxa de Atingimento (%)": (meta.taxa_atingimento || 0).toFixed(1),
      "Status": (meta.taxa_atingimento || 0) >= 100 ? "Atingida" : "Não Atingida",
    }));

    // Adicionar estatísticas ao final
    exportData.push({} as any);
    exportData.push({
      "Nome": "ESTATÍSTICAS GERAIS",
      "Período": "",
      "Meta (R$)": "",
      "Faturamento (R$)": "",
      "Taxa de Atingimento (%)": "",
      "Status": "",
    } as any);
    exportData.push({
      "Nome": "Total de Metas",
      "Período": stats.totalMetas.toString(),
      "Meta (R$)": "",
      "Faturamento (R$)": "",
      "Taxa de Atingimento (%)": "",
      "Status": "",
    } as any);
    exportData.push({
      "Nome": "Metas Atingidas",
      "Período": stats.metasAtingidas.toString(),
      "Meta (R$)": "",
      "Faturamento (R$)": "",
      "Taxa de Atingimento (%)": "",
      "Status": "",
    } as any);
    exportData.push({
      "Nome": "Taxa Média de Atingimento",
      "Período": `${stats.taxaMediaAtingimento.toFixed(1)}%`,
      "Meta (R$)": "",
      "Faturamento (R$)": "",
      "Taxa de Atingimento (%)": "",
      "Status": "",
    } as any);

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Histórico de Metas");
    XLSX.writeFile(wb, `historico_metas_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("Exportação concluída com sucesso!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between w-full">
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Histórico de Metas
            </DialogTitle>
            {metasHistorico.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Exportar Excel
              </Button>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : metasHistorico.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhuma meta anterior encontrada</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Estatísticas Gerais */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total de Metas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.totalMetas}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Metas Atingidas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-success">{stats.metasAtingidas}</p>
                    <Badge variant="outline" className="text-success border-success">
                      {stats.totalMetas > 0 
                        ? Math.round((stats.metasAtingidas / stats.totalMetas) * 100)
                        : 0}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Taxa Média
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.taxaMediaAtingimento.toFixed(1)}%</p>
                </CardContent>
              </Card>
            </div>

            {/* Gráfico de Evolução */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Evolução das Últimas 6 Metas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nome" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => 
                        `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      }
                    />
                    <Legend />
                    <Bar dataKey="Meta" fill="hsl(var(--primary))" name="Meta" />
                    <Bar dataKey="Faturamento" fill="hsl(var(--success))" name="Faturamento" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Lista de Metas */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Histórico Detalhado</h3>
              {metasHistorico.map((meta) => {
                const atingida = (meta.taxa_atingimento || 0) >= 100;
                
                return (
                  <Card key={meta.id} className={atingida ? "border-success/50" : undefined}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{meta.nome}</h4>
                            {atingida ? (
                              <Badge variant="outline" className="text-success border-success">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Atingida
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                <XCircle className="h-3 w-3 mr-1" />
                                Não Atingida
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2">
                            {format(new Date(meta.start_date), "dd/MM/yyyy", { locale: ptBR })} - {format(new Date(meta.end_date), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                          
                          <div className="flex flex-wrap gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Meta: </span>
                              <span className="font-semibold">
                                R$ {meta.valor_mensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            
                            <div>
                              <span className="text-muted-foreground">Faturamento: </span>
                              <span className={`font-semibold ${atingida ? 'text-success' : ''}`}>
                                R$ {(meta.faturamento || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            
                            <div>
                              <span className="text-muted-foreground">Atingimento: </span>
                              <span className={`font-semibold ${atingida ? 'text-success' : 'text-warning'}`}>
                                {(meta.taxa_atingimento || 0).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 shrink-0">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-muted-foreground hover:text-primary"
                            onClick={() => {
                              setEditingMeta(meta);
                              setEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir meta?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir a meta "{meta.nome}"? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteMeta(meta.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
      
      <EditarMetaHistoricoDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        meta={editingMeta}
      />
    </Dialog>
  );
};