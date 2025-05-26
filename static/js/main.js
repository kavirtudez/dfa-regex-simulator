document.addEventListener("DOMContentLoaded", () => {
  // UI Elements
  const regexSelect = document.getElementById("regex-select");
  const regexInput = document.getElementById("regex-input");
  const inputString = document.getElementById("input-string");
  const simulateBtn = document.getElementById("simulate-btn");
  const dfaSection = document.getElementById("dfa-section");
  const dfaImg = document.getElementById("dfa-img");
  const resultsSection = document.getElementById("results-section");
  const acceptanceStatus = document.getElementById("acceptance-status");
  const dfaStats = document.getElementById("dfa-stats");
  const pathDisplay = document.getElementById("path-display");
  const inputStringVisual = document.getElementById("input-string-visual");
  const playAgainBtn = document.getElementById("play-again-btn");
  const errorMessage = document.getElementById("error-message");
  const playPauseBtn = document.getElementById("play-pause-btn");
  const animationControls = document.querySelector(".animation-controls");
  const alertDialog = document.getElementById("alert-dialog");
  const alertTitle = document.getElementById("alert-title");
  const alertMessage = document.getElementById("alert-message");
  const alertOk = document.getElementById("alert-ok");
  const closeAlert = document.querySelector(".close-alert");
  const diagramButtons = document.querySelectorAll(".diagram-btn");
  const confirmationDialog = document.getElementById("confirmation-dialog");
  const confirmationTitle = document.getElementById("confirmation-title");
  const confirmationMessage = document.getElementById("confirmation-message");
  const confirmationConfirm = document.getElementById("confirmation-confirm");
  const confirmationCancel = document.getElementById("confirmation-cancel");
  const closeConfirmation = confirmationDialog.querySelector(".close-alert");
  const fullscreenView = document.getElementById("fullscreen-view");
  const fullscreenImg = document.getElementById("fullscreen-img");
  const closeFullscreen = document.querySelector(".close-fullscreen");
  const loadingPopup = document.getElementById("loading-popup");

  // Verify all required elements exist
  if (
    !regexSelect ||
    !regexInput ||
    !inputString ||
    !simulateBtn ||
    !dfaSection ||
    !dfaImg ||
    !resultsSection ||
    !acceptanceStatus ||
    !dfaStats ||
    !pathDisplay ||
    !errorMessage ||
    !playPauseBtn ||
    !animationControls ||
    !alertDialog ||
    !alertTitle ||
    !alertMessage ||
    !alertOk ||
    !closeAlert ||
    !diagramButtons ||
    !confirmationDialog ||
    !confirmationTitle ||
    !confirmationMessage ||
    !confirmationConfirm ||
    !confirmationCancel ||
    !closeConfirmation ||
    !fullscreenView ||
    !fullscreenImg ||
    !closeFullscreen ||
    !loadingPopup
  ) {
    console.error("Required DOM elements not found");
    return;
  }

  // Animation state
  let currentFrameIndex = 0;
  let frameUrls = [];
  let animationInterval = null;
  let isSimulating = false;
  let isPaused = false;
  let animationSpeed = 1000; // Default speed in milliseconds
  let currentDiagramType = "dfa";
  let pendingChange = null;

  // Initialize UI
  dfaSection.style.display = "none";
  dfaImg.src = "";
  resultsSection.style.display = "none";
  errorMessage.style.display = "none";
  animationControls.style.display = "none";

  // Alert dialog event listeners
  alertOk.addEventListener("click", () => {
    alertDialog.style.display = "none";
  });

  closeAlert.addEventListener("click", () => {
    alertDialog.style.display = "none";
  });

  window.addEventListener("click", (event) => {
    if (event.target === alertDialog) {
      alertDialog.style.display = "none";
    }
  });

  // Confirmation dialog handlers
  function showConfirmation(title, message, onConfirm, onCancel) {
    confirmationTitle.textContent = title;
    confirmationMessage.textContent = message;
    confirmationDialog.style.display = "flex";
    pendingChange = onConfirm;

    // Store the cancel callback
    confirmationDialog.dataset.cancelCallback = onCancel
      ? onCancel.toString()
      : "";
  }

  function hideConfirmation() {
    confirmationDialog.style.display = "none";
    pendingChange = null;
    confirmationDialog.dataset.cancelCallback = "";
  }

  confirmationConfirm.addEventListener("click", () => {
    if (pendingChange) {
      pendingChange();
    }
    hideConfirmation();
  });

  confirmationCancel.addEventListener("click", () => {
    // Execute cancel callback if it exists
    const cancelCallback = confirmationDialog.dataset.cancelCallback;
    if (cancelCallback) {
      try {
        eval(cancelCallback)();
      } catch (e) {
        console.error("Error executing cancel callback:", e);
      }
    }
    hideConfirmation();
  });

  closeConfirmation.addEventListener("click", () => {
    // Execute cancel callback if it exists
    const cancelCallback = confirmationDialog.dataset.cancelCallback;
    if (cancelCallback) {
      try {
        eval(cancelCallback)();
      } catch (e) {
        console.error("Error executing cancel callback:", e);
      }
    }
    hideConfirmation();
  });

  window.addEventListener("click", (event) => {
    if (event.target === confirmationDialog) {
      // Execute cancel callback if it exists
      const cancelCallback = confirmationDialog.dataset.cancelCallback;
      if (cancelCallback) {
        try {
          eval(cancelCallback)();
        } catch (e) {
          console.error("Error executing cancel callback:", e);
        }
      }
      hideConfirmation();
    }
  });

  // Handle regex selection
  regexSelect.addEventListener("change", () => {
    if (isSimulating) return;

    const selectedValue = regexSelect.value;
    const currentValue = regexInput.value;

    // Store the previous value to restore if cancelled
    // We need the original value to restore the correct state of diagram buttons as well
    const previousValue = regexInput.dataset.originalRegex
      ? regexSelect.value
      : "custom";

    // Show confirmation for any regex change
    showConfirmation(
      "Change Regular Expression",
      `Are you sure you want to change the regular expression${
        selectedValue === "custom" ? " to custom input" : ""
      }?`,
      () => {
        // Only proceed with the change if confirmed
        handleRegexChange(selectedValue);
      },
      () => {
        // Restore previous value and associated diagram button state if cancelled
        regexSelect.value = previousValue;
        handleRegexChange(previousValue, true); // Pass true to skip confirmation on revert
      }
    );
  });

  async function handleRegexChange(selectedValue, isRevert = false) {
    // Clear current diagram and reset UI
    dfaImg.src = "";
    dfaSection.style.display = "none";
    resetUI();

    // Update regex input and diagram button state
    const customRegexSelected = selectedValue === "custom";
    const cfgButton = document.querySelector('.diagram-btn[data-type="cfg"]');
    const pdaButton = document.querySelector('.diagram-btn[data-type="pda"]');
    const dfaButton = document.querySelector('.diagram-btn[data-type="dfa"]');

    if (customRegexSelected) {
      regexInput.value = "";
      regexInput.readOnly = false;

      // Disable CFG and PDA buttons for custom regex
      if (cfgButton) {
        cfgButton.disabled = true;
        cfgButton.classList.remove("active");
      }
      if (pdaButton) {
        pdaButton.disabled = true;
        pdaButton.classList.remove("active");
      }
      // Ensure DFA is active and enabled
      if (dfaButton) {
        dfaButton.disabled = false;
        dfaButton.classList.add("active");
      }
      currentDiagramType = "dfa"; // Switch to DFA if custom is selected
    } else {
      // Enable CFG and PDA buttons for preset regex
      if (cfgButton) cfgButton.disabled = false;
      if (pdaButton) pdaButton.disabled = false;

      // Get the original regex for functionality
      const originalRegex = window.presets[selectedValue];
      // Get the formatted regex for display
      const formattedRegex = regexSelect.querySelector(
        `option[value="${selectedValue}"]`
      ).dataset.formatted;

      // Store the original regex in a data attribute for use in simulation
      regexInput.dataset.originalRegex = originalRegex;
      // Display the formatted version
      regexInput.value = formattedRegex;
      regexInput.readOnly = true;

      // Show loading state only if not reverting a cancelled change
      if (!isRevert) {
        dfaSection.style.display = "block";
        dfaSection.classList.add("loading");
      }

      // If CFG or PDA is currently selected, load the preset image directly
      if (currentDiagramType === "cfg" || currentDiagramType === "pda") {
        const imageMap = {
          cfg: {
            preset1: "/static/CFG/CFG1.png", // Assuming images are in static/CFG
            preset2: "/static/CFG/CFG2.png",
          },
          pda: {
            preset1: "/static/PDA/PDA1.svg", // Correct path
            preset2: "/static/PDA/PDA2.svg", // Path for PDA2 (SVG)
          },
        };
        const imageUrl = imageMap[currentDiagramType]?.[selectedValue];

        if (imageUrl) {
          dfaImg.src = imageUrl;
          dfaSection.style.display = "block";
        } else {
          // Handle case where diagram type is selected but no image exists for this preset
          showAlert(
            "Information",
            `${currentDiagramType.toUpperCase()} diagram not available for this preset.`
          );
          dfaImg.src = ""; // Clear image
          dfaSection.style.display = "none";
        }
        // Remove loading state if present
        if (!isRevert) dfaSection.classList.remove("loading");
      } else {
        // For DFA or other types, proceed with API call
        try {
          const response = await fetch("/api/draw_dfa", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-cache",
            },
            body: JSON.stringify({
              regex: originalRegex, // Use original regex for API calls
              type: currentDiagramType,
              timestamp: new Date().getTime(),
            }),
          });

          const data = await response.json();

          if (data.error) {
            showAlert("Error", data.error);
            return;
          }

          dfaImg.src = `${data.image_url}?t=${new Date().getTime()}`;
          dfaSection.style.display = "block";
          // await new Promise((resolve) => {
          //   dfaImg.onload = resolve;
          // });
        } catch (error) {
          showAlert("Error", "Error generating diagram.");
          console.error(error);
        } finally {
          // Remove loading state if present
          if (!isRevert) dfaSection.classList.remove("loading");
        }
      }
    }
    // After handling regex change, ensure correct diagram button is active
    diagramButtons.forEach((b) => {
      b.classList.remove("active");
      if (b.dataset.type === currentDiagramType) {
        b.classList.add("active");
      }
    });
  }

  // Handle diagram type selection
  diagramButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (isSimulating || btn.disabled) return; // Prevent action if simulating or disabled

      const newType = btn.dataset.type;
      if (newType !== currentDiagramType) {
        showConfirmation(
          "Change Diagram Type",
          `Switch from ${currentDiagramType.toUpperCase()} to ${newType.toUpperCase()}?`,
          () => handleDiagramChange(newType, btn)
        );
      } else {
        // If clicking the active button, just ensure it's active (might be needed on revert)
        diagramButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      }
    });
  });

  async function handleDiagramChange(newType, btn) {
    try {
      showLoading(`Loading ${newType.toUpperCase()} diagram...`);

      // Update active button
      diagramButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentDiagramType = newType;

      const selectedRegexValue = regexSelect.value;
      const isPresetRegex =
        selectedRegexValue && selectedRegexValue !== "custom";

      dfaSection.classList.add("loading");
      dfaImg.src = "";

      if (isPresetRegex && (newType === "cfg" || newType === "pda")) {
        const imageMap = {
          cfg: {
            preset1: "/static/CFG/CFG1.png",
            preset2: "/static/CFG/CFG2.png",
          },
          pda: {
            preset1: "/static/PDA/PDA1.svg",
            preset2: "/static/PDA/PDA2.svg",
          },
        };
        const imageUrl = imageMap[newType]?.[selectedRegexValue];

        if (imageUrl) {
          dfaImg.src = imageUrl;
          dfaSection.style.display = "block";
        } else {
          showError(
            `${newType.toUpperCase()} diagram not available for this preset.`
          );
          dfaImg.src = "";
          dfaSection.style.display = "none";
        }
      } else if (selectedRegexValue) {
        const regexToUse =
          selectedRegexValue === "custom"
            ? regexInput.value
            : regexInput.dataset.originalRegex;

        if (!regexToUse) {
          showError("No regular expression selected.");
          return;
        }

        const response = await fetch("/api/draw_dfa", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            regex: regexToUse,
            type: currentDiagramType,
          }),
        });

        const data = await response.json();

        if (data.error) {
          showError(data.error);
          dfaImg.src = "";
          dfaSection.style.display = "none";
        } else {
          dfaImg.src = `${data.image_url}?t=${new Date().getTime()}`;
          dfaSection.style.display = "block";
        }
      } else {
        dfaImg.src = "";
        dfaSection.style.display = "none";
      }
    } catch (error) {
      console.error("Diagram change error:", error);
      showError("An error occurred while changing diagram type.");
      dfaImg.src = "";
      dfaSection.style.display = "none";
    } finally {
      dfaSection.classList.remove("loading");
      hideLoading();
    }
  }

  // Handle regex input changes
  regexInput.addEventListener("input", async () => {
    if (!regexInput.readOnly) {
      const inputValue = regexInput.value.trim();
      console.log("Custom regex input changed:", inputValue);

      // Clear previous diagram and results immediately when typing in custom regex
      dfaImg.src = "";
      dfaSection.style.display = "none";
      resetUI();

      // Clear any previous timeout for drawing
      if (regexInput.dataset.inputTimeout) {
        clearTimeout(regexInput.dataset.inputTimeout);
        delete regexInput.dataset.inputTimeout; // Clean up the dataset property
      }

      // For custom regex, we don't draw the diagram on every input.
      // The diagram will be drawn and validated when the Simulate button is pressed.

      // Keep the loading indicator logic if needed for visual feedback while typing might cause a delay later,
      // but it's probably better to remove it here and only show on simulate.
      // dfaSection.classList.remove("loading");
    } else {
      // Existing logic for preset regex inputs remains (showDFA is called)
      const inputValue = regexInput.value.trim(); // Still trim for preset
      if (inputValue === "") {
        dfaSection.style.display = "none";
        dfaImg.src = "";
      } else {
        // Clear any previous diagram or results for preset change
        dfaImg.src = "";
        dfaSection.style.display = "block"; // Show section to display loading
        dfaSection.classList.add("loading");
        resetUI(); // Clear results section

        // We delay the API call slightly to avoid excessive calls while typing
        // and clear the previous timeout if user types again quickly.
        if (regexInput.dataset.inputTimeout) {
          clearTimeout(regexInput.dataset.inputTimeout);
        }

        regexInput.dataset.inputTimeout = setTimeout(async () => {
          await showDFA(inputValue); // Pass the trimmed input value
          dfaSection.classList.remove("loading"); // Remove loading after showDFA attempts to load or fails
        }, 500); // Wait 500ms after typing stops
      }
    }
  });

  // Handle simulation
  simulateBtn.addEventListener("click", async () => {
    if (isSimulating) return;

    const selectedRegexValue = regexSelect.value;
    const isCustomRegex = selectedRegexValue === "custom";
    const regexToUse = isCustomRegex
      ? regexInput.value.trim()
      : regexInput.dataset.originalRegex;
    const input = inputString.value.trim();

    if (!regexToUse || !input) {
      showError(
        "Please provide both a regular expression and an input string."
      );
      return;
    }

    try {
      isSimulating = true;
      simulateBtn.disabled = true;
      showLoading("Simulating Automaton");

      // For custom regex, first draw the initial diagram
      if (isCustomRegex) {
        dfaSection.classList.add("loading");
        const drawResponse = await fetch("/api/draw_dfa", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ regex: regexToUse, type: currentDiagramType }),
        });
        const drawData = await drawResponse.json();

        if (drawData.error) {
          showError(drawData.error);
          dfaImg.src = "";
          dfaSection.style.display = "none";
          resetUI();
          return;
        }

        dfaImg.src = `${drawData.image_url}?t=${new Date().getTime()}`;
        dfaSection.style.display = "block";
        dfaSection.classList.remove("loading");
      }

      // Show results section with fade effect
      resultsSection.style.display = "block";
      resultsSection.style.opacity = "0";

      // Run simulation
      const response = await fetch("/api/simulate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ regex: regexToUse, input_string: input }),
      });

      const data = await response.json();

      if (data.error) {
        showError(data.error);
        resetUI();
        return;
      }

      // Store frame URLs and display results
      frameUrls = data.frame_urls;
      displayResults(data);

      // Fade in results section
      setTimeout(() => {
        resultsSection.style.opacity = "1";
      }, 100);

      // Start animation after results section is visible
      setTimeout(() => {
        startAnimation();
      }, 300);
    } catch (error) {
      console.error("Simulation error:", error);
      showError("An error occurred during simulation. Please try again.");
      resetUI();
    } finally {
      isSimulating = false;
      simulateBtn.disabled = false;
      hideLoading();
    }
  });

  // Animation control functions
  window.togglePlayPause = function () {
    if (isPaused) {
      resumeAnimation();
    } else {
      pauseAnimation();
    }
  };

  function pauseAnimation() {
    if (animationInterval) {
      clearInterval(animationInterval);
      isPaused = true;
      playPauseBtn.textContent = "Play";
    }
  }

  function resumeAnimation() {
    if (isPaused) {
      startAnimation();
      isPaused = false;
      playPauseBtn.textContent = "Pause";
    }
  }

  window.changeSpeed = function (speed) {
    animationSpeed = speed;
    if (animationInterval) {
      pauseAnimation();
      resumeAnimation();
    }
  };

  // Helper functions
  async function showDFA(regex) {
    if (!regex) {
      dfaSection.style.display = "none";
      dfaImg.src = "";
      return;
    }

    try {
      // Loading class is added in the input event listener now for presets
      const response = await fetch("/api/draw_dfa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ regex: regex, type: currentDiagramType }),
      });

      const data = await response.json();

      if (data.error) {
        // For preset errors during typing, just show an alert, don't clear regex input
        showAlert("Error", data.error);
        dfaImg.src = "";
        dfaSection.style.display = "none";
        // Note: regexInput.value remains unchanged by showAlert
      } else {
        dfaImg.src = `${data.image_url}?t=${new Date().getTime()}`;
        dfaSection.style.display = "block";
      }
    } catch (error) {
      showAlert("Error", "Error generating diagram.");
      console.error(error);
      dfaImg.src = "";
      dfaSection.style.display = "none";
    } finally {
      // Loading class removed in the input event listener for presets
      // dfaSection.classList.remove("loading");
    }
  }

  function displayResults(data) {
    // Update acceptance status
    acceptanceStatus.textContent = data.accepted
      ? "String Accepted"
      : "String Rejected";
    acceptanceStatus.className = data.accepted ? "accepted" : "rejected";

    // Update DFA stats
    dfaStats.innerHTML = `
            <li>Total States: ${data.dfa_info.total_states}</li>
            <li>Start State: ${data.dfa_info.start_state}</li>
            <li>Final States: ${data.dfa_info.final_states.join(", ")}</li>
            <li>Current State: ${data.final_state}</li>
            <li>Steps Taken: ${data.frame_urls.length - 1}</li>
            <li>Valid Symbols: ${data.dfa_info.alphabet.join(", ")}</li>
        `;

    // Update path display with more readable format
    pathDisplay.innerHTML = data.path
      .map(
        ([src, sym, dst], idx) =>
          `<div class="${idx === currentFrameIndex ? "current-step" : ""}">
                Step ${idx + 1}: State ${src} reads '${sym}' → State ${dst}
            </div>`
      )
      .join("");

    // Add final state information
    if (data.path.length > 0) {
      const finalStep = document.createElement("div");
      finalStep.className = "final-step";
      finalStep.textContent = `Final State: ${data.final_state}`;
      pathDisplay.appendChild(finalStep);
    }
  }

  function startAnimation() {
    if (!frameUrls.length) {
      showError("No animation frames available.");
      return;
    }

    currentFrameIndex = 0;
    showCurrentFrame();

    if (animationInterval) {
      clearInterval(animationInterval);
    }

    animationControls.style.display = "flex";
    playPauseBtn.textContent = "Pause";
    isPaused = false;

    // Update path display highlighting
    const pathSteps = pathDisplay.children;
    for (let i = 0; i < pathSteps.length; i++) {
      pathSteps[i].classList.toggle("current-step", i === currentFrameIndex);
    }

    animationInterval = setInterval(() => {
      currentFrameIndex++;

      if (currentFrameIndex >= frameUrls.length) {
        clearInterval(animationInterval);
        playPauseBtn.textContent = "Play";
        isPaused = true;
        return;
      }

      showCurrentFrame();
    }, animationSpeed);
  }

  function showCurrentFrame() {
    if (currentFrameIndex < frameUrls.length) {
      // Update diagram
      dfaImg.src = frameUrls[currentFrameIndex];

      // Update path display highlighting
      const pathSteps = pathDisplay.children;
      for (let i = 0; i < pathSteps.length; i++) {
        pathSteps[i].classList.toggle(
          "current-step",
          i === currentFrameIndex - 1
        );
      }
    }
  }

  function resetUI() {
    // Clear animation
    if (animationInterval) {
      clearInterval(animationInterval);
      animationInterval = null;
    }

    // Reset sections with fade out
    resultsSection.style.opacity = "0";
    setTimeout(() => {
      resultsSection.style.display = "none";
    }, 300);
    errorMessage.style.display = "none";
    animationControls.style.display = "none";

    // Clear content
    if (pathDisplay) {
      pathDisplay.innerHTML = "";
    }
    if (dfaStats) {
      dfaStats.innerHTML = "";
    }
    if (acceptanceStatus) {
      acceptanceStatus.textContent = "";
      acceptanceStatus.className = "";
    }
  }

  function showAlert(title, message) {
    alertTitle.textContent = title;
    alertMessage.textContent = message;
    alertDialog.style.display = "flex";
  }

  // Fullscreen functionality
  dfaImg.addEventListener("click", () => {
    if (dfaImg.src) {
      fullscreenImg.src = dfaImg.src;
      fullscreenView.style.display = "flex";
      document.body.style.overflow = "hidden"; // Prevent scrolling

      // If animation is running, update fullscreen image with each frame
      if (animationInterval) {
        const originalShowCurrentFrame = showCurrentFrame;
        showCurrentFrame = function () {
          if (currentFrameIndex < frameUrls.length) {
            // Update both regular and fullscreen images
            dfaImg.src = frameUrls[currentFrameIndex];
            fullscreenImg.src = frameUrls[currentFrameIndex];

            // Update path display highlighting
            const pathSteps = pathDisplay.children;
            for (let i = 0; i < pathSteps.length; i++) {
              pathSteps[i].classList.toggle(
                "current-step",
                i === currentFrameIndex - 1
              );
            }
          }
        };
      }
    }
  });

  function closeFullscreenView() {
    fullscreenView.style.display = "none";
    document.body.style.overflow = ""; // Restore scrolling

    // Restore original showCurrentFrame if it was modified
    if (animationInterval) {
      showCurrentFrame = function () {
        if (currentFrameIndex < frameUrls.length) {
          // Update diagram
          dfaImg.src = frameUrls[currentFrameIndex];

          // Update path display highlighting
          const pathSteps = pathDisplay.children;
          for (let i = 0; i < pathSteps.length; i++) {
            pathSteps[i].classList.toggle(
              "current-step",
              i === currentFrameIndex - 1
            );
          }
        }
      };
    }
  }

  closeFullscreen.addEventListener("click", closeFullscreenView);

  // Close fullscreen when clicking outside the image
  fullscreenView.addEventListener("click", (event) => {
    if (event.target === fullscreenView) {
      closeFullscreenView();
    }
  });

  // Close fullscreen with Escape key
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && fullscreenView.style.display === "flex") {
      closeFullscreenView();
    }
  });

  // Add error handling utility functions
  function showError(message, duration = 5000) {
    errorMessage.textContent = message;
    errorMessage.style.display = "block";

    // Auto-hide after duration
    setTimeout(() => {
      errorMessage.style.display = "none";
    }, duration);
  }

  function showLoading(message = "Processing...") {
    loadingPopup.style.display = "flex";
    document.querySelector(".loading-message").textContent = message;
    document.body.style.overflow = "hidden";
  }

  function hideLoading() {
    loadingPopup.style.display = "none";
    document.body.style.overflow = "";
  }
});
