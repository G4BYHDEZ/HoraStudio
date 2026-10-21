import React, { forwardRef } from 'react';
import { View } from 'react-native';

type PngExportProps = { svg: string };

export const PngExportView = forwardRef<View, PngExportProps>(() => null);

export async function exportPng(svg: string, filename: string, _view: View | null) {
  const browser = globalThis as any;
  const svgBlobUrl = browser.URL.createObjectURL(new browser.Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new browser.Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('No se pudo convertir la carátula a PNG.'));
      image.src = svgBlobUrl;
    });
    const canvas = browser.document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 1000;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Este navegador no pudo crear la imagen PNG.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob: Blob | null) => blob ? resolve(blob) : reject(new Error('No se pudo generar el archivo PNG.')), 'image/png');
    });
    const downloadUrl = browser.URL.createObjectURL(pngBlob);
    const link = browser.document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    link.click();
    browser.setTimeout(() => browser.URL.revokeObjectURL(downloadUrl), 1000);
  } finally {
    browser.URL.revokeObjectURL(svgBlobUrl);
  }
}
