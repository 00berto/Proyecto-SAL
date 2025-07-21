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
    this.generatedSalTables = []; // Stores { id, title, element }
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
      th.classList.add("text-center"); // Centered alignment for SAL headers
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
    this._validateSalRowsBetweenTables();
  }
  deleteLastSalTable() {
    if (this.salTableCounter > 0) {
      const lastTableInfo = this.generatedSalTables.pop();
      if (lastTableInfo) {
        const tableElement = lastTableInfo.element;
        const checkboxElement = document.getElementById(
          `checkbox-${lastTableInfo.id}`
        );

        if (tableElement && tableElement.parentNode) {
          tableElement.parentNode.removeChild(tableElement);
        }

        if (checkboxElement && checkboxElement.parentNode) {
          checkboxElement.parentNode.removeChild(checkboxElement);
        }

        this.salTableCounter--;

        if (this.salTableCounter === 0) {
          this.selectionSection.style.display = "none";
        }
      }

      // Verifica SAL% después de eliminar
      this._validateSalRowsBetweenTables();
    } else {
      alert("Nussuna tabella SAL da eliminare.");
    }
  }

  _populateSalTable(tbody) {
    // Clear tbody before populating
    tbody.innerHTML = "";

    const originalTableWrappers = document.querySelectorAll(
      "#tableContainer .table-wrapper.original-table-wrapper"
    );
    const totalOriginalTables = originalTableWrappers.length;

    originalTableWrappers.forEach((originalTableWrapper, index) => {
      const originalTable = originalTableWrapper.querySelector("table");
      const originalTbody = originalTable.querySelector("tbody");
      const originalTitleElement = originalTableWrapper.querySelector("h4");

      const originalHeadersLength =
        originalTable.querySelector("thead tr").children.length - 4;

      // Calculate SAL% total for this section before creating rows
      let currentSectionSalPercentTotal = 0;
      originalTbody
        .querySelectorAll("tr:not(.total-row)")
        .forEach((originalRow) => {
          const originalCells = originalRow.querySelectorAll("td");
          const originalSalInput =
            originalCells[originalHeadersLength]?.querySelector(
              "input.sal-input"
            );
          const salPercentValue = parseFloat(
            originalSalInput ? originalSalInput.value : "0"
          );
          currentSectionSalPercentTotal += salPercentValue;
        });

      // Determine if there's a percentage error for this section
      const isSalPercentError =
        currentSectionSalPercentTotal > 100.0001 ||
        currentSectionSalPercentTotal < -0.0001;

      // Add empty row before section header if applicable
      if (originalTitleElement && (index > 0 || totalOriginalTables > 1)) {
        const emptySectionSpacerRow = document.createElement("tr");
        const emptySectionSpacerCell = document.createElement("td");
        emptySectionSpacerCell.colSpan = 2; // Ocupa las 2 columnas
        // emptySectionSpacerCell.style.backgroundColor = '#f0f8ff'; // Fondo sutil para el espacio
        emptySectionSpacerRow.appendChild(emptySectionSpacerCell);
        tbody.appendChild(emptySectionSpacerRow);

        // Add section header
        const sectionHeaderRow = document.createElement("tr");
        sectionHeaderRow.classList.add("table-section-header"); //
        const sectionHeaderCell = document.createElement("td");
        sectionHeaderCell.colSpan = 2;
        sectionHeaderCell.textContent = originalTitleElement.textContent;
        sectionHeaderCell.classList.add("total-row");
        // sectionHeaderCell.style.backgroundColor = '#f0f8ff'; // Fondo sutil para el espacio e9ecef
        sectionHeaderCell.style.backgroundColor = "#e9ecef"; // Fondo sutil para el espacio
        sectionHeaderRow.appendChild(sectionHeaderCell);
        tbody.appendChild(sectionHeaderRow);
      }

      // Iterate over main table rows to create SAL table rows
      originalTbody
        .querySelectorAll("tr:not(.total-row)")
        .forEach((originalRow) => {
          const newRow = document.createElement("tr");
          const originalCells = originalRow.querySelectorAll("td");

          const originalSalInput =
            originalCells[originalHeadersLength]?.querySelector(
              "input.sal-input"
            );
          const salPercentValue = parseFloat(
            originalSalInput ? originalSalInput.value : "0"
          );

          const salPercentTd = document.createElement("td");
          salPercentTd.textContent = `${salPercentValue.toFixed(2)}%`;
          salPercentTd.classList.add("text-center");

          // Verifica error porcentaje 100%
          // if (isSalPercentError) {
          //   salPercentTd.classList.add("table-danger"); // Use Bootstrap's table-danger class
          // } else {
          //   salPercentTd.classList.remove("table-danger"); // Ensure class is removed if no error
          // }

          newRow.appendChild(salPercentTd);

          const salImportoValue =
            originalCells[originalHeadersLength + 1]?.textContent;
          const salImportoTd = document.createElement("td");
          salImportoTd.textContent = salImportoValue || "0,00";
          salImportoTd.classList.add("text-center");
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

        //Validation for 100% total row
        // if (isSalPercentError) {
        //   totalSalPercentTd.textContent = `${currentSectionSalPercentTotal.toFixed(
        //     2
        //   )}% (ERROR)`;
        //   newTotalRow.classList.add("table-danger"); // Apply table-danger to the total row too
        // } else {
        //   totalSalPercentTd.textContent = originalTotalSalPercentText || "";
        //   newTotalRow.classList.remove("table-danger"); // Ensure class is removed
        // }

        //totalSalPercentTd.classList.add("text-center");
        newTotalRow.appendChild(totalSalPercentTd);

        const totalImportoSalTd = document.createElement("td");
        const originalTotalImportoSalText =
          totalOriginalRow.children[totalOriginalRow.children.length - 1]
            ?.textContent;
        totalImportoSalTd.textContent = originalTotalImportoSalText || "0,00";
        totalImportoSalTd.classList.add("text-center");
        newTotalRow.appendChild(totalImportoSalTd);

        tbody.appendChild(newTotalRow);
      }
    });

    // // Separator and Global SAL Total (no changes)
    // const grandTotalSeparatorRow = document.createElement("tr");
    // const grandTotalSeparatorCell = document.createElement("td");
    // grandTotalSeparatorCell.colSpan = 2;
    // grandTotalSeparatorCell.style.height = "20px";
    // grandTotalSeparatorCell.style.borderTop = "2px dashed #007bff";
    // grandTotalSeparatorCell.style.backgroundColor = "#f0f8ff";
    // grandTotalSeparatorRow.appendChild(grandTotalSeparatorCell);
    // tbody.appendChild(grandTotalSeparatorRow);

    // const finalGrandTotalRow = document.createElement("tr");
    // finalGrandTotalRow.classList.add("table-primary", "fw-bold");

    // const grandTotalLabelTd = document.createElement("td");
    // //grandTotalLabelTd.textContent = "TOTAL GLOBAL SAL:";
    // grandTotalLabelTd.textContent = "";
    // grandTotalLabelTd.colSpan = 1;
    // finalGrandTotalRow.appendChild(grandTotalLabelTd);

    // const grandTotalValueTd = document.createElement("td");
    // const totalSummaryTable = document.getElementById("summaryTableWrapper");
    // if (totalSummaryTable) {
    //   const lastRow = totalSummaryTable.querySelector("tbody tr:last-child");
    //   if (lastRow && lastRow.children.length > 1) {
    //     grandTotalValueTd.textContent = lastRow.children[1].textContent;
    //   }
    // } else {
    //   grandTotalValueTd.textContent = "0,00";
    // }
    // grandTotalValueTd.classList.add("text-center");
    // finalGrandTotalRow.appendChild(grandTotalValueTd);

    // tbody.appendChild(finalGrandTotalRow);
    // this._actualizarSalPercentTotal(tbody);
  }

  // _actualizarSalPercentTotal(tbody) {
  //   const salRows = Array.from(tbody.querySelectorAll("tr")).filter(
  //     (tr) =>
  //       tr.children.length >= 2 &&
  //       !tr.classList.contains("total-row") &&
  //       !tr.classList.contains("sal-copy-total-row")
  //   );

  //   let totalSalPercent = 0;

  //   salRows.forEach((row) => {
  //     const salCell = row.children[0];
  //     const valueStr = salCell?.textContent?.replace("%", "").trim();
  //     const value = parseFloat(valueStr.replace(",", ".")) || 0;
  //     totalSalPercent += value;
  //   });

  //   const totalRow = tbody.querySelector("tr.sal-copy-total-row");
  //   if (totalRow && totalRow.children.length >= 2) {
  //     totalRow.children[0].textContent = `${totalSalPercent
  //       .toFixed(2)
  //       .replace(".", ",")}%`;
  //   }
  // }

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
  _validateSalRowsBetweenTables() {
    const tables = this.generatedSalTables;
    if (tables.length < 2) return;

    const prevTable = tables[tables.length - 2].element.querySelector("table");
    const currTable = tables[tables.length - 1].element.querySelector("table");

    if (!prevTable || !currTable) return;

    const prevRows = Array.from(prevTable.querySelectorAll("tbody tr")).filter(
      (tr) => tr.children.length >= 2 && !tr.classList.contains("total-row")
    );

    const currRows = Array.from(currTable.querySelectorAll("tbody tr")).filter(
      (tr) => tr.children.length >= 2 && !tr.classList.contains("total-row")
    );

    const rowCount = Math.min(prevRows.length, currRows.length);
    let salPercentTotal = 0;

    for (let i = 0; i < rowCount; i++) {
      // const prevCell = prevRows[i].children[1];
      // const currCell = currRows[i].children[1];
      const prevCell = prevRows[i].children[0];
      const currCell = currRows[i].children[0];

      if (!prevCell || !currCell) continue;

      const prevVal = this._parseNumber(prevCell.textContent);
      const currVal = this._parseNumber(currCell.textContent);

      salPercentTotal += currVal;

      // Comparación con la tabla anterior
      if (prevVal > currVal + 0.001) {
        currCell.classList.add("table-warning");
        currCell.title = "Controllare Valore % inserito";
        currCell.style.cursor = "help";
      } else {
        currCell.classList.remove("table-warning");
        currCell.title = "";
        currCell.style.cursor = "default";
      }
    }

    // // Verificar si se supera el 100%
    // if (salPercentTotal > 100.001) {
    //   for (let i = 0; i < rowCount; i++) {
    //     const currCell = currRows[i].children[1];
    //     currCell.classList.add("table-danger");
    //     currCell.title = "Totale SAL% supera il 100%";
    //   }
    // } else {
    //   for (let i = 0; i < rowCount; i++) {
    //     const currCell = currRows[i].children[1];
    //     currCell.classList.remove("table-danger");
    //     // No toques el título si hay otra advertencia activa
    //     if (!currCell.classList.contains("table-warning")) {
    //       currCell.title = "";
    //     }
    //   }
    // }
    let totalSalPercentCurrTable = 0;
    currRows.forEach((row) => {
      const salPercentCell = row.children[0]; // SAL % celda
      if (salPercentCell) {
        const val = this._parseNumber(
          salPercentCell.textContent.replace("%", "")
        );
        totalSalPercentCurrTable += val;
      }
    });

    if (
      totalSalPercentCurrTable > 100.001 ||
      totalSalPercentCurrTable < -0.001
    ) {
      // Error si es >100% o <0%
      currRows.forEach((row) => {
        const salPercentCell = row.children[0]; // SAL % celda
        if (salPercentCell) {
          salPercentCell.classList.add("table-danger");
          salPercentCell.title = "Totale SAL% supera il 100%"; // Mensaje para total de columna
          salPercentCell.style.cursor = "help";
        }
      });
    } else {
      // Si no hay error en el total de la columna, asegurarse de quitar la clase table-danger
      currRows.forEach((row) => {
        const salPercentCell = row.children[0];
        if (salPercentCell) {
          salPercentCell.classList.remove("table-danger");
          // Si la celda no tiene table-warning, quitar también el título
          if (!salPercentCell.classList.contains("table-warning")) {
            salPercentCell.removeAttribute("title");
            salPercentCell.style.cursor = "default";
          }
        }
      });
    }

    // Verificar si se supera el 100% por fila (horizontalmente)
    for (let i = 0; i < rowCount; i++) {
      let totalPerRow = 0;
      for (let t = 0; t < tables.length; t++) {
        const tableElement = tables[t].element.querySelector("table");
        const row = tableElement?.querySelectorAll("tbody tr")[i];
        if (!row || row.children.length < 2) continue;
        const cell = row.children[0]; // SAL %
        const val = this._parseNumber(cell.textContent.replace("%", ""));
        totalPerRow += val;
      }

      const currCell = currRows[i].children[0]; // SAL %
      if (totalPerRow > 100.001) {
        console.log(`Fila ${i}: totalPerRow = ${totalPerRow}`);
        currCell.classList.add("table-danger");
        currCell.title = "Somma SAL% supera il 100%";
        currCell.style.cursor = "help";
      } else {
        currCell.classList.remove("table-danger");
        if (!currCell.classList.contains("table-warning")) {
          currCell.title = "";
        }
      }
      //console.log(`Fila ${i}: totalPerRow = ${totalPerRow}`);
    }
  }

  // _parseNumber(str) {
  //   return parseFloat(str.replace(/\./g, "").replace(",", ".")) || 0;
  // }
  _parseNumber(str) {
    if (!str) return 0;
    str = str.trim();

    // Si tiene coma, asumimos formato europeo y lo convertimos
    if (str.includes(",")) {
      return parseFloat(str.replace(/\./g, "").replace(",", ".")) || 0;
    }

    // Si no tiene coma, asumimos que ya viene como número JS válido
    return parseFloat(str) || 0;
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
