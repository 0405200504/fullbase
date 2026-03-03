export const getDateRange = (periodo: string): { inicio: string; fim: string } => {
  const hoje = new Date();
  const fim = hoje.toISOString().split('T')[0];
  let inicio: Date;

  switch (periodo) {
    case "hoje":
      inicio = hoje;
      break;
    case "semana":
      inicio = new Date(hoje);
      inicio.setDate(hoje.getDate() - hoje.getDay());
      break;
    case "mes":
      inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      break;
    case "trimestre":
      inicio = new Date(hoje);
      inicio.setMonth(hoje.getMonth() - 3);
      break;
    default:
      inicio = new Date(hoje);
      inicio.setMonth(hoje.getMonth() - 1);
  }

  return {
    inicio: inicio.toISOString().split('T')[0],
    fim,
  };
};

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('pt-BR');
};
