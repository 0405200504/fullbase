import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FONT_OPTIONS } from "@/types/formBuilder";
import { useFormBySlug, useSubmitFormResponse } from "@/hooks/useForms";
import { supabase } from "@/integrations/supabase/client";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

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

const getFontSizeClass = (size?: string, base: string = 'text-2xl md:text-3xl') => {
  if (size === 'sm') return 'text-lg md:text-xl';
  if (size === 'lg') return 'text-3xl md:text-4xl';
  return base;
};

const getButtonSizeClass = (size?: string) => {
  if (size === 'sm') return 'px-4 py-1.5 text-[11px]';
  if (size === 'lg') return 'px-10 py-4 text-[16px]';
  return 'px-6 py-2.5 text-[13px]';
};

// ===== HELPER: Button style from theme =====
const getButtonStyle = (theme: any) => {
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

const getTextStyle = (theme: any) => {
  const style: React.CSSProperties = { color: theme.textColor };
  if (theme.textShadow) style.textShadow = '0 2px 8px rgba(0,0,0,0.5)';
  return style;
};

const getFontFamilyCss = (fontFamily?: string) => {
  if (!fontFamily) return undefined;
  const found = FONT_OPTIONS.find(f => f.value === fontFamily);
  return found?.css;
};

// ===== Load Google Fonts dynamically =====
const loadGoogleFont = (fontFamily?: string) => {
  if (!fontFamily || fontFamily === 'inter') return;
  const found = FONT_OPTIONS.find(f => f.value === fontFamily);
  if (!found) return;
  const fontName = found.label.replace(/\s/g, '+');
  const linkId = `gfont-${fontFamily}`;
  if (document.getElementById(linkId)) return;
  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
};

const FormRunner = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: formData, isLoading } = useFormBySlug(slug);
  const submitResponse = useSubmitFormResponse();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [direction, setDirection] = useState(1);
  const [completed, setCompleted] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [textValue, setTextValue] = useState("");
  const [validationError, setValidationError] = useState("");
  const [phoneCountry, setPhoneCountry] = useState("+55");
  const [phoneDDD, setPhoneDDD] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [earlySaved, setEarlySaved] = useState(false);
  const [earlyResponseId, setEarlyResponseId] = useState<string | null>(null);
  const [earlySaving, setEarlySaving] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("");

  const form = formData;
  const questions = (form?.questions || []) as any[];
  const currentQuestion = questions[currentIndex];
  const rawProgress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const progress = Math.min(15 + rawProgress * 0.85, 100);
  const isLastQuestion = currentIndex === questions.length - 1;
  const theme = (form?.theme || { bgColor: "#fff", textColor: "#171717", buttonColor: "#4285f4" }) as any;
  const fieldMappings = (form?.field_mappings || []) as any[];
  const btnStyle = getButtonStyle(theme);
  const txtStyle = getTextStyle(theme);
  const fontClass = getFontSizeClass(theme.fontSize);
  const btnSizeClass = getButtonSizeClass(theme.buttonSize);
  const progressColor = theme.progressBarColor || theme.buttonColor;
  const overlayOpacity = theme.imageBrightness != null ? (100 - theme.imageBrightness) / 100 : 0.2;
  const fontCss = getFontFamilyCss(theme.fontFamily);

  const welcomeScreen = (form as any)?.welcome_screen;
  const hasWelcome = welcomeScreen?.enabled && showWelcome;

  const buildMappedData = useCallback((currentAnswers: Record<string, string | string[]>) => {
    const mappedData: Record<string, string> = {};
    fieldMappings.forEach((m: any) => {
      const val = currentAnswers[m.questionId];
      if (val) mappedData[m.target] = typeof val === "string" ? val : (val as string[]).join(", ");
    });
    return mappedData;
  }, [fieldMappings]);

  const buildFinalAnswers = useCallback((currentAnswers: Record<string, string | string[]>) => {
    return questions.map(q => ({ questionId: q.id, value: currentAnswers[q.id] || "" }));
  }, [questions]);

  const attemptEarlySave = useCallback(async (currentAnswers: Record<string, string | string[]>) => {
    if (earlySaved || earlySaving || !form) return;

    const mappedData = buildMappedData(currentAnswers);
    const hasNome = !!(mappedData.nome && mappedData.nome.trim());
    const hasTelefone = !!(mappedData.telefone && mappedData.telefone.trim());

    if (!hasNome || !hasTelefone) return;

    setEarlySaving(true);
    setSaveState("saving");
    setSaveMessage("Salvando lead...");

    try {
      const leadQual = (form as any).lead_qualification || null;
      const partialAnswers = buildFinalAnswers(currentAnswers);

      const data: any = await submitResponse.mutateAsync({
        form_id: form.id,
        account_id: form.account_id,
        answers: partialAnswers,
        mapped_data: mappedData,
        metadata: {
          user_agent: navigator.userAgent,
          submitted_at: new Date().toISOString(),
          early_save: true,
          capture_status: "partial",
        },
        lead_qualification: leadQual,
      });

      setEarlySaved(true);
      setEarlyResponseId(data?.id || null);
      setSaveState("saved");
      setSaveMessage("Lead salvo no pipeline");
    } catch (error: any) {
      console.error("Erro no early save:", error);
      setEarlySaved(false);
      setEarlyResponseId(null);
      setSaveState("error");
      setSaveMessage(error?.message || "Erro ao salvar lead");
    } finally {
      setEarlySaving(false);
    }
  }, [earlySaved, earlySaving, form, buildMappedData, buildFinalAnswers, submitResponse]);

  const submitFinalResponse = useCallback(async (currentAnswers: Record<string, string | string[]>) => {
    if (!form) {
      setCompleted(true);
      return;
    }

    const mappedData = buildMappedData(currentAnswers);
    const finalAnswers = buildFinalAnswers(currentAnswers);

    setSaveState("saving");
    setSaveMessage("Finalizando envio...");

    try {
      if (earlySaved && earlyResponseId) {
        const { error } = await supabase
          .from("form_responses")
          .update({
            answers: finalAnswers as any,
            mapped_data: mappedData as any,
            metadata: {
              user_agent: navigator.userAgent,
              submitted_at: new Date().toISOString(),
              updated: true,
              capture_status: "completed",
            } as any,
          } as any)
          .eq("id", earlyResponseId);

        if (error) throw error;
      } else {
        const leadQual = (form as any).lead_qualification || null;
        await submitResponse.mutateAsync({
          form_id: form.id,
          account_id: form.account_id,
          answers: finalAnswers,
          mapped_data: mappedData,
          metadata: {
            user_agent: navigator.userAgent,
            submitted_at: new Date().toISOString(),
            capture_status: "completed",
          },
          lead_qualification: leadQual,
        });
      }

      setSaveState("saved");
      setSaveMessage("Formulário salvo com sucesso");
      setCompleted(true);
    } catch (error: any) {
      console.error("Erro ao finalizar envio:", error);
      setSaveState("error");
      setSaveMessage(error?.message || "Erro ao finalizar envio");
    }
  }, [form, buildMappedData, buildFinalAnswers, earlySaved, earlyResponseId, submitResponse]);

  // Dynamic theme-color meta tag based on form button color
  useEffect(() => {
    const themeColor = theme.bgColor || theme.buttonColor;
    let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = themeColor;
    return () => { meta.content = theme.bgColor || '#000000'; };
  }, [theme.bgColor, theme.buttonColor]);

  // Load Google Font
  useEffect(() => {
    loadGoogleFont(theme.fontFamily);
  }, [theme.fontFamily]);

  useEffect(() => {
    if (slug) {
      (supabase.rpc as any)("increment_form_views", { form_slug: slug }).then(() => {});
    }
  }, [slug]);

  const validateInput = useCallback((type: string, value: string): string => {
    if (!value.trim()) return "";
    switch (type) {
      case "EMAIL": { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "" : "E-mail inválido"; }
      case "PHONE": { return value.replace(/\D/g, '').length >= 10 ? "" : "Telefone inválido"; }
      case "NUMBER": { return !isNaN(Number(value)) ? "" : "Número inválido"; }
      case "DATE": { return /^\d{2}\/\d{2}\/\d{4}$/.test(value) ? "" : "Formato: dd/mm/aaaa"; }
      default: return "";
    }
  }, []);

  const isPhoneQuestion = useCallback((q: any) => {
    if (q?.type === "PHONE") return true;
    const mapping = fieldMappings.find((m: any) => m.questionId === q?.id);
    return mapping?.target === "telefone";
  }, [fieldMappings]);

  const VALID_DDDS = new Set([
    "11","12","13","14","15","16","17","18","19",
    "21","22","24","27","28",
    "31","32","33","34","35","37","38",
    "41","42","43","44","45","46",
    "47","48","49",
    "51","53","54","55",
    "61","62","63","64","65","66","67","68","69",
    "71","73","74","75","77","79",
    "81","82","83","84","85","86","87","88","89",
    "91","92","93","94","95","96","97","98","99"
  ]);

  const formatPhoneDisplay = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length <= 4) return digits;
    if (digits.length <= 8) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  };

  const handlePhoneNumberChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 9);
    setPhoneNumber(digits);
    setValidationError("");
  };

  const getPhoneValue = () => `${phoneCountry} ${phoneDDD} ${phoneNumber}`.trim();

  const goNext = useCallback(async () => {
    if (!currentQuestion) return;

    const isPhone = isPhoneQuestion(currentQuestion);
    const isText = !isPhone && ["SHORT_TEXT", "LONG_TEXT", "NUMBER", "EMAIL", "DATE"].includes(currentQuestion.type);

    let updatedAnswers = { ...answers };

    if (isPhone) {
      const fullPhone = getPhoneValue();
      if (currentQuestion.required && (!phoneDDD || !phoneNumber)) { setValidationError("Campo obrigatório"); return; }
      if (phoneDDD && !VALID_DDDS.has(phoneDDD)) { setValidationError("DDD inválido"); return; }
      if (phoneNumber.length < 8) { setValidationError("Número incompleto"); return; }
      const error = validateInput("PHONE", fullPhone);
      if (error) { setValidationError(error); return; }
      updatedAnswers[currentQuestion.id] = fullPhone;
      setAnswers(updatedAnswers);
    } else if (isText) {
      if (currentQuestion.required && !textValue.trim()) { setValidationError("Campo obrigatório"); return; }
      const error = validateInput(currentQuestion.type, textValue);
      if (error) { setValidationError(error); return; }
      updatedAnswers[currentQuestion.id] = textValue;
      setAnswers(updatedAnswers);
    }

    void attemptEarlySave(updatedAnswers);

    if (isLastQuestion) {
      await submitFinalResponse(updatedAnswers);
      return;
    }

    setDirection(1);
    setCurrentIndex(prev => prev + 1);
    setTextValue("");
    setPhoneDDD("");
    setPhoneNumber("");
    setValidationError("");
  }, [
    currentQuestion,
    isLastQuestion,
    textValue,
    phoneDDD,
    phoneNumber,
    answers,
    attemptEarlySave,
    submitFinalResponse,
    validateInput,
    isPhoneQuestion,
  ]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(prev => prev - 1);
      setTextValue(""); setPhoneDDD(""); setPhoneNumber(""); setValidationError("");
    }
  }, [currentIndex]);

  useEffect(() => {
    if (currentQuestion) {
      if (currentQuestion.type === "PHONE") {
        const saved = answers[currentQuestion.id];
        if (typeof saved === "string" && saved) {
          const parts = saved.split(' ');
          setPhoneCountry(parts[0] || "+55");
          setPhoneDDD(parts[1] || "");
          setPhoneNumber(parts.slice(2).join(' ') || "");
        }
      } else if (["SHORT_TEXT", "LONG_TEXT", "NUMBER", "EMAIL", "DATE"].includes(currentQuestion.type)) {
        const saved = answers[currentQuestion.id];
        setTextValue(typeof saved === "string" ? saved : "");
      }
    }
  }, [currentIndex, currentQuestion, answers]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void goNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext]);

  const toggleChoice = useCallback((questionId: string, option: string, isMultiple: boolean) => {
    const updatedAnswers = { ...answers };

    if (isMultiple) {
      const current = (updatedAnswers[questionId] as string[]) || [];
      updatedAnswers[questionId] = current.includes(option)
        ? current.filter(o => o !== option)
        : [...current, option];
      setAnswers(updatedAnswers);
      void attemptEarlySave(updatedAnswers);
      return;
    }

    updatedAnswers[questionId] = option;
    setAnswers(updatedAnswers);
    void attemptEarlySave(updatedAnswers);

    setTimeout(() => {
      setDirection(1);
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setTextValue("");
      } else {
        void submitFinalResponse(updatedAnswers);
      }
    }, 300);
  }, [currentIndex, answers, questions.length, attemptEarlySave, submitFinalResponse]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  if (!form || questions.length === 0) return (
    <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground text-[14px]">Formulário não encontrado</p></div>
  );

  const containerFontStyle: React.CSSProperties = fontCss ? { fontFamily: fontCss } : {};

  // ===== WELCOME SCREEN =====
  if (hasWelcome) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ backgroundColor: theme.bgColor, backgroundImage: form.background_image ? `url(${form.background_image})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', ...containerFontStyle }}>
        {form.background_image && <div className="fixed inset-0 z-0" style={{ backgroundColor: `rgba(0,0,0,${overlayOpacity})` }} />}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-lg relative z-10 space-y-6">
          {welcomeScreen.imageUrl && <img src={welcomeScreen.imageUrl} alt="" className="max-h-48 mx-auto rounded-2xl object-cover" />}
          {form.logo && (form.logo as any).url && <img src={(form.logo as any).url} alt="Logo" className="h-10 mx-auto" />}
          <h1 className={cn("font-bold leading-tight", fontClass)} style={txtStyle}>{renderBoldText(welcomeScreen.title || form.title)}</h1>
          {welcomeScreen.description && <p className="text-[15px] opacity-70" style={txtStyle}>{renderBoldText(welcomeScreen.description)}</p>}
          <button onClick={() => setShowWelcome(false)} className={cn("rounded-xl font-medium hover:opacity-90 transition-all", btnSizeClass)} style={btnStyle}>
            {welcomeScreen.buttonText || "Começar"}
          </button>
        </motion.div>
      </div>
    );
  }

  // ===== THANK YOU SCREEN =====
  if (completed) {
    const ts = form.thank_you_screen as any;
    const tyBg = ts?.backgroundImage || form.background_image;
    const tyLogo = ts?.logoUrl || (form.logo && (form.logo as any).url);
    const endingFontClass = getFontSizeClass(ts?.fontSize);
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: theme.bgColor, backgroundImage: tyBg ? `url(${tyBg})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', ...containerFontStyle }}>
        {tyBg && <div className="fixed inset-0" style={{ backgroundColor: `rgba(0,0,0,${overlayOpacity})` }} />}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-lg relative z-10">
          {tyLogo && <img src={tyLogo} alt="Logo" className="h-12 mx-auto mb-8" />}
          <h1 className={cn("font-bold mb-4", endingFontClass)} style={txtStyle}>{renderBoldText(ts?.text || "Obrigado!")}</h1>
          {ts?.videoUrl && <div className="aspect-video rounded-2xl overflow-hidden mb-6"><iframe src={ts.videoUrl} className="w-full h-full" allowFullScreen /></div>}
          {ts?.ctaText && <button className={cn("rounded-xl font-medium hover:opacity-90 transition-opacity", btnSizeClass)} style={btnStyle} onClick={() => { if (ts?.redirectUrl) window.location.href = ts.redirectUrl; }}>{ts.ctaText}</button>}
        </motion.div>
      </div>
    );
  }

  if (!currentQuestion) return null;
  const isChoice = currentQuestion.type === "SINGLE_CHOICE" || currentQuestion.type === "MULTIPLE_CHOICE";
  const isMultiple = currentQuestion.type === "MULTIPLE_CHOICE";
  const isPhone = isPhoneQuestion(currentQuestion);
  const isText = !isPhone && ["SHORT_TEXT", "LONG_TEXT", "NUMBER", "EMAIL", "DATE"].includes(currentQuestion.type);
  const selectedChoices = isMultiple ? (answers[currentQuestion.id] as string[] || []) : [];
  const selectedSingle = !isMultiple ? (answers[currentQuestion.id] as string || "") : "";

  const inputType: Record<string, string> = { SHORT_TEXT: "text", LONG_TEXT: "text", NUMBER: "number", EMAIL: "email", DATE: "text" };
  const inputPlaceholder: Record<string, string> = { SHORT_TEXT: "Digite sua resposta...", LONG_TEXT: "Digite sua resposta...", NUMBER: "0", EMAIL: "email@exemplo.com", DATE: "dd/mm/aaaa" };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: theme.bgColor, backgroundImage: form.background_image ? `url(${form.background_image})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', ...containerFontStyle }}>
      {form.background_image && <div className="fixed inset-0 z-0" style={{ backgroundColor: `rgba(0,0,0,${overlayOpacity})` }} />}
      
      {/* Progress bar - always visible, safe area aware */}
      <div className="fixed top-0 left-0 right-0 h-1.5 z-50" style={{ backgroundColor: `${progressColor}20` }}>
        <motion.div className="h-full rounded-r-full" style={{ backgroundColor: progressColor }} animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
      </div>

      {saveState !== "idle" && (
        <div className="fixed top-3 right-3 z-50">
          <div
            className={cn(
              "rounded-full border px-3 py-1 text-[11px] font-medium backdrop-blur-sm",
              saveState === "saving" && "bg-muted/90 text-foreground border-border",
              saveState === "saved" && "bg-primary/10 text-primary border-primary/20",
              saveState === "error" && "bg-destructive/10 text-destructive border-destructive/20"
            )}
          >
            {saveState === "saving" ? "Salvando..." : saveState === "saved" ? "Salvo" : "Erro"}
            {saveMessage ? ` · ${saveMessage}` : ""}
          </div>
        </div>
      )}

      {form.logo && (form.logo as any).url && (
        <div className={cn("fixed z-40", (form.logo as any).position === 'bottom' ? "bottom-4 left-1/2 -translate-x-1/2" : "top-4 left-6")}>
          <img src={(form.logo as any).url} alt="Logo" className="h-8" />
        </div>
      )}

      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-xl">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div key={currentQuestion.id} custom={direction} initial={{ opacity: 0, y: direction > 0 ? 40 : -40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: direction > 0 ? -40 : 40 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
              <p className="text-[13px] font-medium mb-3 opacity-50" style={txtStyle}>{currentIndex + 1} → {questions.length}</p>
              <h2 className={cn("font-bold mb-2 leading-tight", fontClass)} style={txtStyle}>{renderBoldText(currentQuestion.title || "Sem título")}</h2>
              {currentQuestion.description && <p className="text-[14px] opacity-60 mb-6" style={txtStyle}>{renderBoldText(currentQuestion.description)}</p>}

              {/* Phone input */}
              {isPhone && (
                <div className="mt-6">
                  <div className="flex gap-3 items-end">
                    <div className="w-[72px] shrink-0">
                      <label className="text-[10px] uppercase tracking-wider block mb-1.5" style={{ color: theme.textColor, opacity: 0.5 }}>País</label>
                      <input value={phoneCountry} readOnly className="w-full bg-transparent border-b-2 outline-none py-2 text-lg font-medium transition-colors text-center cursor-default" style={{ color: theme.textColor, borderColor: theme.textColor + '33', opacity: 0.7 }} />
                    </div>
                    <div className="w-[64px] shrink-0">
                      <label className="text-[10px] uppercase tracking-wider block mb-1.5" style={{ color: theme.textColor, opacity: 0.5 }}>DDD</label>
                      <input value={phoneDDD} onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 2); setPhoneDDD(v); setValidationError(""); if (v.length === 2) { const numInput = document.getElementById('phone-number-input'); numInput?.focus(); } }} className="w-full bg-transparent border-b-2 outline-none py-2 text-lg font-medium transition-colors text-center" placeholder="11" maxLength={2} inputMode="numeric" style={{ color: theme.textColor, borderColor: theme.textColor + '33' }} onFocus={e => e.target.style.borderColor = theme.textColor + '99'} onBlur={e => e.target.style.borderColor = theme.textColor + '33'} autoFocus />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] uppercase tracking-wider block mb-1.5" style={{ color: theme.textColor, opacity: 0.5 }}>Número</label>
                      <input id="phone-number-input" value={formatPhoneDisplay(phoneNumber)} onChange={e => handlePhoneNumberChange(e.target.value)} className="w-full bg-transparent border-b-2 outline-none py-2 text-lg font-medium transition-colors" placeholder="99999-9999" maxLength={10} inputMode="numeric" style={{ color: theme.textColor, borderColor: theme.textColor + '33' }} onFocus={e => e.target.style.borderColor = theme.textColor + '99'} onBlur={e => e.target.style.borderColor = theme.textColor + '33'} />
                    </div>
                  </div>
                  {validationError && <p className="text-red-400 text-[12px] mt-1.5">{validationError}</p>}
                  <div className="flex items-center gap-3 mt-4">
                    <button onClick={goNext} className={cn("flex items-center gap-2 rounded-xl font-medium hover:opacity-90 transition-opacity", btnSizeClass)} style={btnStyle}>OK <Check className="w-4 h-4" /></button>
                    <span className="text-[11px] opacity-40" style={txtStyle}>Enter ↵</span>
                  </div>
                </div>
              )}

              {isText && currentQuestion.type !== "LONG_TEXT" && (
                <div className="mt-6">
                   <input
                    type={inputType[currentQuestion.type] || "text"}
                    value={textValue}
                    onChange={e => { setTextValue(e.target.value); setValidationError(""); }}
                    className="w-full bg-transparent border-b-2 outline-none py-3 text-xl font-medium transition-colors"
                    placeholder={inputPlaceholder[currentQuestion.type] || "Digite sua resposta..."}
                    autoFocus
                    style={{ color: theme.textColor, borderColor: theme.textColor + '33', '--tw-placeholder-opacity': '0.3' } as any}
                    onFocus={e => e.target.style.borderColor = theme.textColor + '99'}
                    onBlur={e => e.target.style.borderColor = theme.textColor + '33'}
                  />
                  {validationError && <p className="text-red-400 text-[12px] mt-1.5">{validationError}</p>}
                  <div className="flex items-center gap-3 mt-4">
                    <button onClick={goNext} className={cn("flex items-center gap-2 rounded-xl font-medium hover:opacity-90 transition-opacity", btnSizeClass)} style={btnStyle}>OK <Check className="w-4 h-4" /></button>
                    <span className="text-[11px] opacity-40" style={txtStyle}>Enter ↵</span>
                  </div>
                </div>
              )}

              {currentQuestion.type === "LONG_TEXT" && (
                <div className="mt-6">
                  <textarea value={textValue} onChange={e => { setTextValue(e.target.value); setValidationError(""); }} className="w-full bg-transparent border-b-2 outline-none py-3 text-lg font-medium transition-colors resize-none" placeholder="Digite sua resposta..." rows={3} autoFocus style={{ color: theme.textColor, borderColor: theme.textColor + '33' }} onFocus={e => e.target.style.borderColor = theme.textColor + '99'} onBlur={e => e.target.style.borderColor = theme.textColor + '33'} />
                  {validationError && <p className="text-red-400 text-[12px] mt-1.5">{validationError}</p>}
                  <div className="flex items-center gap-3 mt-4">
                    <button onClick={goNext} className={cn("flex items-center gap-2 rounded-xl font-medium hover:opacity-90 transition-opacity", btnSizeClass)} style={btnStyle}>OK <Check className="w-4 h-4" /></button>
                  </div>
                </div>
              )}

              {isChoice && (
                <div className="mt-6 space-y-2.5">
                  {currentQuestion.options.map((opt: string, i: number) => {
                    const letter = String.fromCharCode(65 + i);
                    const isSelected = isMultiple ? selectedChoices.includes(opt) : selectedSingle === opt;
                    return (
                      <button key={i} onClick={() => toggleChoice(currentQuestion.id, opt, isMultiple)} className="w-full flex items-center gap-3 px-5 py-3.5 rounded-xl border-2 text-left transition-all text-[14px] font-medium" style={{ 
                        borderColor: isSelected ? (theme.buttonBorderColor || theme.buttonColor) : `${theme.textColor}15`, 
                        backgroundColor: isSelected ? `${theme.buttonColor}10` : (theme.optionBgColor || 'transparent'), 
                        ...(theme.textShadow ? { textShadow: '0 2px 8px rgba(0,0,0,0.5)' } : {}), 
                        color: theme.textColor 
                      }}>
                        <span className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold border" style={{ borderColor: isSelected ? (theme.buttonBorderColor || theme.buttonColor) : `${theme.textColor}30`, backgroundColor: isSelected ? theme.buttonColor : 'transparent', color: isSelected ? '#fff' : theme.textColor }}>{isSelected ? <Check className="w-3.5 h-3.5" /> : letter}</span>
                        <span>{renderBoldText(opt)}</span>
                      </button>
                    );
                  })}
                  {isMultiple && selectedChoices.length > 0 && (
                    <div className="mt-4"><button onClick={goNext} className={cn("flex items-center gap-2 rounded-xl font-medium hover:opacity-90 transition-opacity", btnSizeClass)} style={btnStyle}>OK <Check className="w-4 h-4" /></button></div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="fixed bottom-6 right-6 flex items-center gap-2 z-20">
        {currentIndex > 0 && <button onClick={goPrev} className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors" style={{ border: `1px solid ${theme.textColor}20` }}><ChevronDown className="w-5 h-5 rotate-180" style={{ color: theme.textColor }} /></button>}
        <button onClick={goNext} className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors" style={{ border: `1px solid ${theme.textColor}20` }}><ChevronDown className="w-5 h-5" style={{ color: theme.textColor }} /></button>
      </div>
    </div>
  );
};

export default FormRunner;
