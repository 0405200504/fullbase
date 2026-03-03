import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, ArrowLeft, GripVertical, Tag } from "lucide-react";
import { useEtapasFunil } from "@/hooks/useEtapasFunil";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface EtapaFormData {
  nome: string;
  cor: string;
  prazo_alerta_dias: number;
  tipo_etapa: string | null;
}

const tiposEtapa = [
  { value: "lead", label: "Lead" },
  { value: "qualificacao", label: "Qualificação" },
  { value: "call", label: "Call" },
  { value: "proposta", label: "Proposta" },
  { value: "fechamento", label: "Fechamento" },
];

const tipoEtapaLabels: Record<string, string> = {
  lead: "Lead",
  qualificacao: "Qualificação",
  call: "Call",
  proposta: "Proposta",
  fechamento: "Fechamento",
};

const SortableEtapaItem = ({ etapa, onEdit, onDelete }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: etapa.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 bg-card p-4 rounded-lg border border-border"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>

      <div
        className="w-8 h-8 rounded"
        style={{ backgroundColor: etapa.cor }}
      />

      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-semibold">{etapa.nome}</p>
          {etapa.tipo_etapa && (
            <Badge variant="secondary" className="text-xs">
              <Tag className="h-3 w-3 mr-1" />
              {tipoEtapaLabels[etapa.tipo_etapa]}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Alerta após {etapa.prazo_alerta_dias} dias
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(etapa)}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(etapa.id)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const ConfigEtapas = () => {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEtapa, setEditingEtapa] = useState<any>(null);
  const [formData, setFormData] = useState<EtapaFormData>({
    nome: "",
    cor: "#3B82F6",
    prazo_alerta_dias: 3,
    tipo_etapa: null,
  });

  const { data: etapas = [] } = useEtapasFunil();
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const createEtapa = useMutation({
    mutationFn: async (data: EtapaFormData & { ordem: number }) => {
      // Buscar account_id do usuário atual
      const { data: currentProfile, error: currentProfileError } = await supabase
        .from("profiles")
        .select("account_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (currentProfileError) throw currentProfileError;

      const { error } = await supabase.from("etapas_funil").insert([{
        ...data,
        account_id: currentProfile.account_id
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["etapas_funil"] });
      toast.success("Etapa criada com sucesso!");
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar etapa: " + error.message);
    },
  });

  const updateEtapa = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { error } = await supabase
        .from("etapas_funil")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["etapas_funil"] });
      toast.success("Etapa atualizada com sucesso!");
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar etapa: " + error.message);
    },
  });

  const deleteEtapa = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("etapas_funil")
        .update({ ativo: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["etapas_funil"] });
      toast.success("Etapa removida com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao remover etapa: " + error.message);
    },
  });

  const updateOrdens = useMutation({
    mutationFn: async (etapasReordenadas: any[]) => {
      const updates = etapasReordenadas.map((etapa, index) => ({
        id: etapa.id,
        ordem: index + 1,
      }));

      for (const update of updates) {
        await supabase
          .from("etapas_funil")
          .update({ ordem: update.ordem })
          .eq("id", update.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["etapas_funil"] });
      toast.success("Ordem atualizada!");
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = etapas.findIndex((e) => e.id === active.id);
      const newIndex = etapas.findIndex((e) => e.id === over.id);

      const newOrder = arrayMove(etapas, oldIndex, newIndex);
      updateOrdens.mutate(newOrder);
    }
  };

  const handleOpenDialog = (etapa?: any) => {
    if (etapa) {
      setEditingEtapa(etapa);
      setFormData({
        nome: etapa.nome,
        cor: etapa.cor,
        prazo_alerta_dias: etapa.prazo_alerta_dias,
        tipo_etapa: etapa.tipo_etapa || null,
      });
    } else {
      setEditingEtapa(null);
      setFormData({
        nome: "",
        cor: "#3B82F6",
        prazo_alerta_dias: 3,
        tipo_etapa: null,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingEtapa(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingEtapa) {
      updateEtapa.mutate({ id: editingEtapa.id, ...formData });
    } else {
      const maxOrdem = Math.max(...etapas.map((e) => e.ordem), 0);
      createEtapa.mutate({ ...formData, ordem: maxOrdem + 1 });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          onClick={() => navigate("/pipeline")}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Configurar Etapas do Funil</h1>
            <p className="text-muted-foreground">
              Personalize as etapas do seu processo de vendas
            </p>
          </div>

          <Button onClick={() => handleOpenDialog()} className="gap-2 btn-premium">
            <Plus className="h-4 w-4" />
            Nova Etapa
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-md p-6">
        <p className="text-sm text-muted-foreground mb-4">
          Arraste para reordenar as etapas
        </p>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={etapas.map((e) => e.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {etapas.map((etapa) => (
                <SortableEtapaItem
                  key={etapa.id}
                  etapa={etapa}
                  onEdit={handleOpenDialog}
                  onDelete={deleteEtapa.mutate}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingEtapa ? "Editar Etapa" : "Nova Etapa"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome da Etapa</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) =>
                  setFormData({ ...formData, nome: e.target.value })
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="cor">Cor</Label>
              <div className="flex gap-2">
                <Input
                  id="cor"
                  type="color"
                  value={formData.cor}
                  onChange={(e) =>
                    setFormData({ ...formData, cor: e.target.value })
                  }
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={formData.cor}
                  onChange={(e) =>
                    setFormData({ ...formData, cor: e.target.value })
                  }
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="prazo">Prazo para Alerta (dias)</Label>
              <Input
                id="prazo"
                type="number"
                min="1"
                value={formData.prazo_alerta_dias}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    prazo_alerta_dias: parseInt(e.target.value),
                  })
                }
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leads parados nesta etapa por mais de {formData.prazo_alerta_dias}{" "}
                dias receberão alerta de follow-up
              </p>
            </div>

            <div>
              <Label htmlFor="tipo_etapa">
                Tipo da Etapa <span className="text-xs text-muted-foreground">(usado para métricas)</span>
              </Label>
              <Select
                value={formData.tipo_etapa || "nenhum"}
                onValueChange={(value) =>
                  setFormData({ ...formData, tipo_etapa: value === "nenhum" ? null : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Nenhum</SelectItem>
                  {tiposEtapa.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Defina o tipo para usar esta etapa nos cálculos de performance
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
              >
                Cancelar
              </Button>
              <Button type="submit" className="btn-premium">
                {editingEtapa ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConfigEtapas;
