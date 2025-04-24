import e from "express";

function normalizarData(dataString: string): string {
  if (dataString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dataString;
  }
  
  const data = new Date(dataString);
  
  const dataAjustada = new Date(data.getTime() - 3 * 60 * 60 * 1000);

  return `${dataAjustada.getFullYear()}-${String(dataAjustada.getMonth() + 1).padStart(2, '0')}-${String(dataAjustada.getDate()).padStart(2, '0')}`;
}

export default normalizarData;