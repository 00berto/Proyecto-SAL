// js/App.js

class App {
  constructor() {
    console.log("App.js: Constructor App llamado.");

    this.fileInput = document.getElementById("fileInput");
    this.fileNameTitle = document.getElementById("fileNameTitle");
    this.printPdfBtn = document.getElementById("printPdfBtn");
    this.tablaSalBtn = document.getElementById("tablaSalBtn");
    this.deleteSalBtn = document.getElementById("deleteSalBtn");
    this.exportDataBtn = document.getElementById("exportDataBtn");

    this.tableContainer = document.getElementById("tableContainer");
    this.salCopiesContainer = document.getElementById("salCopiesContainer");
    this.salTablesSelectionDiv = document.getElementById("salTablesSelection");
    this.salTablesCheckboxes = document.getElementById("salTablesCheckboxes");

    this.excelProcessor = new ExcelProcessor();
    this.summaryTableGenerator = new SummaryTableGenerator("tableContainer");

    this.tableRenderer = new TableRenderer(
      "tableContainer",
      this.summaryTableGenerator,
      7 // BASE_CALC_COL_INDEX
    );

    this.salTableManager = new SalTableManager(
      "salCopiesContainer",
      this.summaryTableGenerator,
      this.salTablesCheckboxes,
      this.salTablesSelectionDiv
    );

    this.printPdfBtn.style.display = "none";
    this.tablaSalBtn.style.display = "none";
    this.deleteSalBtn.style.display = "none";
    this.salTablesSelectionDiv.style.display = "none";
    
    if (this.exportDataBtn) {
        this.exportDataBtn.style.display = "none";
    }

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
    this.deleteSalBtn.addEventListener(
      "click",
      this._handleDeleteSalTable.bind(this)
    );
    
    if (this.exportDataBtn) {
        this.exportDataBtn.addEventListener(
            "click",
            this._handleExportData.bind(this)
        );
    }
  }

  async _handleFileInputChange(e) {
    const file = e.target.files[0];
    this.fileNameTitle.textContent = "";
    this.printPdfBtn.style.display = "none";
    this.tablaSalBtn.style.display = "none";
    this.deleteSalBtn.style.display = "none";
    this.salTablesSelectionDiv.style.display = "none";
    if (this.exportDataBtn) {
        this.exportDataBtn.style.display = "none";
    }

    this.tableRenderer.allTablesSalTotals = [];
    this.summaryTableGenerator.reset();
    this.salTableManager.reset();

    this.tableContainer.innerHTML = "";
    this.salCopiesContainer.innerHTML = "";

    if (!file) {
      return;
    }

    this.fileNameTitle.textContent = `Archivo cargado: ${file.name}`;
    try {
      const { headers, data } = await this.excelProcessor.processFile(file);

      const BASE_CALC_COL_INDEX = 7;
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
    this.deleteSalBtn.style.display = "block";
    if (this.exportDataBtn) {
        this.exportDataBtn.style.display = "block";
    }
  }

  _handleDeleteSalTable() {
    this.salTableManager.deleteLastSalTable();
    if (this.salTableManager.salTableCounter === 0) {
      this.deleteSalBtn.style.display = "none";
      if (this.exportDataBtn) {
          this.exportDataBtn.style.display = "none";
      }
    }
  }

  _handlePrintPdf() {
    const originalTables = Array.from(
      document.querySelectorAll("#tableContainer .original-table-wrapper")
    );
    const selectedSalTableIds = this.salTableManager.getSelectedSalTableIds();
    const selectedSalTables = selectedSalTableIds
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    const tablesToPrint = [...originalTables, ...selectedSalTables];

    if (tablesToPrint.length === 0) {
      alert(
        "No hay tablas seleccionadas para imprimir. Carga un archivo Excel y/o crea/selecciona tablas SAL."
      );
      return;
    }

    PdfGenerator.generatePdf(
      tablesToPrint,
      "Reporte_Completo_SAL.pdf"
    );
  }

  _handleExportData() {
      const salData = this.salTableManager.getExportableSalData();

      if (salData) {
          try {
              localStorage.setItem("salExportData", JSON.stringify(salData));
              alert("¡Datos SAL exportados correctamente y guardados!");
          } catch (error) {
              console.error("Error al guardar en localStorage:", error);
              alert("Error al guardar los datos exportados.");
          }
      } else {
          alert("No hay datos SAL para exportar.");
      }
  }
}