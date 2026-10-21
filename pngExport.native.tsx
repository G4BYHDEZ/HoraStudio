import React, { forwardRef } from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

type PngExportProps = { svg: string };

export const PngExportView = forwardRef<View, PngExportProps>(({ svg }, ref) => (
  <View
    ref={ref}
    collapsable={false}
    pointerEvents="none"
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
    style={{ position: 'absolute', left: 0, top: -510, width: 360, height: 500 }}
  >
    <SvgXml xml={svg} width={360} height={500} />
  </View>
));

export async function exportPng(svg: string, filename: string, view: View | null) {
  if (!view) throw new Error('No se pudo preparar la imagen. Inténtalo de nuevo.');
  const capturedUri = await captureRef(view, { format: 'png', result: 'tmpfile', quality: 1, width: 720, height: 1000 });
  const directory = FileSystem.cacheDirectory;
  if (!directory) throw new Error('No se encontró una carpeta para exportar.');
  const uri = `${directory}${filename}`;
  const existing = await FileSystem.getInfoAsync(uri);
  if (existing.exists) await FileSystem.deleteAsync(uri, { idempotent: true });
  await FileSystem.copyAsync({ from: capturedUri, to: uri });
  await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Guardar o compartir imagen PNG', UTI: 'public.png' });
}
