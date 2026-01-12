// js/SalTableManager.js
class SalTableManager {
    constructor(
      salCopiesContainerId,
      summaryTableGenerator,
      checkboxesContainer,
      selectionSectionDiv
    ) {
      this.container = document.getElementById(salCopiesContainerId);
      this.summaryTableGenerator = summaryTableGenerator;
      this.salTableCounter = 0;
      this.generatedSalTables = [];
      this.checkboxesContainer = checkboxesContainer;
      this.selectionSection = selectionSectionDiv;
      
      // Pastel Color Palette for SAL columns
      this.salColors = [
          "#e3f2fd", // Blue
          "#e8f5e9", // Green
          "#fff3e0", // Orange
          "#f3e5f5", // Purple
          "#fffde7", // Yellow
          "#e0f2f1", // Teal
          "#fbe9e7", // Deep Orange
          "#eceff1"  // Blue Grey
      ];
    }
  
    createSalCopyTable() {
      this.salTableCounter++;
      const newTableTitle = `SAL ${this.salTableCounter}`;
      const salId = this.salTableCounter;
      
      // Select color based on ID (cyclic)
      const salColor = this.salColors[(salId - 1) % this.salColors.length];
  
      const originalTableWrappers = document.querySelectorAll(
        "#tableContainer .table-wrapper.original-table-wrapper"
      );
      
      let grandTotalImportoSal = 0;
      
      originalTableWrappers.forEach((wrapper) => {
        const table = wrapper.querySelector("table");
        const theadRow = table.querySelector("thead tr");
        const tbody = table.querySelector("tbody");
  
        // 1. Add Headers
        ["SAL %", "Importo SAL"].forEach((name) => {
          const th = document.createElement("th");
          if (name === "SAL %") th.textContent = `SAL ${salId} %`;
          if (name === "Importo SAL") th.textContent = `Imp. SAL ${salId}`;
          
          th.classList.add("text-center", "sal-history-header");
          th.setAttribute("data-sal-id", salId);
          // Apply Color
          th.style.backgroundColor = salColor;
          
          theadRow.appendChild(th);
        });
  
        // 2. Add Data Cells
        const rows = tbody.querySelectorAll("tr");
        let currentSectionSalPercentTotal = 0;
        let currentSectionImportoSalTotal = 0;

        rows.forEach((row) => {
            if (row.classList.contains("total-row")) {
                return;
            }
            if (row.classList.contains("table-section-header")) {
                const cell = row.querySelector("td");
                if (cell) {
                    const currentColSpan = parseInt(cell.getAttribute("colSpan") || "1");
                    cell.setAttribute("colSpan", currentColSpan + 2);
                }
                return;
            }
            // Normal data row
            const salInput = row.querySelector("input.sal-input");
            
            if (!salInput) {
                // Spacer row handling
                const cells = row.querySelectorAll("td");
                if (cells.length === 1 && cells[0].hasAttribute("colspan")) {
                     const currentColSpan = parseInt(cells[0].getAttribute("colSpan") || "1");
                     cells[0].setAttribute("colSpan", currentColSpan + 2);
                } else if(cells.length > 0) {
                     // Empty cells for alignment
                     const td1 = document.createElement("td"); 
                     td1.setAttribute("data-sal-id", salId);
                     const td2 = document.createElement("td");
                     td2.setAttribute("data-sal-id", salId);
                     
                     // Style them to look like spacer - keep spacer color
                     td1.style.backgroundColor = window.getComputedStyle(row).backgroundColor;
                     td2.style.backgroundColor = window.getComputedStyle(row).backgroundColor;

                     row.appendChild(td1);
                     row.appendChild(td2);
                }
                return;
            }
            
            // Data row
            const salPercentValue = parseFloat(salInput.value.replace(',', '.') || "0");
            const baseValue = parseFloat(salInput.getAttribute("data-base-value") || "0");
            const salImportoValue = baseValue * (salPercentValue / 100);
            
            currentSectionSalPercentTotal += salPercentValue;
            currentSectionImportoSalTotal += salImportoValue;
            
            // Create cells
            const tdPercent = document.createElement("td");
            tdPercent.textContent = `${salPercentValue.toFixed(2)}%`;
            tdPercent.classList.add("text-center", "sal-history-cell");
            tdPercent.setAttribute("data-sal-id", salId);
            tdPercent.style.backgroundColor = salColor; // Apply Color
            
            const tdImporto = document.createElement("td");
            tdImporto.textContent = this._formatNumber(salImportoValue);
            tdImporto.classList.add("text-center", "sal-history-cell");
            tdImporto.setAttribute("data-sal-id", salId);
            tdImporto.style.backgroundColor = salColor; // Apply Color
            
            row.appendChild(tdPercent);
            row.appendChild(tdImporto);
        });

        // 3. Handle Total Row
        const totalRow = tbody.querySelector(".total-row");
        if (totalRow) {
             const tdTotalPercent = document.createElement("td");
             tdTotalPercent.textContent = ""; 
             tdTotalPercent.setAttribute("data-sal-id", salId);
             tdTotalPercent.style.backgroundColor = salColor; // Apply Color
             // Note: totalRow usually has its own background styling class. 
             // Inline style should override class background. Useful for distinction.
             
             const tdTotalImporto = document.createElement("td");
             tdTotalImporto.textContent = this._formatNumber(currentSectionImportoSalTotal);
             tdTotalImporto.setAttribute("data-sal-id", salId);
             tdTotalImporto.classList.add("text-center", "fw-bold");
             tdTotalImporto.style.backgroundColor = salColor; // Apply Color
             
             totalRow.appendChild(tdTotalPercent);
             totalRow.appendChild(tdTotalImporto);
        }
        
        grandTotalImportoSal += currentSectionImportoSalTotal;
      });
  
      this.generatedSalTables.push({
        id: salId,
        title: newTableTitle,
        totalGlobalSAL: grandTotalImportoSal
      });
  
      this._addSalTableCheckbox(salId, newTableTitle);
      this._validateHistoryColumns(salId);
      this._updateSummaryTable();
      this._saveToLocalStorage();
    }
  
    deleteLastSalTable() {
      if (this.salTableCounter > 0) {
        const lastSalId = this.salTableCounter;
        const elementsToRemove = document.querySelectorAll(`[data-sal-id="${lastSalId}"]`);
        elementsToRemove.forEach(el => el.remove());
        
        const tables = document.querySelectorAll("#tableContainer table");
        tables.forEach(table => {
            const colspanCells = table.querySelectorAll("td[colspan]");
            colspanCells.forEach(cell => {
                const currentRow = cell.parentElement;
                if (currentRow.classList.contains("table-section-header") || (currentRow.children.length === 1 && cell.getAttribute("colspan"))) {
                     const current = parseInt(cell.getAttribute("colSpan"));
                     if (current > 2) {
                         cell.setAttribute("colSpan", current - 2);
                     }
                }
            });
        });
  
        const checkboxElement = document.getElementById(`checkbox-${lastSalId}`);
        if (checkboxElement && checkboxElement.parentNode) {
            checkboxElement.parentNode.remove();
        }
  
        this.generatedSalTables.pop();
        this.salTableCounter--;
  
        if (this.salTableCounter === 0) {
            this.selectionSection.style.display = "none";
        }
        
        this._updateSummaryTable();
        this._saveToLocalStorage();
      } else {
        alert("Nessuna tabella SAL da eliminare.");
      }
    }
  
    _validateHistoryColumns(currentSalId) {
        if (currentSalId <= 1) return; 
        
        const prevSalId = currentSalId - 1;
        const rows = document.querySelectorAll("#tableContainer tbody tr");
        
        rows.forEach(row => {
            const currentCells = row.querySelectorAll(`td[data-sal-id="${currentSalId}"]`);
            const prevCells = row.querySelectorAll(`td[data-sal-id="${prevSalId}"]`);
            
            if (currentCells.length === 2 && prevCells.length === 2) {
                const currPercentText = currentCells[0].textContent.replace("%", "").trim();
                const prevPercentText = prevCells[0].textContent.replace("%", "").trim();
                
                const currVal = this._parseNumber(currPercentText);
                const prevVal = this._parseNumber(prevPercentText);
                
                if (currVal > 100.001) {
                    currentCells[0].classList.add("table-danger");
                    currentCells[0].title = "Valore SAL% superiore a 100%";
                } else if (currVal < prevVal - 0.001) {
                    currentCells[0].classList.add("table-warning");
                    currentCells[0].title = "Controllare Valore % inserito (minore del precedente)";
                }
            }
        });
    }
    
    // ... [Helpers remain same]
    _addSalTableCheckbox(id, title) {
      const checkboxDiv = document.createElement("div");
      checkboxDiv.className = "form-check form-check-inline";
      const checkboxInput = document.createElement("input");
      checkboxInput.type = "checkbox";
      checkboxInput.className = "form-check-input";
      checkboxInput.id = `checkbox-${id}`;
      checkboxInput.value = id;
      checkboxInput.checked = true;
      const checkboxLabel = document.createElement("label");
      checkboxLabel.className = "form-check-label";
      checkboxLabel.htmlFor = `checkbox-${id}`;
      checkboxLabel.textContent = title;
      checkboxDiv.appendChild(checkboxInput);
      checkboxDiv.appendChild(checkboxLabel);
      this.checkboxesContainer.appendChild(checkboxDiv);
      this.selectionSection.style.display = "block";
    }
  
    reset() {
      this.salTableCounter = 0;
      this.generatedSalTables = [];
      if (this.checkboxesContainer) {
        this.checkboxesContainer.innerHTML = "";
      }
      if (this.selectionSection) {
        this.selectionSection.style.display = "none";
      }
    }
  
    getSelectedSalTableIds() {
      if (!this.checkboxesContainer) return [];
      return Array.from(
        this.checkboxesContainer.querySelectorAll("input[type='checkbox']:checked")
      ).map((checkbox) => parseInt(checkbox.value));
    }
  
    _updateSummaryTable() {
       if (this.generatedSalTables.length === 0) {
           this.summaryTableGenerator.reset();
           return;
       }
       const lastSalId = this.generatedSalTables[this.generatedSalTables.length - 1].id;
       const sections = [];
       const originalTableWrappers = document.querySelectorAll("#tableContainer .table-wrapper.original-table-wrapper");
      
      originalTableWrappers.forEach(wrapper => {
          const titleEl = wrapper.querySelector("h4");
          const title = titleEl ? titleEl.textContent : "Sezione";
          const tableId = wrapper.id;
          let sectionTotal = 0;
          const totalRow = wrapper.querySelector("table tbody .total-row");
          if (totalRow) {
             const cells = totalRow.querySelectorAll(`td[data-sal-id="${lastSalId}"]`);
             if (cells.length === 2) sectionTotal = this._parseNumber(cells[1].textContent);
          }
          if (sectionTotal > 0) {
              sections.push({
                  title: title,
                  salTotal: sectionTotal,
                  sectionId: titleEl ? titleEl.id : tableId
              });
          }
      });
      this.summaryTableGenerator.generate(sections);
    }
  
    getExportableSalData() {
        if (this.generatedSalTables.length === 0) return null;
        const last = this.generatedSalTables[this.generatedSalTables.length - 1];
        const today = new Date();
        const day = String(today.getDate()).padStart(2, "0");
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const year = today.getFullYear();
        const fechaModificacion = `${day}.${month}.${year}`;
        return {
            numeroSAL: last.id,
            totalGlobalSAL: last.totalGlobalSAL,
            fechaModificacion: fechaModificacion
        };
    }
  
    _parseNumber(str) {
      if (!str) return 0;
      str = String(str).trim();
      if (str.includes("€")) str = str.replace("€", "");
      if (str.includes(",")) return parseFloat(str.replace(/\./g, "").replace(",", ".")) || 0;
      return parseFloat(str) || 0;
    }
  
    _formatNumber(num) {
      return num.toLocaleString("it-IT", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    
    getAllExportableSalData() {
        const today = new Date();
        const fechaVal = `${String(today.getDate()).padStart(2,"0")}.${String(today.getMonth()+1).padStart(2,"0")}.${today.getFullYear()}`;
        return this.generatedSalTables.map(t => ({
            numeroSAL: t.id,
            totalGlobalSAL: t.totalGlobalSAL,
            fechaModificacion: fechaVal
        }));
    }

    _saveToLocalStorage() {
        const data = this.getAllExportableSalData();
        localStorage.setItem("currentProjectSalData", JSON.stringify(data));
    }
  }
