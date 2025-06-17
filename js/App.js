// js/App.js

class App {
  constructor() {
    console.log("App.js: Constructor App llamado.");

    // 1. Obtener todas las referencias a elementos del DOM PRIMERO
    this.fileInput = document.getElementById("fileInput");
    this.fileNameTitle = document.getElementById("fileNameTitle");
    this.printPdfBtn = document.getElementById("printPdfBtn");
    this.tablaSalBtn = document.getElementById("tablaSalBtn");
    this.deleteSalBtn = document.getElementById("deleteSalBtn"); // Referencia al botón de eliminar

    this.tableContainer = document.getElementById("tableContainer"); // Contenedor de tablas originales
    this.salCopiesContainer = document.getElementById("salCopiesContainer"); // Contenedor de tablas SAL
    this.salTablesSelectionDiv = document.getElementById("salTablesSelection"); // Div de checkboxes de selección
    this.salTablesCheckboxes = document.getElementById("salTablesCheckboxes"); // Contenedor de los checkboxes individuales

    // 2. Luego, inicializar los componentes pasando las referencias correctas
    this.excelProcessor = new ExcelProcessor();
    this.summaryTableGenerator = new SummaryTableGenerator("tableContainer");

    this.tableRenderer = new TableRenderer(
      "tableContainer",
      this.summaryTableGenerator,
      7 // BASE_CALC_COL_INDEX
    );

    this.salTableManager = new SalTableManager(
      "salCopiesContainer", // ID del contenedor para las tablas SAL
      this.summaryTableGenerator,
      this.salTablesCheckboxes,
      this.salTablesSelectionDiv
    );

    //this.pdfGenerator = new PdfGenerator(); // No necesita parámetros en el constructor por ahora

    // Ocultar elementos al inicio
    this.printPdfBtn.style.display = "none";
    this.tablaSalBtn.style.display = "none";
    this.deleteSalBtn.style.display = "none"; // Ocultar el botón de eliminar al inicio
    this.salTablesSelectionDiv.style.display = "none"; // Ocultar la sección de checkboxes

    this._addEventListeners();
  }

  /**
   * Configura todos los event listeners para los elementos interactivos de la UI.
   * @private
   */
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
    ); // Event listener para el botón de eliminar
  }

  /**
   * Maneja el cambio en la selección del archivo de Excel.
   * Carga y procesa el archivo, y renderiza las tablas originales.
   * @param {Event} e - El evento de cambio del input de archivo.
   * @private
   */
  async _handleFileInputChange(e) {
    const file = e.target.files[0];
    this.fileNameTitle.textContent = "";
    this.printPdfBtn.style.display = "none";
    this.tablaSalBtn.style.display = "none";
    this.deleteSalBtn.style.display = "none"; // Ocultar el botón de eliminar al cargar un nuevo archivo
    this.salTablesSelectionDiv.style.display = "none";

    // Resetear todos los componentes que gestionan tablas/datos anteriores
    this.tableRenderer.allTablesSalTotals = []; // Limpiar los totales de SAL de tablas previas
    this.summaryTableGenerator.reset(); // Reiniciar el generador de tabla resumen
    this.salTableManager.reset(); // Reiniciar el gestor de tablas SAL

    // Limpiar el contenido de los contenedores de tablas en el DOM
    this.tableContainer.innerHTML = "";
    this.salCopiesContainer.innerHTML = ""; // Limpiar el contenedor de tablas SAL

    if (!file) {
      return; // Si no hay archivo, salir
    }

    this.fileNameTitle.textContent = `Archivo cargado: ${file.name}`;
    try {
      const { headers, data } = await this.excelProcessor.processFile(file);

      const BASE_CALC_COL_INDEX = 7; // Índice de la columna base para cálculos (por ejemplo, 'COSTO')
      if (headers.length <= BASE_CALC_COL_INDEX) {
        alert(
          `Error: La columna base para cálculo (índice ${BASE_CALC_COL_INDEX} - "${
            headers[BASE_CALC_COL_INDEX] || "N/A"
          }") no existe o está fuera de rango en el archivo Excel.`
        );
        return;
      }

      this.tableRenderer.renderTables(data, headers); // Renderizar las tablas originales
      this.printPdfBtn.style.display = "block"; // Mostrar botón de imprimir PDF
      this.tablaSalBtn.style.display = "block"; // Mostrar botón de crear tabla SAL
      // El botón de eliminar se hará visible si se crea al menos una tabla SAL
    } catch (error) {
      alert(`Error al procesar el archivo: ${error.message}`);
      console.error("Error al procesar el archivo:", error);
      this.fileNameTitle.textContent = `Error al cargar archivo: ${file.name}`;
    }
  }

  /**
   * Maneja el clic en el botón para crear una nueva tabla SAL.
   * @private
   */
  _handleCreateSalTable() {
    this.salTableManager.createSalCopyTable(); // Crear una nueva tabla SAL
    this.deleteSalBtn.style.display = "block"; // Asegurarse de que el botón de eliminar sea visible
  }

  /**
   * Maneja el clic en el botón para eliminar la última tabla SAL creada.
   * @private
   */
  _handleDeleteSalTable() {
    this.salTableManager.deleteLastSalTable(); // Llama al método del manager para eliminar la última tabla
    // Ocultar el botón si no quedan tablas SAL después de la eliminación
    if (this.salTableManager.salTableCounter === 0) {
      this.deleteSalBtn.style.display = "none";
    }
  }

  /**
   * Maneja el clic en el botón para imprimir el PDF.
   * Recopila las tablas originales y las tablas SAL seleccionadas para la impresión.
   * @private
   */
  _handlePrintPdf() {
    // Obtener todos los wrappers de tablas originales
    const originalTables = Array.from(
      document.querySelectorAll("#tableContainer .original-table-wrapper")
    );
    // Obtener los IDs de las tablas SAL seleccionadas a través del manager
    const selectedSalTableIds = this.salTableManager.getSelectedSalTableIds();
    // Mapear los IDs a los elementos DOM reales de las tablas SAL seleccionadas
    const selectedSalTables = selectedSalTableIds
      .map((id) => document.getElementById(id))
      .filter(Boolean); // Filtrar cualquier posible null si un ID no se encuentra

    // Combinar todas las tablas a imprimir
    const tablesToPrint = [...originalTables, ...selectedSalTables];

    if (tablesToPrint.length === 0) {
      alert(
        "No hay tablas seleccionadas para imprimir. Carga un archivo Excel y/o crea/selecciona tablas SAL."
      );
      return;
    }

    // // Llamar al generador de PDF con la lista de elementos de tabla
    // this.pdfGenerator.generatePdf(
    //   tablesToPrint, // Array de elementos HTML (divs .table-wrapper)
    //   "Reporte_Completo_SAL.pdf" // Nombre del archivo PDF
    // );
    PdfGenerator.generatePdf(
      // Llama directamente a la clase
      tablesToPrint,
      "Reporte_Completo_SAL.pdf"
    );
  }
}
