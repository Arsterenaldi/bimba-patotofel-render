const input = document.querySelector("#imageInput");
const output = document.querySelector("#asciiOutput");
const copyButton = document.querySelector("#copyButton");

const asciiRamp = " .:-=+*#%@";
const maxWidth = 130;

let latestAscii = "";

input.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];

  if (!file) {
    return;
  }

  output.textContent = "Обрабатываю картинку...";
  copyButton.disabled = true;

  try {
    const dataUrl = await readFileAsDataUrl(file);
    renderAscii(dataUrl);
  } catch (error) {
    output.textContent = "Не получилось прочитать файл. Попробуй другую картинку.";
    console.error(error);
  }
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

function renderAscii(dataUrl) {
  const sketch = (p) => {
    p.setup = () => {
      p.noCanvas();
      p.loadImage(
        dataUrl,
        (image) => {
          const ascii = imageToAscii(p, image);
          latestAscii = ascii;
          output.textContent = ascii;
          copyButton.disabled = false;
        },
        () => {
          output.textContent = "Не получилось загрузить изображение.";
        }
      );
    };
  };

  new p5(sketch);
}

function imageToAscii(p, image) {
  const targetWidth = Math.min(maxWidth, image.width);
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

      const brightness = (red + green + blue) / 3;
      const rampIndex = Math.floor(p.map(brightness, 0, 255, asciiRamp.length - 1, 0));
      row += asciiRamp[rampIndex];
    }

    rows.push(row);
  }

  return rows.join("\n");
}
