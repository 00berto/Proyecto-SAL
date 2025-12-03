// js/ProjectManager.js

class ProjectManager {
  constructor(app) {
    this.app = app;
    this.currentProjectId = null;
    this.currentProjectName = null;
  }

  async saveProject(projectName) {
    try {
      // Collect all data from the application
      const excelData = this._getExcelData();
      const salTables = this._getSalTablesData();
      const companyData = this._getCompanyData();

      const response = await fetch('/api/projects/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: projectName,
          excelData: excelData,
          salTables: salTables,
          companyData: companyData
        })
      });

      const result = await response.json();

      if (result.success) {
        this.currentProjectId = result.project.id;
        this.currentProjectName = result.project.name;
        return { success: true, project: result.project };
      } else {
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('Error saving project:', error);
      return { success: false, message: error.message };
    }
  }

  async loadProject(projectId) {
    try {
      const response = await fetch(`/api/projects/load?id=${projectId}`);
      const result = await response.json();

      if (result.success) {
        this.currentProjectId = result.project.id;
        this.currentProjectName = result.project.name;
        
        // Restore application state
        await this._restoreExcelData(result.project.excel_data);
        this._restoreSalTables(result.project.sal_tables);
        this._restoreCompanyData(result.project.company_data);
        
        return { success: true, project: result.project };
      } else {
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('Error loading project:', error);
      return { success: false, message: error.message };
    }
  }

  async listProjects() {
    try {
      const response = await fetch('/api/projects/list');
      const result = await response.json();

      if (result.success) {
        return { success: true, projects: result.projects };
      } else {
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('Error listing projects:', error);
      return { success: false, message: error.message };
    }
  }

  async deleteProject(projectId) {
    try {
      const response = await fetch(`/api/projects/delete?id=${projectId}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (result.success && this.currentProjectId === projectId) {
        this.currentProjectId = null;
        this.currentProjectName = null;
      }

      return result;
    } catch (error) {
      console.error('Error deleting project:', error);
      return { success: false, message: error.message };
    }
  }

  _getExcelData() {
    // Get the processed Excel data from TableRenderer
    if (!this.app.tableRenderer || !this.app.tableRenderer.allTablesSalTotals) {
      return null;
    }

    // Store the raw data and headers
    return {
      headers: this.app.tableRenderer.headers || [],
      data: this.app.tableRenderer.data || [],
      fileName: this.app.fileNameTitle ? this.app.fileNameTitle.textContent : ''
    };
  }

  _getSalTablesData() {
    // Get all SAL tables data from SalTableManager
    if (!this.app.salTableManager) {
      return null;
    }

    return {
      counter: this.app.salTableManager.salTableCounter,
      tables: this.app.salTableManager.getAllExportableSalData()
    };
  }

  _getCompanyData() {
    // Get company data from localStorage (from dati.html)
    const storedData = localStorage.getItem('certificatoDati');
    const companyData = storedData ? JSON.parse(storedData) : null;
    
    // Also include SAL history
    const salHistory = localStorage.getItem('historialSAL');
    const historialSAL = salHistory ? JSON.parse(salHistory) : [];
    
    return {
      certificatoDati: companyData,
      historialSAL: historialSAL
    };
  }

  async _restoreExcelData(excelData) {
    if (!excelData || !excelData.data || !excelData.headers) {
      return;
    }

    // Update file name display
    if (this.app.fileNameTitle && excelData.fileName) {
      this.app.fileNameTitle.textContent = excelData.fileName;
    }

    // Store data in renderer
    this.app.tableRenderer.headers = excelData.headers;
    this.app.tableRenderer.data = excelData.data;

    // Render the tables
    this.app.tableRenderer.renderTables(excelData.data, excelData.headers);
    
    // Show buttons
    this.app.printPdfBtn.style.display = 'block';
    this.app.tablaSalBtn.style.display = 'block';
  }

  _restoreSalTables(salTablesData) {
    if (!salTablesData || !salTablesData.tables || salTablesData.tables.length === 0) {
      return;
    }

    // Reset SAL tables
    this.app.salTableManager.reset();

    // Recreate each SAL table
    for (let i = 0; i < salTablesData.counter; i++) {
      this.app.salTableManager.createSalCopyTable();
    }

    // Show delete button if there are SAL tables
    if (salTablesData.counter > 0) {
      this.app.deleteSalBtn.style.display = 'block';
      if (this.app.exportDataBtn) {
        this.app.exportDataBtn.style.display = 'block';
      }
    }
  }

  _restoreCompanyData(companyData) {
    if (!companyData) {
      return;
    }

    // Restore company/project data
    if (companyData.certificatoDati) {
      localStorage.setItem('certificatoDati', JSON.stringify(companyData.certificatoDati));
    }
    
    // Restore SAL history
    if (companyData.historialSAL) {
      localStorage.setItem('historialSAL', JSON.stringify(companyData.historialSAL));
    }
  }
}
