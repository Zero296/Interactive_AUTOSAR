# -*- coding: utf-8 -*-
import sys

def fix_all():
    # 1. Fix part4_engine_and_scenarios.js
    p4_path = r"D:\__Personal\AntiGravity\build_cannm\part4_engine_and_scenarios.js"
    with open(p4_path, "r", encoding="utf-8") as f:
        p4 = f.read()

    # Remove `simState.currentStep = 0;\n` inside resetSimulation
    target = '  simState.activeDirection = "None";\n  simState.currentStep = 0;'
    if target in p4:
        p4 = p4.replace(target, '  simState.activeDirection = "None";')
        print("Replaced target in part4 (LF)")
    else:
        target_crlf = '  simState.activeDirection = "None";\r\n  simState.currentStep = 0;'
        if target_crlf in p4:
            p4 = p4.replace(target_crlf, '  simState.activeDirection = "None";')
            print("Replaced target in part4 (CRLF)")
        else:
            print("Warning: target not found in part4")

    with open(p4_path, "w", encoding="utf-8") as f:
        f.write(p4)

    # 2. Fix part5_ui_and_exports.js
    p5_path = r"D:\__Personal\AntiGravity\build_cannm\part5_ui_and_exports.js"
    with open(p5_path, "r", encoding="utf-8") as f:
        p5 = f.read()

    # Find section // 8. SCENARIO STEPPER CONTROLS
    start_str = "// 8. SCENARIO STEPPER CONTROLS"
    end_str = "// 9. VIEW SWITCHER & SUB-TABS"
    start_idx = p5.find(start_str)
    end_idx = p5.find(end_str)

    if start_idx == -1 or end_idx == -1:
        print(f"Error: indices not found in part5 ({start_idx}, {end_idx})")
        sys.exit(1)

    new_stepper_code = """// 8. SCENARIO STEPPER CONTROLS & SNAPSHOT HISTORY
let scenarioSnapshots = {}; // scenId -> array of snapshots per step

function captureScenarioSnapshot(scenId, stepIdx) {
  if (!scenarioSnapshots[scenId]) {
    scenarioSnapshots[scenId] = [];
  }
  scenarioSnapshots[scenId][stepIdx] = {
    state: JSON.parse(JSON.stringify({
      mode: simState.mode,
      subState: simState.subState,
      cbv: simState.cbv,
      engine: simState.engine,
      timers: simState.timers,
      pnc: simState.pnc,
      clockMs: simState.clockMs,
      lastBusActivity: simState.lastBusActivity,
      wakeupSource: simState.wakeupSource,
      activeDirection: simState.activeDirection
    })),
    ecuc: JSON.parse(JSON.stringify(ecucConfig)),
    logCount: traceLogs.length
  };
}

function restoreScenarioSnapshot(scenId, stepIdx) {
  const snapList = scenarioSnapshots[scenId];
  if (snapList && snapList[stepIdx]) {
    const snap = snapList[stepIdx];
    Object.assign(simState, JSON.parse(JSON.stringify(snap.state)));
    Object.assign(ecucConfig, JSON.parse(JSON.stringify(snap.ecuc)));
    if (typeof snap.logCount === "number" && traceLogs.length > snap.logCount) {
      traceLogs.splice(snap.logCount);
    }
    updateUIFromConfig();
    return true;
  }
  return false;
}

function resetScenario() {
  const scen = SCENARIOS[simState.currentScenario];
  simState.currentStep = 0;
  scenarioSnapshots[simState.currentScenario] = []; // Reset snapshots for fresh scenario run
  if (scen && scen.steps[0] && typeof scen.steps[0].action === "function") {
    scen.steps[0].action();
  } else {
    resetSimulation();
  }
  simState.currentStep = 0;
  captureScenarioSnapshot(simState.currentScenario, 0);
  updateScenarioStepUI();
  renderAll();
}

function loadScenario(scenId) {
  simState.currentScenario = scenId;
  simState.currentStep = 0;
  const scen = SCENARIOS[scenId];

  const sel = document.getElementById("selScenario");
  if (sel) sel.value = scenId;

  const titleEl = document.getElementById("scenBoxTitle");
  if (titleEl) titleEl.innerText = scen ? scen.title : "";

  scenarioSnapshots[scenId] = []; // Reset snapshots for newly loaded scenario
  if (scen && scen.steps[0] && typeof scen.steps[0].action === "function") {
    scen.steps[0].action();
  }
  simState.currentStep = 0;
  captureScenarioSnapshot(scenId, 0);

  updateScenarioStepUI();
  renderAll();
}

function nextScenarioStep() {
  const scen = SCENARIOS[simState.currentScenario];
  if (!scen) return;

  if (simState.currentStep < scen.steps.length - 1) {
    simState.currentStep++;
    const step = scen.steps[simState.currentStep];
    if (step && typeof step.action === "function") {
      step.action();
    }
    captureScenarioSnapshot(simState.currentScenario, simState.currentStep);
    updateScenarioStepUI();
  } else {
    addTraceLog("SCENARIO", "System", "Hoàn tất kịch bản!", "Đã chạy hết các bước của kịch bản hiện tại.");
  }
  renderAll();
}

function prevScenarioStep() {
  if (simState.currentStep > 0) {
    const targetStep = simState.currentStep - 1;
    const scen = SCENARIOS[simState.currentScenario];

    // Try to restore from snapshot
    const restored = restoreScenarioSnapshot(simState.currentScenario, targetStep);
    if (!restored) {
      // Fallback: re-execute from step 0 to targetStep
      if (scen) {
        for (let s = 0; s <= targetStep; s++) {
          if (scen.steps[s] && typeof scen.steps[s].action === "function") {
            scen.steps[s].action();
          }
        }
        captureScenarioSnapshot(simState.currentScenario, targetStep);
      }
    }

    simState.currentStep = targetStep; // Always guarantee currentStep is targetStep!
    addTraceLog("USER", "Stepper", `Lùi về Bước ${targetStep}`, `Đã lùi 1 bước về Bước ${targetStep}.`);
    updateScenarioStepUI();
    renderAll();
  }
}

function updateScenarioStepUI() {
  const scen = SCENARIOS[simState.currentScenario];
  if (!scen) return;

  const totalSteps = scen.steps.length - 1; // Step 0 is preparation
  const step = scen.steps[simState.currentStep];
  const stepCtr = document.getElementById("lblStepCounter");
  if (stepCtr) {
    if (simState.currentStep === 0) {
      stepCtr.innerText = `Bước 0 / ${totalSteps} (Sẵn sàng)`;
    } else {
      stepCtr.innerText = `Bước ${simState.currentStep} / ${totalSteps}`;
    }
  }

  const apiBadge = document.getElementById("scenApiBadge");
  if (apiBadge) {
    if (simState.currentStep === 0) {
      apiBadge.innerText = "Bước 0: Chuẩn bị";
      apiBadge.className = "badge warn";
    } else {
      apiBadge.innerText = step ? step.api.split(":")[0] : "Sẵn sàng";
      apiBadge.className = "badge ok";
    }
  }

  const ioPill = document.getElementById("scenIoPill");
  if (ioPill) ioPill.innerText = step ? step.io : "";

  const descEl = document.getElementById("scenStepDesc");
  if (descEl) descEl.innerText = step ? step.desc : "";

  // Render 3 What-If Buttons
  const whatIfContainer = document.getElementById("whatIfBtnsContainer");
  if (whatIfContainer && scen.whatIf) {
    let btnsHtml = "";
    scen.whatIf.forEach((w, idx) => {
      btnsHtml += `
        <button class="btn xs" onclick="runWhatIf(${idx})" style="justify-content:flex-start; text-align:left; background:var(--panel2)">
          <span>👉</span> <span>${w.label}</span>
        </button>
      `;
    });
    whatIfContainer.innerHTML = btnsHtml;
  }
}

function runWhatIf(idx) {
  const scen = SCENARIOS[simState.currentScenario];
  if (scen && scen.whatIf && scen.whatIf[idx]) {
    addTraceLog("USER", "What-If", `Thử nghiệm: ${scen.whatIf[idx].label}`, "Kích hoạt kiểm thử What-If tương tác.");
    scen.whatIf[idx].action();
    captureScenarioSnapshot(simState.currentScenario, simState.currentStep);
    renderAll();
  }
}

function toggleScenarioAutoPlay() {
  const btn = document.getElementById("btnAutoScenario");
  if (simState.autoScenarioTimer) {
    clearInterval(simState.autoScenarioTimer);
    simState.autoScenarioTimer = null;
    if (btn) btn.innerText = "▶ Tự Chạy";
  } else {
    if (btn) btn.innerText = "⏸ Dừng Lại";
    simState.autoScenarioTimer = setInterval(() => {
      const scen = SCENARIOS[simState.currentScenario];
      if (simState.currentStep < scen.steps.length - 1) {
        nextScenarioStep();
      } else {
        clearInterval(simState.autoScenarioTimer);
        simState.autoScenarioTimer = null;
        if (btn) btn.innerText = "▶ Tự Chạy";
      }
    }, 2200);
  }
}

function toggleAutoClock() {
  const btn = document.getElementById("btnAutoClock");
  if (simState.autoClockTimer) {
    clearInterval(simState.autoClockTimer);
    simState.autoClockTimer = null;
    if (btn) {
      btn.innerText = "▶ Clock";
      btn.classList.remove("amber");
      btn.classList.add("green");
    }
  } else {
    if (btn) {
      btn.innerText = "⏸ Dừng (2x)";
      btn.classList.remove("green");
      btn.classList.add("amber");
    }
    // Tốc độ đếm nhanh hơn gấp 2 lần: chu kỳ xung nhịp 500ms mỗi tick 100ms (thay vì 1000ms)
    simState.autoClockTimer = setInterval(() => {
      stepClockTick(100);
    }, 500);
  }
}

"""

    p5_new = p5[:start_idx] + new_stepper_code + p5[end_idx:]
    with open(p5_path, "w", encoding="utf-8") as f:
        f.write(p5_new)
    print("SUCCESS: Updated stepper controls and snapshot history in part5!")

if __name__ == "__main__":
    fix_all()
