/**
 * Sanitiza e formata número de telefone para uso no WhatsApp
 * Remove todos os caracteres não numéricos e adiciona código do Brasil (55)
 * 
 * @param telefone - Número de telefone no formato brasileiro
 * @returns URL do WhatsApp formatada ou null se inválido
 */
export const formatWhatsAppUrl = (telefone: string | null | undefined): string | null => {
  if (!telefone) return null;
  
  // Remove todos os caracteres não numéricos
  const numeroLimpo = telefone.replace(/\D/g, "");
  
  // Remove código do país se já estiver presente para evitar duplicação
  let numeroSemPais = numeroLimpo.startsWith("55") ? numeroLimpo.slice(2) : numeroLimpo;

  // Verifica se tem um número válido (DDD + número)
  if (numeroSemPais.length < 10) return null;
  
  // Garante que sempre usamos o formato 55{numero_sanitizado}
  const numeroComPais = `55${numeroSemPais}`;
  
  return `https://wa.me/${numeroComPais}`;
};
