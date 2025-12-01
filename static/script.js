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
        inputs.irrigationCount >= 0 &&
        inputs.irrigationCount <= 25
      );
    if (stepIndex === 5)
      return (
        inputs.leafColor &&
        inputs.spots &&
        inputs.pests &&
        inputs.leafYellowPercent >= 0 &&
        inputs.leafYellowPercent <= 100
      );
    if (stepIndex === 6)
      return (
        inputs.quickHumidity !== null &&
        inputs.rainfall15 >= 0 &&
        inputs.rainfall15 <= 150
      );
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

    getRecoBtn.classList.remove("d-none");
    getRecoBtn.textContent = isFinalStep ? "Get Recommendations" : "Next Step";
    getRecoBtn.disabled = !ok;
  }

  // -------------------------------------------
  // IMAGE SELECTION INPUTS
  // -------------------------------------------
  document.querySelectorAll(".img-selection").forEach((box) => {
    box.addEventListener("click", () => {
      const field = box.dataset.field;
      const value = box.dataset.value;

      inputs[field] = value;

      box.closest(".selection-grid")
        ?.querySelectorAll(".img-selection")
        .forEach((el) => el.classList.remove("selected"));

      box.classList.add("selected");
      updateNavigationButton();
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
        document.getElementById("fertilizerDetails")
          ?.classList.toggle("d-none", value === "No");

      if (name === "usedPesticide")
        document.getElementById("pesticideDetails")
          ?.classList.toggle("d-none", value === "No");

      if (name === "usedFungicide")
        document.getElementById("fungicideDetails")
          ?.classList.toggle("d-none", value === "No");

      updateNavigationButton();
    });
  });

  // -------------------------------------------
  // SLIDERS
  // -------------------------------------------
  const leafSlider = document.getElementById("leafYellowRange");
  const leafBox = document.getElementById("leafPercentBox");

  leafSlider?.addEventListener("input", () => {
    const value = Number(leafSlider.value);
    inputs.leafYellowPercent = value;
    leafBox.textContent = value + "%";
    leafBox.style.backgroundColor = `rgb(${Math.floor(
      (255 * value) / 100
    )},255,0)`;
    updateNavigationButton();
  });

  const rainSlider = document.getElementById("rainfallRange");
  const rainBox = document.getElementById("rainfallValueBox");

  rainSlider?.addEventListener("input", () => {
    inputs.rainfall15 = Number(rainSlider.value);
    rainBox.textContent = `${rainSlider.value} mm`;
    updateNavigationButton();
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

  document.getElementById("pestQtyRange")?.addEventListener("input", (e) => {
    inputs.pesticideQty = Number(e.target.value);
    document.getElementById("pestQtyBox").textContent = e.target.value;
    updateNavigationButton();
  });

  document.getElementById("irrigationCount")?.addEventListener("input", (e) => {
    let val = Number(e.target.value);
    if (val < 0) val = 0;
    if (val > 25) val = 25;
    inputs.irrigationCount = val;
    e.target.value = val;
    updateNavigationButton();
  });

  document.getElementById("fungSprays")?.addEventListener("input", (e) => {
    let val = Number(e.target.value);
    if (val < 0) val = 0;
    inputs.fungSprays = val;
    e.target.value = val;
    updateNavigationButton();
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
    const js_to_flask_data = {
      crop_name: inputs.crop,
      previous_crop: inputs.previousCrop,
      soil_type: inputs.soilType,
      soil_texture: inputs.soilTexture,

      stage_days: inputs.growthStage,
      irrigation_type: inputs.irrigationType,
      irrigation_status: inputs.irrigationStatus,
      irrigation_count: inputs.irrigationCount,

      leaf_color: inputs.leafColor,
      leaf_yellow_percent: inputs.leafYellowPercent,
      spots: inputs.spots,
      pests: inputs.pests,

      rainfall: inputs.rainfall15,

      used_fertilizer: inputs.usedFertilizer,
      fertilizer_type: inputs.fertilizerType,
      fertilizer_qty: inputs.fertilizerQty,

      used_pesticide: inputs.usedPesticide,
      pesticide_type: inputs.pesticideType,
      pesticide_qty: inputs.pesticideQty,

      used_fungicide: inputs.usedFungicide,
      fungicide_count: inputs.fungSprays,

      temperature: 28,
      humidity: 60,
      sunlight_hours: 7,
      plant_height: 60,
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
        if (!response.ok)
          throw new Error(`Server error: ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (data.status !== "success") {
          recommendationOutput.innerHTML =
            "❌ Error from Backend: " + (data.message || "Unknown error");
          return;
        }

        recommendationOutput.innerHTML = `
          
          <p><strong>SQI:</strong> ${data.sqi ?? "N/A"}</p>
          <p><strong>CHI:</strong> ${data.phi ?? "N/A"}</p>

          <h5 class="mt-4 fw-bold">Estimated Soil Nutrients</h5>
          <pre>${JSON.stringify(data.nutrients, null, 2)}</pre>
        `;
      })
      .catch((error) => {
        recommendationOutput.innerHTML =
          "Network Error: " + error.message;
      });

    window.scrollTo({ top: resultPage.offsetTop, behavior: "smooth" });
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
