import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Plus, Type, AlignLeft, CircleDot, CheckSquare, Trash2, GripVertical, Copy, ExternalLink, FileText, Monitor, Smartphone, ArrowLeft, Upload, X, Loader2, Hash, Mail, Phone, CalendarDays, Check, Eye, BarChart3, ChevronRight } from "lucide-react";
import { Form, FormQuestion, QuestionType, FIELD_MAPPING_PRESETS, FONT_OPTIONS } from "@/types/formBuilder";
import { useForms, useCreateForm, useUpdateForm, useDeleteForms, useFormResponses, FormData } from "@/hooks/useForms";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";


const FORM_DOMAIN = "https://highleadsbr.com";

const generateId = () => Math.random().toString(36).substring(2, 9);

const questionTypeLabels: Record<QuestionType, { label: string; icon: typeof Type }> = {
  SHORT_TEXT: { label: "Texto Curto", icon: Type },
  LONG_TEXT: { label: "Texto Longo", icon: AlignLeft },
  SINGLE_CHOICE: { label: "Escolha Única", icon: CircleDot },
  MULTIPLE_CHOICE: { label: "Múltipla Escolha", icon: CheckSquare },
  NUMBER: { label: "Número", icon: Hash },
  EMAIL: { label: "E-mail", icon: Mail },
  PHONE: { label: "Telefone", icon: Phone },
  DATE: { label: "Data", icon: CalendarDays },
};

// ===== Helper: render bold text with *text* syntax =====
const renderBoldText = (text: string) => {
  if (!text) return text;
  const parts = text.split(/(\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <strong key={i}>{part.slice(1, -1)}</strong>;
    }
    return part;
  });
};

// ===== Font size helper =====
const getFontSizeClass = (size?: 'sm' | 'md' | 'lg', base: string = 'text-2xl') => {
  if (size === 'sm') return 'text-lg';
  if (size === 'lg') return 'text-3xl';
  return base;
};

const getButtonSizeClass = (size?: 'sm' | 'md' | 'lg') => {
  if (size === 'sm') return 'px-4 py-1.5 text-[11px]';
  if (size === 'lg') return 'px-10 py-4 text-[16px]';
  return 'px-6 py-2.5 text-[13px]';
};

// ===== IMAGE UPLOAD HELPER =====
const uploadFormAsset = async (file: File, folder: string): Promise<string> => {
  const ext = file.name.split('.').pop();
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
  const { error } = await supabase.storage.from('form-assets').upload(fileName, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from('form-assets').getPublicUrl(fileName);
  return publicUrl;
};

// ===== IMAGE UPLOAD COMPONENT =====
const ImageUploadField = ({ label, value, onChange, hint }: { label: string; value?: string; onChange: (url: string) => void; hint?: string }) => {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error("Selecione uma imagem"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Imagem deve ter no máximo 5MB"); return; }
    setUploading(true);
    try {
      const url = await uploadFormAsset(file, 'backgrounds');
      onChange(url);
      toast.success("Imagem enviada!");
    } catch (err: any) {
      toast.error("Erro ao enviar: " + err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <Label className="text-[12px]">{label}</Label>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      {value ? (
        <div className="mt-1.5 relative group">
          <div className="h-20 rounded-lg bg-cover bg-center border border-border/40 overflow-hidden" style={{ backgroundImage: `url(${value})` }}>
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button variant="secondary" size="sm" className="h-7 text-[11px]" onClick={() => inputRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Trocar"}
              </Button>
              <Button variant="destructive" size="sm" className="h-7 w-7 p-0" onClick={() => onChange("")}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button onClick={() => inputRef.current?.click()} disabled={uploading} className="mt-1.5 w-full h-16 rounded-lg border-2 border-dashed border-border/60 hover:border-primary/40 transition-colors flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          <span className="text-[10px]">{uploading ? "Enviando..." : "Clique para enviar"}</span>
        </button>
      )}
    </div>
  );
};

// ===== SORTABLE QUESTION ITEM =====
const SortableQuestionItem = ({ q, idx, isSelected, form, onClick, onRemove }: {
  q: FormQuestion; idx: number; isSelected: boolean; form: Form;
  onClick: () => void; onRemove: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: q.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 10 : 0 };
  const Icon = questionTypeLabels[q.type]?.icon || Type;
  const mapping = form.fieldMappings.find(m => m.questionId === q.id);

  return (
    <div ref={setNodeRef} style={style} className={cn("p-3 rounded-xl border transition-all cursor-pointer group", isSelected ? "border-primary bg-primary/5" : "border-border/40 hover:border-border")} onClick={onClick}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2 flex-1">
          <div {...attributes} {...listeners} className="flex items-center gap-1 mt-0.5 cursor-grab active:cursor-grabbing" onClick={e => e.stopPropagation()}>
            <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40" />
            <span className="text-[11px] font-bold text-muted-foreground">{idx + 1}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium truncate">{q.title || "Sem título"}</p>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <Badge variant="secondary" className="text-[10px] gap-1 h-5"><Icon className="w-2.5 h-2.5" />{questionTypeLabels[q.type]?.label}</Badge>
              {q.required && <Badge variant="outline" className="text-[10px] h-5">Obrigatório</Badge>}
              {mapping && <Badge className="text-[10px] h-5 bg-blue-500/10 text-blue-600 border-blue-500/20">{FIELD_MAPPING_PRESETS.find(p => p.value === mapping.target)?.label || mapping.customLabel}</Badge>}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive" onClick={e => { e.stopPropagation(); onRemove(); }}><Trash2 className="w-3 h-3" /></Button>
      </div>
    </div>
  );
};

// ===== HELPER: Button style from theme =====
const getButtonStyle = (theme: Form['theme']) => {
  const style: React.CSSProperties = { backgroundColor: theme.buttonColor, color: '#fff' };
  if (theme.buttonBorderColor) style.border = `2px solid ${theme.buttonBorderColor}`;
  if (theme.buttonShadow) style.boxShadow = `0 4px 14px ${theme.buttonColor}40`;
  if (theme.buttonOutline) {
    style.backgroundColor = 'transparent';
    style.color = theme.buttonColor;
    style.border = `2px solid ${theme.buttonBorderColor || theme.buttonColor}`;
  }
  return style;
};

const getTextStyle = (theme: Form['theme']) => {
  const style: React.CSSProperties = { color: theme.textColor };
  if (theme.textShadow) style.textShadow = '0 2px 8px rgba(0,0,0,0.5)';
  return style;
};

const getBrightnessOverlay = (theme: Form['theme']) => {
  const brightness = theme.imageBrightness ?? 80;
  return (100 - brightness) / 100; // 80 brightness = 0.2 overlay
};

// ===== WORKSPACE VIEW =====
const FormWorkspace = ({ onEdit, onViewResponses }: { onEdit: (id: string) => void; onViewResponses: (id: string) => void }) => {
  const { data: forms = [], isLoading } = useForms();
  const createForm = useCreateForm();
  const deleteForms = useDeleteForms();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("Novo Formulário");
  const [newSlug, setNewSlug] = useState("");

  const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleCreate = () => {
    if (!newSlug) { toast.error("Defina um slug"); return; }
    createForm.mutate({ title: newTitle, slug: newSlug }, {
      onSuccess: (data: any) => { setCreateOpen(false); setNewTitle("Novo Formulário"); setNewSlug(""); onEdit(data.id); }
    });
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    deleteForms.mutate(selectedIds, { onSuccess: () => setSelectedIds([]) });
  };

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`${FORM_DOMAIN}/f/${slug}`);
    toast.success("Link copiado!");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Formulários</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Crie formulários para captar leads automaticamente</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <Button variant="destructive" size="sm" onClick={handleDeleteSelected} className="gap-1.5 text-[12px]">
              <Trash2 className="w-3.5 h-3.5" /> Excluir ({selectedIds.length})
            </Button>
          )}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 text-[12px]"><Plus className="w-3.5 h-3.5" /> Novo Formulário</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Criar Formulário</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div><Label className="text-[12px]">Título</Label><Input value={newTitle} onChange={e => setNewTitle(e.target.value)} className="mt-1" /></div>
                <div><Label className="text-[12px]">Slug (URL)</Label>
                  <div className="flex items-center gap-1 mt-1"><span className="text-[12px] text-muted-foreground">/f/</span><Input value={newSlug} onChange={e => setNewSlug(e.target.value.replace(/[^a-z0-9-]/g, ''))} placeholder="meu-formulario" /></div>
                </div>
                <Button onClick={handleCreate} className="w-full" disabled={createForm.isPending}>Criar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : forms.length === 0 ? (
        <Card className="border-border/40"><CardContent className="p-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
          <h3 className="text-lg font-semibold mb-2">Nenhum formulário</h3>
          <p className="text-[13px] text-muted-foreground mb-4">Crie seu primeiro formulário de captação</p>
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5"><Plus className="w-4 h-4" /> Criar Formulário</Button>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {forms.map((form: FormData) => (
            <Card key={form.id} className={cn("border-border/40 group cursor-pointer hover:shadow-md transition-all", selectedIds.includes(form.id) && "ring-2 ring-primary")}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={selectedIds.includes(form.id)} onCheckedChange={() => toggleSelect(form.id)} onClick={e => e.stopPropagation()} />
                    <div onClick={() => onEdit(form.id)} className="flex-1">
                      <h3 className="text-[14px] font-semibold">{form.title}</h3>
                      <p className="text-[11px] text-muted-foreground">/f/{form.slug}</p>
                    </div>
                  </div>
                  <Badge variant={form.active ? "default" : "secondary"} className="text-[10px]">{form.active ? "Ativo" : "Inativo"}</Badge>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-3">
                  <span>{form.questions.length} perguntas</span>
                  <span>{form.submissions_count} respostas</span>
                  <span>{form.views_count} views</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="sm" className="flex-1 h-8 text-[11px]" onClick={() => onEdit(form.id)}>Editar</Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onViewResponses(form.id)} title="Ver respostas"><BarChart3 className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => copyLink(form.slug)}><Copy className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => window.open(`/f/${form.slug}`, '_blank')}><ExternalLink className="w-3.5 h-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// ===== FORM RESPONSES VIEW =====
const FormResponsesView = ({ formId, onBack }: { formId: string; onBack: () => void }) => {
  const { data: forms = [] } = useForms();
  const form = forms.find(f => f.id === formId);
  const { data: responses = [], isLoading } = useFormResponses(formId);
  const [activeTab, setActiveTab] = useState<"summary" | "individual">("summary");
  const [currentIndex, setCurrentIndex] = useState(0);

  const questions = (form?.questions || []) as any[];

  // Data aggregation for charts
  const getQuestionStats = (qId: string, options: string[]) => {
    const stats: Record<string, number> = {};
    options.forEach(opt => stats[opt] = 0);
    
    responses.forEach((r: any) => {
      const rAnswers = Array.isArray(r.answers) ? r.answers : [];
      const ans = rAnswers.find((a: any) => a.questionId === qId);
      if (ans && ans.value) {
        if (Array.isArray(ans.value)) {
          ans.value.forEach((v: string) => {
            if (options.includes(v)) stats[v] = (stats[v] || 0) + 1;
          });
        } else if (options.includes(ans.value)) {
          stats[ans.value] = (stats[ans.value] || 0) + 1;
        }
      }
    });

    return options.map(opt => ({ name: opt, value: stats[opt] }));
  };

  const COLORS = ['#4285f4', '#34a853', '#fbbc05', '#ea4335', '#9c27b0', '#00bcd4'];

  const currentResponse = responses[currentIndex];

  return (
    <div className="space-y-5 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="h-8 w-8 p-0"><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Respostas: {form?.title}</h1>
            <p className="text-[11px] text-muted-foreground">{responses.length} respostas recebidas</p>
          </div>
        </div>
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-[300px]">
          <TabsList className="grid w-full grid-cols-2 h-8">
            <TabsTrigger value="summary" className="text-[11px]">Resumo</TabsTrigger>
            <TabsTrigger value="individual" className="text-[11px]">Individual</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {responses.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 border-border/40 bg-primary/5">
            <p className="text-[10px] font-bold text-primary uppercase tracking-tight">Views</p>
            <p className="text-xl font-bold">{form?.views_count || 0}</p>
          </Card>
          <Card className="p-3 border-border/40 bg-green-500/5">
            <p className="text-[10px] font-bold text-green-600 uppercase tracking-tight">Submissões</p>
            <p className="text-xl font-bold">{form?.submissions_count || 0}</p>
          </Card>
          <Card className="p-3 border-border/40 bg-orange-500/5">
            <p className="text-[10px] font-bold text-orange-600 uppercase tracking-tight">Conversão</p>
            <p className="text-xl font-bold">{form && form.views_count > 0 ? ((form.submissions_count / form.views_count) * 100).toFixed(1) : "0.0"}%</p>
          </Card>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : responses.length === 0 ? (
        <Card className="border-border/40 bg-muted/20"><CardContent className="p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Eye className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <h3 className="text-base font-semibold mb-1">Aguardando Respostas</h3>
          <p className="text-[13px] text-muted-foreground max-w-[250px] mx-auto">Assim que alguém responder seu formulário, os dados aparecerão aqui em tempo real.</p>
        </CardContent></Card>
      ) : activeTab === "summary" ? (
        <div className="space-y-6">
          {questions.map((q, idx) => {
            const isChoice = q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE";
            const stats = isChoice ? getQuestionStats(q.id, q.options || []) : [];
            const hasData = stats.some(s => s.value > 0);

            return (
              <Card key={q.id} className="border-border/40 overflow-hidden shadow-sm">
                <CardHeader className="p-4 flex flex-row items-center justify-between bg-muted/10">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center text-[11px] font-bold">{idx + 1}</span>
                    <CardTitle className="text-[14px] font-semibold">{q.title}</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[9px] uppercase">{questionTypeLabels[q.type as QuestionType]?.label}</Badge>
                </CardHeader>
                <CardContent className="p-5">
                  {isChoice ? (
                    hasData ? (
                      <div className="h-[250px] w-full mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={stats} layout="vertical" margin={{ left: 40, right: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                            <Tooltip 
                              cursor={{fill: 'transparent'}}
                              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '11px' }}
                            />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                              {stats.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.8} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-center py-8 text-[12px] text-muted-foreground italic">Nenhuma opção selecionada ainda.</p>
                    )
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[11px] text-muted-foreground mb-3 font-medium uppercase tracking-wider">Últimas 5 respostas:</p>
                      {responses.slice(0, 5).map((r: any, ri) => {
                        const rAnswers = Array.isArray(r.answers) ? r.answers : [];
                        const ans = rAnswers.find((a: any) => a.questionId === q.id);
                        const val = (ans as any)?.value;
                        return (
                          <div key={ri} className="p-2.5 rounded-lg bg-muted/30 border border-border/20 text-[12px]">
                            {val || <span className="text-muted-foreground/50 italic">Sem resposta</span>}
                          </div>
                        );
                      })}
                      {responses.length > 5 && (
                        <p className="text-[11px] text-primary text-center pt-2 cursor-pointer hover:underline" onClick={() => setActiveTab("individual")}>
                          Ver todas as {responses.length} respostas no modo individual
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4 max-w-2xl mx-auto">
          <div className="flex items-center justify-between bg-background p-4 rounded-xl border border-border/40 shadow-sm sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8" 
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))} 
                disabled={currentIndex === 0}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="text-center">
                <p className="text-[13px] font-bold">{currentIndex + 1} de {responses.length}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">RESPOSTA</p>
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8" 
                onClick={() => setCurrentIndex(prev => Math.min(responses.length - 1, prev + 1))} 
                disabled={currentIndex === responses.length - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-medium">{format(new Date(currentResponse.created_at), "dd 'de' MMMM, HH:mm")}</p>
              <Badge className="text-[9px] h-5 bg-primary/10 text-primary border-primary/20">#{responses.length - currentIndex}</Badge>
            </div>
          </div>

          <div className="space-y-3">
            {questions.map((q, idx) => {
              const rAnswers = Array.isArray(currentResponse?.answers) ? currentResponse.answers : [];
              const ans = rAnswers.find((a: any) => a.questionId === q.id) as any;
              const value = ans?.value;
              return (
                <Card key={q.id} className="border-border/40 overflow-hidden group hover:border-primary/20 transition-colors">
                  <div className="px-4 py-3 bg-muted/10 border-b border-border/10 flex items-center justify-between">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase">{idx + 1}. {q.title}</p>
                    <Badge variant="outline" className="text-[8px] h-4">{questionTypeLabels[q.type as QuestionType]?.label}</Badge>
                  </div>
                  <CardContent className="p-4">
                    <div className="text-[14px] font-medium leading-relaxed">
                      {Array.isArray(value) ? (
                        <div className="flex flex-wrap gap-1.5">
                          {value.map((v, vi) => (
                            <Badge key={vi} variant="secondary" className="bg-primary/5 text-primary border-primary/10 rounded-md font-normal">{v}</Badge>
                          ))}
                        </div>
                      ) : value ? (
                        <p className="text-foreground">{value}</p>
                      ) : (
                        <p className="text-muted-foreground/30 italic font-normal">Não respondida</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            
            {currentResponse.mapped_data && Object.keys(currentResponse.mapped_data).length > 0 && (
              <Card className="border-border/40 bg-primary/5 mt-6 border-dashed">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                    <CheckSquare className="w-3.5 h-3.5" /> Atributos do Lead
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(currentResponse.mapped_data).map(([key, val]) => (
                      <div key={key} className="p-2 rounded bg-background/50 border border-primary/10">
                        <p className="text-[9px] text-muted-foreground uppercase font-bold">{key.replace(/_/g, ' ')}</p>
                        <p className="text-[12px] font-medium truncate">{String(val || "—")}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ===== LIVE PREVIEW COMPONENT =====
const LivePreview = ({ form, mode, previewQuestionIndex, showEnding }: { form: Form; mode: "desktop" | "mobile"; previewQuestionIndex: number; showEnding?: boolean }) => {
  const question = form.questions[previewQuestionIndex] || form.questions[0];
  const theme = form.theme;
  const hasBg = !!form.backgroundImage;
  const progress = form.questions.length > 0 ? ((previewQuestionIndex + 1) / form.questions.length) * 100 : 0;
  const btnStyle = getButtonStyle(theme);
  const txtStyle = getTextStyle(theme);
  const overlayOpacity = getBrightnessOverlay(theme);

  const isTextType = question && (question.type === "SHORT_TEXT" || question.type === "LONG_TEXT" || question.type === "NUMBER" || question.type === "EMAIL" || question.type === "PHONE" || question.type === "DATE");
  const isChoiceType = question && (question.type === "SINGLE_CHOICE" || question.type === "MULTIPLE_CHOICE");

  const placeholders: Record<string, string> = {
    SHORT_TEXT: "Digite sua resposta...",
    LONG_TEXT: "Digite sua resposta...",
    NUMBER: "0",
    EMAIL: "email@exemplo.com",
    PHONE: "+55 00 000000000",
    DATE: "dd/mm/aaaa",
  };

  const fontClass = getFontSizeClass(theme.fontSize);
  const btnSizeClass = getButtonSizeClass(theme.buttonSize);
  const progressColor = theme.progressBarColor || theme.buttonColor;

  // Ending preview
  if (showEnding) {
    const ts = form.thankYouScreen;
    const tyBg = ts.backgroundImage || form.backgroundImage;
    const endingFontClass = getFontSizeClass(ts.fontSize);
    return (
      <div className={cn("flex items-center justify-center bg-muted/30 rounded-xl", mode === "desktop" ? "p-6" : "p-8")}>
        <div
          className={cn(
            "relative overflow-hidden shadow-2xl transition-all duration-300",
            mode === "mobile" ? "rounded-[2rem] border-[6px] border-foreground/10" : "rounded-xl border border-border/30"
          )}
          style={{
            width: mode === "mobile" ? 375 : "100%",
            maxWidth: mode === "desktop" ? 960 : undefined,
            height: mode === "mobile" ? 812 : 540,
            backgroundColor: theme.bgColor,
            backgroundImage: tyBg ? `url(${tyBg})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {tyBg && <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${overlayOpacity})` }} />}
          {mode === "mobile" && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-5 bg-foreground/10 rounded-b-2xl z-30" />}
          <div className="relative z-10 flex items-center justify-center h-full px-8">
            <div className="text-center max-w-sm">
              {ts.logoUrl && <img src={ts.logoUrl} alt="Logo" className="h-10 mx-auto mb-6" />}
              <h2 className={cn("font-bold mb-4", endingFontClass)} style={txtStyle}>{renderBoldText(ts.text || "Obrigado! 🎉")}</h2>
              {ts.ctaText && (
                <button className={cn("rounded-xl font-medium hover:opacity-90 transition-opacity", btnSizeClass)} style={btnStyle}>{ts.ctaText}</button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-center bg-muted/30 rounded-xl", mode === "desktop" ? "p-6" : "p-8")}>
      <div
        className={cn(
          "relative overflow-hidden shadow-2xl transition-all duration-300",
          mode === "mobile" ? "rounded-[2rem] border-[6px] border-foreground/10" : "rounded-xl border border-border/30"
        )}
        style={{
          width: mode === "mobile" ? 375 : "100%",
          maxWidth: mode === "desktop" ? 960 : undefined,
          height: mode === "mobile" ? 812 : 540,
          backgroundColor: theme.bgColor,
          backgroundImage: hasBg ? `url(${form.backgroundImage})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {hasBg && <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${overlayOpacity})` }} />}

        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 z-20" style={{ backgroundColor: `${progressColor}20` }}>
          <div className="h-full transition-all duration-300" style={{ backgroundColor: progressColor, width: `${progress}%` }} />
        </div>

        {/* Logo */}
        {form.logo?.url && (
          <div className="absolute top-4 left-5 z-20">
            <img src={form.logo.url} alt="Logo" className="h-7 object-contain" />
          </div>
        )}

        {/* Content */}
        <div className="relative z-10 flex items-center justify-center h-full px-8 py-12">
          <div className="w-full max-w-md">
            {question ? (
              <div>
                <p className="text-[12px] font-medium mb-2 opacity-40" style={txtStyle}>{previewQuestionIndex + 1} → {form.questions.length}</p>
                <h2 className={cn("font-bold mb-3 leading-tight", mode === "mobile" ? (theme.fontSize === 'sm' ? 'text-base' : theme.fontSize === 'lg' ? 'text-2xl' : 'text-xl') : fontClass)} style={txtStyle}>
                  {renderBoldText(question.title || "Sua pergunta aqui...")}
                </h2>
                {question.description && (
                  <p className="text-[13px] opacity-50 mb-5" style={txtStyle}>{renderBoldText(question.description)}</p>
                )}

                {isTextType && question.type === "PHONE" && (
                  <div>
                    <div className="flex gap-2 items-end opacity-40">
                      <div className="border-b-2 pb-2 text-[14px] w-14 text-center" style={{ borderColor: theme.textColor, ...txtStyle }}>+55</div>
                      <div className="border-b-2 pb-2 text-[14px] w-12 text-center" style={{ borderColor: theme.textColor, ...txtStyle }}>DDD</div>
                      <div className="border-b-2 pb-2 text-[14px] flex-1" style={{ borderColor: theme.textColor, ...txtStyle }}>Número</div>
                    </div>
                    <button className={cn("mt-5 rounded-lg font-medium inline-flex items-center gap-1.5", btnSizeClass)} style={btnStyle}>
                      OK <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {isTextType && question.type !== "PHONE" && question.type !== "LONG_TEXT" && (
                  <div>
                    <div className="border-b-2 pb-2 opacity-30 text-[14px]" style={{ borderColor: theme.textColor, ...txtStyle }}>
                      {placeholders[question.type] || "Digite sua resposta..."}
                    </div>
                    <button className={cn("mt-5 rounded-lg font-medium inline-flex items-center gap-1.5", btnSizeClass)} style={btnStyle}>
                      OK <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {question.type === "LONG_TEXT" && (
                  <div>
                    <div className="border-b-2 pb-2 opacity-30 text-[14px]" style={{ borderColor: theme.textColor, ...txtStyle }}>
                      Digite sua resposta...
                    </div>
                    <button className={cn("mt-5 rounded-lg font-medium inline-flex items-center gap-1.5", btnSizeClass)} style={btnStyle}>
                      OK <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {isChoiceType && question.options.length > 0 && (
                  <div className="space-y-2 mt-4">
                    {question.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-[13px] font-medium" style={{ 
                        borderColor: theme.buttonBorderColor || `${theme.textColor}15`, 
                        backgroundColor: theme.optionBgColor || 'transparent',
                        ...txtStyle 
                      }}>
                        <span className="w-5 h-5 rounded text-[10px] flex items-center justify-center border" style={{ borderColor: theme.buttonBorderColor || `${theme.textColor}30` }}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        {opt}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center" style={txtStyle}>
                <h2 className="text-xl font-bold mb-2">{form.title || "Título do formulário"}</h2>
                <p className="text-[13px] opacity-40">Adicione perguntas</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation arrows */}
        <div className="absolute bottom-4 right-5 flex items-center gap-1.5 z-20">
          <div className="w-8 h-8 rounded-md flex items-center justify-center border opacity-40" style={{ borderColor: `${theme.textColor}30` }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.textColor} strokeWidth="2"><path d="M18 15l-6-6-6 6"/></svg>
          </div>
          <div className="w-8 h-8 rounded-md flex items-center justify-center border opacity-40" style={{ borderColor: `${theme.textColor}30` }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.textColor} strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
          </div>
        </div>

        {/* Mobile notch */}
        {mode === "mobile" && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-5 bg-foreground/10 rounded-b-2xl z-30" />
        )}
      </div>
    </div>
  );
};

// ===== BUILDER/EDITOR VIEW =====
const FormEditor = ({ formId, onBack }: { formId: string; onBack: () => void }) => {
  const { data: forms = [] } = useForms();
  const updateForm = useUpdateForm();
  const existingForm = forms.find((f: FormData) => f.id === formId);

  const [form, setForm] = useState<Form>({
    id: "", slug: "", title: "", theme: { bgColor: "#ffffff", textColor: "#171717", buttonColor: "#4285f4" },
    questions: [], thankYouScreen: { text: "Obrigado! 🎉", ctaText: "Voltar" }, fieldMappings: [],
    welcomeScreen: { enabled: false, title: "", buttonText: "Começar" },
    leadQualification: { enabled: false, requiredFields: [] },
    webhookUrl: "",
  });
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [settingsTab, setSettingsTab] = useState("pergunta");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (existingForm) {
      setForm({
        id: existingForm.id,
        slug: existingForm.slug,
        title: existingForm.title,
        theme: existingForm.theme,
        logo: existingForm.logo ? { url: (existingForm.logo as any).url, position: ((existingForm.logo as any).position || 'top') as 'top' | 'left' | 'bottom' } : undefined,
        backgroundImage: existingForm.background_image || undefined,
        questions: existingForm.questions || [],
        thankYouScreen: existingForm.thank_you_screen,
        welcomeScreen: (existingForm as any).welcome_screen || { enabled: false, title: "", buttonText: "Começar" },
        fieldMappings: existingForm.field_mappings || [],
        leadQualification: (existingForm as any).lead_qualification || { enabled: false, requiredFields: [] },
        webhookUrl: existingForm.webhook_url || "",
      });
    }
  }, [existingForm]);

  const selectedQuestion = form.questions.find(q => q.id === selectedQuestionId);
  const previewQuestionIndex = selectedQuestion ? form.questions.indexOf(selectedQuestion) : 0;
  const showEndingPreview = settingsTab === "finalizacao";

  const addQuestion = useCallback((type: QuestionType) => {
    const newQ: FormQuestion = {
      id: generateId(), type, title: "", description: "", required: false,
      options: type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE" ? ["Opção 1", "Opção 2"] : [],
    };
    setForm(prev => ({ ...prev, questions: [...prev.questions, newQ] }));
    setSelectedQuestionId(newQ.id);
    setSettingsTab("pergunta");
  }, []);

  const updateQuestion = useCallback((id: string, updates: Partial<FormQuestion>) => {
    setForm(prev => ({ ...prev, questions: prev.questions.map(q => q.id === id ? { ...q, ...updates } : q) }));
  }, []);

  const removeQuestion = useCallback((id: string) => {
    setForm(prev => ({ ...prev, questions: prev.questions.filter(q => q.id !== id), fieldMappings: prev.fieldMappings.filter(m => m.questionId !== id) }));
    if (selectedQuestionId === id) setSelectedQuestionId(null);
  }, [selectedQuestionId]);

  const addOption = useCallback((qId: string) => {
    setForm(prev => ({ ...prev, questions: prev.questions.map(q => q.id === qId ? { ...q, options: [...q.options, `Opção ${q.options.length + 1}`] } : q) }));
  }, []);

  const updateOption = useCallback((qId: string, index: number, value: string) => {
    setForm(prev => ({ ...prev, questions: prev.questions.map(q => q.id === qId ? { ...q, options: q.options.map((o, i) => i === index ? value : o) } : q) }));
  }, []);

  const removeOption = useCallback((qId: string, index: number) => {
    setForm(prev => ({
      ...prev,
      questions: prev.questions.map(q => {
        if (q.id === qId) {
          const newOptions = q.options.filter((_, i) => i !== index);
          const newRedirects = { ...q.optionRedirects };
          delete newRedirects[index.toString()];
          
          // Re-map indices for redirects after deletion
          const processedRedirects: Record<string, string> = {};
          Object.entries(newRedirects).forEach(([idx, url]) => {
            const i = parseInt(idx);
            if (i > index) {
              processedRedirects[(i - 1).toString()] = url;
            } else {
              processedRedirects[idx] = url;
            }
          });

          return { ...q, options: newOptions, optionRedirects: processedRedirects };
        }
        return q;
      })
    }));
  }, []);

  const updateOptionRedirect = useCallback((qId: string, index: number, url: string) => {
    setForm(prev => ({
      ...prev,
      questions: prev.questions.map(q => {
        if (q.id === qId) {
          const newRedirects = { ...(q.optionRedirects || {}) };
          if (url) {
            newRedirects[index.toString()] = url;
          } else {
            delete newRedirects[index.toString()];
          }
          return { ...q, optionRedirects: newRedirects };
        }
        return q;
      })
    }));
  }, []);

  const setFieldMapping = useCallback((questionId: string, target: string, customLabel?: string) => {
    setForm(prev => {
      const existing = prev.fieldMappings.filter(m => m.questionId !== questionId);
      if (target === "none") return { ...prev, fieldMappings: existing };
      return { ...prev, fieldMappings: [...existing, { questionId, target: target as any, customLabel }] };
    });
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setForm(prev => {
        const oldIndex = prev.questions.findIndex(q => q.id === active.id);
        const newIndex = prev.questions.findIndex(q => q.id === over.id);
        return { ...prev, questions: arrayMove(prev.questions, oldIndex, newIndex) };
      });
    }
  }, []);

  const handleSave = () => {
    updateForm.mutate({
      id: form.id,
      slug: form.slug,
      title: form.title,
      theme: form.theme,
      logo: form.logo || null,
      background_image: form.backgroundImage || null,
      questions: form.questions,
      thank_you_screen: form.thankYouScreen,
      welcome_screen: form.welcomeScreen,
      field_mappings: form.fieldMappings,
      lead_qualification: form.leadQualification,
      webhook_url: form.webhookUrl,
    }, { onSuccess: () => toast.success("Formulário salvo!") });
  };

  const _currentMapping = selectedQuestion ? form.fieldMappings.find(m => m.questionId === selectedQuestion.id) : null;
  const formLink = `${FORM_DOMAIN}/f/${form.slug}`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="h-8 w-8 p-0"><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h1 className="text-lg font-bold text-foreground">{form.title || "Editor"}</h1>
            <p className="text-[11px] text-muted-foreground">/f/{form.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            <button onClick={() => setPreviewMode("desktop")} className={cn("px-2.5 py-1.5 rounded-md transition-colors", previewMode === "desktop" ? "bg-background shadow-sm" : "text-muted-foreground")}><Monitor className="w-4 h-4" /></button>
            <button onClick={() => setPreviewMode("mobile")} className={cn("px-2.5 py-1.5 rounded-md transition-colors", previewMode === "mobile" ? "bg-background shadow-sm" : "text-muted-foreground")}><Smartphone className="w-4 h-4" /></button>
          </div>
          <Button size="sm" className="gap-1.5 text-[12px]" onClick={handleSave} disabled={updateForm.isPending}>Salvar</Button>
        </div>
      </div>

      {/* Live Preview */}
      <LivePreview form={form} mode={previewMode} previewQuestionIndex={previewQuestionIndex} showEnding={showEndingPreview} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[50vh]">
        {/* Left Sidebar - Elements */}
        <div className="lg:col-span-2">
          <Card className="border-border/40 sticky top-4">
            <CardHeader className="pb-2 px-3 pt-3"><CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Elementos</CardTitle></CardHeader>
            <CardContent className="space-y-0.5 px-2 pb-3">
              {(Object.entries(questionTypeLabels) as [QuestionType, { label: string; icon: typeof Type }][]).map(([type, { label, icon: Icon }]) => (
                <Button key={type} variant="ghost" size="sm" className="w-full justify-start gap-2 text-[11px] h-8 px-2" onClick={() => addQuestion(type)}>
                  <Icon className="w-3.5 h-3.5 shrink-0" /> {label}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Center - Question List */}
        <div className="lg:col-span-6">
          <Card className="border-border/40 min-h-[400px]">
            <CardContent className="p-5">
              <Input value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} className="text-xl font-bold border-none shadow-none px-0 focus-visible:ring-0 mb-4 bg-transparent" placeholder="Título do formulário..." />
              {form.questions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Plus className="w-10 h-10 mb-3 opacity-40" /><p className="text-[14px] font-medium">Adicione sua primeira pergunta</p><p className="text-[12px] mt-1">Use o painel à esquerda</p>
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={form.questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {form.questions.map((q, idx) => (
                        <SortableQuestionItem
                          key={q.id}
                          q={q}
                          idx={idx}
                          isSelected={selectedQuestionId === q.id}
                          form={form}
                          onClick={() => { setSelectedQuestionId(q.id); setSettingsTab("pergunta"); }}
                          onRemove={() => removeQuestion(q.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar - Settings */}
        <div className="lg:col-span-4">
          <Card className="border-border/40 sticky top-4">
            <Tabs value={settingsTab} onValueChange={setSettingsTab}>
              <CardHeader className="pb-0 border-b border-border/20 px-3 pt-3">
                <TabsList className="bg-transparent w-full justify-start gap-0 h-auto p-0">
                  {["pergunta","mapeamento","design","welcome","finalizacao","integracao","publicacao"].map(t => (
                    <TabsTrigger key={t} value={t} className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-2 py-2 text-[10px]">
                      {t === "pergunta" ? "Pergunta" : t === "mapeamento" ? "Dados" : t === "design" ? "Design" : t === "welcome" ? "Início" : t === "finalizacao" ? "Ending" : t === "integracao" ? "Conexão" : "Link"}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 px-4 max-h-[60vh] overflow-y-auto">
                {/* Question Tab */}
                <TabsContent value="pergunta" className="mt-0 space-y-3">
                  {selectedQuestion ? (
                    <>
                      <div><Label className="text-[12px]">Título</Label><Input value={selectedQuestion.title} onChange={e => updateQuestion(selectedQuestion.id, { title: e.target.value })} className="mt-1" placeholder="Ex: Qual seu nome?" /><p className="text-[10px] text-muted-foreground mt-1">Use *texto* para negrito</p></div>
                      <div><Label className="text-[12px]">Descrição</Label><Textarea value={selectedQuestion.description || ""} onChange={e => updateQuestion(selectedQuestion.id, { description: e.target.value })} className="mt-1" rows={2} /></div>
                      <div className="flex items-center justify-between"><Label className="text-[12px]">Obrigatório</Label><Switch checked={selectedQuestion.required} onCheckedChange={v => updateQuestion(selectedQuestion.id, { required: v })} /></div>
                      <div><Label className="text-[12px]">Tipo</Label>
                        <Select value={selectedQuestion.type} onValueChange={v => updateQuestion(selectedQuestion.id, { type: v as QuestionType, options: (v === "SINGLE_CHOICE" || v === "MULTIPLE_CHOICE") ? (selectedQuestion.options.length > 0 ? selectedQuestion.options : ["Opção 1", "Opção 2"]) : [] })}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(questionTypeLabels).map(([type, { label }]) => (
                              <SelectItem key={type} value={type}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {(selectedQuestion.type === "SINGLE_CHOICE" || selectedQuestion.type === "MULTIPLE_CHOICE") && (
                        <div><Label className="text-[12px]">Opções</Label>
                          <div className="space-y-1.5 mt-2">
                            {selectedQuestion.options.map((opt, i) => (
                              <div key={i} className="group relative p-3 rounded-xl border border-secondary/50 bg-secondary/5 hover:bg-secondary/10 hover:border-secondary transition-all duration-200">
                                <div className="flex items-center gap-3">
                                  <div className="flex-1">
                                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Rótulo da Opção</Label>
                                    <Input 
                                      value={opt} 
                                      onChange={e => updateOption(selectedQuestion.id, i, e.target.value)} 
                                      className="h-9 text-[13px] bg-background border-none shadow-sm font-medium" 
                                      placeholder={`Opção ${i + 1}`}
                                    />
                                  </div>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-9 w-9 p-0 text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors mt-5" 
                                    onClick={() => removeOption(selectedQuestion.id, i)} 
                                    disabled={selectedQuestion.options.length <= 1}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                                <div className="mt-3 pt-3 border-t border-secondary/20">
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <div className="bg-primary/10 p-1 rounded">
                                      <ExternalLink className="w-3 h-3 text-primary" />
                                    </div>
                                    <Label className="text-[10px] text-primary/80 font-bold uppercase tracking-tight">Redirecionamento Inteligente</Label>
                                  </div>
                                  <Input 
                                    value={selectedQuestion.optionRedirects?.[i.toString()] || ""} 
                                    onChange={e => updateOptionRedirect(selectedQuestion.id, i, e.target.value)} 
                                    className="h-8 text-[11px] bg-primary/5 border-primary/10 focus-visible:ring-primary/30 placeholder:text-muted-foreground/40" 
                                    placeholder="Ex: https://calendly.com/seu-link" 
                                  />
                                </div>
                              </div>
                            ))}
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full gap-2 text-[12px] h-10 border-dashed hover:border-primary hover:text-primary transition-all bg-transparent" 
                              onClick={() => addOption(selectedQuestion.id)}
                            >
                              <Plus className="w-4 h-4" /> Adicionar Nova Escolha
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : <p className="text-[13px] text-muted-foreground text-center py-8">Selecione uma pergunta</p>}
                </TabsContent>

                {/* Field Mapping Tab - Unified view */}
                <TabsContent value="mapeamento" className="mt-0 space-y-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Mapeamento de Campos</p>
                    <p className="text-[10px] text-muted-foreground mb-3">Defina quais perguntas captam informações do lead para o CRM.</p>
                    
                    {form.questions.length === 0 ? (
                      <p className="text-[12px] text-muted-foreground text-center py-6">Adicione perguntas primeiro</p>
                    ) : (
                      <div className="space-y-2">
                        {form.questions.map((q, idx) => {
                          const mapping = form.fieldMappings.find(m => m.questionId === q.id);
                          const Icon = questionTypeLabels[q.type]?.icon || Type;
                          return (
                            <div key={q.id} className="p-2.5 rounded-lg border border-border/40 space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-muted-foreground w-4">{idx + 1}</span>
                                <Icon className="w-3 h-3 text-muted-foreground shrink-0" />
                                <p className="text-[12px] font-medium truncate flex-1">{q.title || "Sem título"}</p>
                              </div>
                              <Select value={mapping?.target || "none"} onValueChange={v => setFieldMapping(q.id, v)}>
                                <SelectTrigger className="h-7 text-[11px]"><SelectValue placeholder="Não mapear" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">— Não mapear</SelectItem>
                                  {FIELD_MAPPING_PRESETS.map(p => {
                                    const alreadyUsed = form.fieldMappings.some(m => m.target === p.value && m.questionId !== q.id && p.value !== 'custom');
                                    return (
                                      <SelectItem key={p.value} value={p.value} disabled={alreadyUsed}>
                                        {p.label} {alreadyUsed ? "(em uso)" : ""}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                              {mapping?.target === "custom" && (
                                <Input value={mapping.customLabel || ""} onChange={e => setFieldMapping(q.id, "custom", e.target.value)} className="h-7 text-[11px]" placeholder="Nome do campo personalizado" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Lead Qualification */}
                  {form.fieldMappings.length > 0 && (
                    <div className="pt-3 border-t border-border/30 space-y-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Qualificação de Lead</p>
                      <p className="text-[10px] text-muted-foreground">Defina quais campos são obrigatórios para que uma resposta seja salva como lead no pipeline.</p>
                      
                      <div className="flex items-center justify-between">
                        <Label className="text-[12px]">Ativar filtro de qualificação</Label>
                        <Switch 
                          checked={form.leadQualification.enabled} 
                          onCheckedChange={v => setForm(prev => ({ ...prev, leadQualification: { ...prev.leadQualification, enabled: v } }))} 
                        />
                      </div>

                      {form.leadQualification.enabled ? (
                        <div className="space-y-1.5">
                          <p className="text-[10px] text-muted-foreground">Marque os campos que devem estar preenchidos:</p>
                          {form.fieldMappings.filter(m => m.target !== 'custom').map(m => {
                            const preset = FIELD_MAPPING_PRESETS.find(p => p.value === m.target);
                            const isRequired = form.leadQualification.requiredFields.includes(m.target);
                            return (
                              <label key={m.questionId} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                                <Checkbox 
                                  checked={isRequired}
                                  onCheckedChange={checked => {
                                    setForm(prev => ({
                                      ...prev,
                                      leadQualification: {
                                        ...prev.leadQualification,
                                        requiredFields: checked 
                                          ? [...prev.leadQualification.requiredFields, m.target]
                                          : prev.leadQualification.requiredFields.filter(f => f !== m.target)
                                      }
                                    }));
                                  }}
                                />
                                <div>
                                  <p className="text-[12px] font-medium">{preset?.label || m.target}</p>
                                  <p className="text-[10px] text-muted-foreground">{preset?.description}</p>
                                </div>
                              </label>
                            );
                          })}
                          {form.leadQualification.requiredFields.length === 0 && (
                            <p className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg">
                              ⚠️ Selecione pelo menos um campo obrigatório, ou desative o filtro para aceitar todos.
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-[10px] text-muted-foreground bg-muted/50 p-2 rounded-lg">
                          Todas as respostas serão salvas como lead automaticamente (desde que tenham nome ou e-mail ou telefone mapeados).
                        </p>
                      )}

                      {/* Conditional Redirection */}
                      <div className="pt-3 border-t border-border/10 space-y-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Redirecionamento Inteligente</p>
                        <p className="text-[10px] text-muted-foreground">Encaminhe o usuário para um link diferente com base no valor de uma resposta (ex: Renda {">"} 5000).</p>
                        
                        <div className="flex items-center justify-between">
                          <Label className="text-[12px]">Ativar redirecionamento condicional</Label>
                          <Switch 
                            checked={form.leadQualification.conditionalRedirectEnabled || false} 
                            onCheckedChange={v => setForm(prev => ({ 
                              ...prev, 
                              leadQualification: { ...prev.leadQualification, conditionalRedirectEnabled: v } 
                            }))} 
                          />
                        </div>

                        {form.leadQualification.conditionalRedirectEnabled && (
                          <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border/40">
                            <div className="space-y-1.5">
                              <Label className="text-[11px]">Se o campo...</Label>
                              <Select 
                                value={form.leadQualification.conditionField || ""} 
                                onValueChange={v => setForm(prev => ({ 
                                  ...prev, 
                                  leadQualification: { ...prev.leadQualification, conditionField: v as any } 
                                }))}
                              >
                                <SelectTrigger className="h-8 text-[11px]">
                                  <SelectValue placeholder="Selecione um campo mapeado" />
                                </SelectTrigger>
                                <SelectContent>
                                  {form.fieldMappings.filter(m => m.target !== 'custom').map(m => (
                                    <SelectItem key={m.target} value={m.target}>
                                      {FIELD_MAPPING_PRESETS.find(p => p.value === m.target)?.label || m.target}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1.5">
                                <Label className="text-[11px]">For...</Label>
                                <Select 
                                  value={form.leadQualification.conditionOperator || "greater_than"} 
                                  onValueChange={v => setForm(prev => ({ 
                                    ...prev, 
                                    leadQualification: { ...prev.leadQualification, conditionOperator: v as any } 
                                  }))}
                                >
                                  <SelectTrigger className="h-8 text-[11px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="greater_than">Maior que ({">"})</SelectItem>
                                    <SelectItem value="less_than">Menor que ({"<"})</SelectItem>
                                    <SelectItem value="equal">Igual (==)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-[11px]">Valor</Label>
                                <Input 
                                  type="number"
                                  value={form.leadQualification.conditionValue || ""} 
                                  onChange={e => setForm(prev => ({ 
                                    ...prev, 
                                    leadQualification: { ...prev.leadQualification, conditionValue: e.target.value } 
                                  }))}
                                  className="h-8 text-[11px]" 
                                  placeholder="Ex: 5000" 
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5 pt-1">
                              <Label className="text-[11px] font-bold text-primary">Redirecionar para:</Label>
                              <Input 
                                value={form.leadQualification.successRedirectUrl || ""} 
                                onChange={e => setForm(prev => ({ 
                                  ...prev, 
                                  leadQualification: { ...prev.leadQualification, successRedirectUrl: e.target.value } 
                                }))}
                                className="h-8 text-[11px] border-primary/20" 
                                placeholder="https://calendly.com/seu-link" 
                              />
                              <p className="text-[9px] text-muted-foreground">Link do seu calendário ou página de vendas VIP.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {form.fieldMappings.length === 0 && form.questions.length > 0 && (
                    <p className="text-[10px] text-muted-foreground bg-muted/50 p-2.5 rounded-lg">
                      💡 Mapeie pelo menos uma pergunta a um campo (Nome, E-mail ou Telefone) para que as respostas criem leads automaticamente.
                    </p>
                  )}
                </TabsContent>

                {/* Design Tab - Enhanced */}
                <TabsContent value="design" className="mt-0 space-y-3">
                  <div><Label className="text-[12px]">Cor de Fundo</Label><div className="flex items-center gap-2 mt-1"><input type="color" value={form.theme.bgColor} onChange={e => setForm(prev => ({ ...prev, theme: { ...prev.theme, bgColor: e.target.value } }))} className="w-7 h-7 rounded border cursor-pointer" /><Input value={form.theme.bgColor} onChange={e => setForm(prev => ({ ...prev, theme: { ...prev.theme, bgColor: e.target.value } }))} className="flex-1 h-8 text-[12px]" /></div></div>
                  <div><Label className="text-[12px]">Cor do Texto</Label><div className="flex items-center gap-2 mt-1"><input type="color" value={form.theme.textColor} onChange={e => setForm(prev => ({ ...prev, theme: { ...prev.theme, textColor: e.target.value } }))} className="w-7 h-7 rounded border cursor-pointer" /><Input value={form.theme.textColor} onChange={e => setForm(prev => ({ ...prev, theme: { ...prev.theme, textColor: e.target.value } }))} className="flex-1 h-8 text-[12px]" /></div></div>
                  <div><Label className="text-[12px]">Cor do Botão</Label><div className="flex items-center gap-2 mt-1"><input type="color" value={form.theme.buttonColor} onChange={e => setForm(prev => ({ ...prev, theme: { ...prev.theme, buttonColor: e.target.value } }))} className="w-7 h-7 rounded border cursor-pointer" /><Input value={form.theme.buttonColor} onChange={e => setForm(prev => ({ ...prev, theme: { ...prev.theme, buttonColor: e.target.value } }))} className="flex-1 h-8 text-[12px]" /></div></div>
                  <div><Label className="text-[12px]">Cor da Borda (Botão)</Label><div className="flex items-center gap-2 mt-1"><input type="color" value={form.theme.buttonBorderColor || form.theme.buttonColor} onChange={e => setForm(prev => ({ ...prev, theme: { ...prev.theme, buttonBorderColor: e.target.value } }))} className="w-7 h-7 rounded border cursor-pointer" /><Input value={form.theme.buttonBorderColor || ""} onChange={e => setForm(prev => ({ ...prev, theme: { ...prev.theme, buttonBorderColor: e.target.value } }))} className="flex-1 h-8 text-[12px]" placeholder="Mesma do botão" /></div></div>
                  <div><Label className="text-[12px]">Cor de Fundo das Opções</Label><div className="flex items-center gap-2 mt-1"><input type="color" value={form.theme.optionBgColor || form.theme.bgColor} onChange={e => setForm(prev => ({ ...prev, theme: { ...prev.theme, optionBgColor: e.target.value } }))} className="w-7 h-7 rounded border cursor-pointer" /><Input value={form.theme.optionBgColor || ""} onChange={e => setForm(prev => ({ ...prev, theme: { ...prev.theme, optionBgColor: e.target.value } }))} className="flex-1 h-8 text-[12px]" placeholder="Transparente" /></div></div>
                  <div><Label className="text-[12px]">Cor da Barra de Progresso</Label><div className="flex items-center gap-2 mt-1"><input type="color" value={form.theme.progressBarColor || form.theme.buttonColor} onChange={e => setForm(prev => ({ ...prev, theme: { ...prev.theme, progressBarColor: e.target.value } }))} className="w-7 h-7 rounded border cursor-pointer" /><Input value={form.theme.progressBarColor || ""} onChange={e => setForm(prev => ({ ...prev, theme: { ...prev.theme, progressBarColor: e.target.value } }))} className="flex-1 h-8 text-[12px]" placeholder="Mesma do botão" /></div></div>

                  <div className="space-y-2 pt-2 border-t border-border/30">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tipografia & Tamanhos</p>
                    <div><Label className="text-[12px]">Tamanho do Texto</Label>
                      <Select value={form.theme.fontSize || 'md'} onValueChange={v => setForm(prev => ({ ...prev, theme: { ...prev.theme, fontSize: v as any } }))}>
                        <SelectTrigger className="mt-1 h-8 text-[12px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sm">Pequeno</SelectItem>
                          <SelectItem value="md">Médio</SelectItem>
                          <SelectItem value="lg">Grande</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-[12px]">Tamanho do Botão</Label>
                      <Select value={form.theme.buttonSize || 'md'} onValueChange={v => setForm(prev => ({ ...prev, theme: { ...prev.theme, buttonSize: v as any } }))}>
                        <SelectTrigger className="mt-1 h-8 text-[12px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sm">Pequeno</SelectItem>
                          <SelectItem value="md">Médio</SelectItem>
                          <SelectItem value="lg">Grande</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-[12px]">Fonte</Label>
                      <Select value={form.theme.fontFamily || 'inter'} onValueChange={v => setForm(prev => ({ ...prev, theme: { ...prev.theme, fontFamily: v as any } }))}>
                        <SelectTrigger className="mt-1 h-8 text-[12px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FONT_OPTIONS.map(f => (
                            <SelectItem key={f.value} value={f.value}>
                              <span style={{ fontFamily: f.css }}>{f.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2 pt-2 border-t border-border/30">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Efeitos</p>
                    <div className="flex items-center justify-between"><Label className="text-[12px]">Sombra no Botão</Label><Switch checked={form.theme.buttonShadow || false} onCheckedChange={v => setForm(prev => ({ ...prev, theme: { ...prev.theme, buttonShadow: v } }))} /></div>
                    <div className="flex items-center justify-between"><Label className="text-[12px]">Botão apenas Contorno</Label><Switch checked={form.theme.buttonOutline || false} onCheckedChange={v => setForm(prev => ({ ...prev, theme: { ...prev.theme, buttonOutline: v } }))} /></div>
                    <div className="flex items-center justify-between"><Label className="text-[12px]">Sombra no Texto</Label><Switch checked={form.theme.textShadow || false} onCheckedChange={v => setForm(prev => ({ ...prev, theme: { ...prev.theme, textShadow: v } }))} /></div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border/30">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Imagens</p>
                    <ImageUploadField label="Imagem de Fundo" hint="Recomendado: 1920×1080, até 5MB" value={form.backgroundImage} onChange={url => setForm(prev => ({ ...prev, backgroundImage: url || undefined }))} />
                    {form.backgroundImage && (
                      <div>
                        <Label className="text-[12px]">Brilho da Imagem</Label>
                        <div className="flex items-center gap-3 mt-1">
                          <Slider value={[form.theme.imageBrightness ?? 80]} onValueChange={([v]) => setForm(prev => ({ ...prev, theme: { ...prev.theme, imageBrightness: v } }))} min={10} max={100} step={5} className="flex-1" />
                          <span className="text-[11px] text-muted-foreground w-8 text-right">{form.theme.imageBrightness ?? 80}%</span>
                        </div>
                      </div>
                    )}
                    <ImageUploadField label="Logo" hint="PNG transparente" value={form.logo?.url} onChange={url => setForm(prev => ({ ...prev, logo: url ? { url, position: prev.logo?.position || 'top' } : undefined }))} />
                    {form.logo?.url && (
                      <div><Label className="text-[12px]">Posição da Logo</Label>
                        <Select value={form.logo?.position || 'top'} onValueChange={v => setForm(prev => ({ ...prev, logo: prev.logo ? { ...prev.logo, position: v as 'top' | 'left' | 'bottom' } : undefined }))}>
                          <SelectTrigger className="mt-1 h-8 text-[12px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="top">Topo Esquerdo</SelectItem>
                            <SelectItem value="bottom">Rodapé Centro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Welcome Screen Tab */}
                <TabsContent value="welcome" className="mt-0 space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Welcome Screen</p>
                  <p className="text-[10px] text-muted-foreground">Tela inicial exibida antes das perguntas (opcional).</p>
                  <div className="flex items-center justify-between">
                    <Label className="text-[12px]">Ativar Welcome Screen</Label>
                    <Switch checked={form.welcomeScreen.enabled} onCheckedChange={v => setForm(prev => ({ ...prev, welcomeScreen: { ...prev.welcomeScreen, enabled: v } }))} />
                  </div>
                  {form.welcomeScreen.enabled && (
                    <>
                      <div><Label className="text-[12px]">Título</Label><Input value={form.welcomeScreen.title} onChange={e => setForm(prev => ({ ...prev, welcomeScreen: { ...prev.welcomeScreen, title: e.target.value } }))} className="mt-1 h-8 text-[12px]" placeholder="Bem-vindo!" /><p className="text-[10px] text-muted-foreground mt-1">Use *texto* para negrito</p></div>
                      <div><Label className="text-[12px]">Descrição</Label><Textarea value={form.welcomeScreen.description || ""} onChange={e => setForm(prev => ({ ...prev, welcomeScreen: { ...prev.welcomeScreen, description: e.target.value } }))} className="mt-1" rows={2} placeholder="Uma breve descrição..." /></div>
                      <div><Label className="text-[12px]">Texto do Botão</Label><Input value={form.welcomeScreen.buttonText} onChange={e => setForm(prev => ({ ...prev, welcomeScreen: { ...prev.welcomeScreen, buttonText: e.target.value } }))} className="mt-1 h-8 text-[12px]" placeholder="Começar" /></div>
                      <ImageUploadField label="Imagem" hint="Exibida acima do título" value={form.welcomeScreen.imageUrl} onChange={url => setForm(prev => ({ ...prev, welcomeScreen: { ...prev.welcomeScreen, imageUrl: url || undefined } }))} />
                    </>
                  )}
                </TabsContent>

                {/* Ending Tab - Separate */}
                <TabsContent value="finalizacao" className="mt-0 space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tela de Agradecimento</p>
                  <div><Label className="text-[12px]">Mensagem</Label><Textarea value={form.thankYouScreen.text} onChange={e => setForm(prev => ({ ...prev, thankYouScreen: { ...prev.thankYouScreen, text: e.target.value } }))} className="mt-1" rows={3} /><p className="text-[10px] text-muted-foreground mt-1">Use *texto* para negrito</p></div>
                  <div><Label className="text-[12px]">Tamanho do Texto</Label>
                    <Select value={form.thankYouScreen.fontSize || 'md'} onValueChange={v => setForm(prev => ({ ...prev, thankYouScreen: { ...prev.thankYouScreen, fontSize: v as any } }))}>
                      <SelectTrigger className="mt-1 h-8 text-[12px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sm">Pequeno</SelectItem>
                        <SelectItem value="md">Médio</SelectItem>
                        <SelectItem value="lg">Grande</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-[12px]">URL do Vídeo</Label><Input value={form.thankYouScreen.videoUrl || ""} onChange={e => setForm(prev => ({ ...prev, thankYouScreen: { ...prev.thankYouScreen, videoUrl: e.target.value } }))} className="mt-1 h-8 text-[12px]" placeholder="https://youtube.com/..." /></div>
                  <div><Label className="text-[12px]">Texto do Botão</Label><Input value={form.thankYouScreen.ctaText || ""} onChange={e => setForm(prev => ({ ...prev, thankYouScreen: { ...prev.thankYouScreen, ctaText: e.target.value } }))} className="mt-1 h-8 text-[12px]" placeholder="Ex: Voltar, Acessar, etc." /></div>
                  <div><Label className="text-[12px]">URL de Redirecionamento</Label><Input value={form.thankYouScreen.redirectUrl || ""} onChange={e => setForm(prev => ({ ...prev, thankYouScreen: { ...prev.thankYouScreen, redirectUrl: e.target.value } }))} className="mt-1 h-8 text-[12px]" placeholder="https://..." /></div>
                  <ImageUploadField label="Imagem de Fundo (Ending)" hint="Sobrescreve o fundo na tela final" value={form.thankYouScreen.backgroundImage} onChange={url => setForm(prev => ({ ...prev, thankYouScreen: { ...prev.thankYouScreen, backgroundImage: url || undefined } }))} />
                  <ImageUploadField label="Logo (Ending)" hint="Logo específica da tela final" value={form.thankYouScreen.logoUrl} onChange={url => setForm(prev => ({ ...prev, thankYouScreen: { ...prev.thankYouScreen, logoUrl: url || undefined } }))} />
                </TabsContent>

                {/* Integrations Tab */}
                <TabsContent value="integracao" className="mt-0 space-y-4">
                  <div className="space-y-3">
                    <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-primary/20 text-primary">
                          <ExternalLink className="w-4 h-4" />
                        </div>
                        <p className="text-[12px] font-bold">Google Sheets & Webhooks</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Envie os dados das respostas em tempo real para uma planilha ou outro sistema externo.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[12px]">URL do Webhook</Label>
                      <Input 
                        value={form.webhookUrl || ""} 
                        onChange={e => setForm(prev => ({ ...prev, webhookUrl: e.target.value }))} 
                        className="h-9 text-[12px]" 
                        placeholder="https://script.google.com/macros/s/..." 
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Insira a URL do seu Google Apps Script ou serviço de automação (Zapier, Make, etc).
                      </p>
                    </div>

                    <div className="p-3 bg-muted/40 rounded-lg border border-border/40">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Dica de configuração</p>
                      <p className="text-[10px] text-muted-foreground">
                        Utilize um script no Google Sheets para receber o JSON enviado via POST com os campos: `form_id`, `answers`, `mapped_data` e `metadata`.
                      </p>
                    </div>
                  </div>
                </TabsContent>

                {/* Publish Tab */}
                <TabsContent value="publicacao" className="mt-0 space-y-4">
                  <div><Label className="text-[12px]">Slug</Label><div className="flex items-center gap-1 mt-1"><span className="text-[12px] text-muted-foreground">/f/</span><Input value={form.slug} onChange={e => setForm(prev => ({ ...prev, slug: e.target.value.replace(/[^a-z0-9-]/g, '') }))} className="h-8 text-[12px]" /></div></div>
                  {form.slug && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-[11px] text-muted-foreground mb-1">Link:</p>
                      <p className="text-[12px] font-medium break-all">{formLink}</p>
                      <Button variant="outline" size="sm" className="mt-2 gap-1.5 text-[11px] w-full h-8" onClick={() => { navigator.clipboard.writeText(formLink); toast.success("Copiado!"); }}><Copy className="w-3 h-3" /> Copiar Link</Button>
                    </div>
                  )}
                  <div className="flex items-center justify-between"><Label className="text-[12px]">Formulário ativo</Label><Switch checked={form.id ? (existingForm?.active ?? true) : true} onCheckedChange={v => updateForm.mutate({ id: form.id, active: v })} /></div>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
};

// ===== MAIN COMPONENT =====
const FormBuilder = () => {
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [viewingResponsesFormId, setViewingResponsesFormId] = useState<string | null>(null);

  if (viewingResponsesFormId) {
    return <FormResponsesView formId={viewingResponsesFormId} onBack={() => setViewingResponsesFormId(null)} />;
  }

  if (editingFormId) {
    return <FormEditor formId={editingFormId} onBack={() => setEditingFormId(null)} />;
  }

  return <FormWorkspace onEdit={setEditingFormId} onViewResponses={setViewingResponsesFormId} />;
};

export default FormBuilder;
