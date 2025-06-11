// js/ExcelProcessor.js
class ExcelProcessor {
  /**
   * Procesa un archivo Excel y devuelve las cabeceras y los datos de las filas.
   * @param {File} file - El archivo Excel a procesar.
   * @returns {Promise<{headers: string[], data: Array<Array<any>>}>} Una promesa que resuelve con las cabeceras y los datos.
   */
  async processFile(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error("No se ha seleccionado ningún archivo."));
        return;
      }

      const reader = new FileReader();

      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
          header: 1,
        });
        const json = worksheet;

        const isCellEmpty = (cell) =>
          cell === undefined || cell === null || String(cell).trim() === "";

        // Filtrar filas completamente vacías
        const filteredJson = json.filter((row) =>
          row.some((cell) => !isCellEmpty(cell))
        );

        if (filteredJson.length === 0) {
          reject(
            new Error(
              "El archivo Excel está vacío o no contiene datos válidos."
            )
          );
          return;
        }

        const headers = filteredJson[0].map((header) =>
          header === undefined ? "" : String(header).trim()
        );
        const rows = filteredJson.slice(1);

        resolve({ headers, data: rows });
      };

      reader.onerror = (error) => {
        reject(new Error(`Error al leer el archivo: ${error.message}`));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Función auxiliar para limpiar un string formateado con separadores de miles y decimales
   * y convertirlo a un número válido para cálculos.
   * Asume el formato 'it-IT' (apóstrofo para miles, coma para decimales).
   * @param {string} str - La cadena de texto numérica formateada.
   * @returns {number} El número parseado o 0 si no es válido.
   */
  static parseFormattedNumber(str) {
    if (typeof str !== "string" || !str) {
      return 0;
    }
    const cleanedStr = str
      .replace(/\./g, "")
      .replace(/'/g, "")
      .replace(",", ".");
    return parseFloat(cleanedStr) || 0;
  }
}
