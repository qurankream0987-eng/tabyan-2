Source: https://raw.githubusercontent.com/alheekmahlib/quran_library/main/lib/src/tasmee/engine/asset_loader.dart
Title: 
Fetched: 2026-10-15T02:16:13.117Z

/// تحميل أصول الحزمة من التطبيق المضيف.
///
/// أصول الحزم المُعلنة في pubspec تُقدَّم داخل التطبيق بوسم
/// `packages/<name>/...`، فنُجرّب المسار الخام أولًا (لِحالة التضمين
/// المباشر) ثم مفتاح الحزمة.
library;

import 'dart:typed_data';

import 'package:flutter/services.dart' show rootBundle;

/// اسم الحزمة (لِتوليد مفتاح `packages/<name>/...`).
const _pkg = 'quran_library';

/// يحمّل أصلًا نصيًّا — مفتاح الحزمة أولًا (الصحيح داخل التطبيقات).
Future<String> loadPackageAssetString(String assetPath) async {
  try {
    return await rootBundle.loadString('packages/$_pkg/$assetPath');
  } catch (_) {
    return rootBundle.loadString(assetPath);
  }
}

/// يحمّل أصلًا ثنائيًّا — مفتاح الحزمة أولًا (الصحيح داخل التطبيقات).
Future<Uint8List> loadPackageAssetBytes(String assetPath) async {
  try {
    final data = await rootBundle.load('packages/$_pkg/$assetPath');
    return data.buffer.asUint8List();
  } catch (_) {
    final data = await rootBundle.load(assetPath);
    return data.buffer.asUint8List();
  }
}
