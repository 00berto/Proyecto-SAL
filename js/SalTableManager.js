// js/SalTableManager.js
class SalTableManager {
    constructor(
      salCopiesContainerId,
      summaryTableGenerator,
      checkboxesContainer,
      selectionSectionDiv
    ) {
      // Although we don't use salCopiesContainer for tables anymore, we might check if it's used for anything else.
      // Based on previous code, it was only for appending new tables. We can ignore it or keep the reference.
      this.container = document.getElementById(salCopiesContainerId);
      this.summaryTableGenerator = summaryTableGenerator;
      this.salTableCounter = 0;
      // generatedSalTables will now store metadata about columns added
      this.generatedSalTables = [];
      this.checkboxesContainer = checkboxesContainer;
      this.selectionSection = selectionSectionDiv;
      // We no longer need input listeners to update snapshots because snapshots should be static.
      // this._addInputListeners(); 
    }
  
    createSalCopyTable() {
      this.salTableCounter++;
      const newTableTitle = `SAL ${this.salTableCounter}`;
      const salId = this.salTableCounter;
  
      const originalTableWrappers = document.querySelectorAll(
        "#tableContainer .table-wrapper.original-table-wrapper"
      );
      
      let grandTotalImportoSal = 0;
      
      // We will perform the update on ALL existing tables
      originalTableWrappers.forEach((wrapper) => {
        const table = wrapper.querySelector("table");
        const theadRow = table.querySelector("thead tr");
        const tbody = table.querySelector("tbody");
  
        // 1. Add Headers
        ["SAL %", "Importo SAL"].forEach((name) => {
          const th = document.createElement("th");
          // th.textContent = `${name} (${salId})`; // Optional: Add ID to header to distinguish? Or just keep generic? 
          // User asked for "SAL n" columns. Let's make it clear.
          // The previous code had a title "SAL n". 
          // Let's use "SAL n %" and "SAL n Importo" to be precise, or just use the group header if we could.
          // For simplicity and column width, let's try to keep it short or match request.
          // Previous: table title "SAL n", headers "SAL %", "Importo SAL".
          // New: Headers "SAL n %", "Imp. n" to save space? 
          // Let's stick to "SAL n %" and "Imp. SAL n".
          if (name === "SAL %") th.textContent = `SAL ${salId} %`;
          if (name === "Importo SAL") th.textContent = `Imp. SAL ${salId}`;
          
          th.classList.add("text-center", "sal-history-header");
          th.setAttribute("data-sal-id", salId);
          theadRow.appendChild(th);
        });
  
        // 2. Add Data Cells
        // We need to calculate values based on CURRENT state of inputs in this table
        // We can reuse logic similar to _populateSalTable but applied to rows
  
        // Iterate rows
        const rows = tbody.querySelectorAll("tr");
        let currentSectionSalPercentTotal = 0;
        let currentSectionImportoSalTotal = 0;

        rows.forEach((row) => {
            if (row.classList.contains("total-row")) {
                // Handle total row later or at end of loop?
                // It's part of the loop.
                return;
            }
            if (row.classList.contains("table-section-header")) {
                // Section header (if any). Increase colspan.
                const cell = row.querySelector("td");
                if (cell) {
                    const currentColSpan = parseInt(cell.getAttribute("colSpan") || "1");
                    cell.setAttribute("colSpan", currentColSpan + 2);
                }
                return;
            }
            // Normal data row
            const salInput = row.querySelector("input.sal-input");
            
            // If no input (maybe spacer row?), check cells
            if (!salInput) {
                // Check if it's a spacer row (might have colspan)
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
                     
                     // Style them to look like spacer
                     td1.style.backgroundColor = window.getComputedStyle(row).backgroundColor;
                     td2.style.backgroundColor = window.getComputedStyle(row).backgroundColor;

                     row.appendChild(td1);
                     row.appendChild(td2);
                }
                return;
            }
            
            // It has input, so it's a data row
            const salPercentValue = parseFloat(salInput.value.replace(',', '.') || "0");
            
            // Find base value? 
            // The input has data-base-value attribute!
            const baseValue = parseFloat(salInput.getAttribute("data-base-value") || "0");
            const salImportoValue = baseValue * (salPercentValue / 100);
            
            currentSectionSalPercentTotal += salPercentValue;
            currentSectionImportoSalTotal += salImportoValue;
            
            // Create cells
            const tdPercent = document.createElement("td");
            tdPercent.textContent = `${salPercentValue.toFixed(2)}%`;
            tdPercent.classList.add("text-center", "sal-history-cell");
            tdPercent.setAttribute("data-sal-id", salId);
            
            const tdImporto = document.createElement("td");
            tdImporto.textContent = this._formatNumber(salImportoValue);
            tdImporto.classList.add("text-center", "sal-history-cell");
            tdImporto.setAttribute("data-sal-id", salId);
            
            row.appendChild(tdPercent);
            row.appendChild(tdImporto);
        });

        // 3. Handle Total Row
        const totalRow = tbody.querySelector(".total-row");
        if (totalRow) {
             const tdTotalPercent = document.createElement("td");
             tdTotalPercent.textContent = ""; // Usually empty for percent total?
             tdTotalPercent.setAttribute("data-sal-id", salId);
             
             // Check validation for total percent? The original code did. 
             // "isSalPercentError".
             // We can apply style to tdTotalPercent if needed, but usually total row background is enough.
             
             const tdTotalImporto = document.createElement("td");
             tdTotalImporto.textContent = this._formatNumber(currentSectionImportoSalTotal);
             tdTotalImporto.setAttribute("data-sal-id", salId);
             tdTotalImporto.classList.add("text-center", "fw-bold");
             
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
    }
  
    deleteLastSalTable() {
      if (this.salTableCounter > 0) {
        const lastSalId = this.salTableCounter;
        
        // Remove columns with this data-sal-id
        const elementsToRemove = document.querySelectorAll(`[data-sal-id="${lastSalId}"]`);
        elementsToRemove.forEach(el => el.remove());
        
        // Revert colspans
        const tables = document.querySelectorAll("#tableContainer table");
        tables.forEach(table => {
            const colspanCells = table.querySelectorAll("td[colspan]");
            colspanCells.forEach(cell => {
                const currentRow = cell.parentElement;
                // Only reduce colspan if we increased it.
                // We increased it for section headers and spacers.
                // Identifying them:
                if (currentRow.classList.contains("table-section-header")) {
                     const current = parseInt(cell.getAttribute("colSpan"));
                     if (current > 2) {
                         cell.setAttribute("colSpan", current - 2);
                     }
                } else if (currentRow.children.length === 1) { // Likely a spacer row that had colspan INCREASED, so now it has 1 child with large colspan.
                     const current = parseInt(cell.getAttribute("colSpan"));
                     // Spacer row in original code: created with colspan=2.
                     // If we have 1 table, it's 2 + 2*SALs.
                     // But wait, if we removed the colums (td children), the spacers are untouched?
                     // NO, spacer row logic in createSalCopyTable:
                     // if (cells.length === 1 && cells[0].hasAttribute("colspan")) -> increase colspan.
                     // We didn't add cells to spacer row, we increased colspan.
                     // So we MUST decrease it.
                     if (current > 2) {
                         cell.setAttribute("colSpan", current - 2);
                     }
                }
            });
        });
  
        // Remove checkbox
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
      } else {
        alert("Nessuna tabella SAL da eliminare.");
      }
    }
  
    _validateHistoryColumns(currentSalId) {
        if (currentSalId <= 1) return; // Nothing to compare with
        
        const prevSalId = currentSalId - 1;
        const rows = document.querySelectorAll("#tableContainer tbody tr");
        
        rows.forEach(row => {
            const currentCells = row.querySelectorAll(`td[data-sal-id="${currentSalId}"]`);
            const prevCells = row.querySelectorAll(`td[data-sal-id="${prevSalId}"]`);
            
            if (currentCells.length === 2 && prevCells.length === 2) {
                // Index 0 is %, Index 1 is Importo
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
      // Note: Resetting table container is handled by App.js clearing innerHTML, 
      // which removes our appended columns automatically.
    }
  
    getSelectedSalTableIds() {
      if (!this.checkboxesContainer) {
        return [];
      }
      // Return IDs (numbers)
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
       
       // Iterate through all tables (sections)
       const originalTableWrappers = document.querySelectorAll(
        "#tableContainer .table-wrapper.original-table-wrapper"
      );
      
      originalTableWrappers.forEach(wrapper => {
          const titleEl = wrapper.querySelector("h4");
          const title = titleEl ? titleEl.textContent : "Sezione";
          const tableId = wrapper.id;
          
          let sectionTotal = 0;
          
          // Find total row, then find the cell for this SAL ID
          const totalRow = wrapper.querySelector("table tbody .total-row");
          if (totalRow) {
             const cells = totalRow.querySelectorAll(`td[data-sal-id="${lastSalId}"]`);
             // We expect 2 cells: Percent and Importo.
             // Importo is the second one.
             if (cells.length === 2) {
                 sectionTotal = this._parseNumber(cells[1].textContent);
             }
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
      if (str.includes("€")) {
        str = str.replace("€", "");
      }
      // Format 1.000,00
      if (str.includes(",")) {
        return parseFloat(str.replace(/\./g, "").replace(",", ".")) || 0;
      }
      return parseFloat(str) || 0;
    }
  
    _formatNumber(num) {
      return num.toLocaleString("it-IT", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    
    getAllExportableSalData() {
        // ... similar logic reuse
        const today = new Date();
        const fechaVal = `${String(today.getDate()).padStart(2,"0")}.${String(today.getMonth()+1).padStart(2,"0")}.${today.getFullYear()}`;
        
        return this.generatedSalTables.map(t => ({
            numeroSAL: t.id,
            totalGlobalSAL: t.totalGlobalSAL,
            fechaModificacion: fechaVal
        }));
    }
  }
