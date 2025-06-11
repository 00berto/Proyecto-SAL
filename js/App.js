// js/App.js
class App {
  constructor() {
    this.excelProcessor = new ExcelProcessor();
    this.summaryTableGenerator = new SummaryTableGenerator("tableContainer");
    this.tableRenderer = new TableRenderer(
      "tableContainer",
      this.summaryTableGenerator,
      7
    ); // 7 es BASE_CALC_COL_INDEX
    this.salTableManager = new SalTableManager(
      "tableContainer",
      this.summaryTableGenerator
    );
    this.pdfGenerator = new PdfGenerator(); // Asegúrate de que PdfGenerator esté disponible globalmente o importado

    this.fileInput = document.getElementById("fileInput");
    this.fileNameTitle = document.getElementById("fileNameTitle");
    this.printPdfBtn = document.getElementById("printPdfBtn");
    this.tablaSalBtn = document.getElementById("tabla-sal");
    this.salTablesSelectionDiv = document.getElementById("salTablesSelection");

    this._addEventListeners();
  }

  _addEventListeners() {
    this.fileInput.addEventListener(
      "change",
      this._handleFileInputChange.bind(this)
    );
    this.tablaSalBtn.addEventListener(
      "click",
      this._handleCreateSalTable.bind(this)
    );
    this.printPdfBtn.addEventListener("click", this._handlePrintPdf.bind(this));
  }

  async _handleFileInputChange(e) {
    const file = e.target.files[0];
    this.fileNameTitle.textContent = "";
    this.printPdfBtn.style.display = "none";
    this.tablaSalBtn.style.display = "none";
    this.salTablesSelectionDiv.style.display = "none"; // Ocultar al cargar nuevo archivo

    // Resetear todos los componentes que gestionan tablas/datos anteriores
    this.tableRenderer.allTablesSalTotals = []; // Limpiar los totales de las tablas originales
    this.summaryTableGenerator.reset(); // Limpiar la tabla de resumen
    this.salTableManager.reset(); // Limpiar tablas SAL y checkboxes

    if (!file) {
      return;
    }

    this.fileNameTitle.textContent = `Archivo cargado: ${file.name}`;
    try {
      const { headers, data } = await this.excelProcessor.processFile(file);

      // Validar si la columna BASE_CALC_COL_INDEX existe
      const BASE_CALC_COL_INDEX = 7; // Definida aquí o pasada como una constante global
      if (headers.length <= BASE_CALC_COL_INDEX) {
        alert(
          `Error: La columna base para cálculo (índice ${BASE_CALC_COL_INDEX} - "${
            headers[BASE_CALC_COL_INDEX] || "N/A"
          }") no existe o está fuera de rango en el archivo Excel.`
        );
        return;
      }

      this.tableRenderer.renderTables(data, headers);
      this.printPdfBtn.style.display = "block";
      this.tablaSalBtn.style.display = "block";
    } catch (error) {
      alert(`Error al procesar el archivo: ${error.message}`);
      console.error("Error al procesar el archivo:", error);
      this.fileNameTitle.textContent = `Error al cargar archivo: ${file.name}`;
    }
  }

  _handleCreateSalTable() {
    this.salTableManager.createSalCopyTable();
  }

  _handlePrintPdf() {
    const originalTables = Array.from(
      document.querySelectorAll("#tableContainer .original-table-wrapper")
    );
    const selectedSalTableIds = this.salTableManager.getSelectedSalTableIds();
    const selectedSalTables = selectedSalTableIds
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    // Combinar todas las tablas a imprimir: primero las originales, luego las SAL seleccionadas
    const tablesToPrint = [...originalTables, ...selectedSalTables];

    if (tablesToPrint.length === 0) {
      alert(
        "No hay tablas seleccionadas para imprimir. Carga un archivo Excel y/o crea/selecciona tablas SAL."
      );
      return;
    }

    // Obtener las cabeceras de la primera tabla original para la configuración de columnas del PDF
    // (Esto asume que el PDF necesita conocer las columnas por índice de la tabla original,
    // tu PdfGenerator podría necesitar ser más inteligente para manejar diferentes tipos de tablas)
    const firstOriginalTableElement = document.querySelector(
      "#tableContainer .original-table-wrapper table"
    );
    let columnsToInclude = [];
    if (firstOriginalTableElement) {
      const firstTableHtmlHeaders = Array.from(
        firstOriginalTableElement.querySelectorAll("thead th")
      ).map((th) => th.textContent.trim());

      // Columnas originales fijas hasta la 7
      columnsToInclude = [0, 1, 2, 3, 4, 5, 6, 7];

      const salPercentIndex = firstTableHtmlHeaders.indexOf("SAL %");
      const importoSalIndex = firstTableHtmlHeaders.indexOf("Importo SAL");
      const finirePercentIndex = firstTableHtmlHeaders.indexOf("A FINIRE %");
      const finireImportoIndex =
        firstTableHtmlHeaders.indexOf("Importo A FINIRE");

      if (salPercentIndex !== -1) columnsToInclude.push(salPercentIndex);
      if (importoSalIndex !== -1) columnsToInclude.push(importoSalIndex);
      if (finirePercentIndex !== -1) columnsToInclude.push(finirePercentIndex);
      if (finireImportoIndex !== -1) columnsToInclude.push(finireImportoIndex);
    }

    this.pdfGenerator.generatePdf(
      tablesToPrint,
      columnsToInclude,
      "Reporte_Completo_SAL.pdf"
    );
  }
}
