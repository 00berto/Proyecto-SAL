document.getElementById("fileInput").addEventListener("change", function (e) {
  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const table = document.getElementById("dataTable");
    table.innerHTML = "";

    const headers = [
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "SAL %",
      "Importo SAL",
      "A FINIRE %",
      "Importo A FINIRE",
    ];
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    headers.forEach((h) => {
      const th = document.createElement("th");
      th.textContent = h;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    json.forEach((row, index) => {
      if (index === 0) return;

      const tr = document.createElement("tr");

      for (let i = 0; i < 8; i++) {
        if (row[i] !== undefined && row[i] !== "") {
          const td = document.createElement("td");
          const value = parseFloat(row[i]);
          td.textContent = !isNaN(value) ? value.toFixed(2) : row[i];
          tr.appendChild(td);
        } else {
          const td = document.createElement("td");
          td.textContent = "";
          tr.appendChild(td);
        }
      }

      // --- Columna SAL %
      const salTd = document.createElement("td");
      const inputGroup = document.createElement("div");
      inputGroup.className = "input-group input-group-sm";

      const decrementBtn = document.createElement("button");
      decrementBtn.className = "btn btn-outline-secondary";
      decrementBtn.textContent = "−";

      const incrementBtn = document.createElement("button");
      incrementBtn.className = "btn btn-outline-secondary";
      incrementBtn.textContent = "+";

      const input = document.createElement("input");
      input.type = "number";
      input.className = "form-control text-end";
      input.step = "0.01";
      input.min = "0";
      input.max = "100";
      input.value = "0.00";

      inputGroup.appendChild(decrementBtn);
      inputGroup.appendChild(input);
      inputGroup.appendChild(incrementBtn);
      salTd.appendChild(inputGroup);

      const hValue = parseFloat(row[7]) || 0;

      const salImporto = document.createElement("td");
      salImporto.textContent = "0.00";

      const finirePercent = document.createElement("td");
      finirePercent.textContent = "100.00%";

      const finireImporto = document.createElement("td");
      finireImporto.textContent = hValue.toFixed(2);

      function updateSAL() {
        let val = parseFloat(input.value);
        val = isNaN(val) ? 0 : val;
        val = Math.max(0, Math.min(val, 100));
        input.value = val.toFixed(2);

        if (val > 100) {
          input.classList.add("error");
        } else {
          input.classList.remove("error");
        }

        const percent = val / 100;
        salImporto.textContent = (hValue * percent).toFixed(2);
        finirePercent.textContent = ((1 - percent) * 100).toFixed(2) + "%";
        finireImporto.textContent = (hValue * (1 - percent)).toFixed(2);
      }

      input.addEventListener("input", updateSAL);
      incrementBtn.addEventListener("click", () => {
        input.value = (parseFloat(input.value) + 1).toFixed(2);
        updateSAL();
      });
      decrementBtn.addEventListener("click", () => {
        input.value = (parseFloat(input.value) - 1).toFixed(2);
        updateSAL();
      });

      tr.appendChild(salTd);
      tr.appendChild(salImporto);
      tr.appendChild(finirePercent);
      tr.appendChild(finireImporto);

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
  };

  reader.readAsArrayBuffer(file);
});
