# ClearScan OCR

A beginner-friendly, browser-based Optical Character Recognition (OCR) application built with React, TypeScript, Vite, Tailwind CSS v4, and Tesseract.js.

## Features
- Upload PNG, JPG, JPEG, or WEBP images (up to 15 MB)
- Capture a document with a webcam (requires localhost or HTTPS and camera permission)
- Recognize English text with Tesseract.js in the browser
- Edit, copy, and download extracted text
- Save up to 50 scan records in browser LocalStorage
- Search, reopen, and delete saved scans
- Responsive desktop and mobile layout

## Requirements
- Node.js 20.19+ or 22.12+
- npm
- A modern browser

## Setup
1. Extract the project ZIP.
2. Open the `clearscan-ocr` folder in VS Code.
3. Open the integrated terminal in that folder.
4. Install dependencies:

   ```bash
   npm install
   ```

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open the local URL printed in the terminal, usually `http://localhost:5173`.

## Production build

```bash
npm run build
npm run preview
```

The production website is generated in the `dist` folder.

## How to use
1. Select **Upload image** or **Open camera**.
2. Choose or capture a clear picture containing printed text.
3. Click **Extract text from image**.
4. Wait for recognition to finish. The first run may take longer because the OCR language data must be downloaded by Tesseract.js.
5. Review and edit the result. Use **Copy** or **Export** to save it.
6. Open **Scan history** to reopen or remove previous scans.

## Important notes
- The default OCR language is English (`eng`). To add another language, change `createWorker('eng', 1, ...)` in `src/App.tsx` to a supported Tesseract language code, such as `spa` for Spanish or `fil` if a Filipino traineddata file is available from the configured Tesseract data source.
- OCR quality depends on image clarity, lighting, focus, font, and document layout.
- The app does not have a cloud account system or server database. History is stored in the current browser on the current device. Clearing browser storage can remove it.
- Tesseract.js downloads its OCR worker and English language data the first time it is used, so an internet connection is required for the initial OCR setup unless you configure local assets.
- Camera access is generally available on `localhost` during development and on HTTPS when deployed.
- This is a client-side starter project. Do not treat browser LocalStorage as secure storage for sensitive documents.

## Project structure

```text
clearscan-ocr/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── README.md
└── src/
    ├── App.tsx       # OCR logic, camera, history, and interface
    ├── main.tsx      # React entry point
    └── style.css     # Responsive design and Tailwind import
```
