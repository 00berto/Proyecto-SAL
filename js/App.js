// js/App.js

class App {
  constructor() {
    console.log("App.js: Constructor App llamado.");

    // 1. Obtener todas las referencias a elementos del DOM
    this.fileInput = document.getElementById("fileInput");
    this.fileNameTitle = document.getElementById("fileNameTitle");
    this.printPdfBtn = document.getElementById("printPdfBtn");
    this.tablaSalBtn = document.getElementById("tablaSalBtn");
    this.deleteSalBtn = document.getElementById("deleteSalBtn");
    this.saveProjectBtn = document.getElementById("saveProjectBtn");
    this.saveProjectBtn2 = document.getElementById("saveProjectBtn2");
    this.loadProjectBtn = document.getElementById("loadProjectBtn");
    this.deleteProjectBtn = document.getElementById("deleteProjectBtn");

    this.tableContainer = document.getElementById("tableContainer");
    // this.salCopiesContainer = document.getElementById("salCopiesContainer"); // REMOVED
    this.salTablesSelectionDiv = document.getElementById("salTablesSelection");
    this.salTablesCheckboxes = document.getElementById("salTablesCheckboxes");
    this.summaryContainer = document.getElementById("summaryContainer"); // Referencia al nuevo contenedor

    // 2. Inicializar los componentes una sola vez
    this.excelProcessor = new ExcelProcessor();
    this.summaryTableGenerator = new SummaryTableGenerator("summaryContainer"); // Usar el nuevo contenedor
    this.tableRenderer = new TableRenderer(
      "tableContainer",
      this.summaryTableGenerator,
      7 // BASE_CALC_COL_INDEX
    );
    this.salTableManager = new SalTableManager(
      null, // salCopiesContainerId is obsolete
      this.summaryTableGenerator,
      this.salTablesCheckboxes,
      this.salTablesSelectionDiv
    );

    // Initialize ProjectManager
    this.projectManager = new ProjectManager(this);

    // 3. Ocultar elementos al inicio
    this.printPdfBtn.style.display = "none";
    this.tablaSalBtn.style.display = "none";
    this.deleteSalBtn.style.display = "none";
    this.salTablesSelectionDiv.style.display = "none";
    
    if (this.saveProjectBtn2) {
        this.saveProjectBtn2.style.display = "none";
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
    
    if (this.saveProjectBtn2) {
        this.saveProjectBtn2.addEventListener(
            "click",
            this._handleSaveProject.bind(this)
        );
    }

    if (this.saveProjectBtn) {
        this.saveProjectBtn.addEventListener(
            "click",
            this._handleSaveProject.bind(this)
        );
    }

    if (this.loadProjectBtn) {
        this.loadProjectBtn.addEventListener(
            "click",
            this._handleLoadProject.bind(this)
        );
    }

    if (this.deleteProjectBtn) {
        this.deleteProjectBtn.addEventListener(
            "click",
            this._handleDeleteProject.bind(this)
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
    if (this.saveProjectBtn2) {
        this.saveProjectBtn2.style.display = "none";
    }
    if (this.deleteProjectBtn) {
        this.deleteProjectBtn.style.display = "none";
    }

    this.tableRenderer.allTablesSalTotals = [];
    this.summaryTableGenerator.reset();
    this.salTableManager.reset();

    this.tableContainer.innerHTML = "";
    // this.salCopiesContainer.innerHTML = ""; // REMOVED
    this.summaryContainer.innerHTML = ""; // Limpiar también el nuevo contenedor de resumen

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
      if (this.saveProjectBtn) {
        this.saveProjectBtn.style.display = "block";
      }
    } catch (error) {
      alert(`Error al procesar el archivo: ${error.message}`);
      console.error("Error al procesar el archivo:", error);
      this.fileNameTitle.textContent = `Error al cargar archivo: ${file.name}`;
    }
  }

  _handleCreateSalTable() {
    this.salTableManager.createSalCopyTable();
    this.deleteSalBtn.style.display = "block";
    if (this.saveProjectBtn2) {
        this.saveProjectBtn2.style.display = "block";
    }
  }

  _handleDeleteSalTable() {
    this.salTableManager.deleteLastSalTable();
    if (this.salTableManager.salTableCounter === 0) {
      this.deleteSalBtn.style.display = "none";
      if (this.saveProjectBtn2) {
          this.saveProjectBtn2.style.display = "none";
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

    PdfGenerator.generatePdf(tablesToPrint, "Reporte_Completo_SAL.pdf");
  }

  async _handleSaveProject() {
    const projectName = prompt("Nombre del progetto:");
    if (!projectName) {
      return;
    }

    const result = await this.projectManager.saveProject(projectName);
    if (result.success) {
      alert(`✅ Progetto "${projectName}" salvato correttamente!`);
    } else {
      alert(`❌ Errore: ${result.message}`);
    }
  }

  async _handleLoadProject() {
    const modal = new bootstrap.Modal(document.getElementById('loadProjectModal'));
    const projectsList = document.getElementById('projectsList');
    
    // Show loading
    projectsList.innerHTML = '<p class="text-center text-muted">Caricamento...</p>';
    modal.show();

    // Load projects list
    const result = await this.projectManager.listProjects();
    
    if (result.success && result.projects.length > 0) {
      projectsList.innerHTML = '';
      
      result.projects.forEach(project => {
        const projectItem = document.createElement('button');
        projectItem.className = 'list-group-item list-group-item-action';
        projectItem.innerHTML = `
          <div class="d-flex w-100 justify-content-between">
            <h6 class="mb-1">${project.name}</h6>
            <small>${new Date(project.updated_at).toLocaleDateString('it-IT')}</small>
          </div>
          <small class="text-muted">Creato: ${new Date(project.created_at).toLocaleDateString('it-IT')}</small>
        `;
        
        projectItem.addEventListener('click', async () => {
          modal.hide();
          const loadResult = await this.projectManager.loadProject(project.id);
          if (loadResult.success) {
            alert(`✅ Progetto "${project.name}" caricato correttamente!`);
            // Show save button after loading
            if (this.saveProjectBtn) {
              this.saveProjectBtn.style.display = 'block';
            }
            if (this.deleteProjectBtn) {
              this.deleteProjectBtn.style.display = 'block';
            }
          } else {
            alert(`❌ Errore: ${loadResult.message}`);
          }
        });
        
        projectsList.appendChild(projectItem);
      });
    } else if (result.success && result.projects.length === 0) {
      projectsList.innerHTML = '<p class="text-center text-muted">Nessun progetto salvato.</p>';
    } else {
      projectsList.innerHTML = `<p class="text-center text-danger">Errore: ${result.message}</p>`;
    }
    this.deleteProjectBtn = document.getElementById("deleteProjectBtn");

    if (this.deleteProjectBtn) {
        this.deleteProjectBtn.style.display = "none";
        this.deleteProjectBtn.addEventListener(
            "click",
            this._handleDeleteProject.bind(this)
        );
    }
  }

  // ... (inside _handleFileInputChange, hide it)
  // this.deleteProjectBtn.style.display = "none";

  async _handleDeleteProject() {
      if (!this.projectManager.currentProjectId) {
          alert("Nessun progetto caricato da eliminare.");
          return;
      }
      
      if (!confirm(`Sei sicuro di voler eliminare il progetto "${this.projectManager.currentProjectName}"? Questa azione non può essere annullata.`)) {
          return;
      }
      
      const result = await this.projectManager.deleteProject(this.projectManager.currentProjectId);
      if (result.success) {
          alert("✅ Progetto eliminato correttamente.");
          // Reset UI
          this.fileNameTitle.textContent = "Nessun archivio selezionato";
          this.printPdfBtn.style.display = "none";
          this.tablaSalBtn.style.display = "none";
          this.deleteSalBtn.style.display = "none";
          this.salTablesSelectionDiv.style.display = "none";
          if (this.saveProjectBtn) this.saveProjectBtn.style.display = "none";
          if (this.saveProjectBtn2) this.saveProjectBtn2.style.display = "none";
          if (this.deleteProjectBtn) this.deleteProjectBtn.style.display = "none";
          
          this.tableRenderer.allTablesSalTotals = [];
          this.summaryTableGenerator.reset();
          this.salTableManager.reset();
          this.tableContainer.innerHTML = "";
          this.summaryContainer.innerHTML = "";
          
          // Clear file input
          this.fileInput.value = "";
      } else {
          alert(`❌ Errore durante l'eliminazione: ${result.message}`);
      }
  }
  }
}