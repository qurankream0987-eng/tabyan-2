import 'package:flutter/material.dart';

import 'reader/reader_screen.dart';

void main() {
  runApp(const TabyanSmartMushafApp());
}

class TabyanSmartMushafApp extends StatelessWidget {
  const TabyanSmartMushafApp({super.key});

  @override
  Widget build(BuildContext context) {
    const burgundy = Color(0xFF800020);
    const cream = Color(0xFFFAF7F0);

    return MaterialApp(
      title: 'مصحف تبيان الذكي',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: cream,
        colorScheme: ColorScheme.fromSeed(
          seedColor: burgundy,
          primary: burgundy,
          surface: cream,
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: burgundy,
          foregroundColor: Color(0xFFF1D27A),
          centerTitle: true,
          elevation: 0,
        ),
      ),
      home: const ReaderScreen(),
    );
  }
}
