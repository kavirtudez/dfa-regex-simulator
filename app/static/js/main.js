document.addEventListener("DOMContentLoaded", () => {
  const regexInput = document.getElementById("regex");
  const inputString = document.getElementById("input-string");
  const simulateBtn = document.getElementById("simulate-btn");
  const resultsSection = document.querySelector(".results-section");
  const errorMessage = document.getElementById("error-message");
  const acceptanceStatus = document.getElementById("acceptance-status");
  const statsList = document.getElementById("stats-list");
  const pathDisplay = document.getElementById("path-display");
  const dfaImage = document.getElementById("dfa-image");
  const dfaFrameImg = document.getElementById("dfa-frame-img");
  const dfaFrameContainer = document.getElementById("dfa-frame-container");

  const presetRegexes = {
    preset1: {
      regex:
        "(1|0)*(11|00|101|010)(11|00)*(11|00|0|1)(1|0|11)(11|00)*(101|000|111)(1|0)*(101|000|111|001|100)(11|00|1|0)*",
      img: "dfa_preset1.png",
    },
    preset2: {
      regex:
        "(a|b)*(aa|bb)(aa|bb)*(ab|ba|aba)(bab|aba|bbb)(a|b|bb|aa)*(bb|aa|aba)(aaa|bab|bba)(aaa|bab|bba)*",
      img: "dfa_preset2.png",
    },
  };

  const regexOptions = document.getElementById("regex-options");
  const initialDfaSection = document.getElementById("initial-dfa-section");
  const initialDfaImg = document.getElementById("initial-dfa-img");
  const playAgainBtn = document.getElementById("play-again-btn");

  let currentFrameIndex = 0;
  let frames = [];
  let animationInterval = null;

  function showFrame(idx) {
    if (!dfaFrameImg || !frames.length) return;
    dfaFrameImg.src = frames[idx];
  }

  regexOptions.addEventListener("click", (e) => {
    if (e.target.classList.contains("regex-btn")) {
      document
        .querySelectorAll(".regex-btn")
        .forEach((btn) => btn.classList.remove("active"));
      e.target.classList.add("active");
      const val = e.target.getAttribute("data-choice");
      if (val === "preset1" || val === "preset2") {
        regexInput.value = presetRegexes[val].regex;
        regexInput.readOnly = true;
        // Show initial DFA for preset
        initialDfaSection.style.display = "block";
        initialDfaImg.src = `/dfa_frames/${presetRegexes[val].img}`;
      } else {
        regexInput.value = "";
        regexInput.readOnly = false;
        initialDfaSection.style.display = "none";
      }
      // Reset UI
      playAgainBtn.style.display = "none";
      if (document.getElementById("input-string-visual")) {
        document.getElementById("input-string-visual").innerHTML = "";
      }
    }
  });

  // On page load, ensure custom is selected
  regexInput.readOnly = false;
  initialDfaSection.style.display = "none";

  simulateBtn.addEventListener("click", async () => {
    // Reset UI
    errorMessage.style.display = "none";
    resultsSection.style.display = "none";
    if (animationInterval) {
      clearInterval(animationInterval);
      animationInterval = null;
    }

    const regex = regexInput.value.trim();
    const testInput = inputString.value.trim();

    if (!regex || !testInput) {
      showError("Please enter both a regular expression and an input string.");
      return;
    }

    try {
      const response = await fetch("/simulate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          regex: regex,
          input_string: testInput,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "An error occurred during simulation");
      }

      displayResults(data);
    } catch (error) {
      showError(error.message);
    }
  });

  function displayMappingTable(stateLabels) {
    const container = document.getElementById("mapping-table-container");
    let html =
      '<table class="mapping-table"><thead><tr><th>DFA State</th><th>Original Set</th></tr></thead><tbody>';
    for (const [label, orig] of Object.entries(stateLabels)) {
      html += `<tr><td>${label}</td><td>${orig}</td></tr>`;
    }
    html += "</tbody></table>";
    container.innerHTML = html;
  }

  document.getElementById("toggle-mapping").addEventListener("click", () => {
    const container = document.getElementById("mapping-table-container");
    const btn = document.getElementById("toggle-mapping");
    if (container.style.display === "none") {
      container.style.display = "block";
      btn.textContent = "Hide State Mapping";
    } else {
      container.style.display = "none";
      btn.textContent = "Show State Mapping";
    }
  });

  function highlightInputString(str, step) {
    let html = "";
    for (let i = 0; i < str.length; i++) {
      if (i === step) {
        html += `<span class="current-symbol">${str[i]}</span>`;
      } else {
        html += str[i];
      }
    }
    return html;
  }

  function displayResults(data) {
    resultsSection.style.display = "block";

    // Update acceptance status
    acceptanceStatus.textContent = data.accepted ? "Accepted" : "Rejected";
    acceptanceStatus.className = data.accepted ? "accepted" : "rejected";

    // Update stats
    statsList.innerHTML = `<li>Steps Taken: ${
      data.frame_urls ? data.frame_urls.length : 0
    }</li>`;

    // Display transition path
    let pathHtml = "";
    data.path.forEach(([src, sym, dst]) => {
      pathHtml += `${src} → ${sym} → ${dst}<br/>`;
    });
    pathHtml += `<span class="current-step">${data.final_state} (Final State)</span>`;
    pathDisplay.innerHTML = pathHtml;

    // Set up animation
    frames = data.frame_urls;
    currentFrameIndex = 0;
    playAgainBtn.style.display = "none";

    if (!dfaFrameImg || !frames.length) return;

    showFrame(0);

    // Animate input string
    const inputStr = inputString.value;
    const inputStringVisual = document.getElementById("input-string-visual");
    if (inputStringVisual) {
      inputStringVisual.innerHTML = highlightInputString(inputStr, 0);
    }

    if (animationInterval) clearInterval(animationInterval);
    animationInterval = setInterval(() => {
      currentFrameIndex = (currentFrameIndex + 1) % frames.length;
      showFrame(currentFrameIndex);
      if (inputStringVisual) {
        inputStringVisual.innerHTML = highlightInputString(
          inputStr,
          currentFrameIndex
        );
      }
    }, 1000);
  }

  playAgainBtn.addEventListener("click", () => {
    if (!frames.length) return;
    currentFrameIndex = 0;
    showFrame(0);
    playAgainBtn.style.display = "none";

    const inputStr = inputString.value;
    const inputStringVisual = document.getElementById("input-string-visual");
    if (inputStringVisual) {
      inputStringVisual.innerHTML = highlightInputString(inputStr, 0);
    }

    if (animationInterval) clearInterval(animationInterval);
    animationInterval = setInterval(() => {
      currentFrameIndex = (currentFrameIndex + 1) % frames.length;
      showFrame(currentFrameIndex);
      if (inputStringVisual) {
        inputStringVisual.innerHTML = highlightInputString(
          inputStr,
          currentFrameIndex
        );
      }
    }, 1000);
  });

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = "block";
  }
});
