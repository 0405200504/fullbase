export type QuestionType = 'SHORT_TEXT' | 'LONG_TEXT' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'NUMBER' | 'EMAIL' | 'PHONE' | 'DATE';

export type FieldMappingTarget = 
  | 'nome' | 'email' | 'telefone' | 'endereco' 
  | 'renda_mensal' | 'investimento_disponivel' | 'dificuldades'
  | 'fonte_trafego'
  | 'custom';

export interface FieldMapping {
  questionId: string;
  target: FieldMappingTarget;
  customLabel?: string;
}

export const FIELD_MAPPING_PRESETS: { value: FieldMappingTarget; label: string; description: string }[] = [
  { value: 'nome', label: 'Nome', description: 'Nome do lead no CRM' },
  { value: 'email', label: 'E-mail', description: 'E-mail de contato' },
  { value: 'telefone', label: 'Telefone', description: 'Telefone / WhatsApp' },
  { value: 'endereco', label: 'Endereço', description: 'Endereço / Localização' },
  { value: 'renda_mensal', label: 'Renda Mensal', description: 'Renda mensal do lead' },
  { value: 'investimento_disponivel', label: 'Investimento Disponível', description: 'Quanto pode investir' },
  { value: 'dificuldades', label: 'Dificuldades / Desafios', description: 'Principais dores' },
  { value: 'fonte_trafego', label: 'Fonte de Tráfego', description: 'Como conheceu' },
  { value: 'custom', label: 'Campo Personalizado', description: 'Campo customizado' },
];

export interface FormQuestion {
  id: string;
  type: QuestionType;
  title: string;
  description?: string;
  required: boolean;
  options: string[];
  optionRedirects?: Record<string, string>; // Maps option index as string to redirect URL
}

export type FormFontFamily = 'inter' | 'poppins' | 'montserrat' | 'playfair' | 'roboto' | 'raleway' | 'oswald' | 'lato' | 'dm-sans' | 'space-grotesk';

export const FONT_OPTIONS: { value: FormFontFamily; label: string; css: string }[] = [
  { value: 'inter', label: 'Inter', css: "'Inter', sans-serif" },
  { value: 'poppins', label: 'Poppins', css: "'Poppins', sans-serif" },
  { value: 'montserrat', label: 'Montserrat', css: "'Montserrat', sans-serif" },
  { value: 'playfair', label: 'Playfair Display', css: "'Playfair Display', serif" },
  { value: 'roboto', label: 'Roboto', css: "'Roboto', sans-serif" },
  { value: 'raleway', label: 'Raleway', css: "'Raleway', sans-serif" },
  { value: 'oswald', label: 'Oswald', css: "'Oswald', sans-serif" },
  { value: 'lato', label: 'Lato', css: "'Lato', sans-serif" },
  { value: 'dm-sans', label: 'DM Sans', css: "'DM Sans', sans-serif" },
  { value: 'space-grotesk', label: 'Space Grotesk', css: "'Space Grotesk', sans-serif" },
];

export interface FormTheme {
  bgColor: string;
  textColor: string;
  buttonColor: string;
  buttonBorderColor?: string;
  buttonShadow?: boolean;
  buttonOutline?: boolean;
  textShadow?: boolean;
  optionBgColor?: string;
  progressBarColor?: string;
  fontSize?: 'sm' | 'md' | 'lg';
  buttonSize?: 'sm' | 'md' | 'lg';
  imageBrightness?: number;
  fontFamily?: FormFontFamily;
}

export interface FormLogo {
  url: string;
  position: 'top' | 'left' | 'bottom';
}

export interface FormThankYouScreen {
  text: string;
  videoUrl?: string;
  redirectUrl?: string;
  ctaText?: string;
  backgroundImage?: string;
  logoUrl?: string;
  fontSize?: 'sm' | 'md' | 'lg';
}

// Lead qualification: which mapped fields are required to consider a respondent as a lead
export interface LeadQualification {
  enabled: boolean; // If false, always create lead
  requiredFields: FieldMappingTarget[]; // Which mapped fields must be present
  // New conditional logic fields
  conditionalRedirectEnabled?: boolean;
  conditionField?: FieldMappingTarget; // e.g. 'renda_mensal'
  conditionOperator?: 'greater_than' | 'less_than' | 'equal';
  conditionValue?: string; // numeric value as string
  successRedirectUrl?: string; // URL if condition met
}

export interface FormWelcomeScreen {
  enabled: boolean;
  title: string;
  description?: string;
  imageUrl?: string;
  buttonText: string;
}

export interface Form {
  id: string;
  slug: string;
  title: string;
  theme: FormTheme;
  logo?: FormLogo;
  backgroundImage?: string;
  questions: FormQuestion[];
  thankYouScreen: FormThankYouScreen;
  welcomeScreen: FormWelcomeScreen;
  fieldMappings: FieldMapping[];
  leadQualification: LeadQualification;
  webhookUrl?: string;
}

export interface FormAnswer {
  questionId: string;
  value: string | string[];
}