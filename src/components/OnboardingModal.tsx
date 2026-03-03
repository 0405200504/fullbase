import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface OnboardingModalProps {
  open: boolean;
  userId: string;
  nome: string;
  email: string;
}

const nicheOptions = [
  "Infoprodutos",
  "Agência",
  "Consultoria",
  "SaaS",
  "Outro"
];

const teamSizes = [
  { value: "solo", label: "Eu sozinho" },
  { value: "2-5", label: "2-5 pessoas" },
  { value: "6-10", label: "6-10 pessoas" },
  { value: "11+", label: "11+ pessoas" }
];

const revenueRanges = [
  { value: "0-10k", label: "Até R$10k" },
  { value: "10k-50k", label: "R$10k-R$50k" },
  { value: "50k-100k", label: "R$50k-R$100k" },
  { value: "100k+", label: "+R$100k" }
];

const mainGoals = [
  { value: "organize", label: "Organizar meu processo de vendas", icon: "📋" },
  { value: "conversion", label: "Aumentar minha taxa de conversão", icon: "📈" },
  { value: "team", label: "Gerenciar minha equipe comercial", icon: "👥" },
  { value: "insights", label: "Ter mais clareza dos números", icon: "💡" }
];

export const OnboardingModal = ({ open, userId, nome, email }: OnboardingModalProps) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Step 1: Contact Info
  const [telefone, setTelefone] = useState("");

  // Step 2: Business Profile
  const [companyName, setCompanyName] = useState("");
  const [niche, setNiche] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [monthlyRevenue, setMonthlyRevenue] = useState("");

  // Step 3: Goals and Challenges
  const [mainGoal, setMainGoal] = useState("");
  const [mainChallenge, setMainChallenge] = useState("");

  const progress = (step / 4) * 100;

  const handleNext = () => {
    if (step === 1) {
      if (!telefone) {
        toast.error("Por favor, preencha o telefone");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!companyName || !niche || !teamSize || !monthlyRevenue) {
        toast.error("Por favor, preencha todos os campos");
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!mainGoal) {
        toast.error("Por favor, selecione um objetivo");
        return;
      }
      handleFinish();
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    setStep(4);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          telefone,
          company_name: companyName,
          niche,
          team_size: teamSize,
          monthly_revenue: monthlyRevenue,
          main_goal: mainGoal,
          main_challenge: mainChallenge || null,
        })
        .eq("id", userId);

      if (error) throw error;

      // Simulate loading
      await new Promise(resolve => setTimeout(resolve, 2500));

      toast.success("Bem-vindo ao HighLeads! 🎉");
      navigate("/");
    } catch (error: any) {
      toast.error("Erro ao salvar informações: " + error.message);
      setStep(3);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <Dialog open={open} modal={true}>
      <DialogContent 
        className="max-w-full h-screen max-h-screen p-0 gap-0 bg-[#111827] border-none"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Aurora Background Effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-radial from-blue-900/20 via-transparent to-transparent animate-pulse" 
               style={{ animationDuration: '8s' }} />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" 
               style={{ animationDuration: '12s', animationDelay: '0s' }} />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" 
               style={{ animationDuration: '15s', animationDelay: '2s' }} />
        </div>

        <div className="relative z-10 flex flex-col h-full">
          {/* Progress Bar */}
          <div className="px-8 pt-8 pb-4">
            <Progress value={progress} className="h-2" />
          </div>

          {/* Content */}
          <div className="flex-1 flex items-center justify-center px-4 pb-8">
            <div className="w-full max-w-[500px]">
              {step === 1 && (
                <div className="space-y-6 animate-fade-in">
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-white mb-2">
                      Vamos começar. Crie sua conta.
                    </h2>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="displayName" className="text-gray-300">Nome Completo</Label>
                      <Input
                        id="displayName"
                        value={nome}
                        disabled
                        className="mt-1 bg-[#1f2937] border-gray-700 text-white"
                      />
                    </div>

                    <div>
                      <Label htmlFor="displayEmail" className="text-gray-300">Email</Label>
                      <Input
                        id="displayEmail"
                        value={email}
                        disabled
                        className="mt-1 bg-[#1f2937] border-gray-700 text-white"
                      />
                    </div>

                    <div>
                      <Label htmlFor="telefone" className="text-gray-300">Telefone *</Label>
                      <Input
                        id="telefone"
                        value={telefone}
                        onChange={(e) => setTelefone(e.target.value)}
                        placeholder="(00) 00000-0000"
                        className="mt-1 bg-[#1f2937] border-gray-700 text-white focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6 animate-fade-in">
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-white mb-2">
                      Conte-nos sobre sua empresa.
                    </h2>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="companyName" className="text-gray-300">Nome da sua empresa *</Label>
                      <Input
                        id="companyName"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="mt-1 bg-[#1f2937] border-gray-700 text-white focus:border-blue-500"
                        placeholder="Ex: Minha Empresa LTDA"
                      />
                    </div>

                    <div>
                      <Label htmlFor="niche" className="text-gray-300">Nicho de mercado *</Label>
                      <select
                        id="niche"
                        value={niche}
                        onChange={(e) => setNiche(e.target.value)}
                        className="mt-1 w-full h-10 rounded-md border border-gray-700 bg-[#1f2937] px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Selecione...</option>
                        {nicheOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label className="text-gray-300 mb-3 block">Tamanho da equipe *</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {teamSizes.map((size) => (
                          <button
                            key={size.value}
                            type="button"
                            onClick={() => setTeamSize(size.value)}
                            className={`p-3 rounded-lg border transition-all ${
                              teamSize === size.value
                                ? "border-blue-500 bg-blue-500/10 text-blue-400"
                                : "border-gray-700 bg-[#1f2937] text-gray-300 hover:border-gray-600"
                            }`}
                          >
                            {size.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-gray-300 mb-3 block">Faturamento mensal médio *</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {revenueRanges.map((range) => (
                          <button
                            key={range.value}
                            type="button"
                            onClick={() => setMonthlyRevenue(range.value)}
                            className={`p-3 rounded-lg border transition-all ${
                              monthlyRevenue === range.value
                                ? "border-blue-500 bg-blue-500/10 text-blue-400"
                                : "border-gray-700 bg-[#1f2937] text-gray-300 hover:border-gray-600"
                            }`}
                          >
                            {range.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6 animate-fade-in">
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-white mb-2">
                      Como o HighLeads pode te ajudar?
                    </h2>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-gray-300 mb-3 block">Qual seu principal objetivo? *</Label>
                      <div className="space-y-3">
                        {mainGoals.map((goal) => (
                          <button
                            key={goal.value}
                            type="button"
                            onClick={() => setMainGoal(goal.value)}
                            className={`w-full p-4 rounded-lg border transition-all text-left flex items-center gap-3 ${
                              mainGoal === goal.value
                                ? "border-blue-500 bg-blue-500/10 text-blue-400"
                                : "border-gray-700 bg-[#1f2937] text-gray-300 hover:border-gray-600"
                            }`}
                          >
                            <span className="text-2xl">{goal.icon}</span>
                            <span>{goal.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="mainChallenge" className="text-gray-300">
                        Qual seu maior desafio em vendas hoje?
                      </Label>
                      <Textarea
                        id="mainChallenge"
                        value={mainChallenge}
                        onChange={(e) => setMainChallenge(e.target.value)}
                        className="mt-1 bg-[#1f2937] border-gray-700 text-white focus:border-blue-500 min-h-[100px]"
                        placeholder="Ex: Perco muitos leads por falta de follow-up..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-6 animate-fade-in text-center">
                  <Loader2 className="w-16 h-16 animate-spin text-blue-500 mx-auto" />
                  <h2 className="text-2xl font-bold text-white">
                    Configurando seu workspace...
                  </h2>
                  <p className="text-gray-400">Aguarde enquanto preparamos tudo para você</p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {step < 4 && (
            <div className="px-8 pb-8">
              <div className="max-w-[500px] mx-auto flex gap-4">
                {step > 1 && (
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={loading}
                    className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {step === 3 ? "Finalizar Cadastro" : "Continuar"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};