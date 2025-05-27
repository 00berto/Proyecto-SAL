document.getElementById("fileInput").addEventListener("change", function (e) {
  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = function (e) {
    document.getElementById(
      "fileNameTitle"
    ).textContent = `Archivo cargado: ${file.name}`;

    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const container = document.getElementById("dataTable");
    container.innerHTML = "";

    let currentBlock = [];
    let tableIndex = 0;

    function createTable(data, title) {
      if (!data.length) return;

      const table = document.createElement("table");
      table.className = "table table-bordered table-sm mb-4";

      const thead = document.createElement("thead");
      const headerRow = document.createElement("tr");

      // Headers reales del Excel
      json[0].forEach((colName) => {
        const th = document.createElement("th");
        th.textContent = colName;
        headerRow.appendChild(th);
      });

      ["SAL %", "Importo SAL", "A FINIRE %", "Importo A FINIRE"].forEach(
        (name) => {
          const th = document.createElement("th");
          th.textContent = name;
          // if (name === "SAL %") th.classList.add("col-sal");
          headerRow.appendChild(th);
        }
      );

      thead.appendChild(headerRow);
      table.appendChild(thead);

      const tbody = document.createElement("tbody");
      let totals = [0, 0, 0, 0]; // G,H,J,L -> 6,7,9,11

      data.forEach((row) => {
        const tr = document.createElement("tr");

        for (let i = 0; i < 8; i++) {
          const td = document.createElement("td");
          const value = row[i];
          td.textContent = !isNaN(parseFloat(value))
            ? parseFloat(value).toFixed(2)
            : value || "";
          tr.appendChild(td);
        }

        const salTd = document.createElement("td");
        const input = document.createElement("input");
        input.type = "number";
        input.className = "form-control text-end col-sal";
        input.min = "0";
        input.max = "100";
        //input.placeholder = "0.00";

        salTd.appendChild(input);

        const hValue = parseFloat(row[7]) || 0;
        const salImporto = document.createElement("td");
        const finirePercent = document.createElement("td");
        const finireImporto = document.createElement("td");

        salImporto.textContent = "0.00";
        finirePercent.textContent = "100.00%";
        finireImporto.textContent = hValue.toFixed(2);

        input.addEventListener("input", function () {
          let val = parseFloat(input.value);
          val = isNaN(val) ? 0 : Math.max(0, Math.min(val, 100));
          input.value = val.toFixed(2);

          input.classList.toggle("error", val < 0 || val > 100);

          const percent = val / 100;
          salImporto.textContent = (hValue * percent).toFixed(2);
          finirePercent.textContent = ((1 - percent) * 100).toFixed(2) + "%";
          finireImporto.textContent = (hValue * (1 - percent)).toFixed(2);
        });

        tr.appendChild(salTd);
        tr.appendChild(salImporto);
        tr.appendChild(finirePercent);
        tr.appendChild(finireImporto);

        tbody.appendChild(tr);

        // Totales para G,H,J,L
        totals[0] += parseFloat(row[6]) || 0;
        totals[1] += parseFloat(row[7]) || 0;
        totals[2] += parseFloat(row[9]) || 0;
        totals[3] += parseFloat(row[11]) || 0;
      });

      // Fila de totales
      const totalRow = document.createElement("tr");
      for (let i = 0; i < 12; i++) {
        const td = document.createElement("td");
        if ([6, 7, 9, 11].includes(i)) {
          td.textContent = totals[[6, 7, 9, 11].indexOf(i)].toFixed(2);
        } else {
          td.textContent = "";
        }
        totalRow.appendChild(td);
      }
      tbody.appendChild(totalRow);

      table.appendChild(tbody);

      // Título de la tabla
      const titleEl = document.createElement("h5");
      titleEl.textContent = title || `Sección ${++tableIndex}`;
      container.appendChild(titleEl);
      container.appendChild(table);
    }

    json.forEach((row, index) => {
      if (index === 0) return; // cabecera

      if (row[0] !== undefined && row[0] !== "") {
        if (currentBlock.length) {
          createTable(
            currentBlock,
            currentBlock[0][0] +
              " " +
              currentBlock[0][1] +
              " " +
              currentBlock[0][2]
          );
          currentBlock = [];
        }
        // También incluye esta como primera fila de la nueva tabla
        currentBlock.push(row);
      } else {
        currentBlock.push(row);
      }
    });

    // Última tabla
    if (currentBlock.length) {
      createTable(
        currentBlock,
        currentBlock[0][0] + " " + currentBlock[0][1] + " " + currentBlock[0][2]
      );
    }
  };

  reader.readAsArrayBuffer(file);
});
