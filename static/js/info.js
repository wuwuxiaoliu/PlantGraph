// info.js - 结构化信息展示与 AI 脚本生成功能

let currentScriptRequestId = null;
let currentGenerateRequestId = null;

export function setCurrentScriptRequestId(val) {
  currentScriptRequestId = val;
}
export function getCurrentScriptRequestId() {
  return currentScriptRequestId;
}

export function setCurrentGenerateRequestId(val) {
  currentGenerateRequestId = val;
}
export function getCurrentGenerateRequestId() {
  return currentGenerateRequestId;
}

export function fetchStructuredInfo(plant) {
  fetch(`/get_structured_info?name=${encodeURIComponent(plant)}`)
    .then(res => res.json())
    .then(data => {
      const info = data.info || {};
      document.getElementById("field-名称").textContent = plant;
      document.getElementById("field-特征").textContent = info["特征"] || "无";
      document.getElementById("field-治疗").textContent = info["治疗"] || "无";
      document.getElementById("field-拉丁学名").textContent = info["拉丁学名"] || "未知";
      document.getElementById("field-属于科").textContent = info["属于科"] || "未知";
      document.getElementById("field-属于属").textContent = info["属于属"] || "未知";
      document.getElementById("field-国内分布于").textContent = info["国内分布于"] || "未知";
      document.getElementById("field-国际分布于").textContent = info["国际分布于"] || "未知";
      document.getElementById("field-生境").textContent = info["生境"] || "未知";

      generateScript(plant, info);
    });
}

export function generate() {
  const reqId = Symbol("generate");
  setCurrentGenerateRequestId(reqId);

  document.getElementById("result-output").value = "正在生成中，请稍候...";
  const plant_name = document.getElementById("field-名称").textContent.trim();
  if (!plant_name) return alert("请输入植物信息");

  const info = {
    "特征": document.getElementById("field-特征").textContent,
    "治疗": document.getElementById("field-治疗").textContent,
    "属于科": document.getElementById("field-属于科").textContent,
    "属于属": document.getElementById("field-属于属").textContent,
    "拉丁学名": document.getElementById("field-拉丁学名").textContent,
    "国内分布于": document.getElementById("field-国内分布于").textContent,
    "国际分布于": document.getElementById("field-国际分布于").textContent,
    "生境": document.getElementById("field-生境").textContent
  };
  const addition = document.getElementById("user-addition").value.trim();
  const n = parseInt(document.getElementById("n-value").value);

  fetch("/generate", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plant_name, info, addition, n })
  })
    .then(res => res.json())
    .then(result => {
      if (getCurrentGenerateRequestId() !== reqId) return;
      document.getElementById("result-output").value = result;
    })
    .catch(() => {
      if (getCurrentGenerateRequestId() !== reqId) return;
      document.getElementById("result-output").value = "生成失败，请重试。";
    });
}


export function generateScript(plant_name, info) {
  const outputEl = document.getElementById("script-output");
  outputEl.textContent = "正在生成脚本建议，请稍候...";

  const reqId = Symbol("script");
  setCurrentScriptRequestId(reqId);

  fetch("/script_suggestions", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plant_name, info, platform: "video", style: "科普", audience: "大众", n: 1 })
  })
    .then(res => res.json())
    .then(result => {
      if (getCurrentScriptRequestId() !== reqId) return;
      if (result.script_suggestions) {
        outputEl.textContent = result.script_suggestions;
      } else if (result.data) {
        outputEl.textContent = JSON.stringify(result.data, null, 2);
      } else {
        outputEl.textContent = "未能生成脚本建议，请检查接口返回。";
      }
    })
    .catch(() => {
      if (getCurrentScriptRequestId() !== reqId) return;
      outputEl.textContent = "脚本生成失败，请稍后重试。";
    });
}

export function copyResult() {
  const text = document.getElementById("result-output").value;
  navigator.clipboard.writeText(text)
    .then(() => alert("已复制到剪贴板"))
    .catch(err => alert("复制失败：" + err));
}

// 可选导出：清空信息卡片和脚本内容（供 clear-btn 使用）
export function resetInfoCard() {
  const fields = [
    "名称", "特征", "治疗", "拉丁学名",
    "属于科", "属于属", "国内分布于",
    "国际分布于", "生境"
  ];
  fields.forEach(field => {
    document.getElementById("field-" + field).textContent = "";
  });
}

export function clearAIScript() {
  document.getElementById("user-addition").value = "";
  document.getElementById("n-value").value = 1;
  document.getElementById("result-output").value = "";
  const scriptOutput = document.getElementById("script-output");
  if (scriptOutput) scriptOutput.textContent = "";
}