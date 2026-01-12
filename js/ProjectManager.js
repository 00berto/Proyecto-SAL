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
          id: this.currentProjectId, // Pass ID for update
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

    // Capture current values from all "sal-input" fields
    const currentInputValues = [];
    const inputs = document.querySelectorAll("input.sal-input");
    inputs.forEach(input => {
        // We need a way to map this input back to the specific row/table.
        // Assuming order is preserved, we can just save a flat array of values.
        currentInputValues.push(input.value);
    });

    // Store the raw data and headers
    return {
      headers: this.app.tableRenderer.headers || [],
      data: this.app.tableRenderer.data || [],
      fileName: this.app.fileNameTitle ? this.app.fileNameTitle.textContent : '',
      currentValues: currentInputValues // Save current working draft
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
    
    // Restore input values if available
    if (excelData.currentValues && Array.isArray(excelData.currentValues)) {
        const inputs = document.querySelectorAll("input.sal-input");
        inputs.forEach((input, index) => {
            if (index < excelData.currentValues.length) {
                input.value = excelData.currentValues[index];
                // Trigger change event to update totals if necessary? 
                // TableRenderer might calculate on input. Let's trigger a manual update if needed while saving/loaded?
                // Actually TableRenderer usually listens to 'input' event.
                // We should manually trigger the calculation update flow.
                // But simply setting value might be enough if user touches it later. 
                // Better to dispatch input event.
                // input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
        
        // Recalculate totals
        // We need to access the logic that updates totals.
        // Usually attached to inputs.
        // Let's force a recalculation if possible.
        // Assuming TableRenderer has a method? Or just dispatch events.
        // Dispatching events for hundreds of inputs might be slow.
        // But it guarantees consistency.
        inputs.forEach(input => input.dispatchEvent(new Event('input', { bubbles: true })));
    }
    
    // Show buttons
    this.app.printPdfBtn.style.display = 'block';
    this.app.tablaSalBtn.style.display = 'block';
    if (this.app.saveProjectBtn) {
        this.app.saveProjectBtn.style.display = 'block';
    }
  }

  _restoreSalTables(salTablesData) {
    if (!salTablesData || !salTablesData.tables || salTablesData.tables.length === 0) {
      return;
    }

    // Reset SAL tables
    this.app.salTableManager.reset();

    // Recreate each SAL table and restore values
    // salTablesData.tables contains metadata. We need to know the actual values to restore them.
    // The current save logic only saves metadata (id, total). It does NOT save the individual cell percentages.
    // We need to update saveProject to include full SAL details (percentages per row) to be able to restore fully.
    
    // checks if we have full data. If not, we can only create empty columns.
    // Assuming for now we just create the columns as before, but user was asking why they can't modify.
    // Actually, if we just create columns, they are editable. 
    // Is the issue that the buttons are not showing up?
    // In _restoreExcelData we show printPdfBtn and tablaSalBtn.
    // In _restoreSalTables we show deleteSalBtn.
    
    // Wait, if I load a project, I expect the previous SAL percentages to be there. 
    // The current `_getSalTablesData` ONLY returns metadata:
    // return { counter: ..., tables: [{id, total, date}] }
    // It is MISSING the actual input values (percentages).
    // So when loading, we create empty SAL columns 1, 2, 3... but with 0 values! 
    // That confuses the user. They see "SAL 1", "SAL 2" but empty.
    
    // STEP 1: Fix _getSalTablesData to include cell values.
    // This requires changes in this file (ProjectManager.js).
    // STEP 2: Fix _restoreSalTables to use those values.
    
    // This tool call only touches _restoreSalTables, but I need to modify _getSalTablesData first.
    // I will abort this specific replace and do a multi_replace to handle both _getSalTablesData and _restoreSalTables.
    // Actually, I can do it here if I am careful.
    
    // But `_getSalTablesData` is higher up in the file (line 118).
    // I will start by updating _getSalTablesData.
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
