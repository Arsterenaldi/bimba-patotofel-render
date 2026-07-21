const input = document.querySelector("#imageInput");
const output = document.querySelector("#asciiOutput");
const copyButton = document.querySelector("#copyButton");
const platformSelect = document.querySelector("#platformSelect");
const widthRange = document.querySelector("#widthRange");
const aspectRange = document.querySelector("#aspectRange");
const contrastRange = document.querySelector("#contrastRange");
const brightnessRange = document.querySelector("#brightnessRange");
const gammaRange = document.querySelector("#gammaRange");
const invertToggle = document.querySelector("#invertToggle");
const solidCharsToggle = document.querySelector("#solidCharsToggle");
const brailleToggle = document.querySelector("#brailleToggle");
const codeWrapToggle = document.querySelector("#codeWrapToggle");
const exportHint = document.querySelector("#exportHint");
const platformValue = document.querySelector("#platformValue");
const widthValue = document.querySelector("#widthValue");
const aspectValue = document.querySelector("#aspectValue");
const contrastValue = document.querySelector("#contrastValue");
const brightnessValue = document.querySelector("#brightnessValue");
const gammaValue = document.querySelector("#gammaValue");

const platformPresets = {
  discord: {
    defaultWidth: 80,
    label: "Discord",
    maxChars: 1900,
    maxWidth: 110,
    wrapper: "markdown",
  },
  steam: {
    defaultWidth: 70,
    label: "Steam",
    maxChars: 3900,
    maxWidth: 95,
    wrapper: "bbcode",
  },
  plain: {
    defaultWidth: 100,
    label: "текста",
    maxChars: null,
    maxWidth: 140,
    wrapper: "plain",
  },
};

const spacedRamp = " .:-=+*#%@";
const solidRamp = ".:-=+*#%@";
const brailleSpacedRamp = "⠀⠄⠆⠇⡇⣇⣧⣿";
const brailleSolidRamp = "⠄⠂⠆⠇⡇⣇⣧⣿";
const asciiAspectPercent = 50;
const brailleAspectPercent = 62;

let latestAscii = "";
let loadedImage = null;
let p5Api = null;

new p5((p) => {
  p.setup = () => {
    p.noCanvas();
    p5Api = p;
  };
});

input.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];

  if (!file) {
    return;
  }

  output.textContent = "Обрабатываю картинку...";
  copyButton.disabled = true;

  try {
    const dataUrl = await readFileAsDataUrl(file);
    loadImage(dataUrl);
  } catch (error) {
    output.textContent = "Не получилось прочитать файл. Попробуй другую картинку.";
    console.error(error);
  }
});

[widthRange, aspectRange, contrastRange, brightnessRange, gammaRange, invertToggle, solidCharsToggle, codeWrapToggle].forEach((control) => {
  control.addEventListener("input", () => {
    updateControlLabels();

    if (loadedImage) {
      renderAscii();
    }
  });
});

brailleToggle.addEventListener("input", () => {
  aspectRange.value = brailleToggle.checked ? brailleAspectPercent : asciiAspectPercent;
  updateControlLabels();

  if (loadedImage) {
    renderAscii();
  }
});

platformSelect.addEventListener("change", () => {
  applyPlatformPreset();
  updateControlLabels();

  if (loadedImage) {
    renderAscii();
  }
});

copyButton.addEventListener("click", async () => {
  if (!latestAscii) {
    return;
  }

  await navigator.clipboard.writeText(formatForExport(latestAscii));
  copyButton.textContent = "Скопировано";

  window.setTimeout(() => {
    updateCopyButtonLabel();
  }, 1200);
});

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  p5Api.loadImage(
    dataUrl,
    (image) => {
      loadedImage = image;
      renderAscii();
    },
    () => {
      output.textContent = "Не получилось загрузить изображение.";
    }
  );
}

function renderAscii() {
  const image = loadedImage.get();
  const ascii = imageToAscii(image, getSettings());

  latestAscii = ascii;
  output.textContent = ascii;
  copyButton.disabled = false;
  updateExportHint();
}

function getSettings() {
  return {
    aspectCorrection: Number(aspectRange.value) / 100,
    braille: brailleToggle.checked,
    brightness: Number(brightnessRange.value),
    contrast: Number(contrastRange.value) / 100,
    gamma: Number(gammaRange.value) / 100,
    invert: invertToggle.checked,
    ramp: getCharacterRamp(),
    transparentChar: getTransparentChar(),
    width: Number(widthRange.value),
  };
}

function updateControlLabels() {
  const preset = getPlatformPreset();
  const width = Number(widthRange.value);

  platformValue.textContent = preset.label;
  widthValue.textContent = brailleToggle.checked ? `${width} / ⣿` : widthRange.value;
  aspectValue.textContent = `${aspectRange.value}%`;
  contrastValue.textContent = `${contrastRange.value}%`;
  brightnessValue.textContent = brightnessRange.value;
  gammaValue.textContent = (Number(gammaRange.value) / 100).toFixed(2);
  updateCopyButtonLabel();
  updateExportHint();
}

function imageToAscii(image, settings) {
  const targetWidth = Math.min(settings.width, image.width);
  const targetHeight = Math.max(
    1,
    Math.round((image.height / image.width) * targetWidth * settings.aspectCorrection)
  );

  image.resize(targetWidth, targetHeight);
  image.loadPixels();

  const rows = [];

  for (let y = 0; y < image.height; y += 1) {
    let row = "";

    for (let x = 0; x < image.width; x += 1) {
      const index = (x + y * image.width) * 4;
      const red = image.pixels[index];
      const green = image.pixels[index + 1];
      const blue = image.pixels[index + 2];
      const alpha = image.pixels[index + 3];

      if (alpha < 20) {
        row += settings.transparentChar;
        continue;
      }

      const brightness = adjustBrightness((red + green + blue) / 3, settings);
      const rampIndex = brightnessToRampIndex(brightness, settings);
      row += settings.ramp[rampIndex];
    }

    rows.push(row);
  }

  return rows.join("\n");
}

function adjustBrightness(value, settings) {
  const contrasted = (value - 128) * settings.contrast + 128 + settings.brightness;
  const normalized = clamp(contrasted / 255, 0, 1);
  const corrected = Math.pow(normalized, 1 / settings.gamma);

  return corrected * 255;
}

function brightnessToRampIndex(brightness, settings) {
  const normalized = clamp(brightness / 255, 0, 1);
  const mapped = settings.invert ? normalized : 1 - normalized;

  return Math.round(mapped * (settings.ramp.length - 1));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getCharacterRamp() {
  if (brailleToggle.checked) {
    return solidCharsToggle.checked ? brailleSolidRamp : brailleSpacedRamp;
  }

  return solidCharsToggle.checked ? solidRamp : spacedRamp;
}

function getTransparentChar() {
  if (brailleToggle.checked) {
    return solidCharsToggle.checked ? "⠄" : "⠀";
  }

  return solidCharsToggle.checked ? "." : " ";
}

function applyPlatformPreset() {
  const preset = getPlatformPreset();

  widthRange.max = preset.maxWidth;
  widthRange.value = preset.defaultWidth;
}

function getPlatformPreset() {
  return platformPresets[platformSelect.value];
}

function updateCopyButtonLabel() {
  const preset = getPlatformPreset();
  const suffix = codeWrapToggle.checked ? preset.label : "как текст";

  copyButton.textContent = `Скопировать для ${suffix}`;
}

function updateExportHint() {
  const preset = getPlatformPreset();

  if (!latestAscii) {
    exportHint.textContent = codeWrapToggle.checked
      ? "Моноширинная обёртка включена: Discord/Steam сохранят ровные строки."
      : "Обёртка выключена: копируется только ASCII без code block.";
    return;
  }

  const formatted = formatForExport(latestAscii);
  const rows = latestAscii.split("\n").length;
  const chars = formatted.length;
  const limitText = preset.maxChars ? ` / лимит примерно ${preset.maxChars}` : "";
  const warning = preset.maxChars && chars > preset.maxChars
    ? " Уменьши детализацию, чтобы сообщение отправилось целиком."
    : "";
  const wrapperText = codeWrapToggle.checked ? "обёртка включена" : "без обёртки";
  const brailleText = brailleToggle.checked ? `, высота ⣿ ${aspectRange.value}%` : "";

  exportHint.textContent = `${widthRange.value} символов в строке, ${rows} строк, ${chars} символов${limitText}, ${wrapperText}${brailleText}.${warning}`;
}

function formatForExport(ascii) {
  const preset = getPlatformPreset();

  if (!codeWrapToggle.checked) {
    return ascii;
  }

  if (preset.wrapper === "markdown") {
    return `\`\`\`text\n${ascii}\n\`\`\``;
  }

  if (preset.wrapper === "bbcode") {
    return `[code]\n${ascii}\n[/code]`;
  }

  return ascii;
}

applyPlatformPreset();
updateControlLabels();
