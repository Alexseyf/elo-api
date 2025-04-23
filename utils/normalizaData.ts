import e from "express";

function normalizarData(dataString: string): string {
    const data = new Date(dataString);
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
  }

export default normalizarData;