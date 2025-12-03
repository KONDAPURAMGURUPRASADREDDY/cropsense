document.addEventListener("DOMContentLoaded", function () {
  AOS?.init({ duration: 700, once: true });

  const aiOverlay = document.getElementById("aiFormOverlay");
  const openFormBtn = document.getElementById("openFormBtn");
  const closeFormBtn = document.getElementById("closeFormBtn");
  const aiMainContent = document.getElementById("aiMainContent");
  const prevBtn = document.getElementById("prevStepBtn");
  const getRecoBtn = document.getElementById("getRecommendationBtn");
  const steps = Array.from(document.querySelectorAll(".step-card"));
  const progressBar = document.getElementById("progressBar");
  const progressLabel = document.getElementById("curStepNum");
  const resultPage = document.getElementById("recommendationResultsArea");
  const inputSummary = document.getElementById("inputSummary");
  const recommendationOutput = document.getElementById("recommendationOutput");

  let currentStep = 0;
  const totalSteps = steps.length;
  const stepProgress = 100 / totalSteps;

  // -------------------------------------------
  // INPUT STATE
  // -------------------------------------------
  const inputs = {
    crop: null,
    previousCrop: null,
    soilType: null,
    soilTexture: null,
    growthStage: null,
    irrigationType: null,
    irrigationStatus: null,
    irrigationCount: 0,
    leafColor: null,
    spots: null,
    pests: null,
    leafYellowPercent: 0,
    quickHumidity: null,
    rainfall15: 0,
    usedFertilizer: "No",
    fertilizerType: "",
    fertilizerQty: 0,
    usedPesticide: "No",
    pesticideType: "",
    pesticideQty: 0,
    usedFungicide: "No",
    fungSprays: 0,
    rainfallTouched: false,
    leafYellowTouched: false,
    irrigationCountTouched: false,
    fungSpraysTouched: false,
  };

  // -------------------------------------------
  // VALIDATION
  // -------------------------------------------
  function isStepComplete(stepIndex) {
    if (stepIndex === 0) return inputs.crop;
    if (stepIndex === 1) return inputs.previousCrop;
    if (stepIndex === 2) return inputs.soilType && inputs.soilTexture;
    if (stepIndex === 3) return inputs.growthStage;
    if (stepIndex === 4)
      return (
        inputs.irrigationType &&
        inputs.irrigationStatus &&
        inputs.irrigationCountTouched
      );
    if (stepIndex === 5)
      return (
        inputs.leafColor &&
        inputs.spots &&
        inputs.pests &&
        inputs.leafYellowTouched
      );
    if (stepIndex === 6)
      return inputs.quickHumidity !== null && inputs.rainfallTouched;
    if (stepIndex === 7) {
      return (
        inputs.crop &&
        inputs.previousCrop &&
        inputs.soilType &&
        inputs.soilTexture &&
        inputs.growthStage &&
        inputs.irrigationType &&
        inputs.irrigationStatus &&
        inputs.irrigationCount >= 0 &&
        inputs.leafColor &&
        inputs.spots &&
        inputs.pests &&
        inputs.leafYellowPercent >= 0 &&
        inputs.quickHumidity !== null &&
        inputs.rainfall15 >= 0 &&
        (inputs.usedFertilizer === "No" ||
          (inputs.fertilizerType && inputs.fertilizerQty >= 0)) &&
        (inputs.usedPesticide === "No" ||
          (inputs.pesticideType && inputs.pesticideQty >= 0)) &&
        (inputs.usedFungicide === "No" || inputs.fungSprays >= 0)
      );
    }
    return false;
  }

  // auto-next-step

  function autoNextStep() {
    if (isStepComplete(currentStep)) {
      if (currentStep < totalSteps - 1) {
        showStep(currentStep + 1);
      }
    }
  }

  // -------------------------------------------
  // SHOW STEP
  // -------------------------------------------
  function showStep(n) {
    if (n >= totalSteps) return;
    steps.forEach((s, i) => s.classList.toggle("active", i === n));
    currentStep = n;

    progressBar.style.width = `${stepProgress * (n + 1)}%`;
    progressLabel.textContent = n + 1;
    prevBtn.style.display = n === 0 ? "none" : "inline-block";

    updateNavigationButton();
    aiOverlay.scrollTop = 0;
  }

  // -------------------------------------------
  // OPEN/CLOSE FORM
  // -------------------------------------------
  openFormBtn?.addEventListener("click", () => {
    aiOverlay.classList.remove("d-none");
    if (resultPage) resultPage.style.display = "none";
    aiMainContent.style.display = "block";
    showStep(0);
  });

  closeFormBtn?.addEventListener("click", () => {
    aiOverlay.classList.add("d-none");
  });

  prevBtn?.addEventListener("click", () => {
    if (currentStep > 0) showStep(currentStep - 1);
  });

  // -------------------------------------------
  // NEXT BUTTON / GET RECOMMENDATION BUTTON
  // -------------------------------------------
  function updateNavigationButton() {
    const isFinalStep = currentStep === totalSteps - 1;
    const ok = isStepComplete(currentStep);

    if (currentStep === totalSteps - 1) {
      getRecoBtn.classList.remove("d-none"); // show only at last step
    } else {
      getRecoBtn.classList.add("d-none"); // hide for all other steps
    }
  }

  // -------------------------------------------
  // IMAGE SELECTION INPUTS
  // -------------------------------------------
  document.querySelectorAll(".img-selection").forEach((box) => {
    box.addEventListener("click", () => {
      const field = box.dataset.field;
      const value = box.dataset.value;

      inputs[field] = value;

      box
        .closest(".selection-grid")
        ?.querySelectorAll(".img-selection")
        .forEach((el) => el.classList.remove("selected"));

      box.classList.add("selected");

      updateNavigationButton();
      autoNextStep(); // 🔥 AUTO MOVE TO NEXT STEP
    });
  });

  // -------------------------------------------
  // RADIO INPUTS
  // -------------------------------------------
  document.querySelectorAll('input[type="radio"]').forEach((r) => {
    r.addEventListener("change", (e) => {
      const name = e.target.name;
      const value = e.target.value;

      if (name in inputs) inputs[name] = value;

      if (name === "usedFertilizer")
        document
          .getElementById("fertilizerDetails")
          ?.classList.toggle("d-none", value === "No");

      if (name === "usedPesticide")
        document
          .getElementById("pesticideDetails")
          ?.classList.toggle("d-none", value === "No");

      if (name === "usedFungicide")
        document
          .getElementById("fungicideDetails")
          ?.classList.toggle("d-none", value === "No");

      updateNavigationButton();
      autoNextStep();
    });
  });

  // -------------------------------------------
  // SLIDERS
  // -------------------------------------------
  const leafSlider = document.getElementById("leafYellowRange");
  const leafBox = document.getElementById("leafPercentBox");

  leafSlider?.addEventListener("input", () => {
    inputs.leafYellowTouched = true;
    const value = Number(leafSlider.value);
    inputs.leafYellowPercent = value;
    leafBox.textContent = value + "%";
    leafBox.style.backgroundColor = `rgb(${Math.floor(
      (255 * value) / 100
    )},255,0)`;
    updateNavigationButton();
  });
  leafSlider?.addEventListener("change", () => {
    autoNextStep();
  });

  const rainSlider = document.getElementById("rainfallRange");
  const rainBox = document.getElementById("rainfallValueBox");

  rainSlider?.addEventListener("input", () => {
    inputs.rainfallTouched = true;
    inputs.rainfall15 = Number(rainSlider.value);
    rainBox.textContent = `${rainSlider.value} mm`;
    updateNavigationButton();
  });
  rainSlider?.addEventListener("change", () => {
    autoNextStep();
  });

  // -------------------------------------------
  // STEP 8 INPUTS
  // -------------------------------------------
  document.getElementById("fertilizerType")?.addEventListener("change", (e) => {
    inputs.fertilizerType = e.target.value;
    updateNavigationButton();
  });

  document.getElementById("pesticideType")?.addEventListener("change", (e) => {
    inputs.pesticideType = e.target.value;
    updateNavigationButton();
  });

  document.getElementById("fertQtyRange")?.addEventListener("input", (e) => {
    inputs.fertilizerQty = Number(e.target.value);
    document.getElementById("fertQtyBox").textContent = e.target.value;
    updateNavigationButton();
  });
  document.getElementById("fertQtyRange")?.addEventListener("change", () => {
    autoNextStep();
  });

  document.getElementById("pestQtyRange")?.addEventListener("input", (e) => {
    inputs.pesticideQty = Number(e.target.value);
    document.getElementById("pestQtyBox").textContent = e.target.value;
    updateNavigationButton();
  });
  document.getElementById("pestQtyRange")?.addEventListener("change", () => {
    autoNextStep();
  });

  document.getElementById("irrigationCount")?.addEventListener("input", (e) => {
    inputs.irrigationCountTouched = true;
    let val = Number(e.target.value);
    if (val < 0) val = 0;
    if (val > 25) val = 25;
    inputs.irrigationCount = val;
    e.target.value = val;
    updateNavigationButton();
  });
document.getElementById("irrigationCount")?.addEventListener("change", () => {
    autoNextStep();
  });

  document.getElementById("fungSprays")?.addEventListener("input", (e) => {
    inputs.fungSpraysTouched = true;
    let val = Number(e.target.value);
    if (val < 0) val = 0;
    inputs.fungSprays = val;
    e.target.value = val;
    updateNavigationButton();
  });
document.getElementById("fungSprays")?.addEventListener("change", () => {
    autoNextStep();
  });

  // -------------------------------------------
  // GET RECOMMENDATIONS — API CALL
  // -------------------------------------------
  getRecoBtn.addEventListener("click", () => {
    if (getRecoBtn.disabled) return;

    if (currentStep < totalSteps - 1) {
      showStep(currentStep + 1);
      return;
    }

    // -------------------------------------------
    // FRONTEND → BACKEND MAPPING FIXED
    // -------------------------------------------
    // ----------- FRONTEND → BACKEND PAYLOAD (use keys backend expects) -----------
    const js_to_flask_data = {
      // basic
      crop: inputs.crop,
      previousCrop: inputs.previousCrop,

      // soil
      soilType: inputs.soilType,
      soilTexture: inputs.soilTexture,

      // growth / stage
      growthStage: inputs.growthStage, // backend expects "growthStage" or "stage_days"
      // irrigation
      irrigationType: inputs.irrigationType,
      irrigationStatus: inputs.irrigationStatus,
      irrigationCount: Number(inputs.irrigationCount || 0),
      irrigationLast7: 0,

      // leaf & pests
      leafColor: inputs.leafColor,
      spots: inputs.spots,
      pests: inputs.pests,
      leafYellowPercent: Number(inputs.leafYellowPercent || 0),

      // weather
      rainfall: Number(inputs.rainfall15 || 0),
      temperature: Number(inputs.temperature || 28),
      humidity: Number(inputs.humidity || 60),
      sunlight_hours: Number(inputs.sunlight_hours || 7),

      // fertilizer / pesticide / fungicide
      usedFertilizer: inputs.usedFertilizer || "No",
      fertilizerType: inputs.fertilizerType || "",
      fertQty: Number(inputs.fertilizerQty || 0), // backend looks for last_fertilizer_dosage names too

      usedPesticide: inputs.usedPesticide || "No",
      pesticideType: inputs.pesticideType || "",
      pestQty: Number(inputs.pesticideQty || 0),

      usedFungicide: inputs.usedFungicide || "No",
      fungSprays: Number(inputs.fungSprays || 0),

      // misc
      plantHeight: Number(inputs.plantHeight || 60),
    };

    aiMainContent.style.display = "none";
    aiOverlay.classList.add("d-none");
    resultPage.style.display = "block";

    recommendationOutput.innerHTML =
      '<div class="spinner-border text-success"></div> Fetching AI recommendation...';

    // -------------------------------------------
    // INPUT SUMMARY RENDER
    // -------------------------------------------
    let summaryHtml = "";
    for (const key in inputs) {
      let label = key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (s) => s.toUpperCase());

      let value = inputs[key];
      if (value === null || value === "" || value === undefined)
        value = "Not Provided";

      summaryHtml += `<strong>${label}:</strong> ${value}<br>`;
    }
    inputSummary.innerHTML = summaryHtml;

    // -------------------------------------------
    // SEND DATA TO BACKEND
    // -------------------------------------------
fetch("/get_recommendation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(js_to_flask_data),
})
  .then((response) => {
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      return response.json();
  })
  .then((data) => {
      if (data.status !== "success") {
          recommendationOutput.innerHTML =
              "❌ Error from Backend: " + (data.message || "Unknown error");
          return;
      }

      // Build Deficiency List HTML
      let deficiencyHTML = "";
      if (data.deficiencies && data.deficiencies.length > 0) {
          deficiencyHTML += `<h5 class="mt-4 fw-bold">Detected Deficiencies:</h5><ul>`;
          data.deficiencies.forEach((d) => {
              deficiencyHTML += `<li><b>${d.deficiency}</b> (severity: ${d.severity})</li>`;
          });
          deficiencyHTML += `</ul>`;
      } else {
          deficiencyHTML = `<p>No major deficiencies detected.</p>`;
      }

      // Build Treatment Recommendations HTML
      let treatmentHTML = "";
      if (data.treatments && data.treatments.length > 0) {
          treatmentHTML += `<h5 class="mt-4 fw-bold">Top Treatment Recommendations:</h5><ol>`;
          data.treatments.forEach((t) => {
              treatmentHTML += `
                <li class="mb-2">
                  <b>${t.Fertilizer}</b> – ${t.Dose}<br>
                  <span class="text-muted">${t.Notes}</span>
                </li>
              `;
          });
          treatmentHTML += `</ol>`;
      } else {
          treatmentHTML = `<p>No treatment recommendations available.</p>`;
      }

      // Main Output Block
      recommendationOutput.innerHTML = `
<div class="p-3 rounded">

  <p class="mt-3">
    <strong>Soil Quality Index (SQI):</strong>
    <span class="fw-bold">${data.sqi_text}</span>
    (${data.sqi.toFixed(2)}/5)
  </p>

  <p>
    <strong>Crop Health Index (CHI):</strong>
    <span class="fw-bold">${data.phi_text}</span>
    (${data.phi.toFixed(2)}/10)
  </p>

  <p class="mt-4">
    <strong>${data.final_message}</strong>
  </p>

  <p class="mt-3">
    <strong>Estimated N/P/K:</strong>
    ${data.N}/${data.P}/${data.K} kg/ha
  </p>

  <div class="mt-4">${deficiencyHTML}</div>
  <div class="mt-4">${treatmentHTML}</div>

</div>
      `;
  })
  .catch((error) => {
      recommendationOutput.innerHTML = "Network Error: " + error.message;
  });


  // ---------------------------------------------------------------------
  // DOWNLOAD PDF FUNCTION (unchanged)
  // ---------------------------------------------------------------------
  function downloadRecommendationReport() {
    if (typeof window.jspdf === "undefined") {
      alert("jsPDF not loaded");
      return;
    }

    const { jsPDF } = window.jspdf;
    const inputElement = document.getElementById("recommendationResultsArea");

    html2canvas(inputElement, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save("CropSense_Report.pdf");
    });
  }

  window.downloadRecommendationReport = downloadRecommendationReport;
});

}); 