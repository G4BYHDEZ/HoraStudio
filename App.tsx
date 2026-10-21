import React, { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { exportPng, PngExportView } from './pngExport';

const palettes = [
  { name: 'Lima', color: '#d4f36a', dark: '#182014' },
  { name: 'Azul', color: '#8cc8ff', dark: '#101d2b' },
  { name: 'Coral', color: '#ff947a', dark: '#2a1714' },
  { name: 'Violeta', color: '#c7a6ff', dark: '#21192e' },
];
const faces = [
  { name: 'Campo abierto', style: 'ANALÓGICA', time: '10:09', description: 'Una pausa en el campo.' },
  { name: 'Órbita', style: 'DIGITAL', time: '10:09', description: 'El tiempo, en otra dimensión.' },
  { name: 'Marea', style: 'MINIMAL', time: '10:09', description: 'Menos ruido. Más momento.' },
];

export default function App() {
  const [selected, setSelected] = useState(0);
  const [palette, setPalette] = useState(0);
  const [saved, setSaved] = useState(false);
  const [exportVisible, setExportVisible] = useState(false);
  const [exportError, setExportError] = useState('');
  const [now, setNow] = useState(new Date());
  const pngRef = useRef<View>(null);
  const { width } = useWindowDimensions();
  const compact = width < 760;
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    AsyncStorage.getItem('hora-studio-saved-design').then((value) => {
      if (!value) return;
      const design = JSON.parse(value) as { face: number; palette: number };
      setSelected(design.face);
      setPalette(design.palette);
      setSaved(true);
    }).catch(() => {});
  }, []);

  async function saveDesign() {
    try {
      await AsyncStorage.setItem('hora-studio-saved-design', JSON.stringify({ face: selected, palette }));
      setSaved(true);
      setExportError('');
      setExportVisible(true);
    } catch {
      setExportError('No se pudo guardar el diseño. Comprueba el almacenamiento del dispositivo.');
      setExportVisible(true);
    }
  }

  function chooseFace(index: number) {
    setSelected(index);
    if (saved) AsyncStorage.setItem('hora-studio-saved-design', JSON.stringify({ face: index, palette })).catch(() => {});
  }

  function choosePalette(index: number) {
    setPalette(index);
    if (saved) AsyncStorage.setItem('hora-studio-saved-design', JSON.stringify({ face: selected, palette: index })).catch(() => {});
  }

  function makeSvg() {
    const faceBackground = activeFace.style === 'MINIMAL' ? '#ede9df' : '#171a16';
    const foreground = activeFace.style === 'MINIMAL' ? '#22231f' : '#f1efe6';
    const artwork = activeFace.style === 'ANALÓGICA'
      ? `<circle cx="180" cy="250" r="92" fill="none" stroke="#77796e" stroke-width="2"/><text x="180" y="178" text-anchor="middle" fill="#c6c4ba" font-size="15">12</text><text x="180" y="337" text-anchor="middle" fill="#c6c4ba" font-size="15">6</text><path d="M180 250 L222 214" stroke="${accent.color}" stroke-width="7" stroke-linecap="round"/><path d="M180 250 L151 190" stroke="#f1efe6" stroke-width="5" stroke-linecap="round"/><circle cx="180" cy="250" r="7" fill="${accent.color}"/>`
      : `<text x="180" y="270" text-anchor="middle" fill="${foreground}" font-family="Georgia,serif" font-size="68">${time}</text><text x="180" y="302" text-anchor="middle" fill="${accent.color}" font-size="20">${now.getSeconds().toString().padStart(2, '0')}</text>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1000" viewBox="0 0 360 500"><title>${activeFace.name} — Hora Studio</title><rect width="360" height="500" rx="48" fill="#10110f"/><rect x="143" y="0" width="74" height="128" rx="28" fill="#373731"/><rect x="143" y="372" width="74" height="128" rx="28" fill="#373731"/><rect x="77" y="82" width="206" height="336" rx="62" fill="${accent.dark}" stroke="#77766f" stroke-width="4"/><rect x="89" y="94" width="182" height="312" rx="53" fill="${faceBackground}"/><text x="111" y="129" fill="${activeFace.style === 'MINIMAL' ? '#56554e' : '#c6c4ba'}" font-size="11" letter-spacing="2">HORA STUDIO</text><text x="249" y="129" text-anchor="end" fill="${activeFace.style === 'MINIMAL' ? '#56554e' : '#c6c4ba'}" font-size="11">☼ 24°</text>${artwork}<text x="180" y="373" text-anchor="middle" fill="${activeFace.style === 'MINIMAL' ? '#56554e' : '#c6c4ba'}" font-size="11" letter-spacing="2">${activeFace.name.toUpperCase()}</text></svg>`;
  }

  async function exportDesign(format: 'svg' | 'json' | 'png') {
    setExportError('');
    const svg = makeSvg();
    const filenameBase = `hora-studio-${activeFace.name.toLowerCase().replace(/\s+/g, '-')}`;
    if (format === 'png') {
      try {
        await exportPng(svg, `${filenameBase}.png`, pngRef.current);
        setExportVisible(false);
      } catch (error) {
        setExportError(error instanceof Error ? error.message : 'No se pudo crear la imagen PNG.');
      }
      return;
    }
    const contents = format === 'svg' ? svg : JSON.stringify({
      app: 'Hora Studio', version: 1, name: activeFace.name, style: activeFace.style,
      description: activeFace.description, accent: accent.color, accentName: accent.name,
      background: accent.dark, preview: svg,
    }, null, 2);
    const filename = `${filenameBase}.${format}`;

    if (Platform.OS === 'web') {
      const doc = (globalThis as any).document;
      const url = URL.createObjectURL(new Blob([contents], { type: format === 'svg' ? 'image/svg+xml' : 'application/json' }));
      const link = doc.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      setExportVisible(false);
      return;
    }

    try {
      const directory = FileSystem.cacheDirectory;
      if (!directory) throw new Error('No se encontró una carpeta para exportar.');
      const uri = `${directory}${filename}`;
      await FileSystem.writeAsStringAsync(uri, contents, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(uri, {
        mimeType: format === 'svg' ? 'image/svg+xml' : 'application/json',
        dialogTitle: format === 'svg' ? 'Guardar o compartir imagen SVG' : 'Guardar o compartir diseño JSON',
        UTI: format === 'svg' ? 'public.svg-image' : 'public.json',
      });
      setExportVisible(false);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'No se pudo exportar el archivo.');
    }
  }

  const activeFace = faces[selected];
  const accent = palettes[palette];
  const time = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={s.page}>
        <View style={s.nav}>
          <View style={s.brandMark}><Text style={s.brandGlyph}>h.</Text></View>
          <Text style={s.brand}>hora<Text style={{ color: accent.color }}>studio</Text></Text>
          <View style={s.navRight}><Text style={s.navLabel}>ESTUDIO DE CARÁTULAS</Text><View style={s.liveDot} /></View>
        </View>

        <View style={[s.hero, compact && s.heroCompact]}>
          <View style={[s.copy, compact && s.copyCompact]}>
            <View style={s.eyebrow}><View style={[s.eyebrowLine, { backgroundColor: accent.color }]} /><Text style={s.eyebrowText}>TU TIEMPO, A TU MANERA</Text></View>
            <Text style={s.title}>Un reloj que{ '\n' }<Text style={{ color: accent.color, fontFamily: 'Georgia' }}>se siente tuyo.</Text></Text>
            <Text style={s.subtitle}>Descubre carátulas con carácter. Encuentra la que acompaña tu ritmo.</Text>
            <View style={s.stats}><View><Text style={s.statNum}>03</Text><Text style={s.statLabel}>DISEÑOS</Text></View><View style={s.statDivider} /><View><Text style={s.statNum}>∞</Text><Text style={s.statLabel}>MOMENTOS</Text></View></View>
          </View>

          <View style={s.previewArea}>
            <View style={[s.orbit, { borderColor: accent.color + '30' }]} />
            <View style={[s.watch, { backgroundColor: accent.dark, borderColor: '#55544f' }]}>
              <View style={[s.watchBand, s.bandTop, { backgroundColor: '#373731' }]} /><View style={[s.watchBand, s.bandBottom, { backgroundColor: '#373731' }]} />
              <View style={[s.watchFace, { backgroundColor: activeFace.style === 'MINIMAL' ? '#ede9df' : '#171a16' }]}>
                <View style={s.faceTop}><Text style={[s.faceSmall, activeFace.style === 'MINIMAL' && { color: '#56554e' }]}>LUNES · 19</Text><Text style={[s.faceWeather, activeFace.style === 'MINIMAL' && { color: '#56554e' }]}>☼ 24°</Text></View>
                {activeFace.style === 'ANALÓGICA' ? <View style={s.dial}><View style={[s.handHour, { backgroundColor: accent.color }]} /><View style={[s.handMinute, { backgroundColor: '#f1efe6' }]} /><View style={[s.dialCenter, { backgroundColor: accent.color }]} /><Text style={[s.dialMark, { top: 8, left: '47%' }]}>12</Text><Text style={s.dialMark}>06</Text></View> : <View style={s.digital}><Text style={[s.digitalTime, activeFace.style === 'MINIMAL' && { color: '#22231f' }]}>{time}</Text><Text style={[s.digitalSeconds, { color: accent.color }]}>{now.getSeconds().toString().padStart(2, '0')}</Text></View>}
                <View style={s.faceBottom}><Text style={[s.faceSmall, activeFace.style === 'MINIMAL' && { color: '#56554e' }]}>CUPERTINO</Text><Text style={{ color: accent.color, fontSize: 10 }}>● ● ●</Text></View>
              </View>
            </View>
            <View style={[s.floatTag, { borderColor: accent.color + '70' }]}><View style={[s.liveDot, { backgroundColor: accent.color }]} /><Text style={s.floatText}>VISTA EN VIVO</Text></View>
            <Text style={s.previewCaption}>{activeFace.description}</Text>
          </View>
        </View>

        <View style={s.sectionHead}><View><Text style={s.sectionKicker}>LA COLECCIÓN</Text><Text style={s.sectionTitle}>Encuentra tu momento</Text></View><Text style={s.counter}>0{selected + 1} <Text style={{ color: '#56554e' }}>/ 03</Text></Text></View>
        <View style={[s.cards, compact && s.cardsCompact]}>
          {faces.map((face, i) => <Pressable key={face.name} onPress={() => chooseFace(i)} style={[s.card, compact && s.cardCompact, selected === i && { borderColor: accent.color }]}>
            <View style={[s.cardMini, { backgroundColor: i === 2 ? '#ede9df' : '#171a16' }]}><Text style={[s.miniTime, i === 2 && { color: '#22231f' }]}>{i === 1 ? '10:09' : i === 2 ? '10:09' : '◷'}</Text>{i !== 1 && <View style={[s.miniAccent, { backgroundColor: accent.color }]} />}</View>
            <View style={s.cardCopy}><Text style={s.cardName}>{face.name}</Text><Text style={s.cardStyle}>{face.style}</Text></View><View style={[s.radio, selected === i && { borderColor: accent.color, backgroundColor: accent.color }]}>{selected === i && <Text style={s.check}>✓</Text>}</View>
          </Pressable>)}
        </View>

        <View style={[s.bottomRow, compact && s.bottomCompact]}>
          <View style={s.colorPicker}><Text style={s.colorLabel}>ELIGE TU ACENTO</Text><View style={s.swatches}>{palettes.map((p, i) => <Pressable key={p.name} accessibilityLabel={`Color ${p.name}`} onPress={() => choosePalette(i)} style={[s.swatch, { backgroundColor: p.color }, palette === i && s.swatchSelected]} />)}</View></View>
          <Pressable onPress={saveDesign} style={[s.installButton, compact && s.installCompact, { backgroundColor: accent.color }]}><Text style={s.installText}>{saved ? 'ACTUALIZAR Y EXPORTAR' : 'GUARDAR Y EXPORTAR'}</Text><Text style={s.arrow}>↗</Text></Pressable>
        </View>
        <View style={s.footer}><Text style={s.footerText}>DISEÑADO PARA CADA SEGUNDO</Text><Text style={s.footerText}>MÓVIL · WEB · TU ESTILO</Text></View>
      </ScrollView>
      <Modal visible={exportVisible} transparent animationType="fade" onRequestClose={() => setExportVisible(false)}>
        <View style={s.modalBackdrop}>
          <View style={[s.exportModal, compact && s.exportModalCompact]}>
            <View style={s.modalTop}><View><Text style={s.sectionKicker}>DISEÑO GUARDADO</Text><Text style={s.modalTitle}>Llévatelo contigo</Text></View><Pressable accessibilityLabel="Cerrar" onPress={() => setExportVisible(false)} style={s.closeButton}><Text style={s.closeText}>×</Text></Pressable></View>
            <Text style={s.modalDescription}>Descarga tu carátula como imagen o exporta sus datos para reutilizarlos.</Text>
            <Pressable onPress={() => exportDesign('png')} style={[s.exportOption, { borderColor: accent.color + '75' }]}><View style={[s.optionIcon, { backgroundColor: accent.color }]}><Text style={s.optionIconText}>PNG</Text></View><View style={s.optionCopy}><Text style={s.optionTitle}>Descargar imagen PNG</Text><Text style={s.optionCaption}>Imagen lista para usar y compartir</Text></View><Text style={s.optionArrow}>↓</Text></Pressable>
            <Pressable onPress={() => exportDesign('svg')} style={s.exportOption}><View style={[s.optionIcon, s.svgIcon]}><Text style={s.optionIconText}>SVG</Text></View><View style={s.optionCopy}><Text style={s.optionTitle}>Descargar imagen SVG</Text><Text style={s.optionCaption}>Vectorial: amplíala o insértala en un sitio</Text></View><Text style={s.optionArrow}>↓</Text></Pressable>
            <Pressable onPress={() => exportDesign('json')} style={s.exportOption}><View style={[s.optionIcon, s.jsonIcon]}><Text style={s.optionIconText}>JSON</Text></View><View style={s.optionCopy}><Text style={s.optionTitle}>Exportar archivo de diseño</Text><Text style={s.optionCaption}>Colores, estilo y vista previa SVG</Text></View><Text style={s.optionArrow}>↓</Text></Pressable>
            {exportError ? <Text style={s.exportError}>{exportError}</Text> : null}
            <Text style={s.modalFootnote}>{Platform.OS === 'web' ? 'El archivo se descargará en tu dispositivo.' : 'Usa el menú del sistema para guardar o enviar el archivo.'}</Text>
          </View>
        </View>
      </Modal>
      <PngExportView ref={pngRef} svg={makeSvg()} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#10110f' }, page: { maxWidth: 1100, width: '100%', alignSelf: 'center', paddingHorizontal: 32, paddingBottom: 34 },
  nav: { height: 76, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: '#292a25' }, brandMark: { width: 31, height: 31, borderRadius: 10, borderWidth: 1, borderColor: '#505148', alignItems: 'center', justifyContent: 'center', marginRight: 10 }, brandGlyph: { color: '#f1efe6', fontFamily: 'Georgia', fontSize: 19 }, brand: { color: '#f1efe6', fontWeight: '700', fontSize: 17, letterSpacing: -0.7 }, navRight: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 10 }, navLabel: { color: '#85857b', fontSize: 9, letterSpacing: 1.8 }, liveDot: { width: 7, height: 7, borderRadius: 7, backgroundColor: '#d4f36a' },
  hero: { flexDirection: 'row', minHeight: 372, alignItems: 'center', paddingTop: 35, paddingBottom: 22 }, heroCompact: { flexDirection: 'column', alignItems: 'stretch', paddingTop: 36 }, copy: { flex: 1, paddingRight: 10 }, copyCompact: { paddingRight: 0 }, eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 19 }, eyebrowLine: { width: 22, height: 1 }, eyebrowText: { color: '#a4a398', fontSize: 9, letterSpacing: 2 }, title: { color: '#f1efe6', fontSize: 47, lineHeight: 55, fontWeight: '600', letterSpacing: -1.7 }, subtitle: { color: '#9a9a90', fontSize: 14, lineHeight: 22, maxWidth: 350, marginTop: 16 }, stats: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 28 }, statNum: { color: '#f1efe6', fontSize: 19, fontFamily: 'Georgia' }, statLabel: { color: '#74756d', fontSize: 8, letterSpacing: 1.2, marginTop: 3 }, statDivider: { height: 30, width: 1, backgroundColor: '#383932' },
  previewArea: { width: 320, height: 330, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }, orbit: { position: 'absolute', width: 280, height: 280, borderWidth: 1, borderRadius: 180 }, watch: { width: 160, height: 224, borderRadius: 45, borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, watchBand: { position: 'absolute', width: 58, height: 63, borderRadius: 12, left: 49 }, bandTop: { top: -31 }, bandBottom: { bottom: -31 }, watchFace: { width: 142, height: 180, borderRadius: 37, paddingHorizontal: 13, paddingVertical: 15, justifyContent: 'space-between', borderWidth: 1, borderColor: '#5b5a54' }, faceTop: { flexDirection: 'row', justifyContent: 'space-between' }, faceSmall: { fontSize: 6, color: '#c6c4ba', letterSpacing: 0.8 }, faceWeather: { fontSize: 7, color: '#c6c4ba' }, faceBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, dial: { width: 96, height: 96, alignSelf: 'center', borderWidth: 1, borderColor: '#55574c', borderRadius: 50, alignItems: 'center', justifyContent: 'center' }, handHour: { position: 'absolute', height: 29, width: 3, borderRadius: 3, top: 21, transform: [{ rotate: '35deg' }] }, handMinute: { position: 'absolute', height: 37, width: 2, borderRadius: 2, bottom: 15, transform: [{ rotate: '-35deg' }] }, dialCenter: { width: 6, height: 6, borderRadius: 4 }, dialMark: { position: 'absolute', bottom: 7, color: '#929287', fontSize: 7, left: '48%' }, digital: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', marginTop: 24 }, digitalTime: { color: '#f1efe6', fontSize: 39, letterSpacing: -2, fontFamily: 'Georgia' }, digitalSeconds: { fontSize: 11, marginTop: 5, marginLeft: 2 }, floatTag: { position: 'absolute', right: 0, top: 48, flexDirection: 'row', gap: 7, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderRadius: 20, backgroundColor: '#171813' }, floatText: { color: '#c7c6bc', fontSize: 8, letterSpacing: 1 }, previewCaption: { position: 'absolute', bottom: -2, color: '#8b8b81', fontSize: 11, letterSpacing: 0.6 },
  sectionHead: { borderTopWidth: 1, borderColor: '#292a25', paddingTop: 22, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }, sectionKicker: { color: '#85857b', fontSize: 8, letterSpacing: 1.8, marginBottom: 7 }, sectionTitle: { color: '#f1efe6', fontSize: 21, letterSpacing: -0.4 }, counter: { color: '#f1efe6', fontSize: 12, marginBottom: 3 }, cards: { flexDirection: 'row', gap: 11, marginTop: 17 }, cardsCompact: { flexDirection: 'column' }, card: { flex: 1, minHeight: 86, borderWidth: 1, borderColor: '#34352f', borderRadius: 12, flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12, backgroundColor: '#151612' }, cardCompact: { flex: 0 }, cardMini: { width: 45, height: 59, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, miniTime: { color: '#f1efe6', fontSize: 15, fontFamily: 'Georgia' }, miniAccent: { width: 14, height: 2, marginTop: 4 }, cardCopy: { flex: 1 }, cardName: { color: '#f1efe6', fontSize: 13, fontWeight: '600' }, cardStyle: { color: '#86867c', fontSize: 8, letterSpacing: 1.1, marginTop: 5 }, radio: { width: 17, height: 17, borderWidth: 1, borderColor: '#53544c', borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, check: { color: '#151612', fontSize: 10, fontWeight: 'bold' },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22 }, bottomCompact: { flexDirection: 'column', alignItems: 'stretch', gap: 19 }, colorPicker: {}, colorLabel: { color: '#85857b', fontSize: 8, letterSpacing: 1.4, marginBottom: 10 }, swatches: { flexDirection: 'row', gap: 10 }, swatch: { width: 20, height: 20, borderRadius: 12 }, swatchSelected: { borderWidth: 2, borderColor: '#f1efe6', transform: [{ scale: 1.15 }] }, installButton: { height: 47, minWidth: 243, borderRadius: 7, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, installCompact: { width: '100%' }, installText: { color: '#151612', fontSize: 9, letterSpacing: 1.2, fontWeight: '800' }, arrow: { color: '#151612', fontSize: 20 }, footer: { marginTop: 24, paddingTop: 13, borderTopWidth: 1, borderColor: '#292a25', flexDirection: 'row', justifyContent: 'space-between' }, footerText: { color: '#686960', fontSize: 7, letterSpacing: 1.4 },
  modalBackdrop: { flex: 1, backgroundColor: '#000b', justifyContent: 'center', alignItems: 'center', padding: 20 }, exportModal: { width: '100%', maxWidth: 470, borderRadius: 18, borderWidth: 1, borderColor: '#414239', backgroundColor: '#171813', padding: 24 }, exportModalCompact: { padding: 20 }, modalTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, modalTitle: { color: '#f1efe6', fontSize: 24, letterSpacing: -0.5, marginTop: 5 }, closeButton: { width: 34, height: 34, borderRadius: 18, borderWidth: 1, borderColor: '#42433b', alignItems: 'center', justifyContent: 'center' }, closeText: { color: '#d4d3c9', fontSize: 24, lineHeight: 28 }, modalDescription: { color: '#a3a398', fontSize: 13, lineHeight: 20, marginTop: 12, marginBottom: 19 }, exportOption: { minHeight: 72, borderWidth: 1, borderColor: '#34352f', borderRadius: 11, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 9, gap: 12 }, optionIcon: { width: 44, height: 44, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, svgIcon: { backgroundColor: '#34362d' }, jsonIcon: { backgroundColor: '#303129' }, optionIconText: { color: '#151612', fontWeight: '800', fontSize: 9, letterSpacing: 0.4 }, optionCopy: { flex: 1 }, optionTitle: { color: '#f1efe6', fontWeight: '600', fontSize: 13 }, optionCaption: { color: '#929287', fontSize: 10, marginTop: 4 }, optionArrow: { color: '#d4d3c9', fontSize: 19, paddingHorizontal: 5 }, modalFootnote: { color: '#77786f', fontSize: 10, lineHeight: 15, marginTop: 7 }, exportError: { color: '#ff947a', fontSize: 12, marginTop: 5 }
});
