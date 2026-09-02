import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Mode = 'photo' | 'scan';

export default function CameraScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [mode, setMode] = useState<Mode>(params.mode === 'scan' ? 'scan' : 'photo');
  const [facing, setFacing] = useState<CameraType>('back');
  const [busy, setBusy] = useState(false);
  const handledRef = useRef(false);

  async function ensurePermission(): Promise<boolean> {
    if (permission?.granted) return true;
    const res = await requestPermission();
    return res.granted;
  }

  async function takePhoto() {
    if (busy) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) {
        Haptics.selectionAsync();
        router.replace({ pathname: '/confirm', params: { uri: photo.uri } });
      }
    } finally {
      setBusy(false);
    }
  }

  function onBarcode(code: string) {
    if (handledRef.current || mode !== 'scan') return;
    handledRef.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace({ pathname: '/confirm', params: { barcode: code } });
  }

  async function pickFromGallery() {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) return;
    const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true, aspect: [4, 3] });
    if (!r.canceled) router.replace({ pathname: '/confirm', params: { uri: r.assets[0].uri } });
  }

  // Sem permissão ainda: tela de solicitação.
  if (!permission || !permission.granted) {
    return (
      <View style={styles.permission}>
        <Ionicons name="camera-outline" size={56} color="#FFFFFF" />
        <Text style={styles.permissionText}>
          O Luma precisa da câmera para registrar refeições e escanear produtos.
        </Text>
        <Pressable style={styles.permissionBtn} onPress={ensurePermission}>
          <Text style={styles.permissionBtnText}>Permitir câmera</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={styles.permissionCancel}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={mode === 'scan' ? ({ data }) => onBarcode(data) : undefined}
      />

      {/* Overlay */}
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable style={styles.circleBtn} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.topTitle}>
            {mode === 'scan' ? 'Escanear produto' : 'Registrar refeição'}
          </Text>
          <Pressable
            style={styles.circleBtn}
            onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
            hitSlop={8}>
            <Ionicons name="camera-reverse-outline" size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Center: scan frame */}
        {mode === 'scan' ? (
          <View style={styles.scanArea}>
            <View style={styles.scanFrame} />
            <Text style={styles.scanHint}>Aponte para o código de barras</Text>
          </View>
        ) : (
          <View style={styles.scanArea} />
        )}

        {/* Bottom controls */}
        <View style={styles.bottom}>
          {/* Mode toggle */}
          <View style={styles.modeToggle}>
            {(['photo', 'scan'] as const).map((m) => {
              const on = mode === m;
              return (
                <Pressable
                  key={m}
                  onPress={() => {
                    handledRef.current = false;
                    setMode(m);
                  }}
                  style={[styles.modeBtn, on && styles.modeBtnActive]}>
                  <Ionicons
                    name={m === 'photo' ? 'camera' : 'barcode-outline'}
                    size={16}
                    color={on ? '#0F3D2E' : '#FFFFFF'}
                  />
                  <Text style={[styles.modeText, { color: on ? '#0F3D2E' : '#FFFFFF' }]}>
                    {m === 'photo' ? 'Foto' : 'Escanear'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Action row */}
          {mode === 'photo' ? (
            <View style={styles.actionRow}>
              <Pressable style={styles.sideBtn} onPress={pickFromGallery} hitSlop={8}>
                <Ionicons name="images-outline" size={26} color="#FFFFFF" />
              </Pressable>
              <Pressable style={styles.shutter} onPress={takePhoto} disabled={busy}>
                {busy ? <ActivityIndicator color="#0F3D2E" /> : <View style={styles.shutterInner} />}
              </Pressable>
              <View style={styles.sideBtn} />
            </View>
          ) : (
            <Text style={styles.scanCaption}>A leitura é automática ao focar o código.</Text>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  scanArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  scanFrame: {
    width: '78%',
    height: 150,
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  scanHint: { color: '#FFFFFF', fontSize: 14, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99 },
  bottom: { paddingBottom: 12, gap: 20 },
  modeToggle: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 99,
    padding: 4,
    gap: 4,
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 99,
  },
  modeBtnActive: { backgroundColor: '#FFFFFF' },
  modeText: { fontSize: 14, fontWeight: '600' },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
  },
  sideBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  shutter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#FFFFFF' },
  scanCaption: { color: 'rgba(255,255,255,0.85)', textAlign: 'center', fontSize: 13, paddingBottom: 18 },
  permission: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  permissionText: { color: '#FFFFFF', textAlign: 'center', fontSize: 15, lineHeight: 21 },
  permissionBtn: {
    backgroundColor: '#1A6B47',
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 99,
    marginTop: 8,
  },
  permissionBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
  permissionCancel: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
});
