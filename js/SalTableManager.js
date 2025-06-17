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
    this.generatedSalTables = []; // Almacena { id, title, element }
    this.checkboxesContainer = checkboxesContainer;
    this.selectionSection = selectionSectionDiv;
  }

  createSalCopyTable() {
    this.salTableCounter++;
    const newTableTitle = `SAL ${this.salTableCounter}`;
    const salTableId = `sal-copy-table-${this.salTableCounter}`;

    const salTableWrapper = document.createElement("div");
    salTableWrapper.className = "table-wrapper sal-copy-table-wrapper";
    salTableWrapper.id = salTableId;

    const title = document.createElement("h4");
    title.textContent = newTableTitle;
    salTableWrapper.appendChild(title);

    const newSalTable = document.createElement("table");
    newSalTable.className = "table table-bordered table-sm mb-1 sal-copy-table";

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    ["SAL %", "Importo SAL"].forEach((name) => {
      const th = document.createElement("th");
      th.textContent = name;
      th.classList.add("text-end");
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    newSalTable.appendChild(thead);

    const tbody = document.createElement("tbody");
    newSalTable.appendChild(tbody);
    salTableWrapper.appendChild(newSalTable);
    this.container.appendChild(salTableWrapper);

    this._populateSalTable(tbody);

    this._addSalTableCheckbox(salTableId, newTableTitle);
  }

  // NUEVO: Método para eliminar la última tabla SAL
  deleteLastSalTable() {
    if (this.salTableCounter > 0) {
      // Obtener el ID de la última tabla generada
      const lastTableInfo = this.generatedSalTables.pop(); // Elimina del array y lo devuelve
      if (lastTableInfo) {
        const tableElement = lastTableInfo.element;
        const checkboxElement = document.getElementById(
          `checkbox-${lastTableInfo.id}`
        );

        // Eliminar la tabla del DOM
        if (tableElement && tableElement.parentNode) {
          tableElement.parentNode.removeChild(tableElement);
        }

        // Eliminar el checkbox del DOM
        if (checkboxElement && checkboxElement.parentNode) {
          checkboxElement.parentNode.removeChild(checkboxElement);
        }

        this.salTableCounter--; // Decrementar el contador

        // Ocultar la sección de checkboxes si no quedan tablas SAL
        if (this.salTableCounter === 0) {
          this.selectionSection.style.display = "none";
        }
      }
    } else {
      alert("No hay tablas SAL para eliminar.");
    }
  }

  _populateSalTable(tbody) {
    document
      .querySelectorAll("#tableContainer .table-wrapper.original-table-wrapper")
      .forEach((originalTableWrapper) => {
        const originalTable = originalTableWrapper.querySelector("table");
        const originalTbody = originalTable.querySelector("tbody");

        const originalHeadersLength =
          originalTable.querySelector("thead tr").children.length - 4;

        originalTbody
          .querySelectorAll("tr:not(.total-row)")
          .forEach((originalRow) => {
            const newRow = document.createElement("tr");
            const originalCells = originalRow.querySelectorAll("td");

            const originalSalInput =
              originalCells[originalHeadersLength]?.querySelector(
                "input.sal-input"
              );
            const salPercentValue = originalSalInput
              ? originalSalInput.value
              : "0";
            const salPercentTd = document.createElement("td");
            salPercentTd.textContent = `${parseFloat(salPercentValue).toFixed(
              2
            )}%`;
            salPercentTd.classList.add("text-end");
            newRow.appendChild(salPercentTd);

            const salImportoValue =
              originalCells[originalHeadersLength + 1]?.textContent;
            const salImportoTd = document.createElement("td");
            salImportoTd.textContent = salImportoValue || "0,00";
            salImportoTd.classList.add("text-end");
            newRow.appendChild(salImportoTd);

            tbody.appendChild(newRow);
          });

        const totalOriginalRow = originalTbody.querySelector(".total-row");
        if (totalOriginalRow) {
          const newTotalRow = document.createElement("tr");
          newTotalRow.classList.add(
            "table-info",
            "fw-bold",
            "sal-copy-total-row"
          );

          const totalSalPercentTd = document.createElement("td");
          const originalTotalSalPercentText =
            totalOriginalRow.children[totalOriginalRow.children.length - 2]
              ?.textContent;
          totalSalPercentTd.textContent =
            originalTotalSalPercentText || "0,00%";
          totalSalPercentTd.classList.add("text-end");
          newTotalRow.appendChild(totalSalPercentTd);

          const totalImportoSalTd = document.createElement("td");
          const originalTotalImportoSalText =
            totalOriginalRow.children[totalOriginalRow.children.length - 1]
              ?.textContent;
          totalImportoSalTd.textContent = originalTotalImportoSalText || "0,00";
          totalImportoSalTd.classList.add("text-end");
          newTotalRow.appendChild(totalImportoSalTd);

          tbody.appendChild(newTotalRow);
        }
      });

    const finalGrandTotalRow = document.createElement("tr");
    finalGrandTotalRow.classList.add("table-primary", "fw-bold");

    const grandTotalLabelTd = document.createElement("td");
    grandTotalLabelTd.textContent = "TOTAL GLOBAL SAL:";
    grandTotalLabelTd.colSpan = 1;
    finalGrandTotalRow.appendChild(grandTotalLabelTd);

    // const grandTotalPercentTd = document.createElement("td");
    // grandTotalPercentTd.textContent = "";
    // finalGrandTotalRow.appendChild(grandTotalPercentTd);

    const grandTotalValueTd = document.createElement("td");
    const totalSummaryTable = document.getElementById("summaryTableWrapper");
    if (totalSummaryTable) {
      const lastRow = totalSummaryTable.querySelector("tbody tr:last-child");
      if (lastRow && lastRow.children.length > 1) {
        grandTotalValueTd.textContent = lastRow.children[1].textContent;
      }
    } else {
      grandTotalValueTd.textContent = "0,00";
    }
    grandTotalValueTd.classList.add("text-end");
    finalGrandTotalRow.appendChild(grandTotalValueTd);

    tbody.appendChild(finalGrandTotalRow);
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

    this.generatedSalTables.push({
      id: id,
      title: title,
      element: document.getElementById(id),
    });
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

    if (this.container) {
      this.container.innerHTML = "";
    }
  }

  getSelectedSalTableIds() {
    if (!this.checkboxesContainer) {
      console.warn("Contenedor de checkboxes SAL no encontrado.");
      return [];
    }
    return Array.from(
      this.checkboxesContainer.querySelectorAll(
        "input[type='checkbox']:checked"
      )
    ).map((checkbox) => checkbox.value);
  }
}
