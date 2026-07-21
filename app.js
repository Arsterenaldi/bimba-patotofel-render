const input = document.querySelector("#imageInput");
const output = document.querySelector("#asciiOutput");
const copyButton = document.querySelector("#copyButton");
const widthRange = document.querySelector("#widthRange");
const contrastRange = document.querySelector("#contrastRange");
const brightnessRange = document.querySelector("#brightnessRange");
const gammaRange = document.querySelector("#gammaRange");
const invertToggle = document.querySelector("#invertToggle");
const widthValue = document.querySelector("#widthValue");
const contrastValue = document.querySelector("#contrastValue");
const brightnessValue = document.querySelector("#brightnessValue");
const gammaValue = document.querySelector("#gammaValue");

const asciiRamp = " .:-=+*#%@";

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

[widthRange, contrastRange, brightnessRange, gammaRange, invertToggle].forEach((control) => {
  control.addEventListener("input", () => {
    updateControlLabels();

    if (loadedImage) {
      renderAscii();
    }
  });
});

copyButton.addEventListener("click", async () => {
  if (!latestAscii) {
    return;
  }

  await navigator.clipboard.writeText(latestAscii);
  copyButton.textContent = "Скопировано";

  window.setTimeout(() => {
    copyButton.textContent = "Скопировать";
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
}

function getSettings() {
  return {
    brightness: Number(brightnessRange.value),
    contrast: Number(contrastRange.value) / 100,
    gamma: Number(gammaRange.value) / 100,
    invert: invertToggle.checked,
    width: Number(widthRange.value),
  };
}

function updateControlLabels() {
  widthValue.textContent = widthRange.value;
  contrastValue.textContent = `${contrastRange.value}%`;
  brightnessValue.textContent = brightnessRange.value;
  gammaValue.textContent = (Number(gammaRange.value) / 100).toFixed(2);
}

function imageToAscii(image, settings) {
  const targetWidth = Math.min(settings.width, image.width);
  const charAspectCorrection = 0.5;
  const targetHeight = Math.max(
    1,
    Math.round((image.height / image.width) * targetWidth * charAspectCorrection)
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
        row += " ";
        continue;
      }

      const brightness = adjustBrightness((red + green + blue) / 3, settings);
      const rampIndex = brightnessToRampIndex(brightness, settings.invert);
      row += asciiRamp[rampIndex];
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

function brightnessToRampIndex(brightness, invert) {
  const normalized = clamp(brightness / 255, 0, 1);
  const mapped = invert ? normalized : 1 - normalized;

  return Math.round(mapped * (asciiRamp.length - 1));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

updateControlLabels();
